import { HE_HEXAGONS, HEP_DOMAINS } from '../contracts/elite-hehep';

export const ELITE_HEHEP_MANIFEST = {
  project: 'ELITE HeHep',
  fullName: 'Ecosistema Latino Interfederado TAMV Enterprise - Hexagonal Heptafederado',
  doctrine: 'MD-X4',
  kernels: ['TAMV Core Kernel', 'OSO Data Weaver'],
  canonicalKernel: 'OsoPanda1/oso-data-weaver',
  compatibility: ['OSO-compat', 'tamv-federation-v1'],
  heptagon_domains: HEP_DOMAINS,
  hexagons: HE_HEXAGONS,
  bookpi: {
    role: 'Auditable event ledger for cross-domain TAMV actions.',
    requiredContext: 'he_hep_context',
    integrity: 'sha256',
  },
  ethics: {
    protocol: 'IsabellaCoreProtocol',
    guardrails: [
      'human-dignity',
      'equity',
      'privacy',
      'informed-consent',
      'ethical-governance',
      'four-layer-filtering',
      'bookpi-audit-trail',
    ],
  },
} as const;

export type EliteHeHepManifest = typeof ELITE_HEHEP_MANIFEST;
