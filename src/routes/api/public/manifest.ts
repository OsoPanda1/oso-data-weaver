import { createFileRoute } from "@tanstack/react-router";
import { buildEnrichedManifest } from "@/lib/integrations/ecosystem.functions";
import { saveManifestSnapshot } from "@/lib/integrations/manifest-snapshots";

/**
 * Manifest publico enriquecido del ecosistema TAMV.
 * Fuente unica de verdad consumible por cualquier repo del ecosistema,
 * con telemetria viva de GitHub + estado de identidad academica.
 */
export const Route = createFileRoute("/api/public/manifest")({
  server: {
    handlers: {
      GET: async () => {
        try {
          const body = await buildEnrichedManifest();
          const snapshot = await saveManifestSnapshot(body);
          return new Response(JSON.stringify({ ...body, snapshot }, null, 2), {
            status: 200,
            headers: {
              "Content-Type": "application/json; charset=utf-8",
              "Cache-Control": "public, max-age=120",
              "Access-Control-Allow-Origin": "*",
              "X-TAMV-Manifest-Snapshot": snapshot.id,
              "X-TAMV-Manifest-SHA256": snapshot.sha256,
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
