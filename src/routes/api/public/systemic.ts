import { createFileRoute } from "@tanstack/react-router";
import { FEDERATIONS } from "@/lib/ecosystem/contracts";
import { HE_HEXAGONS, HEP_DOMAINS } from "../../../../lib/contracts/elite-hehep";
import { kernelHealth } from "@/lib/integrations/kernel.functions";

/**
 * Mapeo sistémico ELITE HeHep + estado del kernel.
 * Permite escenarios "qué pasaría si…" desde consumidores externos.
 */
export const Route = createFileRoute("/api/public/systemic")({
  server: {
    handlers: {
      GET: async () => {
        const health = await kernelHealth();
        const body = {
          generatedAt: new Date().toISOString(),
          doctrine: "MD-X4",
          ecosystem: "ELITE HeHep",
          kernel: health,
          federations: Object.values(FEDERATIONS).map((f) => ({
            id: f.id,
            name: f.name,
            domain: f.domain,
            hexagon: f.hexagon,
            mission: f.mission,
          })),
          hexagons: Object.values(HE_HEXAGONS),
          hepDomains: Object.values(HEP_DOMAINS),
        };
        return new Response(JSON.stringify(body, null, 2), {
          status: 200,
          headers: {
            "Content-Type": "application/json; charset=utf-8",
            "Cache-Control": "public, max-age=60",
            "Access-Control-Allow-Origin": "*",
          },
        });
      },
    },
  },
});
