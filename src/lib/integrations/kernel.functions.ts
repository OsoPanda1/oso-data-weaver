/**
 * TAMV Kernel — Server Functions (capa de exposición Cap.6 de la spec).
 * Conectan la UI y los repos externos con el núcleo MD-X4.
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { tamvKernel, seedKernelIfEmpty } from "../../../lib/kernel/kernel";
import type { KernelContext } from "../../../lib/kernel/contract";
import type { NodeType } from "../../../lib/canonical/types";
import { readStoreConfig } from "../../../lib/memory/store-config";
import { pingNeo4j } from "../../../lib/memory/graph-neo4j";
import { pingQdrant } from "../../../lib/memory/vector-qdrant";

const ContextSchema = z
  .object({
    federation: z.string().min(1).max(64).default("central"),
    actorId: z.string().min(1).max(128).default("anon:web"),
    language: z.string().optional(),
  })
  .strict();

const QueryInput = z
  .object({
    query: z.string().min(1).max(2000),
    context: ContextSchema.optional(),
  })
  .strict();

const TraceInput = z.object({ traceId: z.string().uuid() }).strict();

const IngestInput = z
  .object({
    nodes: z
      .array(
        z
          .object({
            id: z.string().min(1).max(256),
            type: z.string().min(1) as z.ZodType<NodeType>,
            title: z.string().min(1).max(512),
            body: z.string().max(50_000).optional(),
            tags: z.array(z.string().min(1).max(64)).max(64).default([]),
            source: z.string().min(1).max(256).default("api:ingest"),
            ontologyClass: z.string().min(1).max(128).default("tamv.external"),
          })
          .strict(),
      )
      .min(1)
      .max(100),
    context: ContextSchema.optional(),
  })
  .strict();

function ctx(input?: {
  federation?: string;
  actorId?: string;
  language?: string;
}): KernelContext {
  return {
    federation: input?.federation ?? "central",
    actorId: input?.actorId ?? "anon:web",
    language: input?.language,
  };
}

export const kernelHealth = createServerFn({ method: "GET" }).handler(
  async () => {
    seedKernelIfEmpty();
    return tamvKernel.health();
  },
);

export const kernelEvents = createServerFn({ method: "GET" }).handler(
  async () => {
    seedKernelIfEmpty();
    return tamvKernel.recentEvents(100);
  },
);

export const kernelStores = createServerFn({ method: "GET" }).handler(
  async () => {
    const cfg = readStoreConfig();
    const [neo4j, qdrant] = await Promise.all([pingNeo4j(), pingQdrant()]);
    return { config: cfg, probes: { neo4j, qdrant } };
  },
);

export const kernelQuery = createServerFn({ method: "POST" })
  .inputValidator((input) => QueryInput.parse(input))
  .handler(async ({ data }) => {
    seedKernelIfEmpty();
    return tamvKernel.handleQuery(data.query, ctx(data.context));
  });

export const kernelIngest = createServerFn({ method: "POST" })
  .inputValidator((input) => IngestInput.parse(input))
  .handler(async ({ data }) => {
    seedKernelIfEmpty();
    const now = new Date().toISOString();
    const rawNodes = data.nodes.map((n) => ({
      id: n.id,
      type: n.type,
      title: n.title,
      body: n.body,
      metadata: { createdAt: now, updatedAt: now, source: n.source },
      semantic: {
        ontologyClass: n.ontologyClass,
        tags: n.tags,
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
    return tamvKernel.ingest(rawNodes, ctx(data.context));
  });

export const kernelAudit = createServerFn({ method: "POST" })
  .inputValidator((input) => TraceInput.parse(input))
  .handler(async ({ data }) => {
    seedKernelIfEmpty();
    const report = tamvKernel.auditSession(data.traceId);
    if (!report) return { found: false, report: null };
    return { found: true, report };
  });
