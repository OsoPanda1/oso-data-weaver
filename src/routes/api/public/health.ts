import { createFileRoute } from "@tanstack/react-router";
import { kernelHealth } from "@/lib/integrations/kernel.functions";

export const Route = createFileRoute("/api/public/health")({
  server: {
    handlers: {
      GET: async () => {
        const health = await kernelHealth();
        return new Response(JSON.stringify(health, null, 2), {
          status: 200,
          headers: {
            "Content-Type": "application/json; charset=utf-8",
            "Cache-Control": "no-store",
            "Access-Control-Allow-Origin": "*",
          },
        });
      },
    },
  },
});
