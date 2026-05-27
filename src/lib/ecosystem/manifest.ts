import type { FederationId } from "./contracts";

/**
 * Manifest del ecosistema TAMV — mapeo repo → federación.
 * Cada repo es una federación funcional. La cadena viva es:
 *   core → dominios → deploy.
 *
 * Este manifest se sirve también en /api/public/manifest para que
 * cualquier repo del ecosistema lo consuma como contrato compartido.
 */

export type RepoLayer = "kernel" | "identity" | "domain" | "deploy" | "docs";

export interface Repo {
  slug: string;            // nombre del repo en GitHub
  title: string;           // nombre humano
  federation: FederationId;
  layer: RepoLayer;
  language: "TypeScript" | "JavaScript" | "Python";
  summary: string;
  url: string;
  consumes: string[];      // repos que consume (en serie)
  emits: string[];         // tipos de evento que emite al BookPI
}

export const GITHUB_OWNER = "OsoPanda1";
const repo = (slug: string) => `https://github.com/${GITHUB_OWNER}/${slug}`;

export const REPOS: Repo[] = [
  // ── KERNEL (este proyecto) ──────────────────────────────
  {
    slug: "tamv-core-kernel",
    title: "TAMV Core Kernel",
    federation: "central",
    layer: "kernel",
    language: "TypeScript",
    summary:
      "Router heptafederado, BookPI ledger, registro de contratos. Este hub.",
    url: "#",
    consumes: [],
    emits: ["ContractPublished", "FederationHeartbeat"],
  },

  // ── IDENTIDAD / DISEÑO ──────────────────────────────────
  {
    slug: "alamexa-design-system",
    title: "Alamexa Design System",
    federation: "central",
    layer: "identity",
    language: "TypeScript",
    summary: "Tokens, componentes y lenguaje visual TAMV compartido.",
    url: repo("alamexa-design-system"),
    consumes: ["tamv-core-kernel"],
    emits: ["ContractPublished"],
  },
  {
    slug: "symbol-forge",
    title: "Symbol Forge",
    federation: "security",
    layer: "identity",
    language: "TypeScript",
    summary: "Forja de sigilos GoS, glifos e identidad criptográfica.",
    url: repo("symbol-forge"),
    consumes: ["tamv-core-kernel"],
    emits: ["IdentityUpdated"],
  },

  // ── NÚCLEO FEDERADO ─────────────────────────────────────
  {
    slug: "tamv-digital-nexus",
    title: "TAMV Digital Nexus",
    federation: "ops",
    layer: "domain",
    language: "TypeScript",
    summary: "Nexo operativo, orquestación de federaciones en vivo.",
    url: repo("tamv-digital-nexus"),
    consumes: ["tamv-core-kernel", "alamexa-design-system"],
    emits: ["FederationHeartbeat", "DeployTriggered"],
  },
  {
    slug: "tamv-atlas",
    title: "TAMV Atlas",
    federation: "ops",
    layer: "domain",
    language: "TypeScript",
    summary: "Cartografía viva del ecosistema, índice federado.",
    url: repo("tamv-atlas"),
    consumes: ["tamv-core-kernel", "tamv-digital-nexus"],
    emits: ["FederationHeartbeat"],
  },
  {
    slug: "tamv-the-federated-frontier",
    title: "Federated Frontier",
    federation: "security",
    layer: "domain",
    language: "TypeScript",
    summary: "Frontera federada, perímetro de soberanía.",
    url: repo("tamv-the-federated-frontier"),
    consumes: ["tamv-core-kernel", "symbol-forge"],
    emits: ["IdentityUpdated"],
  },

  // ── META XR / SIGUIENTE GENERACIÓN ──────────────────────
  {
    slug: "tamvonline-metanextgen",
    title: "Meta NextGen",
    federation: "infra",
    layer: "domain",
    language: "TypeScript",
    summary: "Capa meta XR/VR/3D/4D de siguiente generación.",
    url: repo("tamvonline-metanextgen"),
    consumes: ["tamv-core-kernel", "alamexa-design-system"],
    emits: ["TerritoryOverlayChanged"],
  },
  {
    slug: "ecosistema-nextgen-tamv",
    title: "Ecosistema NextGen",
    federation: "infra",
    layer: "domain",
    language: "JavaScript",
    summary: "Ecosistema civilizatorio antifrágil XR-VR-3D-4D nativo.",
    url: repo("ecosistema-nextgen-tamv"),
    consumes: ["tamv-core-kernel", "tamvonline-metanextgen"],
    emits: ["TerritoryOverlayChanged"],
  },

  // ── VERTICAL EDUCACIÓN ──────────────────────────────────
  {
    slug: "utamv-campus",
    title: "UTAMV Campus",
    federation: "users",
    layer: "domain",
    language: "TypeScript",
    summary: "Campus digital de la Universidad TAMV.",
    url: repo("utamv-campus"),
    consumes: ["tamv-core-kernel", "alamexa-design-system", "symbol-forge"],
    emits: ["IdentityUpdated", "AiContextRequested"],
  },
  {
    slug: "utamv-elite-masterclass",
    title: "UTAMV Elite Masterclass",
    federation: "users",
    layer: "domain",
    language: "TypeScript",
    summary: "Masterclasses elite, alta formación.",
    url: repo("utamv-elite-masterclass"),
    consumes: ["tamv-core-kernel", "utamv-campus"],
    emits: ["IdentityUpdated"],
  },

  // ── VERTICAL TERRITORIO RDM ─────────────────────────────
  {
    slug: "RDM-Digital-X",
    title: "RDM Digital X",
    federation: "infra",
    layer: "domain",
    language: "TypeScript",
    summary: "Nodo Cero — Real del Monte digitalizado.",
    url: repo("RDM-Digital-X"),
    consumes: ["tamv-core-kernel", "alamexa-design-system"],
    emits: ["TerritoryOverlayChanged"],
  },
  {
    slug: "real-del-monte-elevated",
    title: "Real del Monte Elevated",
    federation: "infra",
    layer: "domain",
    language: "TypeScript",
    summary: "Capa elevada — experiencia premium del territorio.",
    url: repo("real-del-monte-elevated"),
    consumes: ["tamv-core-kernel", "RDM-Digital-X"],
    emits: ["TerritoryOverlayChanged"],
  },
  {
    slug: "real-del-monte-twin",
    title: "Real del Monte Twin",
    federation: "infra",
    layer: "domain",
    language: "TypeScript",
    summary: "Gemelo digital del territorio RDM.",
    url: repo("real-del-monte-twin"),
    consumes: ["tamv-core-kernel", "RDM-Digital-X"],
    emits: ["TerritoryOverlayChanged"],
  },
  {
    slug: "rdm-turismodigital",
    title: "RDM Turismo Digital",
    federation: "logistics",
    layer: "domain",
    language: "TypeScript",
    summary: "Logística turística sobre el Nodo Cero.",
    url: repo("rdm-turismodigital"),
    consumes: ["tamv-core-kernel", "RDM-Digital-X", "real-del-monte-elevated"],
    emits: ["TerritoryOverlayChanged", "EconomyRecalculated"],
  },

  // ── DOCS ────────────────────────────────────────────────
  {
    slug: "documentacion-total-tamv-online",
    title: "Documentación Total",
    federation: "central",
    layer: "docs",
    language: "TypeScript",
    summary: "Recopilación completa del sistema TAMV.",
    url: repo("documentacion-total-tamv-online"),
    consumes: ["tamv-core-kernel"],
    emits: [],
  },
  {
    slug: "OsoPanda1",
    title: "Perfil Fundador",
    federation: "central",
    layer: "docs",
    language: "Python",
    summary: "Edwin O. Castillo Trejo — CEO Fundador. Mi sueño TAMV.",
    url: repo("OsoPanda1"),
    consumes: [],
    emits: [],
  },
];

export function reposByFederation(id: FederationId): Repo[] {
  return REPOS.filter((r) => r.federation === id);
}

export function repoBySlug(slug: string): Repo | undefined {
  return REPOS.find((r) => r.slug === slug);
}

/** Eventos de muestra para el BookPI (sembrados al cargar). */
export const SAMPLE_EVENTS = [
  { type: "ContractPublished", origin: "central", note: "@tamv/core-contracts@1.0.0 publicado" },
  { type: "IdentityUpdated", origin: "users", note: "12 alumnos UTAMV — sigilos GoS renovados" },
  { type: "TerritoryOverlayChanged", origin: "infra", note: "RDM-Twin sync: capa minería v3" },
  { type: "EconomyRecalculated", origin: "finance", note: "Reputación recalculada (+3 nodos)" },
  { type: "DeployTriggered", origin: "ops", note: "tamv-atlas → preview verde" },
  { type: "FederationHeartbeat", origin: "central", note: "7/7 federaciones activas" },
] as const;
