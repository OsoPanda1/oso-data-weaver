import type { CanonicalEvent, CanonicalNode, EvidenceDoc } from "../canonical/types";
import type { KernelTrace } from "./state-machine";

/** Contrato operativo K: (I, C, P, S) → (R, E, T, A). */
export interface KernelInput {
  kind: "query" | "ingest";
  payload: unknown;
}

export interface KernelContext {
  federation: string;
  actorId: string;
  language?: string;
  flags?: Record<string, boolean>;
}

export interface KernelPolicy {
  id: string;
  description: string;
  evaluate: (subject: unknown, ctx: KernelContext) => PolicyDecision;
}

export interface PolicyDecision {
  policyId: string;
  decision: "ALLOW" | "DENY" | "PENDING";
  reason?: string;
}

export type ResponseStatus = "OK" | "INSUFFICIENT_EVIDENCE" | "BLOCKED" | "FAILED";

export interface KernelResponse<T = unknown> {
  status: ResponseStatus;
  traceId: string;
  data: T | null;
  evidence: EvidenceDoc[];
  decisions: PolicyDecision[];
  message?: string;
}

export interface KernelOutput<T = unknown> {
  R: KernelResponse<T>;
  E: EvidenceDoc[];
  T: KernelTrace[];
  A: AuditReport;
}

export interface AuditReport {
  traceId: string;
  startedAt: string;
  finishedAt: string;
  transitions: KernelTrace[];
  events: CanonicalEvent[];
  nodesTouched: string[];
  decisions: PolicyDecision[];
}

export type IngestResult = {
  nodes: CanonicalNode[];
  events: CanonicalEvent[];
};
