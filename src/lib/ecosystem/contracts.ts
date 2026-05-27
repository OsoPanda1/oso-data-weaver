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

export interface Federation {
  id: FederationId;
  name: string;
  sigil: string;       // glifo unicode
  color: string;       // var name
  mission: string;
  domain: string;      // ámbito doctrinal
}

export const FEDERATIONS: Record<FederationId, Federation> = {
  central: {
    id: "central",
    name: "Federación Central",
    sigil: "◉",
    color: "var(--fed-central)",
    mission: "Kernel MD-X4 · Router heptafederado · BookPI · Contratos.",
    domain: "Gobernanza, identidad simbólica, ledger soberano.",
  },
  ops: {
    id: "ops",
    name: "Federación Operaciones",
    sigil: "△",
    color: "var(--fed-ops)",
    mission: "Orquestación de pipelines, despliegue, observabilidad.",
    domain: "CI/CD, eventos vivos, telemetría XR/4D.",
  },
  infra: {
    id: "infra",
    name: "Federación Infraestructura",
    sigil: "▤",
    color: "var(--fed-infra)",
    mission: "Hardware, edge, federación de cómputo, territorio digital.",
    domain: "Nodo Cero RDM, gemelos digitales, infraestructura física.",
  },
  security: {
    id: "security",
    name: "Federación Seguridad",
    sigil: "✦",
    color: "var(--fed-security)",
    mission: "Guardianías, sigilos, validación criptográfica, GoS.",
    domain: "Soberanía, anti-fragilidad, control de acceso.",
  },
  finance: {
    id: "finance",
    name: "Federación Financiera",
    sigil: "◈",
    color: "var(--fed-finance)",
    mission: "Economía interna, reputación, límites, valor circulante.",
    domain: "Ledger económico, recálculo automático por eventos.",
  },
  logistics: {
    id: "logistics",
    name: "Federación Logística",
    sigil: "◇",
    color: "var(--fed-logistics)",
    mission: "Turismo digital, rutas, distribución de experiencias.",
    domain: "Real del Monte turismo, mapas operativos.",
  },
  users: {
    id: "users",
    name: "Federación Usuarios",
    sigil: "◎",
    color: "var(--fed-users)",
    mission: "Identidad, perfil, educación, comunidad UTAMV.",
    domain: "Campus, masterclass, identidad de alumnos y maestros.",
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
