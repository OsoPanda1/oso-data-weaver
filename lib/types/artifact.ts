/**
 * TAMV Knowledge Engine v4.0 - Cognitive Graph Data Model
 * Del almacenamiento estático a grafos event-sourced operados por agentes.
 *
 * Este modelo está diseñado para:
 * - Integrarse con el TAMV Core Kernel (MD-X4, BookPI, GitHub-ledger).
 * - Ser base de JSON Schemas estrictos (tamv-identity-ledger / artifact-ledger).
 * - Ser consumible por agentes (Lovable, Cursor, Isabella, etc.) como grafo cognitivo.
 */

// -----------------------------
//  Tipos base y utilidades
// -----------------------------

export type ResourceTier = 'EDGE' | 'CLOUD' | 'QUANTUM';

export type CellType =
  | 'Render3D'
  | 'Render4D'
  | 'IA-ImmersiveFX'
  | 'QuantumChannel'
  | 'SensorMultiFX'
  | 'APIIntegration'
  | 'Analytics'
  | 'UIControl'
  | 'SpatialLogic'
  | 'LedgerProjection'      // Proyección de estados desde GitHub/BookPI
  | 'ReasoningPipeline';    // Pipelines de inferencia multi-celda

export type ArtifactType = 'CODE' | 'DATASET' | 'PAPER' | 'SPEC' | 'MIXED';

export type ArtifactStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';

export type SignatureScheme = 'ED25519' | 'ETH_SIGN' | 'PGP';

export type RelationType = 'requires' | 'extends' | 'composes' | 'streamsFrom' | 'mirrors';

// -----------------------------
//  Capacidades de ejecución
// -----------------------------

/**
 * ExecutionCapability
 * Define qué puede hacer una KnowledgeCell, en qué capa y con qué garantías.
 */
export interface ExecutionCapability {
  capabilityId: string;
  minResourceTier: ResourceTier;
  latencyConstraintMs: number;
  isDeterministic: boolean;       // Clave para ciencia reproducible
  maxConcurrency?: number;        // Control de carga
  requiresTrustedEnv?: boolean;   // Solo entornos verificados (ej. UTAMV cluster)
}

// -----------------------------
//  Provenance y directivas cognitivas
// -----------------------------

/**
 * BuildProvenance
 * Fuente y entorno de compilación/ejecución, base de reproducibilidad fuerte.
 */
export interface BuildProvenance {
  sourceHash: string;             // hash Git (árbol/commit)
  buildEnvironment: string;       // descripción o hash (Nix/Guix/Contenedor)
  toolchainVersion: string;       // versión del toolchain principal
  verifiedAt: string;             // ISO8601
  verifierId?: string;            // ORCID/TAMV user que verificó
}

/**
 * CognitiveDirective
 * Contrato para agentes cognitivos que operan la celda.
 */
export interface CognitiveDirective {
  systemPrompt: string;           // Instrucción núcleo para la IA
  contextScope: string[];         // Namespaces/datasets que puede ver
  safetyConstraints: string[];    // Reglas de uso ético / límites
  maxTokens?: number;             // Límite de tokens / contexto
}

// -----------------------------
//  KnowledgeCell: nodo cognitivo
// -----------------------------

/**
 * KnowledgeCell v4
 * Microservicio cognitivo autodocumentado, trazable y gobernable.
 */
export interface KnowledgeCell {
  id: string;
  type: CellType;
  version: string;

  capabilities: ExecutionCapability[];
  provenance: BuildProvenance;
  cognitiveDirective: CognitiveDirective;

  apiEndpoint: string;            // Endpoint HTTP/GraphQL/gRPC
  microserviceUrl: string;        // URL de despliegue

  lastHeartbeatAt: string;        // Último heartbeat (observabilidad)
  updatedAt: string;

  // Seguridad y acceso
  accessPolicy: {
    allowedRoles: string[];       // p.ej. ['KERNEL', 'UTAMV_AGENT', 'PUBLIC_VIEW']
    requiresOrcid?: boolean;      // ¿Requiere identidad académica?
  };
}

// -----------------------------
//  TAMVArtifact: unidad de consenso científico
// -----------------------------

export interface TAMVArtifactAuthor {
  tamvUserId: string;
  orcid?: string;
  role: 'CONTRIBUTOR' | 'PRINCIPAL';
}

export interface TAMVArtifactGitTarget {
  hash: string;                   // commit/tree hash
  branch: string;
  repo: string;                   // nombre del repo GitHub
}

export interface TAMVArtifactAcademicTarget {
  doi?: string;
  platform?: 'ZENODO' | 'FIGSHARE';
  depositId?: number;
  url?: string;
}

export interface TAMVArtifactIntegrity {
  contentHash: string;            // SHA-256 del artefacto final
  signature: string;              // Firma criptográfica del autor
  signedAt: string;               // ISO8601
  signatureScheme: SignatureScheme;
}

/**
 * TAMVArtifact v4
 * Unidad de consenso científico + enrutador multicanal (GitHub/Zenodo/Figshare).
 */
export interface TAMVArtifact {
  id: string;
  type: ArtifactType;

  metadata: {
    title: string;
    description: string;
    keywords?: string[];
    authors: TAMVArtifactAuthor[];
  };

  targets: {
    git: TAMVArtifactGitTarget;
    academic: TAMVArtifactAcademicTarget;
    extra?: Record<string, unknown>; // extensiones (Software Heritage, etc.)
  };

  integrity: TAMVArtifactIntegrity;

  status: ArtifactStatus;
  createdAt: string;
  updatedAt: string;
}

// -----------------------------
//  Grafo de conocimiento
// -----------------------------

export interface KnowledgeRelation {
  from: string;                   // cell id
  to: string;                     // cell id
  type: RelationType;
  weight: number;                 // Fuerza de la relación
  lastUpdatedAt: string;
}

/**
 * KnowledgeRepo v4
 * Grafo de KnowledgeCells + relaciones, versionado por eventos.
 */
export interface KnowledgeRepo {
  cells: Record<string, KnowledgeCell>;
  relations: KnowledgeRelation[];

  topologyHash: string;           // Hash Merkle del grafo completo
  lastEventId: string;            // Último evento procesado (event sourcing)
  updatedAt: string;
}

// -----------------------------
//  Eventos de dominio (para CQRS / event sourcing)
// -----------------------------

export type TamvKnowledgeEventType =
  | 'KnowledgeCellRegistered'
  | 'KnowledgeCellUpdated'
  | 'KnowledgeRelationDefined'
  | 'TamvArtifactCreated'
  | 'TamvArtifactUpdated'
  | 'TamvArtifactPublished'
  | 'TopologyRecomputed';

export interface TamvKnowledgeEvent {
  eventId: string;                // UUID
  type: TamvKnowledgeEventType;
  occurredAt: string;             // ISO8601
  actorId: string;                // userId / agentId
  payload: Record<string, unknown>;
  prevEventId?: string;

  topologyHashBefore?: string;
  topologyHashAfter?: string;

  contentHash: string;            // hash del payload normalizado
}

// -----------------------------
//  Interfaces de proveedores externos
// -----------------------------

/**
 * ArtifactProvider
 * Abstracción que implementan Zenodo/Figshare u otros backends.
 */
export interface ArtifactProvider {
  createDraft(artifact: TAMVArtifact): Promise<{ remoteId: string | number }>;

  uploadFile(params: {
    artifact: TAMVArtifact;
    remoteId: string | number;
    filePath: string;
  }): Promise<void>;

  publish(
    artifact: TAMVArtifact,
    remoteId: string | number,
  ): Promise<{ doiOrId: string; url?: string }>;
}

/**
 * IdentityProvider
 * Abstracción para proveedores de identidad académica (ORCID, etc.).
 */
export interface IdentityProvider {
  linkIdentity(params: {
    userId: string;
    authCode: string;
    redirectUri: string;
  }): Promise<{
    orcid?: string;
    scope: string;
    rawResponse: Record<string, unknown>;
  }>;
}
