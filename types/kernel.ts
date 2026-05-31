export const TAMV_ARTIFACT_STATES = ["INITIALIZED", "SYNCED", "PUBLISHED", "ERROR"] as const;

export type TAMVArtifactState = (typeof TAMV_ARTIFACT_STATES)[number];

export enum TAMVArtifactStateEnum {
  INITIALIZED = "INITIALIZED",
  SYNCED = "SYNCED",
  PUBLISHED = "PUBLISHED",
  ERROR = "ERROR",
}

export interface TAMVArtifactMetadata {
  title?: string;
  description?: string;
  keywords?: string[];
  authors?: Array<{
    name: string;
    orcid?: string;
    affiliation?: string;
  }>;
  [key: string]: unknown;
}

export interface TAMVProviderReceipt {
  provider: string;
  syncedAt: string;
  response: unknown;
}

export interface TAMVArtifact {
  uid: string;
  git_hash: string;
  metadata: TAMVArtifactMetadata;
  providers: Record<string, TAMVProviderReceipt | unknown>;
  state: TAMVArtifactState;
}

export interface TAMVArtifactProvider<TResponse = unknown> {
  name: string;
  upload: (artifact: TAMVArtifact) => Promise<TResponse>;
}
