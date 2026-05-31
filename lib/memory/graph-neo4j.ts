/**
 * Adaptador Neo4j (HTTP Query API v2) — compatible con Cloudflare Worker.
 * Activado cuando NEO4J_URL y NEO4J_AUTH ("user:password" base64) están definidos.
 * Sirve como espejo del graph-store; el kernel sigue operando si falla la red.
 */

import type { CanonicalNode } from "../canonical/types";

export interface Neo4jPingResult {
  ok: boolean;
  latencyMs: number;
  error?: string;
  version?: string;
}

function endpoint(): { url: string; auth: string } | null {
  const url = process.env.NEO4J_URL;
  const auth = process.env.NEO4J_AUTH;
  if (!url || !auth) return null;
  return { url: url.replace(/\/+$/, ""), auth };
}

export async function pingNeo4j(): Promise<Neo4jPingResult> {
  const cfg = endpoint();
  if (!cfg) return { ok: false, latencyMs: 0, error: "not_configured" };
  const t0 = Date.now();
  try {
    const res = await fetch(`${cfg.url}/`, {
      headers: { Authorization: `Basic ${cfg.auth}`, Accept: "application/json" },
    });
    return {
      ok: res.ok,
      latencyMs: Date.now() - t0,
      error: res.ok ? undefined : `http_${res.status}`,
    };
  } catch (e) {
    return {
      ok: false,
      latencyMs: Date.now() - t0,
      error: (e as Error).message,
    };
  }
}

/** Best-effort upsert vía Cypher MERGE. Silencioso si no está configurado. */
export async function mirrorNodeToNeo4j(node: CanonicalNode): Promise<boolean> {
  const cfg = endpoint();
  if (!cfg) return false;
  const cypher = `MERGE (n:CanonicalNode {id:$id})
    SET n.type=$type, n.title=$title, n.canonicalHash=$hash, n.updatedAt=$updatedAt`;
  try {
    const res = await fetch(`${cfg.url}/db/neo4j/query/v2`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${cfg.auth}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        statement: cypher,
        parameters: {
          id: node.id,
          type: node.type,
          title: node.title,
          hash: node.canonicalHash,
          updatedAt: node.metadata.updatedAt,
        },
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}
