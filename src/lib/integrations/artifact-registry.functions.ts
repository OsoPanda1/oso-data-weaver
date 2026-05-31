import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

import { FigshareProvider } from "@/lib/kernel/providers/figshare";
import { ZenodoProvider } from "@/lib/kernel/providers/zenodo";
import { GitHubArtifactLedger, TAMVArtifactSchema, TAMVEngine } from "@/lib/kernel/registry";

const ProviderNameSchema = z.enum(["zenodo", "figshare"]);

const ArtifactSyncInputSchema = z
  .object({
    artifact: TAMVArtifactSchema,
    providers: z.array(ProviderNameSchema).min(1).max(2).default(["zenodo", "figshare"]),
  })
  .strict();

const ArtifactAuditInputSchema = z
  .object({
    uid: z.string().min(1).max(256),
    providers: z.array(ProviderNameSchema).min(1).max(2).default(["zenodo", "figshare"]),
  })
  .strict();

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`env_missing:${name}`);
  return value;
}

function toSerializable(value: unknown): JsonValue {
  return JSON.parse(JSON.stringify(value));
}

function buildEngine(): TAMVEngine {
  const owner = process.env.TAMV_LEDGER_OWNER ?? "OsoPanda1";
  const repo = process.env.TAMV_LEDGER_REPO ?? "tamv-identity-ledger";
  return new TAMVEngine({
    ledger: new GitHubArtifactLedger({
      token: requiredEnv("GITHUB_TOKEN"),
      owner,
      repo,
      branch: process.env.TAMV_LEDGER_BRANCH,
      basePath: process.env.TAMV_LEDGER_REGISTRY_PATH ?? "registry",
    }),
    providers: [ZenodoProvider, FigshareProvider],
    repository: `${owner}/${repo}`,
    source: "tamv-artifact-registry",
  });
}

export const syncArtifactRegistry = createServerFn({ method: "POST" })
  .inputValidator((input) => ArtifactSyncInputSchema.parse(input))
  .handler(async ({ data }) => {
    const engine = buildEngine();
    const result = await engine.processArtifact(data.artifact, data.providers);
    return toSerializable(result);
  });

export const auditArtifactRegistry = createServerFn({ method: "POST" })
  .inputValidator((input) => ArtifactAuditInputSchema.parse(input))
  .handler(async ({ data }) => {
    const engine = buildEngine();
    const result = await engine.auditAndHeal(data.uid, data.providers);
    return toSerializable(result);
  });
