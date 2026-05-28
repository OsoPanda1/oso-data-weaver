import { createFileRoute } from "@tanstack/react-router";
import { buildEnrichedManifest } from "@/lib/integrations/ecosystem.functions";

/**
 * Manifest público enriquecido del ecosistema TAMV.
 * Fuente única de verdad consumible por cualquier repo del ecosistema,
 * con telemetría viva de GitHub + estado de identidad académica.
 */
export const Route = createFileRoute("/api/public/manifest")({
  server: {
    handlers: {
      GET: async () => {
        try {
          const body = await buildEnrichedManifest();
          return new Response(JSON.stringify(body, null, 2), {
            status: 200,
            headers: {
              "Content-Type": "application/json; charset=utf-8",
              "Cache-Control": "public, max-age=120",
              "Access-Control-Allow-Origin": "*",
            },
          });
        } catch (err) {
          return new Response(
            JSON.stringify({
              error: "manifest_build_failed",
              message: err instanceof Error ? err.message : String(err),
            }),
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
      OPTIONS: async () =>
        new Response(null, {
          status: 204,
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type",
          },
        }),
    },
  },
});
