import type { ArtifactProvider, ArtifactProviderRecord, TAMVArtifact } from "../registry";
import { providerSchemaFromSample } from "../registry";

const DEFAULT_FIGSHARE_BASE_URL = "https://api.figshare.com/v2";

function figshareHeaders(): HeadersInit {
  const token = process.env.FIGSHARE_TOKEN ?? process.env.FIGSHARE_ACCESS_TOKEN;
  if (!token) throw new Error("figshare_token_missing");
  return {
    Accept: "application/json",
    "Content-Type": "application/json",
    Authorization: `token ${token}`,
  };
}

function figshareBaseUrl(): string {
  return (process.env.FIGSHARE_BASE_URL ?? DEFAULT_FIGSHARE_BASE_URL).replace(/\/$/, "");
}

function normalizeFigshareRecord(raw: Record<string, unknown>): ArtifactProviderRecord {
  return {
    id: String(raw.id ?? raw.article_id ?? ""),
    doi: typeof raw.doi === "string" ? raw.doi : undefined,
    url:
      typeof raw.url_public_html === "string"
        ? raw.url_public_html
        : typeof raw.url === "string"
          ? raw.url
          : undefined,
    syncedAt: new Date().toISOString(),
    raw,
  };
}

export const FigshareProvider: ArtifactProvider = {
  name: "figshare",

  async upload(artifact: TAMVArtifact): Promise<ArtifactProviderRecord> {
    const response = await fetch(`${figshareBaseUrl()}/account/articles`, {
      method: "POST",
      headers: figshareHeaders(),
      body: JSON.stringify({
        title: artifact.metadata.title ?? artifact.uid,
        description:
          artifact.metadata.description ??
          `TAMV artifact generated from commit ${artifact.git_hash}`,
        defined_type: artifact.metadata.defined_type ?? "dataset",
        tags: Array.isArray(artifact.metadata.tags)
          ? artifact.metadata.tags
          : ["tamv", "open-science"],
        custom_fields: {
          ...(typeof artifact.metadata.custom_fields === "object" && artifact.metadata.custom_fields
            ? (artifact.metadata.custom_fields as Record<string, unknown>)
            : {}),
          tamv_uid: artifact.uid,
          git_hash: artifact.git_hash,
        },
      }),
    });
    if (!response.ok) throw new Error(`figshare_http_${response.status}`);
    const raw = (await response.json()) as Record<string, unknown>;
    return normalizeFigshareRecord(raw);
  },

  async inspect(artifact: TAMVArtifact): Promise<ArtifactProviderRecord | null> {
    const providerRecord = artifact.providers.figshare;
    if (!providerRecord?.id) return null;
    const response = await fetch(
      `${figshareBaseUrl()}/account/articles/${encodeURIComponent(providerRecord.id)}`,
      {
        headers: figshareHeaders(),
      },
    );
    if (response.status === 404) return null;
    if (!response.ok) throw new Error(`figshare_inspect_http_${response.status}`);
    const raw = (await response.json()) as Record<string, unknown>;
    return normalizeFigshareRecord(raw);
  },

  async discoverSchema() {
    return providerSchemaFromSample("figshare", {
      id: "number|string",
      doi: "string?",
      url_public_html: "string?",
      title: "string",
      custom_fields: "object?",
    });
  },
};
