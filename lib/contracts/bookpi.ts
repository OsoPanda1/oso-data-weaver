import type { HeHepContext } from './elite-hehep';

export interface EliteHeHepHeader {
  id: string;
  createdAt: string;
  source: string;
  repository: string;
  protocol: string;
  type: string;
  he_hep_context: HeHepContext;
}

export interface EliteHeHepIntegrity {
  sha256: string;
  signature?: string;
}

export interface EliteHeHepEvent<TPayload = unknown, TMeta = unknown> {
  header: EliteHeHepHeader;
  payload: TPayload;
  meta?: TMeta;
  integrity: EliteHeHepIntegrity;
}

export interface BookPiTransport<TPayload = unknown, TMeta = unknown> {
  publish(event: EliteHeHepEvent<TPayload, TMeta>): Promise<EliteHeHepEvent<TPayload, TMeta>>;
}

export interface BookPiLedgerProjection {
  eventCount: number;
  eventTypes: Record<string, number>;
  domains: Record<string, number>;
  hexagons: Record<string, number>;
  latestEvent?: EliteHeHepEvent;
}
