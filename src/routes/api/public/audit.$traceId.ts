import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { kernelAudit } from "@/lib/integrations/kernel.functions";

const ParamSchema = z.string().uuid();

export const Route = createFileRoute("/api/public/audit/$traceId")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const parsed = ParamSchema.safeParse(params.traceId);
        if (!parsed.success)
          return new Response(JSON.stringify({ error: "invalid_trace_id" }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        const out = await kernelAudit({ data: { traceId: parsed.data } });
        return new Response(JSON.stringify(out, null, 2), {
          status: out.found ? 200 : 404,
          headers: {
            "Content-Type": "application/json; charset=utf-8",
            "Access-Control-Allow-Origin": "*",
          },
        });
      },
    },
  },
});
