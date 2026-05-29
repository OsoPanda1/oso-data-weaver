export interface WikiSection {
  id: string;
  title: string;
  icon: string;
  children: WikiPage[];
}

export interface WikiPage {
  slug: string;
  title: string;
  shortTitle?: string;
}

export const wikiStructure: WikiSection[] = [
  {
    id: "modulo-cero",
    title: "0 · Módulo Cero",
    icon: "🔷",
    children: [
      { slug: "introduccion", title: "Introducción conceptual" },
      { slug: "diferenciadores", title: "Por qué TAMV y qué nos diferencia" },
      { slug: "origen-proposito", title: "Origen, propósito y misión" },
      { slug: "biografia-ceo", title: "Biografía del CEO" },
      { slug: "humanismo-en-codigo", title: "Humanismo en código" },
      { slug: "fusion-wikis-externas", title: "Fusión de wikis externas" },
    ],
  },
  {
    id: "fundamentos-isni",
    title: "1 · Fundamentos ISNI",
    icon: "🧬",
    children: [
      { slug: "resumen-academico", title: "Resumen académico de ISNI" },
      { slug: "marco-teorico", title: "Marco teórico: SSI, DIDs y PIDs" },
      { slug: "conceptos-clave", title: "Conceptos clave de identidad" },
      { slug: "soberania-digital", title: "Soberanía digital y enfoque LATAM" },
    ],
  },
  {
    id: "arquitectura",
    title: "2 · Arquitectura ISNI",
    icon: "🏗️",
    children: [
      { slug: "capas-arquitectonicas", title: "Capas arquitectónicas" },
      { slug: "ontologia-formal", title: "Ontología formal JSON-LD" },
      { slug: "grafo-conocimiento", title: "Grafo de conocimiento TAMV" },
      { slug: "arquitectura-interoperable", title: "Arquitectura interoperable" },
    ],
  },
  {
    id: "modelado-identidades",
    title: "3 · Modelado de Identidades",
    icon: "🪪",
    children: [
      { slug: "tipos-identidad", title: "Tipos de identidad" },
      { slug: "integracion-pids", title: "Integración ORCID, DOI, ROR" },
      { slug: "comparacion-sistemas", title: "Comparación TAMV · ORCID · ROR" },
      { slug: "display-guidelines", title: "Directrices de visualización" },
    ],
  },
  {
    id: "ssi-did",
    title: "4 · SSI, DID y Soberanía",
    icon: "🔐",
    children: [
      { slug: "introduccion-ssi", title: "Introducción a SSI y DID" },
      { slug: "did-tamv", title: "Esquema did:tamv" },
      { slug: "credenciales-vc", title: "Credenciales verificables" },
      { slug: "principios-sovrin", title: "Principios SSI de Sovrin" },
    ],
  },
  {
    id: "perfiles-tamv",
    title: "5 · Sistema de Perfiles",
    icon: "👤",
    children: [
      { slug: "modelo-perfiles", title: "Modelo de datos de perfil" },
      { slug: "perfiles-academicos", title: "Perfiles académicos tipo ORCID" },
      { slug: "perfiles-org-territorio", title: "Perfiles de organizaciones" },
      { slug: "generacion-automatica", title: "Generación automática" },
    ],
  },
  {
    id: "flujos-viajes",
    title: "6 · Flujos y Visualizaciones",
    icon: "🔄",
    children: [
      { slug: "flujos-identidad", title: "Flujos de identidad" },
      { slug: "visualizaciones-grafo", title: "Visualizaciones del grafo" },
      { slug: "user-journeys", title: "Trayectorias de usuario" },
      { slug: "diagramas-secuencia", title: "Diagramas de secuencia" },
    ],
  },
  {
    id: "casos-uso",
    title: "7 · Casos de Uso",
    icon: "🗺️",
    children: [
      { slug: "casos-ssi-mundo", title: "Adopción SSI en el mundo" },
      { slug: "escenarios-tamv", title: "Escenarios en TAMV" },
      { slug: "integraciones-open-science", title: "Integraciones Open Science" },
      { slug: "roadmap-adopcion", title: "Roadmap de adopción" },
    ],
  },
  {
    id: "implementacion",
    title: "8 · Implementación Técnica",
    icon: "⚡",
    children: [
      { slug: "jsonld-implementacion", title: "JSON-LD en sitios TAMV" },
      { slug: "api-isni", title: "API ISNI y endpoints" },
      { slug: "webhooks-eventos", title: "Webhooks y eventos" },
      { slug: "cicd-pipelines", title: "CI/CD y pipelines" },
    ],
  },
  {
    id: "automatizacion",
    title: "9 · Automatización",
    icon: "🤖",
    children: [
      { slug: "generadores-perfiles", title: "Generadores de perfiles" },
      { slug: "sincronizacion-pids", title: "Sincronización con PIDs" },
      { slug: "busqueda-avanzada", title: "Búsqueda e indexación" },
      { slug: "herramientas", title: "Herramientas de mantenimiento" },
    ],
  },
  {
    id: "gobernanza",
    title: "10 · Gobernanza y Ética",
    icon: "🤝",
    children: [
      { slug: "gobernanza-documental", title: "Gobernanza documental" },
      { slug: "politicas-edicion", title: "Políticas de edición" },
      { slug: "etica-privacidad", title: "Ética, privacidad y equidad" },
      { slug: "metadatos-versionado", title: "Metadatos y versionado" },
    ],
  },
  {
    id: "referencias",
    title: "11 · Referencias",
    icon: "📚",
    children: [
      { slug: "referencias-academicas", title: "Referencias académicas" },
      { slug: "documentacion-estandares", title: "Documentación de estándares" },
      { slug: "recursos-smart-cities", title: "Smart Cities y Digital Twin" },
      { slug: "creditos", title: "Créditos y agradecimientos" },
    ],
  },
  {
    id: "metaverso-xr",
    title: "12 · Metaverso, XR e IA",
    icon: "🌐",
    children: [
      { slug: "isabella-ai", title: "Isabella AI: Ética y Arquitectura" },
      { slug: "dreamspaces-xr", title: "DreamSpaces y experiencias XR" },
      { slug: "rdm-pueblos-digitales", title: "RDM y Pueblos Digitales" },
      { slug: "korima-filosofia", title: "Filosofía Kórima y Códice" },
      { slug: "msr-blockchain", title: "MSR Blockchain y BookPI" },
      { slug: "economia-cuantica", title: "Economía cuántica y TEE" },
      { slug: "roadmap-civilizatorio", title: "Roadmap civilizatorio" },
      { slug: "dekateotl-seguridad", title: "DEKATEOTL: 11 capas de seguridad" },
    ],
  },
  {
    id: "modulo-omega",
    title: "Ω · Filosofía, Innovación y Valor Civilizatorio",
    icon: "🜂",
    children: [
      { slug: "manifiesto-tamv", title: "Manifiesto TAMV: una civilización escrita en código" },
      { slug: "filosofia-dekateotl", title: "Filosofía de diseño: DEKATEOTL, dignidad y vergüenza" },
      { slug: "isabella-secretaria", title: "Isabella Villaseñor: secretaria del fin de las excusas" },
      { slug: "wiki-vale-mas", title: "Por qué esta wiki vale más que su código" },
      { slug: "tamv-vs-industria", title: "TAMV vs la industria: un espejo incómodo" },
      { slug: "wiki-viva", title: "Wiki viva: cuando la documentación despliega mundos" },
    ],
  },
];
