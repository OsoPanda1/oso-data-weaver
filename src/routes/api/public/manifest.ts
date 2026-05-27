import { createFileRoute } from "@tanstack/react-router";
import { CONTRACT_VERSION, FEDERATIONS } from "@/lib/ecosystem/contracts";
import { REPOS } from "@/lib/ecosystem/manifest";

/**
 * Manifest público del ecosistema TAMV.
 * Cualquier repo del ecosistema puede hacer GET aquí como fuente de verdad
 * sin necesidad de añadir más nodos (sin SDK, sin gateway extra).
 */
export const Route = createFileRoute("/api/public/manifest")({
  server: {
    handlers: {
      GET: async () => {
        const body = {
          name: "tamv-core-kernel",
          contractVersion: CONTRACT_VERSION,
          generatedAt: new Date().toISOString(),
          federations: FEDERATIONS,
          repos: REPOS,
        };
        return new Response(JSON.stringify(body, null, 2), {
          status: 200,
          headers: {
            "Content-Type": "application/json; charset=utf-8",
            "Cache-Control": "public, max-age=300",
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
