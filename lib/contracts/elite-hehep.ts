export type HeHexagonId =
  | 'HE-Ingest'
  | 'HE-Transform'
  | 'HE-Publish'
  | 'HE-Science'
  | 'HE-Economy'
  | 'HE-Identity';

export type HepDomainId =
  | 'HEP-1'
  | 'HEP-2'
  | 'HEP-3'
  | 'HEP-4'
  | 'HEP-5'
  | 'HEP-6'
  | 'HEP-7';

export interface HeHepContext {
  hexagon: HeHexagonId;
  domain: HepDomainId;
}

export interface HepDomainDefinition {
  id: HepDomainId;
  name: string;
  role: string;
  guardians: string[];
}

export interface HeHexagonDefinition {
  id: HeHexagonId;
  name: string;
  role: string;
  eventPrefix: string;
}

export const HE_HEXAGONS: Record<HeHexagonId, HeHexagonDefinition> = {
  'HE-Ingest': {
    id: 'HE-Ingest',
    name: 'Ingesta',
    role: 'Web, sensores, APIs, XR, logs y recepcion de senales federadas.',
    eventPrefix: 'INGEST',
  },
  'HE-Transform': {
    id: 'HE-Transform',
    name: 'Transformacion',
    role: 'Filtrado de 4 capas, guardianes, normalizacion y enriquecimiento.',
    eventPrefix: 'TRANSFORM',
  },
  'HE-Publish': {
    id: 'HE-Publish',
    name: 'Publicacion',
    role: 'Artefactos, contratos, eventos BookPI y publicacion verificable.',
    eventPrefix: 'PUBLISH',
  },
  'HE-Science': {
    id: 'HE-Science',
    name: 'Ciencia',
    role: 'Ciencia abierta, DOIs, ORCID, reproducibilidad y evidencia academica.',
    eventPrefix: 'SCIENCE',
  },
  'HE-Economy': {
    id: 'HE-Economy',
    name: 'Economia',
    role: 'Reputacion, DAO, tokenomics, subastas y justicia economica.',
    eventPrefix: 'ECONOMY',
  },
  'HE-Identity': {
    id: 'HE-Identity',
    name: 'Identidad',
    role: 'Identidad soberana, IsabellaCoreProtocol, GoS, DIDs y etica.',
    eventPrefix: 'IDENTITY',
  },
};

export const HEP_DOMAINS: Record<HepDomainId, HepDomainDefinition> = {
  'HEP-1': {
    id: 'HEP-1',
    name: 'Central',
    role: 'Kernel core, BookPI, contratos y router heptafederado.',
    guardians: ['contract-governance', 'bookpi-audit', 'kernel-integrity'],
  },
  'HEP-2': {
    id: 'HEP-2',
    name: 'Operaciones',
    role: 'Synapse AI, Encore Flow, Nexus y DreamSpaces runtime.',
    guardians: ['latency-budget', 'workflow-safety', 'operator-consent'],
  },
  'HEP-3': {
    id: 'HEP-3',
    name: 'Infraestructura',
    role: 'Edge, XR rendering, HoloWall, NVLink/CXL y multinube.',
    guardians: ['resource-isolation', 'deploy-observability', 'edge-failover'],
  },
  'HEP-4': {
    id: 'HEP-4',
    name: 'Seguridad',
    role: 'Dekateotl, guardianes, filtrado 4 capas, shutdown y cripto post-cuantica.',
    guardians: ['four-layer-filter', 'shutdown-protocol', 'pq-crypto-policy'],
  },
  'HEP-5': {
    id: 'HEP-5',
    name: 'Financiera',
    role: 'Oracle Sentinel Economy, Ember Stream, AuraBid y BidVision.',
    guardians: ['anti-extraction', 'market-anomaly-detection', 'reputation-audit'],
  },
  'HEP-6': {
    id: 'HEP-6',
    name: 'Logistica',
    role: 'Puentes Oniricos, rutas y distribucion de experiencias DreamSpaces.',
    guardians: ['distribution-consent', 'custody-audit', 'route-resilience'],
  },
  'HEP-7': {
    id: 'HEP-7',
    name: 'Usuarios',
    role: 'IsabellaCoreProtocol, Quantum Pets, diario 24h y recomendaciones.',
    guardians: ['privacy-by-design', 'informed-consent', 'identity-safety'],
  },
};

export const KERNEL_ELITE_CONTEXT: HeHepContext = {
  hexagon: 'HE-Publish',
  domain: 'HEP-1',
};

export function isHeHexagonId(value: string): value is HeHexagonId {
  return Object.prototype.hasOwnProperty.call(HE_HEXAGONS, value);
}

export function isHepDomainId(value: string): value is HepDomainId {
  return Object.prototype.hasOwnProperty.call(HEP_DOMAINS, value);
}

export function validateHeHepContext(context: HeHepContext): HeHepContext {
  if (!context || !isHeHexagonId(context.hexagon) || !isHepDomainId(context.domain)) {
    throw new Error(`Invalid ELITE HeHep context: ${JSON.stringify(context)}`);
  }
  return context;
}
