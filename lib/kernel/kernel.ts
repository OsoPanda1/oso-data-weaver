/**
 * TamvKernel — Núcleo MD-X4.
 * Orquesta: ingesta → canonización → retrieval → validación → síntesis → auditoría.
 * Principio RAG estricto: sin evidencia, sin respuesta.
 */

import { randomUUID } from "node:crypto";
import type {
  AuditReport,
  IngestResult,
  KernelContext,
  KernelOutput,
  KernelPolicy,
  KernelResponse,
} from "./contract";
import { canTransition, type KernelState, type KernelTrace } from "./state-machine";
import { upsertNode, integrityReport, nodeCount } from "../memory/graph-store";
import {
  appendEvent,
  eventCount,
  findEventsByTrace,
  listEvents,
  verifyChain,
} from "../memory/event-log";
import { buildDossier } from "../retrieval/dossier-builder";
import { synthesize } from "../retrieval/synthesizer";
import { DEFAULT_POLICIES, evaluateAll, isDenied } from "../governance/policy-engine";
import type { CanonicalNode, NodeType } from "../canonical/types";

class Kernel {
  private state: KernelState = "IDLE";
  private traces: KernelTrace[] = [];

  getState(): KernelState {
    return this.state;
  }

  private transition(to: KernelState, traceId: string, reason?: string) {
    if (!canTransition(this.state, to)) {
      const trace: KernelTrace = {
        ts: new Date().toISOString(),
        from: this.state,
        to: "FAILED",
        traceId,
        reason: `invalid_transition_${this.state}_${to}`,
      };
      this.traces.push(trace);
      this.state = "FAILED";
      return;
    }
    const trace: KernelTrace = {
      ts: new Date().toISOString(),
      from: this.state,
      to,
      traceId,
      reason,
    };
    this.traces.push(trace);
    this.state = to;
  }

  emitTrace(info: Partial<KernelTrace> & { traceId: string }) {
    this.traces.push({
      ts: new Date().toISOString(),
      from: this.state,
      to: this.state,
      ...info,
    } as KernelTrace);
  }

  ingest(
    rawNodes: Array<
      Omit<CanonicalNode, "canonicalHash" | "identityHash" | "versionHash">
    >,
    ctx: KernelContext,
  ): IngestResult & { traceId: string; transitions: KernelTrace[] } {
    const traceId = randomUUID();
    const startTraces = this.traces.length;
    this.transition("INGESTING", traceId, `actor:${ctx.actorId}`);
    const nodes: CanonicalNode[] = [];
    const events = [];
    this.transition("CANONICALIZING", traceId);
    for (const raw of rawNodes) {
      const res = upsertNode(raw);
      nodes.push(res.node);
      const ev = appendEvent({
        eventId: randomUUID(),
        eventType: res.created ? "NODE_CREATED" : "NODE_UPDATED",
        timestamp: new Date().toISOString(),
        actorId: ctx.actorId,
        nodeId: res.node.id,
        payload: { traceId, violations: res.violations },
      });
      events.push(ev);
    }
    this.transition("AUDITING", traceId);
    this.transition("IDLE", traceId);
    return {
      nodes,
      events,
      traceId,
      transitions: this.traces.slice(startTraces),
    };
  }

  handleQuery(
    query: string,
    ctx: KernelContext,
    policies: KernelPolicy[] = DEFAULT_POLICIES,
  ): KernelOutput<{ text: string; citations: string[] }> {
    const traceId = randomUUID();
    const startedAt = new Date().toISOString();
    const startTraces = this.traces.length;

    this.transition("RETRIEVING", traceId, `query:${query.slice(0, 80)}`);
    const dossier = buildDossier(query);

    this.transition("VALIDATING", traceId);
    const decisions = evaluateAll(policies, { query, dossier }, ctx);
    const denied = isDenied(decisions);

    let response: KernelResponse<{ text: string; citations: string[] }>;
    if (denied) {
      this.transition("FAILED", traceId, denied.reason);
      response = {
        status: "BLOCKED",
        traceId,
        data: null,
        evidence: dossier.docs,
        decisions,
        message: `Policy ${denied.policyId} denied: ${denied.reason ?? "unspecified"}`,
      };
    } else if (!dossier.hasEvidence) {
      this.transition("RESPONDING", traceId, "insufficient_evidence");
      const synth = synthesize(dossier);
      response = {
        status: "INSUFFICIENT_EVIDENCE",
        traceId,
        data: synth,
        evidence: [],
        decisions,
      };
    } else {
      this.transition("RESPONDING", traceId);
      const synth = synthesize(dossier);
      response = {
        status: "OK",
        traceId,
        data: synth,
        evidence: dossier.docs,
        decisions,
      };
    }

    const policyEv = appendEvent({
      eventId: randomUUID(),
      eventType: "POLICY_EVALUATED",
      timestamp: new Date().toISOString(),
      actorId: ctx.actorId,
      payload: { traceId, decisions, query },
    });

    this.transition("AUDITING", traceId);
    if (this.state !== "FAILED") this.transition("IDLE", traceId);
    else this.transition("IDLE", traceId);

    const transitions = this.traces.slice(startTraces);
    const audit: AuditReport = {
      traceId,
      startedAt,
      finishedAt: new Date().toISOString(),
      transitions,
      events: [policyEv],
      nodesTouched: dossier.docs.map((d) => d.nodeId),
      decisions,
    };
    return { R: response, E: dossier.docs, T: transitions, A: audit };
  }

  auditSession(traceId: string): AuditReport | null {
    const transitions = this.traces.filter((t) => t.traceId === traceId);
    const events = findEventsByTrace(traceId);
    if (!transitions.length && !events.length) return null;
    return {
      traceId,
      startedAt: transitions[0]?.ts ?? events[0]?.timestamp ?? "",
      finishedAt:
        transitions[transitions.length - 1]?.ts ??
        events[events.length - 1]?.timestamp ??
        "",
      transitions,
      events,
      nodesTouched: events.map((e) => e.nodeId).filter((x): x is string => !!x),
      decisions: [],
    };
  }

  health() {
    const chain = verifyChain();
    const integrity = integrityReport();
    return {
      state: this.state,
      nodes: nodeCount(),
      events: eventCount(),
      chainOk: chain.ok,
      chainBrokenAt: chain.brokenAt,
      integrity,
      lastTraces: this.traces.slice(-10),
    };
  }

  recentEvents(limit = 50) {
    return listEvents(limit);
  }
}

/** Singleton por Worker. Estado en memoria — perfecto para preview/dev. */
export const tamvKernel = new Kernel();

/** Seed mínima para que retrieval no esté vacío en arranque limpio. */
export function seedKernelIfEmpty() {
  if (nodeCount() > 0) return;
  const baseTs = new Date().toISOString();
  const makeRaw = (
    id: string,
    type: NodeType,
    title: string,
    body: string,
    tags: string[],
  ) =>
    ({
      id,
      type,
      title,
      body,
      metadata: {
        createdAt: baseTs,
        updatedAt: baseTs,
        source: "tamv-core-kernel:seed",
        license: "CC-BY-4.0",
      },
      semantic: {
        ontologyClass: "tamv.core",
        tags,
        language: "es",
        scope: "core" as const,
      },
      relations: [],
      dependencies: [],
      lineage: [],
      state: {
        integrity: "VALID" as const,
        constitutional: "APPROVED" as const,
        synchronization: "SYNCED" as const,
        operational: "ACTIVE" as const,
      },
    }) satisfies Omit<CanonicalNode, "canonicalHash" | "identityHash" | "versionHash">;

  const ctx: KernelContext = { federation: "central", actorId: "seed:bootstrap" };
  tamvKernel.ingest(
    [
      makeRaw(
        "root:tamv",
        "ROOT",
        "TAMV Core Kernel",
        "Núcleo MD-X4 del ecosistema heptafederado. Implementa contratos, BookPI y router federado.",
        ["mdx4", "kernel", "heptafederacion"],
      ),
      makeRaw(
        "protocol:bookpi",
        "PROTOCOL",
        "BookPI",
        "Ledger de eventos con cadena prevHash, contexto ELITE HeHep e integridad SHA-256 verificable.",
        ["bookpi", "ledger", "event-sourcing"],
      ),
      makeRaw(
        "protocol:eoct",
        "PROTOCOL",
        "EOCT — Ethical Open Computing and Technology",
        "Marco ético: dignidad, equidad, privacidad, consentimiento informado y gobernanza auditable.",
        ["eoct", "etica", "gobernanza"],
      ),
      makeRaw(
        "federation:heptafederacion",
        "FEDERATION",
        "Heptafederación MD-X4",
        "Siete dominios HEP-1..HEP-7 atravesados por seis pipelines HE-Ingest..HE-Identity.",
        ["heptafederacion", "mdx4", "elite-hehep"],
      ),
      makeRaw(
        "policy:rag-estricto",
        "POLICY",
        "RAG estricto",
        "El kernel rechaza fabricar contenido sin evidencia primaria. Sin dossier, devuelve INSUFFICIENT_EVIDENCE.",
        ["rag", "policy", "trazabilidad"],
      ),
    ],
    ctx,
  );
}
