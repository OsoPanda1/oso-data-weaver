export type OfferProfile =
  | "usuarios"
  | "creadores"
  | "inversionistas"
  | "desarrolladores"
  | "empresas"
  | "gobiernos";

export type OfferItem = {
  profile: OfferProfile;
  category: "modulo" | "funcion" | "programa" | "protocolo" | "herramienta" | "servicio" | "beneficio";
  title: string;
  description: string;
};

export const TAMV_OFFER_CATALOG: OfferItem[] = [
  { profile: "usuarios", category: "modulo", title: "Red social avanzada", description: "Experiencia social con reputación y control soberano de datos." },
  { profile: "usuarios", category: "modulo", title: "Universidad TAMV", description: "Formación y certificaciones digitales orientadas a habilidades aplicadas." },
  { profile: "usuarios", category: "funcion", title: "Streaming XR/4D", description: "Transmisiones inmersivas con participación en tiempo real." },
  { profile: "usuarios", category: "beneficio", title: "Control de identidad", description: "Privacidad selectiva y gestión soberana del perfil digital." },

  { profile: "creadores", category: "modulo", title: "Canales premium", description: "Suscripciones y distribución de contenido exclusivo." },
  { profile: "creadores", category: "funcion", title: "Marketplace NFT", description: "Publicación, venta y trazabilidad de obras digitales." },
  { profile: "creadores", category: "programa", title: "FairSplit", description: "Reparto proporcional de ingresos según aporte y reputación." },
  { profile: "creadores", category: "beneficio", title: "Royalties automáticos", description: "Compensación programática por uso de contenido." },

  { profile: "inversionistas", category: "modulo", title: "Banco digital", description: "Paneles y herramientas financieras para operaciones digitales." },
  { profile: "inversionistas", category: "funcion", title: "Dashboards de métricas", description: "Monitoreo de desempeño y actividad económica del ecosistema." },
  { profile: "inversionistas", category: "protocolo", title: "Escrow inteligente", description: "Custodia condicional y liberación automática de fondos." },
  { profile: "inversionistas", category: "beneficio", title: "Transparencia auditable", description: "Trazabilidad para seguimiento de decisiones y flujos." },

  { profile: "desarrolladores", category: "modulo", title: "TAMV Core API", description: "APIs base para integración de productos y servicios." },
  { profile: "desarrolladores", category: "funcion", title: "SDK XR/VR", description: "Herramientas para construir experiencias inmersivas." },
  { profile: "desarrolladores", category: "programa", title: "Bounties éticos", description: "Incentivos para contribuciones técnicas verificables." },
  { profile: "desarrolladores", category: "servicio", title: "Documentación y mentoría", description: "Soporte técnico y rutas de aprendizaje." },

  { profile: "empresas", category: "modulo", title: "TAMV Enterprise", description: "Suite para digitalización comercial e interoperabilidad." },
  { profile: "empresas", category: "funcion", title: "Integración de pagos", description: "Conectividad con pasarelas y medios de cobro." },
  { profile: "empresas", category: "servicio", title: "Cumplimiento y antifraude", description: "Controles y auditoría de operaciones empresariales." },
  { profile: "empresas", category: "beneficio", title: "Expansión de mercado", description: "Alcance internacional con gobernanza trazable." },

  { profile: "gobiernos", category: "modulo", title: "Gobernanza digital", description: "Infraestructura para decisiones públicas con trazabilidad." },
  { profile: "gobiernos", category: "funcion", title: "Registro memorial", description: "Preservación de identidad y memoria institucional." },
  { profile: "gobiernos", category: "protocolo", title: "Sovereign Connect", description: "Interoperabilidad segura entre entidades y ciudadanos." },
  { profile: "gobiernos", category: "beneficio", title: "Autonomía tecnológica", description: "Capacidad de operación digital no capturable." },
];
