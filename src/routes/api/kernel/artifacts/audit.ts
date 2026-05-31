import { createFileRoute } from "@tanstack/react-router";

import { createDefaultTAMVEngine } from "../../../../../lib/kernel/artifact-runtime";

export const Route = createFileRoute("/api/kernel/artifacts/audit")({
  server: {
    handlers: {
      POST: async () => {
        try {
          const engine = createDefaultTAMVEngine();
          const report = await engine.selfAudit();
          return new Response(JSON.stringify({ ok: true, report }, null, 2), {
            status: 200,
            headers: {
              "Content-Type": "application/json; charset=utf-8",
              "Access-Control-Allow-Origin": "*",
            },
          });
        } catch (error) {
          return new Response(
            JSON.stringify(
              { ok: false, error: error instanceof Error ? error.message : String(error) },
              null,
              2,
            ),
            {
              status: 500,
              headers: {
                "Content-Type": "application/json; charset=utf-8",
                "Access-Control-Allow-Origin": "*",
              },
            },
          );
        }
      },
    },
  },
});
