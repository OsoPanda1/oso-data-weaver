/**
 * CQRS Event Sourcing Types
 * Events are immutable facts about state changes
 */

export type EventType =
  | 'OrcidLinked'
  | 'OrcidUnlinked'
  | 'GitHubLinked'
  | 'ZenodoLinked'
  | 'ZenodoUnlinked'
  | 'FigshareLinked'
  | 'FigshareUnlinked'
  | 'ArtifactCreated'
  | 'ArtifactPublished'
  | 'ArtifactArchived'
  | 'ZenodoDepositDraftCreated'
  | 'ZenodoDepositPublished'
  | 'FigshareItemCreated'
  | 'FigshareItemPublished'
  | 'TamvArtifactPublished'
  | 'CommandFailed'
  | 'AuditLog';

export interface TamvInternalEvent {
  eventId: string; // UUID v4, unique
  commandId: string; // originating command UUID
  type: EventType;
  aggregateId: string; // entity ID (userId, artifactId, etc.)
  aggregateType: 'User' | 'Artifact' | 'Integration';
  timestamp: string; // ISO 8601
  version: number; // event version
  data: Record<string, unknown>; // event payload
  metadata?: {
    userId?: string;
    source?: string; // 'API', 'UI', 'WEBHOOK'
    ipAddress?: string;
    userAgent?: string;
  };
  correlationId?: string; // trace ID
  causeId?: string; // previous event that caused this
}

/**
 * Outbox entry for reliable event delivery
 */
export interface OutboxEntry {
  id: string; // UUID
  event: TamvInternalEvent;
  destination: 'bookpi' | 'webhook' | 'stream';
  status: 'pending' | 'sent' | 'failed';
  attempt: number;
  lastAttemptAt?: string;
  nextRetryAt?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Event Store snapshot for performance
 */
export interface EventSnapshot {
  aggregateId: string;
  aggregateType: string;
  version: number;
  state: Record<string, unknown>;
  timestamp: string;
}
