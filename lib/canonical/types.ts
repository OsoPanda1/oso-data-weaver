/**
 * TAMV/UTAMV/ATLAS — Modelo Canónico Unificado.
 * Fuente única de verdad para nodos, aristas y eventos del kernel.
 */

export type NodeType =
  | "ROOT"
  | "DOCUMENT"
  | "REPOSITORY"
  | "PROTOCOL"
  | "SKILL"
  | "PERSONA"
  | "MODEL"
  | "POLICY"
  | "EVENT"
  | "PIPELINE"
  | "FEDERATION"
  | "EDGE_ENTITY";

export interface CanonicalState {
  integrity: "VALID" | "CORRUPTED" | "UNKNOWN";
  constitutional: "APPROVED" | "BLOCKED" | "PENDING";
  synchronization: "SYNCED" | "DIVERGED" | "STALE";
  operational: "ACTIVE" | "INACTIVE" | "DEGRADED";
}

export interface CanonicalMetadata {
  createdAt: string;
  updatedAt: string;
  source: string;
  author?: string;
  version?: string;
  doi?: string;
  orcid?: string;
  license?: string;
  checksum?: string;
}

export interface CanonicalSemantic {
  ontologyClass: string;
  tags: string[];
  language?: string;
  embeddingId?: string;
  confidence?: number;
  scope?: "core" | "extended" | "federated";
}

export type CanonicalRelation =
  | "depends_on"
  | "derived_from"
  | "validated_by"
  | "implements"
  | "extends"
  | "causes"
  | "synchronized_with"
  | "governed_by";

export interface CanonicalEdge {
  id: string;
  from: string;
  to: string;
  relation: CanonicalRelation;
  weight?: number;
  confidence?: number;
}

export interface CanonicalDependency {
  sourceNode: string;
  targetNode: string;
  criticality: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  type: "semantic" | "runtime" | "constitutional" | "historical" | "identity";
}

export interface CanonicalLineage {
  ancestor: string;
  descendant: string;
  transformationType: "fork" | "fusion" | "evolution" | "migration" | "compilation";
  timestamp: string;
}

export interface CanonicalNode {
  id: string;
  type: NodeType;
  title: string;
  canonicalHash: string;
  identityHash?: string;
  versionHash?: string;
  metadata: CanonicalMetadata;
  semantic: CanonicalSemantic;
  relations: CanonicalEdge[];
  dependencies: CanonicalDependency[];
  lineage: CanonicalLineage[];
  state: CanonicalState;
  body?: string;
}

export type CanonicalEventType =
  | "NODE_CREATED"
  | "NODE_UPDATED"
  | "NODE_MERGED"
  | "NODE_BLOCKED"
  | "EDGE_ADDED"
  | "EDGE_REMOVED"
  | "POLICY_EVALUATED"
  | "SNAPSHOT_CREATED";

export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [k: string]: JsonValue };

export interface CanonicalEvent {
  eventId: string;
  eventType: CanonicalEventType;
  timestamp: string;
  actorId: string;
  nodeId?: string;
  payload: { [k: string]: JsonValue };
  prevHash: string;
  eventHash: string;
  signature: string;
}

export interface EvidenceDoc {
  nodeId: string;
  title: string;
  excerpt: string;
  score: number;
  source: string;
  citation: {
    doi?: string;
    orcid?: string;
    sha256: string;
  };
}
