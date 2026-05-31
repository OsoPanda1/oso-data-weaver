import type { Dossier } from './dossier-builder';

export interface SynthesisResult {
  text: string;
  citations: string[]; // nodeIds
  mode: 'deterministic' | 'lovable-delegated';
}

/**
 * Sintetiza respuesta SOLO con la evidencia del dossier.
 * Sin dossier → respuesta de insuficiencia (principio RAG estricto).
 *
 * Cuando LOVABLE_API_KEY esté disponible, este módulo puede delegar
 * a un AI Gateway, manteniendo trazabilidad de citas.
 */
export async function synthesize(dossier: Dossier): Promise<SynthesisResult> {
  if (!dossier.hasEvidence) {
    return {
      text: `INSUFFICIENT_EVIDENCE: no se encontró material primario para "${dossier.query}". El kernel no fabrica contenido sin base.`,
      citations: [],
      mode: 'deterministic',
    };
  }

  const useLovable =
    typeof process !== 'undefined' &&
    !!process.env.LOVABLE_API_KEY &&
    process.env.TAMV_SYNTH_MODE !== 'deterministic-only';

  if (!useLovable) {
    // Modo determinista actual
    const lines = dossier.docs.map(
      (d, i) =>
        `[${i + 1}] ${d.title} — ${d.excerpt} (sha256:${d.citation.sha256.slice(
          0,
          12,
        )})`,
    );
    return {
      text: `Síntesis sobre "${dossier.query}" basada en ${dossier.docs.length} fragmentos primarios:\n${lines.join(
        '\n',
      )}`,
      citations: dossier.docs.map((d) => d.nodeId),
      mode: 'deterministic',
    };
  }

  // Esqueleto para delegar a Lovable / AI Gateway (sin implementación concreta).
  // Aquí sólo dejamos claro el contrato; la llamada real se implementa después.
  const fallbackTextParts = dossier.docs.slice(0, 3).map((d, i) => {
    return `[${i + 1}] ${d.title} — ${d.excerpt}`;
  });

  const text = `LOVABLE_DELEGATED_PLACEHOLDER: kernel configurado para síntesis asistida, pero el AI Gateway aún no está implementado.\n\nContexto base:\n${fallbackTextParts.join(
    '\n',
  )}`;

  return {
    text,
    citations: dossier.docs.map((d) => d.nodeId),
    mode: 'lovable-delegated',
  };
}
