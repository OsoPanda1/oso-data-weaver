import type { EvidenceDoc } from "../canonical/types";
import { listNodes } from "../memory/graph-store";
import { rankByQuery } from "../memory/vector-index";

export interface Dossier {
  query: string;
  docs: EvidenceDoc[];
  hasEvidence: boolean;
}

export function buildDossier(query: string, topK = 5): Dossier {
  const all = listNodes();
  const docs = rankByQuery(query, all, topK);
  return { query, docs, hasEvidence: docs.length > 0 };
}
