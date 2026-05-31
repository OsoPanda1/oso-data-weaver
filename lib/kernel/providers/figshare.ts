import type { TAMVArtifact, TAMVProviderReference } from "../registry";
import { asRecord, asString, HttpAcademicProvider } from "./http-provider";

function mapFigshareReference(raw: unknown): TAMVProviderReference {
  const record = asRecord(raw);
  return {
    id: String(record.id ?? record.article_id ?? ""),
    doi: asString(record.doi),
    url: asString(record.url_public_html) ?? asString(record.url) ?? asString(record.html_url),
    state: record.is_public === true ? "PUBLISHED" : "SYNCED",
  };
}

export function createFigshareProvider(env: NodeJS.ProcessEnv = process.env) {
  return new HttpAcademicProvider({
    name: "figshare",
    baseUrl: env.FIGSHARE_BASE_URL ?? "https://api.figshare.com",
    token: env.FIGSHARE_TOKEN,
    authScheme: "token",
    createPath: "/v2/account/articles",
    readPath: (id) => `/v2/account/articles/${encodeURIComponent(id)}`,
    requiredEnv: ["FIGSHARE_TOKEN"],
    mapUploadBody: (artifact: TAMVArtifact) => ({
      title: typeof artifact.metadata.title === "string" ? artifact.metadata.title : artifact.uid,
      description:
        typeof artifact.metadata.description === "string"
          ? artifact.metadata.description
          : `TAMV artifact ${artifact.uid}`,
      tags: Array.isArray(artifact.metadata.keywords)
        ? artifact.metadata.keywords
        : ["tamv", "open-science"],
      custom_fields: {
        tamv_uid: artifact.uid,
        git_hash: artifact.git_hash,
      },
    }),
    mapUploadResponse: mapFigshareReference,
  });
}

export const FigshareProvider = createFigshareProvider();
