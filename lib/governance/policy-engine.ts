import type {
  KernelContext,
  KernelPolicy,
  PolicyDecision,
} from '../kernel/contract';

// ⚠️ Estas estructuras siguen siendo en memoria.
// Para producción, deberías sustituirlas por un backend (Redis / BookPI / MSR).

const seenEvents = new Set<string>();
const rateBuckets = new Map<string, number[]>();

const MAX_REQUESTS_PER_MINUTE = 60;
const RATE_WINDOW_MS = 60_000;

/** Política: anti-replay por eventId + expiración superficial. */
export const antiReplay: KernelPolicy = {
  id: 'anti-replay',
  description: 'Rechaza eventos con eventId ya procesado en esta instancia.',
  category: 'integrity',
  severity: 'high',
  evaluate(subject, ctx): PolicyDecision {
    const id = (subject as { eventId?: string })?.eventId;

    if (!id) {
      return {
        policyId: 'anti-replay',
        decision: 'ALLOW',
        reason: 'no_event_id',
      };
    }

    if (seenEvents.has(id)) {
      return {
        policyId: 'anti-replay',
        decision: 'DENY',
        reason: 'replay',
        metadata: { eventId: id, actorId: ctx.actorId },
      };
    }

    seenEvents.add(id);

    return {
      policyId: 'anti-replay',
      decision: 'ALLOW',
      metadata: { eventId: id, actorId: ctx.actorId },
    };
  },
};

/** Política: rate limit por actor (60 req / 60s) — best-effort en memoria. */
export const rateLimit: KernelPolicy = {
  id: 'rate-limit',
  description: 'Máximo 60 solicitudes por minuto por actor (best-effort).',
  category: 'abuse-prevention',
  severity: 'medium',
  evaluate(_subject, ctx): PolicyDecision {
    const now = Date.now();
    const key = ctx.actorId ?? 'anonymous';

    const previous = rateBuckets.get(key) ?? [];
    const fresh = previous.filter((t) => now - t < RATE_WINDOW_MS);
    fresh.push(now);
    rateBuckets.set(key, fresh);

    if (fresh.length > MAX_REQUESTS_PER_MINUTE) {
      return {
        policyId: 'rate-limit',
        decision: 'DENY',
        reason: 'rate_exceeded',
        metadata: {
          actorId: ctx.actorId,
          count: fresh.length,
          windowMs: RATE_WINDOW_MS,
        },
      };
    }

    return {
      policyId: 'rate-limit',
      decision: 'ALLOW',
      metadata: {
        actorId: ctx.actorId,
        count: fresh.length,
        windowMs: RATE_WINDOW_MS,
      },
    };
  },
};

// ---------------------------
//  Política constitucional
// ---------------------------

/**
 * Los términos vetados deben eventualmente migrarse a un
 * manifiesto doctrinal versionado (MD-X4 Canon), no hardcode.
 */
const FORBIDDEN_PATTERNS = [
  'dao sin custodio',
  'manipulación cognitiva',
  'extracción no consentida',
];

export const constitutional: KernelPolicy = {
  id: 'constitutional',
  description: 'Veta patrones que violan IsabellaCoreProtocol y MD-X4.',
  category: 'constitutional',
  severity: 'critical',
  evaluate(subject, ctx): PolicyDecision {
    // Idealmente, extraerías solo campos semánticos (prompt, description, etc.)
    const text = JSON.stringify(subject ?? {}).toLowerCase();

    const hit = FORBIDDEN_PATTERNS.find((p) => text.includes(p));
    if (hit) {
      return {
        policyId: 'constitutional',
        decision: 'DENY',
        reason: `pattern:${hit}`,
        metadata: {
          actorId: ctx.actorId,
          federations: ctx.federations,
        },
      };
    }

    return {
      policyId: 'constitutional',
      decision: 'ALLOW',
    };
  },
};

export const DEFAULT_POLICIES: KernelPolicy[] = [
  antiReplay,
  rateLimit,
  constitutional,
];

/**
 * Evalúa políticas en orden, con short-circuit si alguna DENY es crítica.
 */
export function evaluateAll(
  policies: KernelPolicy[],
  subject: unknown,
  ctx: KernelContext,
): PolicyDecision[] {
  const decisions: PolicyDecision[] = [];

  for (const policy of policies) {
    const result = policy.evaluate(subject, ctx);
    decisions.push(result);

    if (
      result.decision === 'DENY' &&
      (policy.severity === 'critical' || policy.category === 'constitutional')
    ) {
      // Short-circuit: bloqueamos inmediatamente ante violación constitucional
      break;
    }
  }

  return decisions;
}

/**
 * Devuelve la primera decisión DENY (priorizando constitucional),
 * útil para logging y respuesta al usuario.
 */
export function isDenied(
  decisions: PolicyDecision[],
): PolicyDecision | undefined {
  const constitutionalDeny = decisions.find(
    (d) => d.decision === 'DENY' && d.policyId === 'constitutional',
  );
  if (constitutionalDeny) return constitutionalDeny;

  return decisions.find((d) => d.decision === 'DENY');
}
