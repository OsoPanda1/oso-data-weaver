import { createHash, randomUUID } from "node:crypto";
import { z } from "zod";

import { emitEliteBookPiEvent, sha256, stableJson } from "../../../lib/contracts/bookpi-emitter";
import type { HeHepContext } from "../../../lib/contracts/elite-hehep";

export type ArtifactState = "INITIALIZED" | "LEDGERED" | "SYNCED" | "PUBLISHED" | "ERROR";
export type ArtifactProviderKey = "zenodo" | "figshare" | (string & {});

export interface ArtifactProviderRecord {
  id: string;
  doi?: string;
  url?: string;
  checksum?: string;
  syncedAt?: string;
  schemaFingerprint?: string;
  raw?: unknown;
}

export interface TAMVArtifact {
  uid: string;
  git_hash: string;
  metadata: Record<string, unknown>;
  providers: Record<ArtifactProviderKey, ArtifactProviderRecord | undefined>;
  state: ArtifactState;
  ledger?: ArtifactLedgerContract;
  audit?: ArtifactAuditState;
}

export interface ArtifactLedgerContract {
  contractId: string;
  artifactUid: string;
  sourceGitHash: string;
  ledgerCommitHash: string;
  providerOutputs: Record<string, ArtifactProviderRecord | undefined>;
  state: ArtifactState;
  he_hep_context: HeHepContext;
  createdAt: string;
  updatedAt: string;
  integrity: {
    artifactSha256: string;
    contractSha256: string;
  };
}

export interface ArtifactAuditState {
  checkedAt: string;
  discrepancies: ArtifactDiscrepancy[];
  corrected: boolean;
}

export interface ArtifactDiscrepancy {
  provider: string;
  field: string;
  ledgerValue?: unknown;
  externalValue?: unknown;
}

export interface ProviderSchemaSnapshot {
  provider: string;
  version: string;
  fields: string[];
  fingerprint: string;
  capturedAt: string;
}

export interface ArtifactProvider {
  name: ArtifactProviderKey;
  upload(artifact: TAMVArtifact): Promise<ArtifactProviderRecord>;
  inspect?(artifact: TAMVArtifact): Promise<ArtifactProviderRecord | null>;
  discoverSchema?(): Promise<ProviderSchemaSnapshot>;
}

export interface GitHubLedgerPort {
  readArtifact(uid: string): Promise<TAMVArtifact | null>;
  listArtifactUids?(): Promise<string[]>;
  commitArtifact(
    artifact: TAMVArtifact,
    message: string,
  ): Promise<{ commitHash: string; path: string }>;
}

export interface RetryPolicy {
  attempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
}

export interface TAMVEngineOptions {
  ledger: GitHubLedgerPort;
  providers?: ArtifactProvider[];
  retry?: RetryPolicy;
  repository?: string;
  source?: string;
}

const HeHepScienceContext: HeHepContext = { hexagon: "HE-Science", domain: "HEP-1" };

export const ArtifactProviderRecordSchema = z
  .object({
    id: z.string().min(1),
    doi: z.string().min(1).optional(),
    url: z.string().min(1).optional(),
    checksum: z.string().min(1).optional(),
    syncedAt: z.string().datetime().optional(),
    schemaFingerprint: z.string().min(1).optional(),
    raw: z.unknown().optional(),
  })
  .passthrough();

export const TAMVArtifactSchema = z.lazy(() =>
  z
    .object({
      uid: z.string().min(1).max(256),
      git_hash: z
        .string()
        .regex(/^[a-f0-9]{7,64}$/i, "git_hash debe ser un commit hash Git válido"),
      metadata: z.record(z.string(), z.unknown()).default({}),
      providers: z.record(z.string(), ArtifactProviderRecordSchema.optional()).default({}),
      state: z.enum(["INITIALIZED", "LEDGERED", "SYNCED", "PUBLISHED", "ERROR"]),
      ledger: z.unknown().optional() as z.ZodType<ArtifactLedgerContract | undefined>,
      audit: z
        .object({
          checkedAt: z.string(),
          discrepancies: z.array(
            z.object({
              provider: z.string(),
              field: z.string(),
              ledgerValue: z.unknown(),
              externalValue: z.unknown(),
            }),
          ),
          corrected: z.boolean(),
        })
        .optional(),
    })
    .strict(),
) as z.ZodType<TAMVArtifact>;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function sanitizeError(error: unknown): string {
  if (error instanceof Error) return error.message.replace(/[A-Za-z0-9_-]{24,}/g, "[redacted]");
  return String(error).replace(/[A-Za-z0-9_-]{24,}/g, "[redacted]");
}

function providerOutputChanged(
  a?: ArtifactProviderRecord | null,
  b?: ArtifactProviderRecord | null,
): boolean {
  return stableJson(a ?? null) !== stableJson(b ?? null);
}

export function buildArtifactLedgerContract(
  artifact: TAMVArtifact,
  ledgerCommitHash: string,
): ArtifactLedgerContract {
  const now = new Date().toISOString();
  const unsigned = {
    contractId: artifact.ledger?.contractId ?? randomUUID(),
    artifactUid: artifact.uid,
    sourceGitHash: artifact.git_hash,
    ledgerCommitHash,
    providerOutputs: artifact.providers,
    state: artifact.state,
    he_hep_context: HeHepScienceContext,
    createdAt: artifact.ledger?.createdAt ?? now,
    updatedAt: now,
  } satisfies Omit<ArtifactLedgerContract, "integrity">;

  return {
    ...unsigned,
    integrity: {
      artifactSha256: sha256({
        uid: artifact.uid,
        git_hash: artifact.git_hash,
        metadata: artifact.metadata,
        providers: artifact.providers,
        state: artifact.state,
      }),
      contractSha256: sha256(unsigned),
    },
  };
}

export async function withExponentialBackoff<T>(
  task: () => Promise<T>,
  policy: RetryPolicy,
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= policy.attempts; attempt += 1) {
    try {
      return await task();
    } catch (error) {
      lastError = error;
      if (attempt === policy.attempts) break;
      const jitter = Math.floor(Math.random() * policy.baseDelayMs);
      const nextDelay = Math.min(
        policy.maxDelayMs,
        policy.baseDelayMs * 2 ** (attempt - 1) + jitter,
      );
      await delay(nextDelay);
    }
  }
  throw lastError;
}

export class GitHubArtifactLedger implements GitHubLedgerPort {
  constructor(
    private readonly config: {
      token: string;
      owner: string;
      repo: string;
      branch?: string;
      basePath?: string;
    },
  ) {}

  private artifactPath(uid: string): string {
    const safeUid = encodeURIComponent(uid).replace(/%2F/gi, "-");
    return `${this.config.basePath ?? "registry"}/${safeUid}.json`;
  }

  private async github<T>(path: string, init: RequestInit = {}): Promise<T> {
    const response = await fetch(`https://api.github.com${path}`, {
      ...init,
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${this.config.token}`,
        "Content-Type": "application/json",
        "X-GitHub-Api-Version": "2022-11-28",
        ...(init.headers ?? {}),
      },
    });

    if (response.status === 404) throw new Error("github_not_found");
    if (!response.ok) throw new Error(`github_http_${response.status}`);
    return (await response.json()) as T;
  }

  async readArtifact(uid: string): Promise<TAMVArtifact | null> {
    const path = this.artifactPath(uid);
    try {
      const payload = await this.github<{ content: string }>(
        `/repos/${this.config.owner}/${this.config.repo}/contents/${path}`,
      );
      const json = Buffer.from(payload.content, "base64").toString("utf8");
      return TAMVArtifactSchema.parse(JSON.parse(json));
    } catch (error) {
      if (error instanceof Error && error.message === "github_not_found") return null;
      throw error;
    }
  }

  async listArtifactUids(): Promise<string[]> {
    const basePath = this.config.basePath ?? "registry";
    try {
      const entries = await this.github<Array<{ name: string; type: string }>>(
        `/repos/${this.config.owner}/${this.config.repo}/contents/${basePath}`,
      );
      return entries
        .filter((entry) => entry.type === "file" && entry.name.endsWith(".json"))
        .map((entry) => decodeURIComponent(entry.name.replace(/\.json$/, "")));
    } catch (error) {
      if (error instanceof Error && error.message === "github_not_found") return [];
      throw error;
    }
  }

  async commitArtifact(
    artifact: TAMVArtifact,
    message: string,
  ): Promise<{ commitHash: string; path: string }> {
    const path = this.artifactPath(artifact.uid);
    let sha: string | undefined;
    try {
      const current = await this.github<{ sha: string }>(
        `/repos/${this.config.owner}/${this.config.repo}/contents/${path}`,
      );
      sha = current.sha;
    } catch (error) {
      if (!(error instanceof Error) || error.message !== "github_not_found") throw error;
    }

    const payload = await this.github<{ commit: { sha: string } }>(
      `/repos/${this.config.owner}/${this.config.repo}/contents/${path}`,
      {
        method: "PUT",
        body: JSON.stringify({
          message,
          content: Buffer.from(`${JSON.stringify(artifact, null, 2)}\n`).toString("base64"),
          sha,
          branch: this.config.branch,
        }),
      },
    );
    return { commitHash: payload.commit.sha, path };
  }
}

export class TAMVEngine {
  private readonly providers = new Map<string, ArtifactProvider>();
  private readonly retry: RetryPolicy;
  private readonly repository: string;
  private readonly source: string;

  constructor(private readonly options: TAMVEngineOptions) {
    for (const provider of options.providers ?? []) this.providers.set(provider.name, provider);
    this.retry = options.retry ?? { attempts: 3, baseDelayMs: 500, maxDelayMs: 5_000 };
    this.repository = options.repository ?? "OsoPanda1/oso-data-weaver";
    this.source = options.source ?? "tamv-engine";
  }

  async processArtifact(
    artifactInput: TAMVArtifact,
    providerNames?: string[],
  ): Promise<TAMVArtifact> {
    let artifact = TAMVArtifactSchema.parse(artifactInput);
    const selectedProviders = this.resolveProviders(providerNames);

    try {
      artifact = await this.ensureLedgered(artifact);
      await this.emit("ArtifactLedgered", artifact);

      const uploaded = await Promise.all(
        selectedProviders.map(async (provider) => {
          const schema = await provider.discoverSchema?.();
          const record = await withExponentialBackoff(() => provider.upload(artifact), this.retry);
          return [
            provider.name,
            { ...record, schemaFingerprint: record.schemaFingerprint ?? schema?.fingerprint },
          ] as const;
        }),
      );

      artifact = {
        ...artifact,
        providers: { ...artifact.providers, ...Object.fromEntries(uploaded) },
        state: "SYNCED",
      };
      artifact = await this.commitWithContract(artifact, `chore: sync artifact ${artifact.uid}`);
      await this.emit("ArtifactUnified", artifact);
      return artifact;
    } catch (error) {
      const faulted: TAMVArtifact = { ...artifact, state: "ERROR" };
      await this.options.ledger.commitArtifact(
        faulted,
        `chore: mark artifact ${artifact.uid} as error`,
      );
      await this.emit("ArtifactSyncError", faulted, { error: sanitizeError(error) });
      throw error;
    }
  }

  async auditAll(
    providerNames?: string[],
    uids?: string[],
  ): Promise<{ checkedAt: string; audited: number; healed: number; artifacts: TAMVArtifact[] }> {
    const selectedUids = uids ?? (await this.options.ledger.listArtifactUids?.()) ?? [];
    const artifacts: TAMVArtifact[] = [];

    for (const uid of selectedUids) {
      artifacts.push(await this.auditAndHeal(uid, providerNames));
    }

    return {
      checkedAt: new Date().toISOString(),
      audited: artifacts.length,
      healed: artifacts.filter((artifact) => artifact.audit?.corrected).length,
      artifacts,
    };
  }

  async auditAndHeal(uid: string, providerNames?: string[]): Promise<TAMVArtifact> {
    const ledgerArtifact = await this.options.ledger.readArtifact(uid);
    if (!ledgerArtifact) throw new Error(`artifact_not_found:${uid}`);

    const providers = this.resolveProviders(providerNames).filter((provider) => provider.inspect);
    const discrepancies: ArtifactDiscrepancy[] = [];
    const healedProviders = { ...ledgerArtifact.providers };

    for (const provider of providers) {
      const external = await withExponentialBackoff(
        () => provider.inspect!(ledgerArtifact),
        this.retry,
      );
      const ledgerValue = ledgerArtifact.providers[provider.name];
      if (providerOutputChanged(ledgerValue, external)) {
        discrepancies.push({
          provider: provider.name,
          field: "providers",
          ledgerValue,
          externalValue: external,
        });
        if (external) healedProviders[provider.name] = external;
      }
    }

    const healed: TAMVArtifact = {
      ...ledgerArtifact,
      providers: healedProviders,
      state: discrepancies.length ? "SYNCED" : ledgerArtifact.state,
      audit: {
        checkedAt: new Date().toISOString(),
        discrepancies,
        corrected: discrepancies.length > 0,
      },
    };

    const committed = discrepancies.length
      ? await this.commitWithContract(healed, `chore: self-heal artifact ${uid}`)
      : healed;
    await this.emit(discrepancies.length ? "ArtifactSelfHealed" : "ArtifactAuditClean", committed, {
      discrepancies: discrepancies.length,
    });
    return committed;
  }

  private resolveProviders(providerNames?: string[]): ArtifactProvider[] {
    const names = providerNames?.length ? providerNames : Array.from(this.providers.keys());
    const resolved = names.map((name) => {
      const provider = this.providers.get(name);
      if (!provider) throw new Error(`provider_not_registered:${name}`);
      return provider;
    });
    if (!resolved.length) throw new Error("provider_required");
    return resolved;
  }

  private async ensureLedgered(artifact: TAMVArtifact): Promise<TAMVArtifact> {
    if (artifact.ledger?.ledgerCommitHash && artifact.state !== "INITIALIZED") return artifact;
    const ledgered: TAMVArtifact = { ...artifact, state: "LEDGERED" };
    return this.commitWithContract(ledgered, `chore: initialize artifact ${artifact.uid}`);
  }

  private async commitWithContract(artifact: TAMVArtifact, message: string): Promise<TAMVArtifact> {
    const firstPass: TAMVArtifact = {
      ...artifact,
      ledger: buildArtifactLedgerContract(artifact, artifact.ledger?.ledgerCommitHash ?? "pending"),
    };
    const commit = await this.options.ledger.commitArtifact(firstPass, message);
    const committed: TAMVArtifact = {
      ...firstPass,
      ledger: buildArtifactLedgerContract(firstPass, commit.commitHash),
    };
    await this.options.ledger.commitArtifact(
      committed,
      `${message} contract ${commit.commitHash.slice(0, 12)}`,
    );
    return committed;
  }

  private async emit(type: string, artifact: TAMVArtifact, meta?: Record<string, unknown>) {
    return emitEliteBookPiEvent({
      protocol: "tamv-artifact-registry/v1",
      type,
      source: this.source,
      repository: this.repository,
      context: HeHepScienceContext,
      payload: {
        artifactId: artifact.uid,
        git_hash: artifact.git_hash,
        state: artifact.state,
        ledger: artifact.ledger,
        providers: artifact.providers,
      },
      meta,
    });
  }
}

export function providerSchemaFromSample(
  provider: string,
  sample: Record<string, unknown>,
  version = "runtime",
): ProviderSchemaSnapshot {
  const fields = Object.keys(sample).sort();
  return {
    provider,
    version,
    fields,
    fingerprint: createHash("sha256")
      .update(stableJson({ provider, version, fields }))
      .digest("hex"),
    capturedAt: new Date().toISOString(),
  };
}
