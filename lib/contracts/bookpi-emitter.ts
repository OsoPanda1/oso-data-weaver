import { createHash, randomUUID } from 'node:crypto';
import type {
  BookPiTransport,
  EliteHeHepEvent,
  EliteHeHepHeader,
} from './bookpi';
import {
  KERNEL_ELITE_CONTEXT,
  validateHeHepContext,
  type HeHepContext,
} from './elite-hehep';
import {
  inferDoctrineTags,
  inferTerritory,
  sha256 as doctrineSha256,
  sortKeys as doctrineSortKeys,
} from './elite-bookpi-doctrine'; // puedes apuntar al módulo doctrinal que ya tienes

export interface EmitEliteBookPiEventParams<TPayload, TMeta> {
  protocol: string;
  type: string;
  source: string;
  repository: string;
  payload: TPayload;
  meta?: TMeta & {
    doctrine?: string;
    doctrineTags?: string[];
    territory?: string | null;
  };
  context?: HeHepContext;
  transport?: BookPiTransport<TPayload, TMeta>;
}

export function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (!value || typeof value !== 'object') return value;
  return Object.keys(value as Record<string, unknown>)
    .sort()
    .reduce<Record<string, unknown>>((acc, key) => {
      acc[key] = sortKeys((value as Record<string, unknown>)[key]);
      return acc;
    }, {});
}

export function stableJson(value: unknown): string {
  return JSON.stringify(sortKeys(value));
}

export function sha256(value: unknown): string {
  // Mantengo sha256 local, pero podría delegar en doctrineSha256 si quieres una sola fuente
  return createHash('sha256').update(stableJson(value)).digest('hex');
}

export function validateEliteHeHepEvent<TPayload, TMeta>(
  event: EliteHeHepEvent<TPayload, TMeta>,
): EliteHeHepEvent<TPayload, TMeta> {
  validateHeHepContext(event.header.he_hep_context);

  for (const key of ['id', 'createdAt', 'source', 'repository', 'type'] as const) {
    if (!event.header[key]) {
      throw new Error(
        `Invalid BookPI event header: missing required identity field "${key}".`,
      );
    }
  }

  if (!event.integrity?.sha256) {
    throw new Error('Invalid BookPI event: missing integrity.sha256.');
  }

  const { integrity, ...unsignedEvent } = event as any;
  if (integrity.sha256 !== sha256(unsignedEvent)) {
    throw new Error('Invalid BookPI event integrity hash.');
  }

  return event;
}

export async function emitEliteBookPiEvent<
  TPayload,
  TMeta extends Record<string, unknown> = Record<string, never>,
>(
  params: EmitEliteBookPiEventParams<TPayload, TMeta>,
): Promise<EliteHeHepEvent<TPayload, TMeta>> {
  const heContext = validateHeHepContext(
    params.context ?? KERNEL_ELITE_CONTEXT,
  );

  const header: EliteHeHepHeader = {
    id: randomUUID(),
    createdAt: new Date().toISOString(),
    source: params.source,
    repository: params.repository,
    protocol: params.protocol,
    type: params.type,
    he_hep_context: heContext,
  };

  const baseMeta: Record<string, unknown> = params.meta ? { ...params.meta } : {};

  // Doctrina por defecto MD-X4 si no viene especificada
  if (!baseMeta.doctrine) {
    baseMeta.doctrine = 'MD-X4';
  }

  // Enriquecer doctrineTags y territory usando el módulo de inferencia doctrinal
  const doctrineTags =
    baseMeta.doctrineTags ??
    inferDoctrineTags({
      header,
      payload: params.payload,
      meta: baseMeta,
    });

  const territory =
    baseMeta.territory ??
    inferTerritory({
      header,
      payload: params.payload,
      meta: baseMeta,
    });

  const unsignedEvent = {
    header,
    payload: params.payload,
    meta: {
      ...baseMeta,
      doctrineTags,
      territory,
    } as TMeta,
  };

  const event: EliteHeHepEvent<TPayload, TMeta> = {
    ...unsignedEvent,
    integrity: {
      sha256: sha256(unsignedEvent),
    },
  };

  validateEliteHeHepEvent(event);

  if (params.transport) {
    return params.transport.publish(event);
  }

  return event;
}
