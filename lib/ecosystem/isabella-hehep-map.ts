import type { HeHepContext } from '../contracts/elite-hehep';

export interface IsabellaHeHepModuleMapEntry {
  module: string;
  context: HeHepContext;
  input: string;
  output: string;
  guardianPolicy: string[];
}

export const ISABELLA_HEHEP_MODULE_MAP: IsabellaHeHepModuleMapEntry[] = [
  {
    module: 'Synapse AI',
    context: { hexagon: 'HE-Ingest', domain: 'HEP-2' },
    input: 'metricas de latencia',
    output: 'offsets perceptivos',
    guardianPolicy: ['latency-budget', 'operator-consent'],
  },
  {
    module: 'Encore Flow',
    context: { hexagon: 'HE-Ingest', domain: 'HEP-2' },
    input: 'nivel de carga',
    output: 'politicas de interaccion',
    guardianPolicy: ['workflow-safety', 'load-shedding'],
  },
  {
    module: 'Echo Chamber AI',
    context: { hexagon: 'HE-Transform', domain: 'HEP-6' },
    input: 'actividad DreamSpace',
    output: 'ambientacion y sugerencias',
    guardianPolicy: ['context-isolation', 'consent-filter'],
  },
  {
    module: 'Phoenix Protocol',
    context: { hexagon: 'HE-Transform', domain: 'HEP-6' },
    input: 'estado NFT/DreamSpace',
    output: 'custodia, archivo o adopcion',
    guardianPolicy: ['custody-audit', 'archive-policy'],
  },
  {
    module: 'AuraBid',
    context: { hexagon: 'HE-Economy', domain: 'HEP-5' },
    input: 'bids off-chain',
    output: 'commits on-chain',
    guardianPolicy: ['anti-extraction', 'market-audit'],
  },
  {
    module: 'BidVision AI',
    context: { hexagon: 'HE-Economy', domain: 'HEP-5' },
    input: 'contexto de oferta',
    output: 'impacto simulado',
    guardianPolicy: ['simulation-disclosure', 'reputation-audit'],
  },
  {
    module: 'Spark Catalyst',
    context: { hexagon: 'HE-Transform', domain: 'HEP-7' },
    input: 'match colaboracion',
    output: 'microtareas gamificadas',
    guardianPolicy: ['user-consent', 'fair-labor'],
  },
  {
    module: 'Synergy Guard AI',
    context: { hexagon: 'HE-Transform', domain: 'HEP-5' },
    input: 'borrador de contrato',
    output: 'analisis de ambiguedad y riesgo',
    guardianPolicy: ['contract-ambiguity', 'risk-disclosure'],
  },
  {
    module: 'Oracle Sentinel Economy',
    context: { hexagon: 'HE-Economy', domain: 'HEP-5' },
    input: 'eventos de mercado',
    output: 'anomalias detectadas',
    guardianPolicy: ['market-anomaly-detection', 'dao-audit'],
  },
  {
    module: 'Ember Stream',
    context: { hexagon: 'HE-Economy', domain: 'HEP-5' },
    input: 'acciones creativas',
    output: 'eventos de consumo/burn',
    guardianPolicy: ['token-safety', 'creator-rights'],
  },
  {
    module: 'Cognito Curator',
    context: { hexagon: 'HE-Identity', domain: 'HEP-7' },
    input: 'estado de decision usuario',
    output: 'consejo de curacion',
    guardianPolicy: ['informed-consent', 'recommendation-transparency'],
  },
  {
    module: 'Horizon Seeker',
    context: { hexagon: 'HE-Identity', domain: 'HEP-7' },
    input: 'perfil usuario',
    output: 'clusters emergentes sugeridos',
    guardianPolicy: ['privacy-by-design', 'profile-minimization'],
  },
  {
    module: 'Soul Sustainer',
    context: { hexagon: 'HE-Identity', domain: 'HEP-7' },
    input: 'estado Quantum Pet',
    output: 'cambio de forma o guardiania',
    guardianPolicy: ['identity-safety', 'emotional-safety'],
  },
  {
    module: 'Chrysalis AI',
    context: { hexagon: 'HE-Identity', domain: 'HEP-7' },
    input: 'progreso usuario/pet',
    output: 'nueva necesidad activa',
    guardianPolicy: ['developmental-safety', 'consent-renewal'],
  },
];

export function findIsabellaModule(module: string): IsabellaHeHepModuleMapEntry | undefined {
  return ISABELLA_HEHEP_MODULE_MAP.find((entry) => entry.module.toLowerCase() === module.toLowerCase());
}
