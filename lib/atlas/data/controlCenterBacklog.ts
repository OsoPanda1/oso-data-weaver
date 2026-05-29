export type BacklogDomain = "feature" | "technical" | "security" | "ux" | "integration";
export type BacklogPriority = "P0" | "P1" | "P2" | "P3";
export type BacklogStatus = "TODO" | "IN_PROGRESS" | "BLOCKED" | "DONE";

export interface BacklogItem {
  id: string;
  title: string;
  description: string;
  domain: BacklogDomain;
  priority: BacklogPriority;
  status: BacklogStatus;
  owner: string;
  checkpoints: string[];
}

export interface ArchitectureLayer {
  id: string;
  title: string;
  focus: string;
  status: "SOLID" | "PARTIAL" | "MISSING";
}

export const ARCHITECTURE_LAYERS: ArchitectureLayer[] = [
  { id: "L1", title: "UI Platino/Glass", focus: "Layout principal, dashboard y estética cristal", status: "SOLID" },
  { id: "L2", title: "Nexo EOCT", focus: "Federaciones, carga cognitiva y estado operativo", status: "PARTIAL" },
  { id: "L3", title: "TAMVCrums ECG", focus: "Telemetría emocional agregada por rango temporal", status: "PARTIAL" },
  { id: "L4", title: "Data Layer", focus: "Hooks reutilizables, estado loading/error/success", status: "MISSING" },
  { id: "L5", title: "Kernel Control", focus: "Ignición fractal verificable y observabilidad", status: "MISSING" },
  { id: "L6", title: "Panteón Horus", focus: "Repositorio vivo unificado de proyectos y federaciones", status: "MISSING" },
];

export const CONTROL_CENTER_BACKLOG: BacklogItem[] = [
  {
    id: "CC-001",
    title: "Implementar Panteón Horus",
    description: "Vista de repos y proyectos clave con estado ACTIVO/HIBERNACIÓN/ARCHIVADO y acciones rápidas.",
    domain: "feature",
    priority: "P0",
    status: "TODO",
    owner: "Producto",
    checkpoints: ["Componente PanteonHorus", "Métricas por repo", "Acciones rápidas por federación"],
  },
  {
    id: "CC-002",
    title: "Verificar Ignición Fractal real",
    description: "Conectar estado global de ignición y exponer badge de sincronización completa con manejo de errores.",
    domain: "feature",
    priority: "P0",
    status: "IN_PROGRESS",
    owner: "Kernel",
    checkpoints: ["Estado global IDLE/RUNNING/ERROR/COMPLETED", "Mensajería de reintento", "Toasts de éxito/fallo"],
  },
  {
    id: "CC-003",
    title: "Conectar ECG a telemetría viva",
    description: "Sustituir mocks por agregación de logs reales y filtros por rango/federación.",
    domain: "feature",
    priority: "P0",
    status: "IN_PROGRESS",
    owner: "TAMVCrums",
    checkpoints: ["Agregación por hora/4h", "Leyenda dinámica", "Selector 24h/7d/30d"],
  },
  {
    id: "CC-004",
    title: "Visualizar anillo completo de 195 nodos",
    description: "Render circular por estado de nodo con tooltips y resaltado por federación.",
    domain: "feature",
    priority: "P1",
    status: "TODO",
    owner: "Nexo EOCT",
    checkpoints: ["Componente FederationRing", "Modo latido", "Optimización con memo"],
  },
  {
    id: "CC-005",
    title: "Tipado fuerte de dominio EOCT",
    description: "Consolidar tipos compartidos para Federation, Node, TamvcrumLog e IgnitionStatus.",
    domain: "technical",
    priority: "P1",
    status: "TODO",
    owner: "Arquitectura",
    checkpoints: ["src/core/types", "Eliminar estructuras inline", "Contrato único de estado"],
  },
  {
    id: "CC-006",
    title: "Hooks robustos para consultas/mutaciones",
    description: "Estandarizar data fetching con estados consistentes, refetch y fallback de errores.",
    domain: "technical",
    priority: "P1",
    status: "TODO",
    owner: "Plataforma",
    checkpoints: ["useSupabaseQuery", "useSupabaseMutation", "Skeletons por vista"],
  },
  {
    id: "CC-007",
    title: "RLS y seguridad de ignición",
    description: "Restringir acciones críticas al owner y trazar auditoría por user_id.",
    domain: "security",
    priority: "P0",
    status: "BLOCKED",
    owner: "Security",
    checkpoints: ["Políticas RLS", "Vincular auth.uid", "Registro de eventos críticos"],
  },
  {
    id: "CC-008",
    title: "Observabilidad del kernel",
    description: "Feed de eventos del kernel con heartbeat y categorización de errores.",
    domain: "technical",
    priority: "P1",
    status: "TODO",
    owner: "Observabilidad",
    checkpoints: ["Tabla tamv_kernel_events", "Indicador heartbeat", "Timeline de eventos"],
  },
  {
    id: "CC-009",
    title: "UX narrativa y tour guiado",
    description: "Añadir narrativa explicativa de paneles, tooltips clave y transiciones suaves.",
    domain: "ux",
    priority: "P2",
    status: "TODO",
    owner: "UX",
    checkpoints: ["Tour 4-5 pasos", "Tooltips de términos", "Responsive tablet/mobile"],
  },
  {
    id: "CC-010",
    title: "Integración GitHub avanzada",
    description: "Sincronizar repos de OsoPanda1 y mapearlos a federaciones con cache.",
    domain: "integration",
    priority: "P1",
    status: "TODO",
    owner: "Integraciones",
    checkpoints: ["Function de sync", "Tabla tamv_repositorio_panteon", "Botón Forzar Sync"],
  },
  {
    id: "CC-011",
    title: "Configurable profiles EOCT",
    description: "Configurar intervalos, etiquetas y modos por tabla de configuración editable.",
    domain: "technical",
    priority: "P2",
    status: "TODO",
    owner: "Kernel",
    checkpoints: ["Tabla tamv_config", "Hook useEoctConfig", "UI de edición"],
  },
  {
    id: "CC-012",
    title: "Unificación del Nexus 177 repos",
    description: "Estrategia de convergencia para consolidar repos dispersos en tamv-digital-nexus.",
    domain: "integration",
    priority: "P0",
    status: "IN_PROGRESS",
    owner: "Programa Nexus",
    checkpoints: ["Inventario por federación", "Matriz de dependencias", "Plan de migración por olas"],
  },
];
