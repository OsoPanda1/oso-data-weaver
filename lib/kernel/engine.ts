import { emitEliteBookPiEvent as emitBookPiEvent } from "../contracts/bookpi-emitter";
import type { BookPiTransport, EliteHeHepEvent } from "../contracts/bookpi";
import type { HeHepContext } from "../contracts/elite-hehep";
import type { TAMVArtifact, TAMVArtifactProvider } from "../../types/kernel";
import {
  TAMVKernelRegistry,
  type LedgerUpdateResult,
  type OctokitLike,
  type TAMVRegistryOptions,
} from "./registry";

export interface TAMVEngineOptions {
  registry?: TAMVKernelRegistry;
  registryOptions?: TAMVRegistryOptions;
  bookPiTransport?: BookPiTransport<TAMVSyncEventPayload, TAMVSyncEventMeta>;
}

export interface TAMVSyncEventPayload {
  artifact: TAMVArtifact;
  provider: string;
  providerResponse?: unknown;
  ledger?: LedgerUpdateResult;
  error?: {
    message: string;
    name?: string;
  };
}

export interface TAMVSyncEventMeta {
  engine: "TAMVEngine";
  stage: "sync" | "error";
}

export interface TAMVSyncResult {
  artifact: TAMVArtifact;
  providerResponse: unknown;
  ledger: LedgerUpdateResult;
  event: EliteHeHepEvent<TAMVSyncEventPayload, TAMVSyncEventMeta>;
}

const BOOKPI_CONTEXT: HeHepContext = {
  hexagon: "HE-Publish",
  domain: "HEP-1",
};

function toErrorPayload(error: unknown): { message: string; name?: string } {
  if (error instanceof Error) {
    return {
      message: error.message,
      name: error.name,
    };
  }

  return {
    message: String(error),
  };
}

export class TAMVEngine {
  private readonly registry: TAMVKernelRegistry;
  private readonly bookPiTransport?: BookPiTransport<TAMVSyncEventPayload, TAMVSyncEventMeta>;

  constructor(octokit: OctokitLike, options: TAMVEngineOptions = {}) {
    this.registry = options.registry ?? new TAMVKernelRegistry(octokit, options.registryOptions);
    this.bookPiTransport = options.bookPiTransport;
  }

  async sync(artifact: TAMVArtifact, provider: TAMVArtifactProvider): Promise<TAMVSyncResult> {
    try {
      const providerResponse = await provider.upload(artifact);
      const syncedArtifact: TAMVArtifact = {
        ...artifact,
        providers: {
          ...artifact.providers,
          [provider.name]: {
            provider: provider.name,
            syncedAt: new Date().toISOString(),
            response: providerResponse,
          },
        },
        state: "SYNCED",
      };

      const ledger = await this.registry.updateLedger(syncedArtifact);
      const event = await emitBookPiEvent<TAMVSyncEventPayload, TAMVSyncEventMeta>({
        protocol: "tamv.kernel.sync.v1",
        type: "ArtifactSynced",
        source: "tamv-core-kernel",
        repository: "OsoPanda1/oso-data-weaver",
        context: BOOKPI_CONTEXT,
        transport: this.bookPiTransport,
        payload: {
          artifact: syncedArtifact,
          provider: provider.name,
          providerResponse,
          ledger,
        },
        meta: {
          engine: "TAMVEngine",
          stage: "sync",
        },
      });

      return {
        artifact: syncedArtifact,
        providerResponse,
        ledger,
        event,
      };
    } catch (error) {
      const failedArtifact: TAMVArtifact = {
        ...artifact,
        state: "ERROR",
      };
      await emitBookPiEvent<TAMVSyncEventPayload, TAMVSyncEventMeta>({
        protocol: "tamv.kernel.sync.v1",
        type: "SyncError",
        source: "tamv-core-kernel",
        repository: "OsoPanda1/oso-data-weaver",
        context: BOOKPI_CONTEXT,
        transport: this.bookPiTransport,
        payload: {
          artifact: failedArtifact,
          provider: provider.name,
          error: toErrorPayload(error),
        },
        meta: {
          engine: "TAMVEngine",
          stage: "error",
        },
      });
      throw error;
    }
  }
}
