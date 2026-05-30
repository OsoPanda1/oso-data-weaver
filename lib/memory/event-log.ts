import type { CanonicalEvent } from "../canonical/types";
import { validateEventChain } from "../canonical/invariants";
import { eventHash } from "../canonical/hash";

/** Event log append-only con cadena prevHash verificable. */
const log: CanonicalEvent[] = [];

export function appendEvent(
  partial: Omit<CanonicalEvent, "eventHash" | "signature" | "prevHash">,
  signature = "unsigned-dev",
): CanonicalEvent {
  const prev = log[log.length - 1];
  const prevHash = prev?.eventHash ?? "GENESIS";
  const base = { ...partial, prevHash };
  const hash = eventHash(base);
  const event: CanonicalEvent = { ...base, eventHash: hash, signature };
  const violations = validateEventChain(prev, event);
  if (violations.length) {
    throw new Error(
      `Event chain violation: ${violations.map((v) => v.code).join(",")}`,
    );
  }
  log.push(event);
  return event;
}

export function listEvents(limit = 200): CanonicalEvent[] {
  return log.slice(-limit).reverse();
}

export function eventCount(): number {
  return log.length;
}

export function verifyChain(): { ok: boolean; brokenAt?: number } {
  for (let i = 0; i < log.length; i++) {
    const violations = validateEventChain(log[i - 1], log[i]);
    if (violations.length) return { ok: false, brokenAt: i };
  }
  return { ok: true };
}

export function findEventsByTrace(traceId: string): CanonicalEvent[] {
  return log.filter(
    (e) => (e.payload as { traceId?: string } | null)?.traceId === traceId,
  );
}
