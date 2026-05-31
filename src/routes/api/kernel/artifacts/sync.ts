import { createFileRoute } from "@tanstack/react-router";

import { createDefaultTAMVEngine } from "../../../../../lib/kernel/artifact-runtime";
import { validateTAMVArtifact, type TAMVArtifact } from "../../../../../lib/kernel/registry";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}

export const Route = createFileRoute("/api/kernel/artifacts/sync")({
  server: {
    handlers: {
      OPTIONS: async () =>
        new Response(null, {
          status: 204,
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, Authorization",
          },
        }),
      POST: async ({ request }) => {
        let body: { artifact?: TAMVArtifact };
        try {
          body = (await request.json()) as { artifact?: TAMVArtifact };
        } catch {
          return jsonResponse({ error: "invalid_json" }, 400);
        }

        if (!body.artifact) return jsonResponse({ error: "missing_artifact" }, 400);

        try {
          const engine = createDefaultTAMVEngine();
          const artifact = validateTAMVArtifact(body.artifact);
          const result = await engine.processArtifact(artifact);
          return jsonResponse({ ok: true, artifact: result });
        } catch (error) {
          return jsonResponse(
            {
              ok: false,
              error: error instanceof Error ? error.message : String(error),
            },
            500,
          );
        }
      },
    },
  },
});
