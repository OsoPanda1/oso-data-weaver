import type {
  TAMVArtifact,
  TAMVArtifactRegistry,
  TAMVLedgerEvent,
  TAMVLedgerRecord,
} from "./registry";
import { createLedgerEvent } from "./registry";

export interface GitHubLedgerConfig {
  token: string;
  owner: string;
  repo: string;
  branch?: string;
  registryPath?: string;
  committer?: {
    name: string;
    email: string;
  };
}

interface GitHubContentResponse {
  sha: string;
  content?: string;
  encoding?: string;
}

export class GitHubArtifactRegistry implements TAMVArtifactRegistry {
  private readonly apiBase = "https://api.github.com";
  private readonly registryPath: string;

  constructor(private readonly config: GitHubLedgerConfig) {
    this.registryPath = config.registryPath ?? "registry";
  }

  async read(uid: string): Promise<TAMVLedgerRecord | null> {
    const response = await this.getContent(this.recordPath(uid));
    if (!response) return null;
    if (response.encoding !== "base64" || !response.content) {
      throw new Error(`GitHub ledger record ${uid} has unsupported encoding.`);
    }
    return JSON.parse(Buffer.from(response.content, "base64").toString("utf8")) as TAMVLedgerRecord;
  }

  async append(
    artifact: TAMVArtifact,
    event: Omit<TAMVLedgerEvent, "id" | "occurred_at" | "prev_hash" | "event_hash">,
  ): Promise<TAMVLedgerRecord> {
    const existing = await this.read(artifact.uid);
    const ledgerEvent = createLedgerEvent(event, existing?.latest_hash);
    const updatedArtifact = { ...artifact, updated_at: ledgerEvent.occurred_at };
    const record: TAMVLedgerRecord = {
      artifact: updatedArtifact,
      events: [...(existing?.events ?? []), ledgerEvent],
      latest_hash: ledgerEvent.event_hash,
      updated_at: ledgerEvent.occurred_at,
    };
    await this.putContent(
      this.recordPath(artifact.uid),
      record,
      `ledger: ${event.type} ${artifact.uid}`,
    );
    return record;
  }

  private recordPath(uid: string): string {
    return `${this.registryPath}/${encodeURIComponent(uid)}.json`;
  }

  private async getContent(path: string): Promise<GitHubContentResponse | null> {
    const url = new URL(
      `${this.apiBase}/repos/${this.config.owner}/${this.config.repo}/contents/${path}`,
    );
    if (this.config.branch) url.searchParams.set("ref", this.config.branch);
    const response = await fetch(url, { headers: this.headers() });
    if (response.status === 404) return null;
    if (!response.ok) throw new Error(`GitHub ledger read failed: HTTP ${response.status}`);
    return response.json() as Promise<GitHubContentResponse>;
  }

  private async putContent(path: string, record: TAMVLedgerRecord, message: string): Promise<void> {
    const current = await this.getContent(path);
    const body: Record<string, unknown> = {
      message,
      content: Buffer.from(JSON.stringify(record, null, 2)).toString("base64"),
      sha: current?.sha,
      branch: this.config.branch,
      committer: this.config.committer,
    };
    for (const key of Object.keys(body)) if (body[key] === undefined) delete body[key];

    const response = await fetch(
      `${this.apiBase}/repos/${this.config.owner}/${this.config.repo}/contents/${path}`,
      {
        method: "PUT",
        headers: this.headers(),
        body: JSON.stringify(body),
      },
    );
    if (!response.ok) throw new Error(`GitHub ledger write failed: HTTP ${response.status}`);
  }

  private headers(): HeadersInit {
    return {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${this.config.token}`,
      "Content-Type": "application/json",
      "User-Agent": "tamv-core-kernel",
      "X-GitHub-Api-Version": "2022-11-28",
    };
  }
}

export function createGitHubArtifactRegistryFromEnv(
  env: NodeJS.ProcessEnv = process.env,
): GitHubArtifactRegistry {
  const token = env.GITHUB_LEDGER_TOKEN ?? env.GITHUB_TOKEN;
  if (!token)
    throw new Error("Missing GITHUB_LEDGER_TOKEN or GITHUB_TOKEN for TAMV GitHub ledger.");
  return new GitHubArtifactRegistry({
    token,
    owner: env.GITHUB_LEDGER_OWNER ?? "OsoPanda1",
    repo: env.GITHUB_LEDGER_REPO ?? "tamv-identity-ledger",
    branch: env.GITHUB_LEDGER_BRANCH,
    registryPath: env.GITHUB_LEDGER_REGISTRY_PATH ?? "registry/artifacts",
    committer:
      env.GITHUB_LEDGER_COMMITTER_NAME && env.GITHUB_LEDGER_COMMITTER_EMAIL
        ? { name: env.GITHUB_LEDGER_COMMITTER_NAME, email: env.GITHUB_LEDGER_COMMITTER_EMAIL }
        : undefined,
  });
}
