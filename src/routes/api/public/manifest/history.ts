import { createFileRoute } from "@tanstack/react-router";
import { listManifestSnapshots } from "@/lib/integrations/manifest-snapshots";

export const Route = createFileRoute("/api/public/manifest/history")({
  server: {
    handlers: {
      GET: async () => {
        const snapshots = await listManifestSnapshots();
        return new Response(JSON.stringify({ snapshots }, null, 2), {
          status: 200,
          headers: {
            "Content-Type": "application/json; charset=utf-8",
            "Cache-Control": "no-store",
            "Access-Control-Allow-Origin": "*",
          },
        });
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
