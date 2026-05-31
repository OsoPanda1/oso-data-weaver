/**
 * POST /api/public/query
 * Traduce una consulta en lenguaje natural a recuperación grafo/vector,
 * aplica políticas (anti-replay, rate-limit, constitucional MD-X4 / EOCT)
 * y devuelve EvidenceDoc ordenado por score con la decisión auditada.
 */

import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { tamvKernel, seedKernelIfEmpty } from "../../../../lib/kernel/kernel";

const Schema = z.object({
  query: z.string().min(1).max(2000),
  actorId: z.string().min(1).max(128).default("anon:public-query"),
  federation: z.string().min(1).max(64).default("central"),
  language: z.string().min(2).max(8).optional(),
});

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

export const Route = createFileRoute("/api/public/query")({
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
        seedKernelIfEmpty();
        let raw: unknown;
        try {
          raw = await request.json();
        } catch {
          return jsonResponse({ error: "invalid_json" }, 400);
        }
        const parsed = Schema.safeParse(raw);
        if (!parsed.success)
          return jsonResponse(
            { error: "validation_failed", issues: parsed.error.issues },
            400,
          );

        const { query, actorId, federation, language } = parsed.data;
        const out = tamvKernel.handleQuery(query, {
          actorId,
          federation,
          language,
        });

        const statusCode =
          out.R.status === "OK"
            ? 200
            : out.R.status === "INSUFFICIENT_EVIDENCE"
              ? 200
              : out.R.status === "BLOCKED"
                ? 403
                : 500;

        return jsonResponse(
          {
            traceId: out.R.traceId,
            status: out.R.status,
            answer: out.R.data?.text ?? null,
            citations: out.R.data?.citations ?? [],
            evidence: out.E.map((e) => ({
              nodeId: e.nodeId,
              title: e.title,
              excerpt: e.excerpt,
              score: e.score,
              source: e.source,
              sha256: e.citation.sha256,
            })),
            decisions: out.R.decisions,
            transitions: out.T.map((t) => ({ from: t.from, to: t.to })),
          },
          statusCode,
        );
      },
    },
  },
});
