import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Firma HMAC-SHA256 de un evento canónico.
 * Vincula el `eventHash` al `actorId` con una clave compartida.
 * Sustituible por Ed25519 / PQ cuando exista PKI federada.
 */
function key(): string {
  return (
    process.env.KERNEL_SIGNING_KEY ??
    process.env.LOVABLE_API_KEY ?? // fallback dev
    "tamv-mdx4-dev-signing-key"
  );
}

export function signEvent(eventHash: string, actorId: string): string {
  const h = createHmac("sha256", key());
  h.update(`${actorId}|${eventHash}`);
  return `hmac-sha256:${h.digest("hex")}`;
}

export function verifyEventSignature(
  eventHash: string,
  actorId: string,
  signature: string,
): boolean {
  if (!signature.startsWith("hmac-sha256:")) return false;
  const expected = signEvent(eventHash, actorId);
  try {
    const a = Buffer.from(expected);
    const b = Buffer.from(signature);
    return a.length === b.length && timingSafeEqual(a, b);
  } catch {
    return false;
  }
}
