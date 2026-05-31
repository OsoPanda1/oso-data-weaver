import { createHash, randomUUID } from "node:crypto";

import { emitEliteBookPiEvent, sha256, stableJson } from "../contracts/bookpi-emitter";
import type { BookPiTransport, EliteHeHepEvent } from "../contracts/bookpi";
import type { HeHepContext } from "../contracts/elite-hehep";

export type TAMVArtifactState = "INITIALIZED" | "SYNCED" | "PUBLISHED" | "ERROR";
export type TAMVProviderName = "zenodo" | "figshare" | (string & {});

export interface TAMVProviderReference {
  id: string;
  doi?: string;
  url?: string;
  state?: TAMVArtifactState;
  checksum?: string;
  raw?: unknown;
}

export interface TAMVArtifactProviderMap {
  zenodo?: TAMVProviderReference;
  figshare?: TAMVProviderReference;
  [provider: string]: TAMVProviderReference | undefined;
}

export interface TAMVArtifactContract {
  contract_id: string;
  artifact_uid: string;
  git_hash: string;
  provider: string;
  provider_id: string;
  doi?: string;
  url?: string;
  output_hash: string;
  ledger_hash: string;
  issued_at: string;
}

export interface TAMVArtifact {
  uid: string;
  git_hash: string;
  metadata: Record<string, unknown>;
  providers: TAMVArtifactProviderMap;
  state: TAMVArtifactState;
  contracts?: TAMVArtifactContract[];
  created_at?: string;
  updated_at?: string;
  error?: string;
}

export interface TAMVProviderCapabilities {
  name: string;
  version: string;
  endpoints: Record<string, string>;
  schema_hash: string;
  observed_at: string;
  required_env?: string[];
}

export interface TAMVAcademicProvider {
  name: TAMVProviderName;
  upload(artifact: TAMVArtifact): Promise<TAMVProviderReference>;
  readRemote(reference: TAMVProviderReference): Promise<TAMVProviderReference | null>;
  describeCapabilities(): Promise<TAMVProviderCapabilities>;
}

export type TAMVLedgerEventType =
  | "ArtifactInitialized"
  | "ArtifactSyncRequested"
  | "ArtifactProviderSynced"
  | "ArtifactPublished"
  | "ArtifactSyncFailed"
  | "ArtifactSelfAuditStarted"
  | "ArtifactSelfAuditDiscrepancy"
  | "ArtifactSelfAuditRepaired"
  | "ProviderContractObserved";

export interface TAMVLedgerEvent {
  id: string;
  type: TAMVLedgerEventType;
  artifact_uid: string;
  git_hash: string;
  occurred_at: string;
  payload: Record<string, unknown>;
  prev_hash?: string;
  event_hash: string;
  he_hep_context: HeHepContext;
}

export interface TAMVLedgerRecord {
  artifact: TAMVArtifact;
  events: TAMVLedgerEvent[];
  latest_hash: string;
  updated_at: string;
}

export interface TAMVArtifactRegistry {
  read(uid: string): Promise<TAMVLedgerRecord | null>;
  append(
    artifact: TAMVArtifact,
    event: Omit<TAMVLedgerEvent, "id" | "occurred_at" | "prev_hash" | "event_hash">,
  ): Promise<TAMVLedgerRecord>;
  list?(): Promise<TAMVLedgerRecord[]>;
}

export interface TAMVEngineOptions {
  registry: TAMVArtifactRegistry;
  providers?: TAMVAcademicProvider[];
  bookPiTransport?: BookPiTransport<Record<string, unknown>, Record<string, unknown>>;
  repository?: string;
  source?: string;
  maxAttempts?: number;
  baseDelayMs?: number;
}

export interface TAMVSelfAuditDiscrepancy {
  artifact_uid: string;
  provider: string;
  expected?: TAMVProviderReference;
  actual?: TAMVProviderReference | null;
  reason:
    | "missing_ledger_reference"
    | "missing_remote_output"
    | "doi_mismatch"
    | "url_mismatch"
    | "checksum_mismatch"
    | "provider_error";
  repaired: boolean;
  error?: string;
}

export interface TAMVSelfAuditReport {
  checked_at: string;
  inspected: number;
  discrepancies: TAMVSelfAuditDiscrepancy[];
}

const SCIENCE_CONTEXT: HeHepContext = { hexagon: "HE-Science", domain: "HEP-1" };
const PUBLISH_CONTEXT: HeHepContext = { hexagon: "HE-Publish", domain: "HEP-1" };

export function validateTAMVArtifact(artifact: TAMVArtifact): TAMVArtifact {
  if (!artifact.uid || !/^[A-Za-z0-9._:-]+$/.test(artifact.uid)) {
    throw new Error("Invalid TAMVArtifact.uid: expected a stable ledger-safe identifier.");
  }
  if (!artifact.git_hash || !/^[a-fA-F0-9]{7,64}$/.test(artifact.git_hash)) {
    throw new Error("Invalid TAMVArtifact.git_hash: expected a git commit or tree hash.");
  }
  if (!artifact.metadata || typeof artifact.metadata !== "object") {
    throw new Error("Invalid TAMVArtifact.metadata: expected object metadata.");
  }
  if (!["INITIALIZED", "SYNCED", "PUBLISHED", "ERROR"].includes(artifact.state)) {
    throw new Error(`Invalid TAMVArtifact.state: ${artifact.state}`);
  }
  return artifact;
}

export function createArtifactContract(
  artifact: TAMVArtifact,
  provider: string,
  reference: TAMVProviderReference,
  ledgerHash: string,
): TAMVArtifactContract {
  const output_hash = sha256({ provider, reference, git_hash: artifact.git_hash });
  const issued_at = new Date().toISOString();
  return {
    contract_id: createHash("sha256")
      .update(`${artifact.uid}:${artifact.git_hash}:${provider}:${reference.id}:${output_hash}`)
      .digest("hex"),
    artifact_uid: artifact.uid,
    git_hash: artifact.git_hash,
    provider,
    provider_id: reference.id,
    doi: reference.doi,
    url: reference.url,
    output_hash,
    ledger_hash: ledgerHash,
    issued_at,
  };
}

export function createLedgerEvent(
  input: Omit<TAMVLedgerEvent, "id" | "occurred_at" | "prev_hash" | "event_hash">,
  prevHash?: string,
): TAMVLedgerEvent {
  const unsigned = {
    id: randomUUID(),
    type: input.type,
    artifact_uid: input.artifact_uid,
    git_hash: input.git_hash,
    occurred_at: new Date().toISOString(),
    payload: input.payload,
    prev_hash: prevHash,
    he_hep_context: input.he_hep_context,
  };
  return { ...unsigned, event_hash: sha256(unsigned) };
}

export class InMemoryTAMVArtifactRegistry implements TAMVArtifactRegistry {
  private readonly records = new Map<string, TAMVLedgerRecord>();

  async read(uid: string): Promise<TAMVLedgerRecord | null> {
    return this.records.get(uid) ?? null;
  }

  async append(
    artifact: TAMVArtifact,
    event: Omit<TAMVLedgerEvent, "id" | "occurred_at" | "prev_hash" | "event_hash">,
  ): Promise<TAMVLedgerRecord> {
    const existing = this.records.get(artifact.uid);
    const ledgerEvent = createLedgerEvent(event, existing?.latest_hash);
    const updatedArtifact = { ...artifact, updated_at: ledgerEvent.occurred_at };
    const record: TAMVLedgerRecord = {
      artifact: updatedArtifact,
      events: [...(existing?.events ?? []), ledgerEvent],
      latest_hash: ledgerEvent.event_hash,
      updated_at: ledgerEvent.occurred_at,
    };
    this.records.set(artifact.uid, record);
    return record;
  }

  async list(): Promise<TAMVLedgerRecord[]> {
    return Array.from(this.records.values());
  }
}

export class TAMVEngine {
  private readonly providers: TAMVAcademicProvider[];
  private readonly maxAttempts: number;
  private readonly baseDelayMs: number;
  private readonly repository: string;
  private readonly source: string;

  constructor(private readonly options: TAMVEngineOptions) {
    this.providers = options.providers ?? [];
    this.maxAttempts = options.maxAttempts ?? 3;
    this.baseDelayMs = options.baseDelayMs ?? 500;
    this.repository = options.repository ?? "OsoPanda1/oso-data-weaver";
    this.source = options.source ?? "tamv-kernel-artifact-registry";
  }

  async processArtifact(artifact: TAMVArtifact, providers = this.providers): Promise<TAMVArtifact> {
    const initialized = validateTAMVArtifact({ ...artifact, providers: artifact.providers ?? {} });
    const requestRecord = await this.options.registry.append(initialized, {
      type: "ArtifactSyncRequested",
      artifact_uid: initialized.uid,
      git_hash: initialized.git_hash,
      he_hep_context: PUBLISH_CONTEXT,
      payload: {
        state: initialized.state,
        providers: providers.map((provider) => provider.name),
        metadata_hash: sha256(initialized.metadata),
      },
    });

    let current: TAMVArtifact = requestRecord.artifact;
    try {
      const results = await Promise.all(
        providers.map((provider) => this.syncProvider(current, provider)),
      );
      for (const result of results) current = result;
      await this.emitBookPi(
        "ArtifactUnified",
        current,
        { providers: providers.map((provider) => provider.name) },
        SCIENCE_CONTEXT,
      );
      return current;
    } catch (error) {
      const failed: TAMVArtifact = { ...current, state: "ERROR", error: sanitizeError(error) };
      await this.options.registry.append(failed, {
        type: "ArtifactSyncFailed",
        artifact_uid: failed.uid,
        git_hash: failed.git_hash,
        he_hep_context: SCIENCE_CONTEXT,
        payload: { error: failed.error },
      });
      await this.emitBookPi("ArtifactSyncFailed", failed, { error: failed.error }, SCIENCE_CONTEXT);
      throw error;
    }
  }

  async syncProvider(
    artifact: TAMVArtifact,
    provider: TAMVAcademicProvider,
  ): Promise<TAMVArtifact> {
    const reference = await withExponentialBackoff(() => provider.upload(artifact), {
      attempts: this.maxAttempts,
      baseDelayMs: this.baseDelayMs,
    });
    const providerPatch = { ...artifact.providers, [provider.name]: reference };
    const synced: TAMVArtifact = { ...artifact, providers: providerPatch, state: "SYNCED" };
    const ledgerRecord = await this.options.registry.append(synced, {
      type: "ArtifactProviderSynced",
      artifact_uid: synced.uid,
      git_hash: synced.git_hash,
      he_hep_context: SCIENCE_CONTEXT,
      payload: { provider: provider.name, reference },
    });
    const contract = createArtifactContract(
      synced,
      provider.name,
      reference,
      ledgerRecord.latest_hash,
    );
    const contracted: TAMVArtifact = {
      ...ledgerRecord.artifact,
      contracts: [...(ledgerRecord.artifact.contracts ?? []), contract],
    };
    await this.options.registry.append(contracted, {
      type: "ArtifactPublished",
      artifact_uid: contracted.uid,
      git_hash: contracted.git_hash,
      he_hep_context: SCIENCE_CONTEXT,
      payload: { provider: provider.name, contract },
    });
    await this.emitBookPi(
      "ArtifactProviderSynced",
      contracted,
      { provider: provider.name, contract },
      SCIENCE_CONTEXT,
    );
    return contracted;
  }

  async registerProviderContract(
    provider: TAMVAcademicProvider,
  ): Promise<TAMVProviderCapabilities> {
    const capabilities = await provider.describeCapabilities();
    const artifact: TAMVArtifact = {
      uid: `provider-contract:${provider.name}`,
      git_hash: capabilities.schema_hash.slice(0, 40),
      metadata: capabilities as unknown as Record<string, unknown>,
      providers: {},
      state: "SYNCED",
    };
    await this.options.registry.append(artifact, {
      type: "ProviderContractObserved",
      artifact_uid: artifact.uid,
      git_hash: artifact.git_hash,
      he_hep_context: PUBLISH_CONTEXT,
      payload: { provider: provider.name, capabilities },
    });
    return capabilities;
  }

  async selfAudit(records?: TAMVLedgerRecord[]): Promise<TAMVSelfAuditReport> {
    const sourceRecords =
      records ?? (this.options.registry.list ? await this.options.registry.list() : []);
    const report: TAMVSelfAuditReport = {
      checked_at: new Date().toISOString(),
      inspected: sourceRecords.length,
      discrepancies: [],
    };

    for (const record of sourceRecords) {
      await this.options.registry.append(record.artifact, {
        type: "ArtifactSelfAuditStarted",
        artifact_uid: record.artifact.uid,
        git_hash: record.artifact.git_hash,
        he_hep_context: SCIENCE_CONTEXT,
        payload: { provider_count: Object.keys(record.artifact.providers).length },
      });

      for (const provider of this.providers) {
        const expected = record.artifact.providers[provider.name];
        if (!expected) continue;
        const discrepancy = await this.auditProvider(record.artifact, provider, expected);
        if (discrepancy) {
          report.discrepancies.push(discrepancy);
          await this.options.registry.append(record.artifact, {
            type: discrepancy.repaired
              ? "ArtifactSelfAuditRepaired"
              : "ArtifactSelfAuditDiscrepancy",
            artifact_uid: record.artifact.uid,
            git_hash: record.artifact.git_hash,
            he_hep_context: SCIENCE_CONTEXT,
            payload: { discrepancy },
          });
        }
      }
    }

    await this.emitBookPi(
      "ArtifactSelfAuditCompleted",
      { report } as unknown as TAMVArtifact,
      { report },
      SCIENCE_CONTEXT,
    );
    return report;
  }

  private async auditProvider(
    artifact: TAMVArtifact,
    provider: TAMVAcademicProvider,
    expected: TAMVProviderReference,
  ): Promise<TAMVSelfAuditDiscrepancy | null> {
    try {
      const actual = await provider.readRemote(expected);
      if (!actual)
        return {
          artifact_uid: artifact.uid,
          provider: provider.name,
          expected,
          actual,
          reason: "missing_remote_output",
          repaired: false,
        };
      const reason = detectDiscrepancy(expected, actual);
      if (!reason) return null;
      const repairedArtifact = {
        ...artifact,
        providers: { ...artifact.providers, [provider.name]: { ...expected, ...actual } },
        state: "SYNCED" as const,
      };
      await this.options.registry.append(repairedArtifact, {
        type: "ArtifactSelfAuditRepaired",
        artifact_uid: artifact.uid,
        git_hash: artifact.git_hash,
        he_hep_context: SCIENCE_CONTEXT,
        payload: {
          provider: provider.name,
          expected,
          actual,
          repair: "ledger_reference_updated_from_provider",
        },
      });
      return {
        artifact_uid: artifact.uid,
        provider: provider.name,
        expected,
        actual,
        reason,
        repaired: true,
      };
    } catch (error) {
      return {
        artifact_uid: artifact.uid,
        provider: provider.name,
        expected,
        reason: "provider_error",
        repaired: false,
        error: sanitizeError(error),
      };
    }
  }

  private async emitBookPi(
    type: string,
    artifact: TAMVArtifact,
    meta: Record<string, unknown>,
    context: HeHepContext,
  ): Promise<EliteHeHepEvent<Record<string, unknown>, Record<string, unknown>>> {
    return emitEliteBookPiEvent({
      protocol: "tamv-artifact-registry/v1",
      type,
      source: this.source,
      repository: this.repository,
      context,
      payload: artifact as unknown as Record<string, unknown>,
      meta,
      transport: this.options.bookPiTransport,
    });
  }
}

export async function withExponentialBackoff<T>(
  operation: () => Promise<T>,
  options: { attempts: number; baseDelayMs: number },
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= options.attempts; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (attempt === options.attempts) break;
      const jitter = Math.floor(Math.random() * options.baseDelayMs);
      await delay(options.baseDelayMs * 2 ** (attempt - 1) + jitter);
    }
  }
  throw lastError;
}

function detectDiscrepancy(
  expected: TAMVProviderReference,
  actual: TAMVProviderReference,
): TAMVSelfAuditDiscrepancy["reason"] | null {
  if (expected.doi && actual.doi && expected.doi !== actual.doi) return "doi_mismatch";
  if (expected.url && actual.url && expected.url !== actual.url) return "url_mismatch";
  if (expected.checksum && actual.checksum && expected.checksum !== actual.checksum)
    return "checksum_mismatch";
  return null;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function sanitizeError(error: unknown): string {
  if (error instanceof Error) return error.message.replace(/[A-Za-z0-9_\-.=]{24,}/g, "[redacted]");
  return stableJson(error).replace(/[A-Za-z0-9_\-.=]{24,}/g, "[redacted]");
}
