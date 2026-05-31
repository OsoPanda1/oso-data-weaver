/**
 * TAMV ATLAS — Vector Index
 * Búsqueda híbrida léxica/semántica sobre CanonicalNode,
 * con trazabilidad hacia ELITE/BookPI.
 */

import type { CanonicalNode, EvidenceDoc } from '../canonical/types';
// Si ya tienes estas estructuras, puedes ajustar el import/paths
// Aquí asumimos un contrato evolucionado de EvidenceDoc.

//
// ----------------- Tipos base -----------------
//

export interface EvidenceSignature {
  sha256: string;
  bookpiEventId?: string;
  eliteSignature?: string;
}

export interface EvidenceEliteMeta {
  heHexagon?: string;
  hepDomain?: string;
  doctrineTags?: string[];
  territory?: string;
}

export interface EvidenceDocFinal extends EvidenceDoc {
  tags: string[];
  signature?: EvidenceSignature;
  elite?: EvidenceEliteMeta;
}

export interface RankOptions {
  topK?: number;
  mode?: 'lexical' | 'semantic' | 'hybrid';
}

//
// ----------------- Utilidades léxicas -----------------
//

function tokenize(s: string | null | undefined): Set<string> {
  if (!s) return new Set();
  return new Set(
    s
      .toLowerCase()
      .replace(/[^\w\sáéíóúñ]/g, ' ')
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

//
// ----------------- Normalización de scores -----------------
//

function normalizeScores(
  docs: EvidenceDocFinal[],
  field: keyof EvidenceDocFinal,
): Map<string, number> {
  const values = docs.map((d) => (d[field] as number) ?? 0);
  const max = Math.max(...values, 0);
  const min = Math.min(...values, 0);
  const range = max - min || 1;
  const map = new Map<string, number>();

  for (const d of docs) {
    const v = (d[field] as number) ?? 0;
    map.set(d.nodeId, (v - min) / range);
  }

  return map;
}

//
// ----------------- Re-ranking por metadatos / tags -----------------
//

/**
 * Calcula un score meta basado en tags doctrinales y fuente.
 * Puedes ajustar pesos según tu canon.
 */
function computeMetaScore(doc: EvidenceDocFinal, query: string): number {
  const tags = doc.tags || [];
  const source = (doc.source ?? '').toLowerCase();
  const q = query.toLowerCase();

  let score = 0;

  // Boost por tags doctrinales clave
  const boostTags = [
    'tamv-core',
    'md-x4',
    'dekateotl',
    'heptafed',
    'isabella-ai',
    'genesis-canon',
  ];
  for (const t of tags) {
    if (boostTags.includes(t)) score += 0.2;
  }

  // Boost si source es canónica/peer-reviewed
  if (source.includes('root-canon')) score += 0.3;
  if (source.includes('peer-reviewed')) score += 0.2;

  // Algo de afinidad simple query-tags
  const qTokens = q.split(/\s+/);
  for (const qt of qTokens) {
    if (qt.length < 3) continue;
    if (tags.some((t) => t.toLowerCase().includes(qt))) {
      score += 0.05;
    }
  }

  // Recorta a [0,1] para estabilidad
  if (score > 1) score = 1;
  if (score < 0) score = 0;
  return score;
}

function applyMetadataRerank(
  docs: EvidenceDocFinal[],
  query: string,
): EvidenceDocFinal[] {
  return docs
    .map((doc) => {
      const metaScore = computeMetaScore(doc, query);
      // Guardamos metaScore dentro de score como pequeño ajuste
      const finalScore = (doc.score ?? 0) + metaScore;
      return { ...doc, score: finalScore };
    })
    .sort((a, b) => b.score - a.score || a.nodeId.localeCompare(b.nodeId));
}

//
// ----------------- Búsqueda léxica pura -----------------
//

export function rankLexical(
  query: string,
  nodes: CanonicalNode[],
  topK = 5,
): EvidenceDocFinal[] {
  const q = tokenize(query);
  if (!q.size) return [];

  const results: EvidenceDocFinal[] = nodes
    .map((n) => {
      const title = n.title ?? '';
      const body = n.body ?? '';
      const tags = Array.isArray(n.semantic?.tags)
        ? n.semantic.tags
        : [];

      const corpus = tokenize(`${title} ${body} ${tags.join(' ')}`);
      const score = jaccard(q, corpus);

      const excerptSource = body || title;
      const excerpt = excerptSource.slice(0, 280);

      const doc: EvidenceDocFinal = {
        nodeId: n.id,
        title,
        excerpt,
        score,
        source: n.metadata.source,
        tags,
        citation: {
          doi: n.metadata.doi,
          orcid: n.metadata.orcid,
          sha256: n.canonicalHash,
        },
        elite: n.elite ?? undefined, // si CanonicalNode ya trae meta ELITE opcional
        signature: n.signature
          ? {
              sha256: n.signature.sha256,
              bookpiEventId: n.signature.bookpiEventId,
              eliteSignature: n.signature.eliteSignature,
            }
          : undefined,
      };

      return doc;
    })
    .filter((d) => d.score > 0);

  return applyMetadataRerank(
    results.sort((a, b) => b.score - a.score || a.nodeId.localeCompare(b.nodeId)).slice(0, topK),
    query,
  );
}

//
// ----------------- Qdrant / embeddings (stubs) -----------------
//

// Contratos mínimos para Qdrant
export interface QdrantPointPayload {
  nodeId: string;
  title: string;
  body?: string;
  tags: string[];
  source: string;
  doi?: string;
  orcid?: string;
  sha256: string;
  elite?: EvidenceEliteMeta;
  signature?: EvidenceSignature;
}

export interface QdrantPoint {
  id: string;
  vector: number[];
  payload: QdrantPointPayload;
}

export interface QdrantSearchResult {
  id: string;
  score: number;
  payload: QdrantPointPayload;
}

// Cliente stub: implementa aquí los hooks reales a tu Qdrant
export interface QdrantClient {
  upsertPoint(point: QdrantPoint): Promise<void>;
  deletePoint(id: string): Promise<void>;
  search(
    vector: number[],
    topK: number,
  ): Promise<QdrantSearchResult[]>;
}

// Embeddings (Lovable u otro proveedor)
export interface EmbeddingsClient {
  embed(text: string): Promise<number[]>;
}

// Helpers para construir texto de embeddings
function buildEmbeddingText(node: CanonicalNode): string {
  const title = node.title ?? '';
  const body = node.body ?? '';
  const tags = Array.isArray(node.semantic?.tags)
    ? node.semantic.tags.join(' ')
    : '';
  return [title, body, tags].filter(Boolean).join('\n');
}

export async function upsertCanonicalNodeToQdrant(
  node: CanonicalNode,
  qdrant: QdrantClient,
  embeddings: EmbeddingsClient,
): Promise<void> {
  const text = buildEmbeddingText(node);
  const vector = await embeddings.embed(text);

  const payload: QdrantPointPayload = {
    nodeId: node.id,
    title: node.title ?? '',
    body: node.body ?? '',
    tags: Array.isArray(node.semantic?.tags) ? node.semantic.tags : [],
    source: node.metadata.source,
    doi: node.metadata.doi,
    orcid: node.metadata.orcid,
    sha256: node.canonicalHash,
    elite: node.elite ?? undefined,
    signature: node.signature
      ? {
          sha256: node.signature.sha256,
          bookpiEventId: node.signature.bookpiEventId,
          eliteSignature: node.signature.eliteSignature,
        }
      : undefined,
  };

  const point: QdrantPoint = {
    id: node.id,
    vector,
    payload,
  };

  await qdrant.upsertPoint(point);
}

export async function deleteCanonicalNodeFromQdrant(
  nodeId: string,
  qdrant: QdrantClient,
): Promise<void> {
  await qdrant.deletePoint(nodeId);
}

//
// ----------------- Búsqueda semántica pura -----------------
//

export async function rankSemantic(
  query: string,
  topK: number,
  qdrant: QdrantClient,
  embeddings: EmbeddingsClient,
): Promise<EvidenceDocFinal[]> {
  const vector = await embeddings.embed(query);
  const results = await qdrant.search(vector, topK);

  const docs: EvidenceDocFinal[] = results.map((r) => {
    const p = r.payload;
    const excerptSource = p.body || p.title;
    const excerpt = excerptSource.slice(0, 280);

    return {
      nodeId: p.nodeId,
      title: p.title,
      excerpt,
      score: r.score,
      source: p.source,
      tags: p.tags ?? [],
      citation: {
        doi: p.doi,
        orcid: p.orcid,
        sha256: p.sha256,
      },
      elite: p.elite,
      signature: p.signature,
    };
  });

  return docs.sort((a, b) => b.score - a.score || a.nodeId.localeCompare(b.nodeId));
}

//
// ----------------- Fusión híbrida léxico + semántico -----------------
//

function mergeAndRerankHybrid(
  lexical: EvidenceDocFinal[],
  semantic: EvidenceDocFinal[],
  query: string,
  topK: number,
  weights: { lex: number; sem: number; meta: number } = {
    lex: 0.3,
    sem: 0.6,
    meta: 0.1,
  },
): EvidenceDocFinal[] {
  const map = new Map<string, EvidenceDocFinal>();

  for (const d of lexical) {
    map.set(d.nodeId, { ...d });
  }
  for (const d of semantic) {
    const existing = map.get(d.nodeId);
    if (!existing) {
      map.set(d.nodeId, { ...d });
    } else {
      // Combinar: nos quedamos con el mayor excerpt y fusionamos tags/meta
      const combined: EvidenceDocFinal = {
        ...existing,
        score: Math.max(existing.score ?? 0, d.score ?? 0),
        tags: Array.from(new Set([...(existing.tags || []), ...(d.tags || [])])),
        elite: existing.elite ?? d.elite,
        signature: existing.signature ?? d.signature,
      };
      map.set(d.nodeId, combined);
    }
  }

  const merged = Array.from(map.values());

  const lexNorm = normalizeScores(lexical, 'score');
  const semNorm = normalizeScores(semantic, 'score');

  const rescored = merged.map((doc) => {
    const lexScore = lexNorm.get(doc.nodeId) ?? 0;
    const semScore = semNorm.get(doc.nodeId) ?? 0;
    const metaScore = computeMetaScore(doc, query); // [0,1]

    const finalScore =
      weights.lex * lexScore +
      weights.sem * semScore +
      weights.meta * metaScore;

    return { ...doc, score: finalScore };
  });

  return rescored
    .sort((a, b) => b.score - a.score || a.nodeId.localeCompare(b.nodeId))
    .slice(0, topK);
}

//
// ----------------- API principal rankByQuery -----------------
//

export async function rankByQuery(
  query: string,
  nodes: CanonicalNode[],
  options: RankOptions & {
    qdrant?: QdrantClient;
    embeddings?: EmbeddingsClient;
  } = {},
): Promise<EvidenceDocFinal[]> {
  const topK = options.topK ?? 5;
  const mode = options.mode ?? 'hybrid';

  const lexical = rankLexical(query, nodes, topK);
  if (mode === 'lexical') return lexical;

  if (!options.qdrant || !options.embeddings) {
    // Si no hay infraestructura semántica, cae a léxico
    return lexical;
  }

  const semantic = await rankSemantic(
    query,
    topK,
    options.qdrant,
    options.embeddings,
  );

  if (mode === 'semantic') return semantic;

  // hybrid
  return mergeAndRerankHybrid(lexical, semantic, query, topK);
}
