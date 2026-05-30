import type { KernelContext, KernelPolicy, PolicyDecision } from "../kernel/contract";

const seenEvents = new Set<string>();
const rateBuckets = new Map<string, number[]>();

/** Política: anti-replay por eventId. */
export const antiReplay: KernelPolicy = {
  id: "anti-replay",
  description: "Rechaza eventos con eventId ya procesado.",
  evaluate(subject) {
    const id = (subject as { eventId?: string })?.eventId;
    if (!id) return { policyId: "anti-replay", decision: "ALLOW" };
    if (seenEvents.has(id))
      return { policyId: "anti-replay", decision: "DENY", reason: "replay" };
    seenEvents.add(id);
    return { policyId: "anti-replay", decision: "ALLOW" };
  },
};

/** Política: rate limit por actor (60 req / 60s). */
export const rateLimit: KernelPolicy = {
  id: "rate-limit",
  description: "Máximo 60 solicitudes por minuto por actor.",
  evaluate(_subject, ctx) {
    const now = Date.now();
    const bucket = rateBuckets.get(ctx.actorId) ?? [];
    const fresh = bucket.filter((t) => now - t < 60_000);
    fresh.push(now);
    rateBuckets.set(ctx.actorId, fresh);
    if (fresh.length > 60)
      return { policyId: "rate-limit", decision: "DENY", reason: "rate_exceeded" };
    return { policyId: "rate-limit", decision: "ALLOW" };
  },
};

/** Política constitucional: bloquea términos vetados doctrina MD-X4. */
const FORBIDDEN = ["dao sin custodio", "manipulación cognitiva", "extracción no consentida"];
export const constitutional: KernelPolicy = {
  id: "constitutional",
  description: "Veta patrones que violan IsabellaCoreProtocol y MD-X4.",
  evaluate(subject) {
    const text = JSON.stringify(subject).toLowerCase();
    const hit = FORBIDDEN.find((p) => text.includes(p));
    if (hit)
      return {
        policyId: "constitutional",
        decision: "DENY",
        reason: `pattern:${hit}`,
      };
    return { policyId: "constitutional", decision: "ALLOW" };
  },
};

export const DEFAULT_POLICIES: KernelPolicy[] = [antiReplay, rateLimit, constitutional];

export function evaluateAll(
  policies: KernelPolicy[],
  subject: unknown,
  ctx: KernelContext,
): PolicyDecision[] {
  return policies.map((p) => p.evaluate(subject, ctx));
}

export function isDenied(decisions: PolicyDecision[]): PolicyDecision | undefined {
  return decisions.find((d) => d.decision === "DENY");
}
