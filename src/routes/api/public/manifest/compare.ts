import { createFileRoute } from "@tanstack/react-router";
import { diffManifestSnapshots, readManifestSnapshot } from "@/lib/integrations/manifest-snapshots";

export const Route = createFileRoute("/api/public/manifest/compare")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const beforeId = url.searchParams.get("before");
        const afterId = url.searchParams.get("after");
        if (!beforeId || !afterId) {
          return new Response(JSON.stringify({ error: "missing_before_or_after" }), {
            status: 400,
            headers: { "Content-Type": "application/json; charset=utf-8", "Access-Control-Allow-Origin": "*" },
          });
        }
        const before = await readManifestSnapshot(beforeId);
        const after = await readManifestSnapshot(afterId);
        return new Response(JSON.stringify(diffManifestSnapshots(before, after), null, 2), {
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
