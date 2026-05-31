import type { CanonicalEvent } from "../canonical/types";
import { validateEventChain } from "../canonical/invariants";
import { eventHash } from "../canonical/hash";
import { signEvent, verifyEventSignature } from "../canonical/signature";

/** Event log append-only con cadena prevHash + firma HMAC verificable. */
const log: CanonicalEvent[] = [];

export function appendEvent(
  partial: Omit<CanonicalEvent, "eventHash" | "signature" | "prevHash">,
): CanonicalEvent {
  const prev = log[log.length - 1];
  const prevHash = prev?.eventHash ?? "GENESIS";
  const base = { ...partial, prevHash };
  const hash = eventHash(base);
  const signature = signEvent(hash, partial.actorId);
  const event: CanonicalEvent = { ...base, eventHash: hash, signature };

  // Verificación dura antes de persistir.
  const violations = validateEventChain(prev, event);
  if (violations.length) {
    throw new Error(
      `Event chain violation: ${violations.map((v) => v.code).join(",")}`,
    );
  }
  if (!verifyEventSignature(event.eventHash, event.actorId, event.signature)) {
    throw new Error("SIGNATURE_VERIFICATION_FAILED");
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

export function verifyChain(): {
  ok: boolean;
  brokenAt?: number;
  reason?: string;
} {
  for (let i = 0; i < log.length; i++) {
    const violations = validateEventChain(log[i - 1], log[i]);
    if (violations.length)
      return { ok: false, brokenAt: i, reason: violations[0].code };
    if (
      !verifyEventSignature(log[i].eventHash, log[i].actorId, log[i].signature)
    )
      return { ok: false, brokenAt: i, reason: "BAD_SIGNATURE" };
  }
  return { ok: true };
}

export function findEventsByTrace(traceId: string): CanonicalEvent[] {
  return log.filter(
    (e) => (e.payload as { traceId?: string } | null)?.traceId === traceId,
  );
}
