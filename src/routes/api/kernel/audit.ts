import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { FigshareProvider } from "@/lib/kernel/providers/figshare";
import { ZenodoProvider } from "@/lib/kernel/providers/zenodo";
import { GitHubArtifactLedger, TAMVEngine } from "@/lib/kernel/registry";

const AuditRequestSchema = z
  .object({
    uid: z.string().min(1).max(256),
    providers: z
      .array(z.enum(["zenodo", "figshare"]))
      .min(1)
      .max(2)
      .default(["zenodo", "figshare"]),
  })
  .strict();

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`env_missing:${name}`);
  return value;
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
    source: "api:/kernel/audit",
  });
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  });
}

export const Route = createFileRoute("/api/kernel/audit")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const input = AuditRequestSchema.parse(await request.json());
          const engine = buildEngine();
          const result = await engine.auditAndHeal(input.uid, input.providers);
          return json(result);
        } catch (error) {
          return json(
            {
              error: "artifact_audit_failed",
              details: error instanceof Error ? error.message : String(error),
            },
            500,
          );
        }
      },
    },
  },
});
