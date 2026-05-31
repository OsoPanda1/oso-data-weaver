/**
 * Adaptador Qdrant (REST) — compatible con Cloudflare Worker vía fetch.
 * Activado cuando QDRANT_URL está definido. QDRANT_API_KEY opcional.
 * El kernel mantiene su índice Jaccard en memoria como fallback siempre vivo.
 */

export interface QdrantPingResult {
  ok: boolean;
  latencyMs: number;
  error?: string;
  collections?: number;
}

function endpoint(): { url: string; key?: string; collection: string } | null {
  const url = process.env.QDRANT_URL;
  if (!url) return null;
  return {
    url: url.replace(/\/+$/, ""),
    key: process.env.QDRANT_API_KEY,
    collection: process.env.QDRANT_COLLECTION ?? "tamv-canonical",
  };
}

function headers(cfg: { key?: string }) {
  const h: Record<string, string> = {
    Accept: "application/json",
    "Content-Type": "application/json",
  };
  if (cfg.key) h["api-key"] = cfg.key;
  return h;
}

export async function pingQdrant(): Promise<QdrantPingResult> {
  const cfg = endpoint();
  if (!cfg) return { ok: false, latencyMs: 0, error: "not_configured" };
  const t0 = Date.now();
  try {
    const res = await fetch(`${cfg.url}/collections`, { headers: headers(cfg) });
    if (!res.ok)
      return {
        ok: false,
        latencyMs: Date.now() - t0,
        error: `http_${res.status}`,
      };
    const body = (await res.json()) as {
      result?: { collections?: unknown[] };
    };
    return {
      ok: true,
      latencyMs: Date.now() - t0,
      collections: body.result?.collections?.length ?? 0,
    };
  } catch (e) {
    return {
      ok: false,
      latencyMs: Date.now() - t0,
      error: (e as Error).message,
    };
  }
}
