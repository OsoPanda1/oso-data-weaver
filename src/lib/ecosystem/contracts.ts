/**
 * TAMV Core Kernel — Contratos Heptafederados
 * Fuente única de verdad. Consumido por todos los repos del ecosistema.
 *
 * Doctrina: 7 federaciones lógicas. Cada repo se mapea a una federación.
 * La comunicación es en serie: core → dominios → deploy, vía contratos + eventos.
 */

export type FederationId =
  | "central"
  | "ops"
  | "infra"
  | "security"
  | "finance"
  | "logistics"
  | "users";

export type HeHexagonId =
  | "HE-Ingest"
  | "HE-Transform"
  | "HE-Publish"
  | "HE-Science"
  | "HE-Economy"
  | "HE-Identity";

export type HepDomainId =
  | "HEP-1"
  | "HEP-2"
  | "HEP-3"
  | "HEP-4"
  | "HEP-5"
  | "HEP-6"
  | "HEP-7";

export interface Federation {
  id: FederationId;
  name: string;
  sigil: string;
  color: string;
  mission: string;
  domain: HepDomainId;
  hexagon: HeHexagonId;
  domainDescription: string;
}

export const FEDERATIONS: Record<FederationId, Federation> = {
  central: {
    id: "central",
    name: "Federación Central",
    sigil: "◉",
    color: "var(--fed-central)",
    mission: "Kernel MD-X4 · Router heptafederado · BookPI · Contratos.",
    domain: "HEP-1",
    hexagon: "HE-Publish",
    domainDescription: "Gobernanza, identidad simbólica, ledger soberano.",
  },
  ops: {
    id: "ops",
    name: "Federación Operaciones",
    sigil: "△",
    color: "var(--fed-ops)",
    mission: "Orquestación de pipelines, despliegue, observabilidad.",
    domain: "HEP-2",
    hexagon: "HE-Transform",
    domainDescription: "CI/CD, eventos vivos, telemetría XR/4D.",
  },
  infra: {
    id: "infra",
    name: "Federación Infraestructura",
    sigil: "▤",
    color: "var(--fed-infra)",
    mission: "Hardware, edge, federación de cómputo, territorio digital.",
    domain: "HEP-3",
    hexagon: "HE-Ingest",
    domainDescription: "Nodo Cero RDM, gemelos digitales, infraestructura física.",
  },
  security: {
    id: "security",
    name: "Federación Seguridad",
    sigil: "✦",
    color: "var(--fed-security)",
    mission: "Guardianías, sigilos, validación criptográfica, GoS.",
    domain: "HEP-4",
    hexagon: "HE-Transform",
    domainDescription: "Soberanía, anti-fragilidad, control de acceso.",
  },
  finance: {
    id: "finance",
    name: "Federación Financiera",
    sigil: "◈",
    color: "var(--fed-finance)",
    mission: "Economía interna, reputación, límites, valor circulante.",
    domain: "HEP-5",
    hexagon: "HE-Economy",
    domainDescription: "Ledger económico, recálculo automático por eventos.",
  },
  logistics: {
    id: "logistics",
    name: "Federación Logística",
    sigil: "◇",
    color: "var(--fed-logistics)",
    mission: "Turismo digital, rutas, distribución de experiencias.",
    domain: "HEP-6",
    hexagon: "HE-Publish",
    domainDescription: "Real del Monte turismo, mapas operativos.",
  },
  users: {
    id: "users",
    name: "Federación Usuarios",
    sigil: "◎",
    color: "var(--fed-users)",
    mission: "Identidad, perfil, educación, comunidad UTAMV.",
    domain: "HEP-7",
    hexagon: "HE-Identity",
    domainDescription: "Campus, masterclass, identidad de alumnos y maestros.",
  },
};

/** Eventos del BookPI (ledger). Versión 1.0.0 de los contratos. */
export type TamvEventType =
  | "IdentityUpdated"
  | "RepoSynced"
  | "ContractPublished"
  | "DeployTriggered"
  | "EconomyRecalculated"
  | "TerritoryOverlayChanged"
  | "AiContextRequested"
  | "FederationHeartbeat";

export interface TamvEvent<T = Record<string, unknown>> {
  id: string;
  type: TamvEventType;
  origin: FederationId;
  occurredAt: string; // ISO
  contractVersion: string;
  payload: T;
}

export const CONTRACT_VERSION = "1.0.0";
