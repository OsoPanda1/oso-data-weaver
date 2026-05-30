import type { Dossier } from "./dossier-builder";

/**
 * Sintetiza respuesta SOLO con la evidencia del dossier.
 * Sin dossier → respuesta de insuficiencia (principio RAG estricto).
 *
 * Cuando LOVABLE_API_KEY esté disponible, este módulo se puede ampliar
 * para invocar el AI Gateway; hoy compone una síntesis determinista
 * citable y trazable.
 */
export function synthesize(dossier: Dossier): {
  text: string;
  citations: string[];
} {
  if (!dossier.hasEvidence) {
    return {
      text: `INSUFFICIENT_EVIDENCE: no se encontró material primario para "${dossier.query}". El kernel no fabrica contenido sin base.`,
      citations: [],
    };
  }
  const lines = dossier.docs.map(
    (d, i) =>
      `[${i + 1}] ${d.title} — ${d.excerpt} (sha256:${d.citation.sha256.slice(0, 12)})`,
  );
  return {
    text: `Síntesis sobre "${dossier.query}" basada en ${dossier.docs.length} fragmentos primarios:\n${lines.join("\n")}`,
    citations: dossier.docs.map((d) => d.nodeId),
  };
}
