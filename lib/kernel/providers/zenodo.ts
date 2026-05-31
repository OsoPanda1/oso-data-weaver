import type { TAMVArtifact, TAMVArtifactProvider } from "../../../types/kernel";

export interface ZenodoDepositionResponse {
  id?: number;
  conceptrecid?: string;
  links?: Record<string, string>;
  metadata?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface ZenodoProviderOptions {
  accessToken?: string;
  baseUrl?: string;
  fetcher?: typeof fetch;
}

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.replace(/\/$/, "");
}

function toZenodoMetadata(artifact: TAMVArtifact): Record<string, unknown> {
  return {
    title: artifact.metadata.title ?? artifact.uid,
    description: artifact.metadata.description ?? `TAMV artifact ${artifact.uid}`,
    upload_type: "dataset",
    keywords: artifact.metadata.keywords,
    creators: artifact.metadata.authors?.map((author) => ({
      name: author.name,
      orcid: author.orcid,
      affiliation: author.affiliation,
    })),
    tamv_uid: artifact.uid,
    git_hash: artifact.git_hash,
  };
}

export function createZenodoProvider(
  options: ZenodoProviderOptions = {},
): TAMVArtifactProvider<ZenodoDepositionResponse> {
  const accessToken = options.accessToken ?? process.env.ZENODO_ACCESS_TOKEN;
  const baseUrl = normalizeBaseUrl(
    options.baseUrl ?? process.env.ZENODO_BASE_URL ?? "https://zenodo.org/api",
  );
  const fetcher = options.fetcher ?? fetch;

  return {
    name: "zenodo",
    async upload(artifact: TAMVArtifact): Promise<ZenodoDepositionResponse> {
      if (!accessToken) {
        throw new Error("ZENODO_ACCESS_TOKEN is required to upload TAMV artifacts to Zenodo.");
      }

      const response = await fetcher(`${baseUrl}/deposit/depositions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          metadata: toZenodoMetadata(artifact),
        }),
      });

      if (!response.ok) {
        const body = await response.text();
        throw new Error(`Zenodo upload failed with ${response.status}: ${body}`);
      }

      return (await response.json()) as ZenodoDepositionResponse;
    },
  };
}

export const zenodoProvider = createZenodoProvider();
