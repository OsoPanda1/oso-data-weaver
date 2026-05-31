import type { TAMVArtifact } from "../../types/kernel";

export const TAMV_LEDGER_OWNER = "OsoPanda1";
export const TAMV_LEDGER_REPO = "tamv-identity-ledger";
export const TAMV_LEDGER_BRANCH = "main";

export interface GitHubContentFile {
  type?: string;
  sha?: string;
}

export interface OctokitLike {
  rest: {
    repos: {
      getContent(params: {
        owner: string;
        repo: string;
        path: string;
        ref?: string;
      }): Promise<{ data: GitHubContentFile | GitHubContentFile[] }>;
      createOrUpdateFileContents(params: {
        owner: string;
        repo: string;
        path: string;
        message: string;
        content: string;
        branch?: string;
        sha?: string;
      }): Promise<unknown>;
    };
  };
}

export interface TAMVRegistryOptions {
  owner?: string;
  repo?: string;
  branch?: string;
  artifactPath?: (artifact: TAMVArtifact) => string;
}

export interface LedgerUpdateResult {
  owner: string;
  repo: string;
  branch: string;
  path: string;
  action: "create" | "update";
  response: unknown;
}

function encodeBase64(value: string): string {
  return Buffer.from(value, "utf8").toString("base64");
}

function isNotFound(error: unknown): boolean {
  return typeof error === "object" && error !== null && "status" in error && error.status === 404;
}

function getArtifactLedgerPath(artifact: TAMVArtifact): string {
  return `artifacts/${artifact.uid}.json`;
}

export class TAMVKernelRegistry {
  private readonly owner: string;
  private readonly repo: string;
  private readonly branch: string;
  private readonly artifactPath: (artifact: TAMVArtifact) => string;

  constructor(
    private readonly octokit: OctokitLike,
    options: TAMVRegistryOptions = {},
  ) {
    this.owner = options.owner ?? TAMV_LEDGER_OWNER;
    this.repo = options.repo ?? TAMV_LEDGER_REPO;
    this.branch = options.branch ?? TAMV_LEDGER_BRANCH;
    this.artifactPath = options.artifactPath ?? getArtifactLedgerPath;
  }

  async updateLedger(artifact: TAMVArtifact): Promise<LedgerUpdateResult> {
    const path = this.artifactPath(artifact);
    const message = `chore: sync artifact ${artifact.uid}`;
    const content = encodeBase64(`${JSON.stringify(artifact, null, 2)}\n`);
    const sha = await this.resolveFileSha(path);
    const action = sha ? "update" : "create";

    const response = await this.octokit.rest.repos.createOrUpdateFileContents({
      owner: this.owner,
      repo: this.repo,
      path,
      message,
      content,
      branch: this.branch,
      ...(sha ? { sha } : {}),
    });

    return {
      owner: this.owner,
      repo: this.repo,
      branch: this.branch,
      path,
      action,
      response,
    };
  }

  private async resolveFileSha(path: string): Promise<string | undefined> {
    try {
      const existing = await this.octokit.rest.repos.getContent({
        owner: this.owner,
        repo: this.repo,
        path,
        ref: this.branch,
      });

      if (Array.isArray(existing.data)) {
        throw new Error(`Ledger path ${path} points to a directory, not an artifact file.`);
      }

      return existing.data.sha;
    } catch (error) {
      if (isNotFound(error)) return undefined;
      throw new Error(
        `Unable to inspect ledger artifact ${path}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}

export function createKernelRegistry(
  octokit: OctokitLike,
  options?: TAMVRegistryOptions,
): TAMVKernelRegistry {
  return new TAMVKernelRegistry(octokit, options);
}
