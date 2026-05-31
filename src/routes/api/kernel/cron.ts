import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { FigshareProvider } from "@/lib/kernel/providers/figshare";
import { ZenodoProvider } from "@/lib/kernel/providers/zenodo";
import { GitHubArtifactLedger, TAMVEngine } from "@/lib/kernel/registry";

const CronRequestSchema = z
  .object({
    uids: z.array(z.string().min(1).max(256)).max(100).optional(),
    providers: z
      .array(z.enum(["zenodo", "figshare"]))
      .min(1)
      .max(2)
      .default(["zenodo", "figshare"]),
  })
  .strict()
  .default({ providers: ["zenodo", "figshare"] });

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`env_missing:${name}`);
  return value;
}

function envUids(): string[] | undefined {
  const raw = process.env.TAMV_AUDIT_ARTIFACT_UIDS;
  if (!raw) return undefined;
  return raw
    .split(",")
    .map((uid) => uid.trim())
    .filter(Boolean);
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
    source: "cron:/kernel/artifact-audit",
  });
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  });
}

export const Route = createFileRoute("/api/kernel/cron")({
  server: {
    handlers: {
      GET: async () => {
        try {
          const engine = buildEngine();
          const result = await engine.auditAll(["zenodo", "figshare"], envUids());
          return json(result);
        } catch (error) {
          return json(
            {
              error: "artifact_cron_failed",
              details: error instanceof Error ? error.message : String(error),
            },
            500,
          );
        }
      },
      POST: async ({ request }) => {
        try {
          const input = CronRequestSchema.parse(await request.json());
          const engine = buildEngine();
          const result = await engine.auditAll(input.providers, input.uids ?? envUids());
          return json(result);
        } catch (error) {
          return json(
            {
              error: "artifact_cron_failed",
              details: error instanceof Error ? error.message : String(error),
            },
            500,
          );
        }
      },
    },
  },
});
