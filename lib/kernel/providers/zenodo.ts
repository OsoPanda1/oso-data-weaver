import type { TAMVArtifact, TAMVProviderReference } from "../registry";
import { asRecord, asString, HttpAcademicProvider } from "./http-provider";

function mapZenodoReference(raw: unknown): TAMVProviderReference {
  const record = asRecord(raw);
  const metadata = asRecord(record.metadata);
  const links = asRecord(record.links);
  const doi =
    asString(record.doi) ??
    asString(metadata.prereserve_doi) ??
    asString(asRecord(metadata.prereserve_doi).doi);
  return {
    id: String(record.id ?? record.conceptrecid ?? ""),
    doi,
    url: asString(links.html) ?? asString(record.url),
    state: record.submitted === true ? "PUBLISHED" : "SYNCED",
  };
}

export function createZenodoProvider(env: NodeJS.ProcessEnv = process.env) {
  return new HttpAcademicProvider({
    name: "zenodo",
    baseUrl: env.ZENODO_BASE_URL ?? "https://zenodo.org",
    token: env.ZENODO_ACCESS_TOKEN ?? env.ZENODO_API_KEY,
    authScheme: "bearer",
    createPath: "/api/deposit/depositions",
    readPath: (id) => `/api/deposit/depositions/${encodeURIComponent(id)}`,
    requiredEnv: ["ZENODO_ACCESS_TOKEN"],
    mapUploadBody: (artifact: TAMVArtifact) => ({
      metadata: {
        ...artifact.metadata,
        related_identifiers: [
          ...((Array.isArray(artifact.metadata.related_identifiers)
            ? artifact.metadata.related_identifiers
            : []) as unknown[]),
          {
            identifier: artifact.git_hash,
            relation: "isCompiledBy",
            scheme: "url",
            resource_type: "software",
          },
        ],
      },
    }),
    mapUploadResponse: mapZenodoReference,
  });
}

export const ZenodoProvider = createZenodoProvider();
