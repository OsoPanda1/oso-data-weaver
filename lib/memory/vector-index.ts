/**
 * Vector index stub. Interfaz lista para Lovable AI Embeddings o Qdrant.
 * Hoy implementa similitud léxica simple (Jaccard sobre tokens).
 */

import type { CanonicalNode, EvidenceDoc } from "../canonical/types";

function tokenize(s: string): Set<string> {
  return new Set(
    s
      .toLowerCase()
      .replace(/[^\w\sáéíóúñ]/g, " ")
      .split(/\s+/)
      .filter((t) => t.length > 2),
  );
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (!a.size || !b.size) return 0;
  let inter = 0;
  for (const t of a) if (b.has(t)) inter++;
  return inter / (a.size + b.size - inter);
}

export function rankByQuery(
  query: string,
  nodes: CanonicalNode[],
  topK = 5,
): EvidenceDoc[] {
  const q = tokenize(query);
  return nodes
    .map((n) => {
      const corpus = tokenize(`${n.title} ${n.body ?? ""} ${n.semantic.tags.join(" ")}`);
      const score = jaccard(q, corpus);
      const doc: EvidenceDoc = {
        nodeId: n.id,
        title: n.title,
        excerpt: (n.body ?? n.title).slice(0, 280),
        score,
        source: n.metadata.source,
        citation: {
          doi: n.metadata.doi,
          orcid: n.metadata.orcid,
          sha256: n.canonicalHash,
        },
      };
      return doc;
    })
    .filter((d) => d.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
}
