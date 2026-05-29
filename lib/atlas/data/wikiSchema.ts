export type WikiSectionId =
  | "manifiesto"
  | "lenguaje"
  | "sistema-civilizatorio"
  | "modulos"
  | "federaciones"
  | "roles"
  | "infra-backend"
  | "isabella"
  | "blindaje-legal"
  | "tokenomics"
  | "utamv"
  | "rdm-territorial"
  | "marketing"
  | "roadmap";

export type WikiChildKind = "chapter" | "module" | "federation" | "role";

export interface WikiChild {
  slug: string;
  title: string;
  kind: WikiChildKind;
}

export interface WikiSection {
  id: WikiSectionId;
  title: string;
  description: string;
  children?: WikiChild[];
}

export const WIKI_SECTIONS: WikiSection[] = [
  {
    id: "sistema-civilizatorio",
    title: "Sistema Civilizatorio TAMV",
    description:
      "Despliegue del TAMV_Atlas_Documento_Maestro_Integrado_v2 por capítulos.",
    children: [
      { slug: "capitulo-1-fundamentos", title: "Capítulo 1 · Fundamentos", kind: "chapter" },
      { slug: "capitulo-2-ejes", title: "Capítulo 2 · Ejes", kind: "chapter" },
      { slug: "capitulo-3-capacidades", title: "Capítulo 3 · Capacidades", kind: "chapter" },
      { slug: "capitulo-4-gobernanza", title: "Capítulo 4 · Gobernanza", kind: "chapter" },
      { slug: "capitulo-5-integracion", title: "Capítulo 5 · Integración", kind: "chapter" },
    ],
  },
  {
    id: "modulos",
    title: "Módulos 1–11 del Ecosistema",
    description: "Descripción funcional y técnica de cada módulo TAMV.",
    children: Array.from({ length: 11 }, (_, idx) => ({
      slug: `modulo-${idx + 1}`,
      title: `Módulo ${idx + 1}`,
      kind: "module" as const,
    })),
  },
  {
    id: "federaciones",
    title: "Federaciones TAMV",
    description: "Detalle de FED-01 a FED-07.",
    children: [
      { slug: "fed-01-isni-identidad-soberana", title: "FED-01 · ISNI / Identidad Soberana", kind: "federation" },
      { slug: "fed-02-mdx-kernel", title: "FED-02 · MD-X Kernel Operativo", kind: "federation" },
      { slug: "fed-03-isabella", title: "FED-03 · Isabella Villaseñor AI", kind: "federation" },
      { slug: "fed-04-utamv", title: "FED-04 · UTAMV Academia", kind: "federation" },
      { slug: "fed-05-rdm-territorial", title: "FED-05 · RDM Territorial", kind: "federation" },
      { slug: "fed-06-bookpi-etica", title: "FED-06 · BookPI / Ética", kind: "federation" },
      { slug: "fed-07-integracion-global", title: "FED-07 · Integración Global", kind: "federation" },
    ],
  },
  {
    id: "roles",
    title: "Roles y niveles de acceso",
    description: "Ciudadano, Desarrollador, Partner, Academia, Gobierno.",
    children: [
      { slug: "rol-ciudadano", title: "Rol · Ciudadano / Usuario", kind: "role" },
      { slug: "rol-desarrollador", title: "Rol · Desarrollador", kind: "role" },
      { slug: "rol-partner", title: "Rol · Empresario / Partner", kind: "role" },
      { slug: "rol-academia", title: "Rol · Academia / Investigador", kind: "role" },
      { slug: "rol-gobierno", title: "Rol · Gobierno / Institución", kind: "role" },
    ],
  },
  {
    id: "infra-backend",
    title: "Infraestructura Técnica y Backend Hardened",
    description: "Despliegue de TAMV-HARDENED-BACKEND-SETUP y IMPLEMENTACION-TECNICA.",
  },
  {
    id: "isabella",
    title: "Isabella Villaseñor AI",
    description: "Arquitectura multi-agente, auditoría y logging en Supabase.",
  },
  {
    id: "blindaje-legal",
    title: "Blindaje Legal y Estándares",
    description: "TOS, certificados, UNESCO, GDPR, ICCPR, UNDRIP, etc.",
  },
  {
    id: "tokenomics",
    title: "Tokenomics TAMV y MSR",
    description: "Documento blockchain_msr y economía creativa.",
  },
  {
    id: "utamv",
    title: "UTAMV y Ciencia Abierta",
    description: "ORCID, DOIs, Zenodo, OpenAIRE, producción científica.",
  },
  {
    id: "rdm-territorial",
    title: "RDM Territorial y XR/Smart Destinations",
    description: "Pueblos digitales, destinos inteligentes, XR/4D.",
  },
  {
    id: "marketing",
    title: "Marketing Digital y Posicionamiento",
    description: "Mensajes, pitch, comparativa competitiva.",
  },
  {
    id: "roadmap",
    title: "Roadmap, Riesgos y Métricas",
    description: "Hitos 2026–2027, KPIs y mitigación de riesgos.",
  },
  {
    id: "manifiesto",
    title: "Manifiesto TAMV",
    description: "Visión filosófica, narrativa civilizatoria y principios operativos.",
  },
  {
    id: "lenguaje",
    title: "Lenguaje y semántica TAMV",
    description: "Glosario canónico, taxonomía y estándares semánticos.",
  },
];
