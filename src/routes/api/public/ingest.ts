/**
 * POST /api/public/ingest
 * Convierte documentos crudos en CanonicalNode y emite CanonicalEvent
 * con prevHash + eventHash + firma HMAC. Devuelve traceId y resumen.
 *
 * Body:
 *  {
 *    actorId?: string,
 *    federation?: string,
 *    documents: Array<{
 *      id: string,
 *      title: string,
 *      body?: string,
 *      type?: NodeType,                // default "DOCUMENT"
 *      source?: string,                // default "api:public/ingest"
 *      tags?: string[],
 *      ontologyClass?: string,
 *    }>
 *  }
 */

import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { tamvKernel, seedKernelIfEmpty } from "../../../../lib/kernel/kernel";
import { mirrorNodeToNeo4j } from "../../../../lib/memory/graph-neo4j";
import type {
  CanonicalNode,
  NodeType,
} from "../../../../lib/canonical/types";

const NODE_TYPES = [
  "ROOT",
  "DOCUMENT",
  "REPOSITORY",
  "PROTOCOL",
  "SKILL",
  "PERSONA",
  "MODEL",
  "POLICY",
  "EVENT",
  "PIPELINE",
  "FEDERATION",
  "EDGE_ENTITY",
] as const;

const Schema = z.object({
  actorId: z.string().min(1).max(128).default("anon:public-ingest"),
  federation: z.string().min(1).max(64).default("central"),
  documents: z
    .array(
      z.object({
        id: z.string().min(1).max(256).regex(/^[A-Za-z0-9._:\-/]+$/),
        title: z.string().min(1).max(512),
        body: z.string().max(50_000).optional(),
        type: z.enum(NODE_TYPES).default("DOCUMENT"),
        source: z.string().min(1).max(256).default("api:public/ingest"),
        tags: z.array(z.string().min(1).max(64)).max(64).default([]),
        ontologyClass: z.string().min(1).max(128).default("tamv.external"),
      }),
    )
    .min(1)
    .max(100),
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

export const Route = createFileRoute("/api/public/ingest")({
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
        const { actorId, federation, documents } = parsed.data;
        const now = new Date().toISOString();

        const rawNodes: Array<
          Omit<CanonicalNode, "canonicalHash" | "identityHash" | "versionHash">
        > = documents.map((d) => ({
          id: d.id,
          type: d.type as NodeType,
          title: d.title,
          body: d.body,
          metadata: { createdAt: now, updatedAt: now, source: d.source },
          semantic: {
            ontologyClass: d.ontologyClass,
            tags: d.tags,
            language: "es",
            scope: "extended" as const,
          },
          relations: [],
          dependencies: [],
          lineage: [],
          state: {
            integrity: "VALID" as const,
            constitutional: "PENDING" as const,
            synchronization: "SYNCED" as const,
            operational: "ACTIVE" as const,
          },
        }));

        const result = tamvKernel.ingest(rawNodes, { federation, actorId });

        // Best-effort mirror externo. No bloquea la respuesta del kernel.
        const mirrored = await Promise.all(
          result.nodes.map((n) => mirrorNodeToNeo4j(n).catch(() => false)),
        );

        return jsonResponse({
          traceId: result.traceId,
          ingested: result.nodes.length,
          events: result.events.map((e) => ({
            eventId: e.eventId,
            eventType: e.eventType,
            eventHash: e.eventHash,
            prevHash: e.prevHash,
            signature: e.signature,
            nodeId: e.nodeId,
          })),
          transitions: result.transitions.map((t) => ({
            from: t.from,
            to: t.to,
            ts: t.ts,
          })),
          mirrors: { neo4j: mirrored.filter(Boolean).length },
        });
      },
    },
  },
});
