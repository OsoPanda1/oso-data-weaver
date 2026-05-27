import { createHash, randomUUID } from 'node:crypto';
import type { BookPiTransport, EliteHeHepEvent, EliteHeHepHeader } from './bookpi';
import { KERNEL_ELITE_CONTEXT, validateHeHepContext, type HeHepContext } from './elite-hehep';

export interface EmitEliteBookPiEventParams<TPayload, TMeta> {
  protocol: string;
  type: string;
  source: string;
  repository: string;
  payload: TPayload;
  meta?: TMeta;
  context?: HeHepContext;
  transport?: BookPiTransport<TPayload, TMeta>;
}

export function stableJson(value: unknown): string {
  return JSON.stringify(sortKeys(value));
}

export function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (!value || typeof value !== 'object') return value;
  return Object.keys(value as Record<string, unknown>).sort().reduce<Record<string, unknown>>((acc, key) => {
    acc[key] = sortKeys((value as Record<string, unknown>)[key]);
    return acc;
  }, {});
}

export function sha256(value: unknown): string {
  return createHash('sha256').update(stableJson(value)).digest('hex');
}

export function validateEliteHeHepEvent<TPayload, TMeta>(event: EliteHeHepEvent<TPayload, TMeta>): EliteHeHepEvent<TPayload, TMeta> {
  validateHeHepContext(event.header.he_hep_context);
  if (!event.header.id || !event.header.createdAt || !event.header.source || !event.header.repository || !event.header.type) {
    throw new Error('Invalid BookPI event header: missing required identity fields.');
  }
  const { integrity, ...unsignedEvent } = event;
  if (integrity.sha256 !== sha256(unsignedEvent)) {
    throw new Error('Invalid BookPI event integrity hash.');
  }
  return event;
}

export async function emitEliteBookPiEvent<TPayload, TMeta = Record<string, never>>(
  params: EmitEliteBookPiEventParams<TPayload, TMeta>,
): Promise<EliteHeHepEvent<TPayload, TMeta>> {
  const heContext = validateHeHepContext(params.context ?? KERNEL_ELITE_CONTEXT);
  const header: EliteHeHepHeader = {
    id: randomUUID(),
    createdAt: new Date().toISOString(),
    source: params.source,
    repository: params.repository,
    protocol: params.protocol,
    type: params.type,
    he_hep_context: heContext,
  };
  const unsignedEvent = {
    header,
    payload: params.payload,
    meta: params.meta,
  };
  const event: EliteHeHepEvent<TPayload, TMeta> = {
    ...unsignedEvent,
    integrity: {
      sha256: sha256(unsignedEvent),
    },
  };
  validateEliteHeHepEvent(event);
  if (params.transport) return params.transport.publish(event);
  return event;
}
