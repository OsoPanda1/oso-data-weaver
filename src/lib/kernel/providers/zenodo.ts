import type { ArtifactProvider, ArtifactProviderRecord, TAMVArtifact } from "../registry";
import { providerSchemaFromSample } from "../registry";

const DEFAULT_ZENODO_BASE_URL = "https://zenodo.org";

function zenodoHeaders(): HeadersInit {
  const token = process.env.ZENODO_ACCESS_TOKEN ?? process.env.ZENODO_API_KEY;
  if (!token) throw new Error("zenodo_token_missing");
  return {
    Accept: "application/json",
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

function zenodoBaseUrl(): string {
  return (process.env.ZENODO_BASE_URL ?? DEFAULT_ZENODO_BASE_URL).replace(/\/$/, "");
}

function normalizeZenodoRecord(raw: Record<string, unknown>): ArtifactProviderRecord {
  const links =
    raw.links && typeof raw.links === "object" ? (raw.links as Record<string, unknown>) : {};
  return {
    id: String(raw.id ?? raw.record_id ?? ""),
    doi: typeof raw.doi === "string" ? raw.doi : undefined,
    url:
      typeof links.html === "string"
        ? links.html
        : typeof raw.conceptdoi === "string"
          ? raw.conceptdoi
          : undefined,
    syncedAt: new Date().toISOString(),
    raw,
  };
}

export const ZenodoProvider: ArtifactProvider = {
  name: "zenodo",

  async upload(artifact: TAMVArtifact): Promise<ArtifactProviderRecord> {
    const response = await fetch(`${zenodoBaseUrl()}/api/deposit/depositions`, {
      method: "POST",
      headers: zenodoHeaders(),
      body: JSON.stringify({
        metadata: {
          ...artifact.metadata,
          upload_type: artifact.metadata.upload_type ?? "dataset",
          title: artifact.metadata.title ?? artifact.uid,
          version: artifact.git_hash,
          related_identifiers: [
            {
              identifier: artifact.git_hash,
              relation: "isCompiledBy",
              scheme: "url",
              resource_type: "software",
            },
          ],
        },
      }),
    });
    if (!response.ok) throw new Error(`zenodo_http_${response.status}`);
    const raw = (await response.json()) as Record<string, unknown>;
    return normalizeZenodoRecord(raw);
  },

  async inspect(artifact: TAMVArtifact): Promise<ArtifactProviderRecord | null> {
    const providerRecord = artifact.providers.zenodo;
    if (!providerRecord?.id) return null;
    const response = await fetch(
      `${zenodoBaseUrl()}/api/deposit/depositions/${encodeURIComponent(providerRecord.id)}`,
      {
        headers: zenodoHeaders(),
      },
    );
    if (response.status === 404) return null;
    if (!response.ok) throw new Error(`zenodo_inspect_http_${response.status}`);
    const raw = (await response.json()) as Record<string, unknown>;
    return normalizeZenodoRecord(raw);
  },

  async discoverSchema() {
    return providerSchemaFromSample("zenodo", {
      id: "number|string",
      doi: "string?",
      links: "object?",
      metadata: "object",
      conceptdoi: "string?",
    });
  },
};
