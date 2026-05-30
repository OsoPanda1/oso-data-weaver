/** Estados discretos del Kernel TAMV. */
export type KernelState =
  | "IDLE"
  | "INGESTING"
  | "CANONICALIZING"
  | "RETRIEVING"
  | "VALIDATING"
  | "RESPONDING"
  | "AUDITING"
  | "FAILED";

const TRANSITIONS: Record<KernelState, KernelState[]> = {
  IDLE: ["INGESTING", "RETRIEVING", "AUDITING", "FAILED"],
  INGESTING: ["CANONICALIZING", "FAILED"],
  CANONICALIZING: ["VALIDATING", "RETRIEVING", "FAILED"],
  RETRIEVING: ["VALIDATING", "FAILED"],
  VALIDATING: ["RESPONDING", "AUDITING", "FAILED"],
  RESPONDING: ["AUDITING", "FAILED"],
  AUDITING: ["IDLE", "FAILED"],
  FAILED: ["IDLE"],
};

export function canTransition(from: KernelState, to: KernelState): boolean {
  return TRANSITIONS[from]?.includes(to) ?? false;
}

export interface KernelTrace {
  ts: string;
  from: KernelState;
  to: KernelState;
  traceId: string;
  reason?: string;
  meta?: Record<string, unknown>;
}
