import { createFigshareProvider } from "./providers/figshare";
import { createZenodoProvider } from "./providers/zenodo";
import { createGitHubArtifactRegistryFromEnv } from "./github-ledger-client";
import {
  InMemoryTAMVArtifactRegistry,
  TAMVEngine,
  type TAMVAcademicProvider,
  type TAMVArtifactRegistry,
} from "./registry";

const memoryRegistry = new InMemoryTAMVArtifactRegistry();

export function createDefaultAcademicProviders(
  env: NodeJS.ProcessEnv = process.env,
): TAMVAcademicProvider[] {
  return [createZenodoProvider(env), createFigshareProvider(env)];
}

export function createDefaultArtifactRegistry(
  env: NodeJS.ProcessEnv = process.env,
): TAMVArtifactRegistry {
  if (env.GITHUB_LEDGER_TOKEN || env.GITHUB_TOKEN) return createGitHubArtifactRegistryFromEnv(env);
  return memoryRegistry;
}

export function createDefaultTAMVEngine(env: NodeJS.ProcessEnv = process.env): TAMVEngine {
  return new TAMVEngine({
    registry: createDefaultArtifactRegistry(env),
    providers: createDefaultAcademicProviders(env),
    repository: env.TAMV_REPOSITORY ?? "OsoPanda1/oso-data-weaver",
    maxAttempts: Number(env.TAMV_PROVIDER_MAX_ATTEMPTS ?? 3),
    baseDelayMs: Number(env.TAMV_PROVIDER_BASE_DELAY_MS ?? 500),
  });
}

export interface TAMVSelfAuditCronHandle {
  stop(): void;
}

export function startTAMVSelfAuditCron(
  engine = createDefaultTAMVEngine(),
  intervalMs = Number(process.env.TAMV_SELF_AUDIT_INTERVAL_MS ?? 15 * 60 * 1000),
): TAMVSelfAuditCronHandle {
  const timer = setInterval(() => {
    void engine.selfAudit().catch((error) => {
      console.error("TAMV self-audit cron failed", error);
    });
  }, intervalMs);
  if (typeof timer.unref === "function") timer.unref();
  return { stop: () => clearInterval(timer) };
}
