import { appendFile, mkdir, readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { createHash, randomUUID } from 'node:crypto';

export const HE_HEXAGONS = ['HE-Ingest', 'HE-Transform', 'HE-Publish', 'HE-Science', 'HE-Economy', 'HE-Identity'];
export const HEP_DOMAINS = ['HEP-1', 'HEP-2', 'HEP-3', 'HEP-4', 'HEP-5', 'HEP-6', 'HEP-7'];
export const KERNEL_ELITE_CONTEXT = { hexagon: 'HE-Publish', domain: 'HEP-1' };

export function sortKeys(value) {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (!value || typeof value !== 'object') return value;
  return Object.keys(value).sort().reduce((acc, key) => {
    acc[key] = sortKeys(value[key]);
    return acc;
  }, {});
}

export function sha256(value) {
  return createHash('sha256').update(JSON.stringify(sortKeys(value))).digest('hex');
}

export function validateHeHepContext(context) {
  if (!context || !HE_HEXAGONS.includes(context.hexagon) || !HEP_DOMAINS.includes(context.domain)) {
    throw new Error(`Invalid ELITE HeHep context: ${JSON.stringify(context)}`);
  }
  return context;
}

export function validateEliteHeHepEvent(event) {
  validateHeHepContext(event?.header?.he_hep_context);
  for (const key of ['id', 'createdAt', 'source', 'repository', 'protocol', 'type']) {
    if (!event.header[key]) throw new Error(`Invalid BookPI event header: missing ${key}.`);
  }
  const { integrity, ...unsignedEvent } = event;
  if (integrity?.sha256 !== sha256(unsignedEvent)) {
    throw new Error('Invalid BookPI event integrity hash.');
  }
  return event;
}

export async function emitEliteBookPiEvent(params) {
  const heContext = validateHeHepContext(params.context ?? KERNEL_ELITE_CONTEXT);
  const header = {
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
    payload: params.payload ?? {},
    meta: params.meta,
  };
  const event = {
    ...unsignedEvent,
    integrity: { sha256: sha256(unsignedEvent) },
  };
  validateEliteHeHepEvent(event);
  if (params.transport?.publish) return params.transport.publish(event);
  return event;
}

export async function appendBookPiEvent(event, stateDir = '.tamv/state') {
  validateEliteHeHepEvent(event);
  const file = resolve(stateDir, 'bookpi-events.jsonl');
  await mkdir(dirname(file), { recursive: true });
  await appendFile(file, `${JSON.stringify(event)}\n`, 'utf8');
  return event;
}

export async function emitLocalEliteBookPiEvent(params, stateDir = '.tamv/state') {
  const event = await emitEliteBookPiEvent(params);
  await appendBookPiEvent(event, stateDir);
  return event;
}

export async function readBookPiEvents(stateDir = '.tamv/state') {
  try {
    const text = await readFile(resolve(stateDir, 'bookpi-events.jsonl'), 'utf8');
    return text.split('\n').filter(Boolean).map((line) => JSON.parse(line));
  } catch (error) {
    if (error.code === 'ENOENT') return [];
    throw error;
  }
}

export async function projectBookPiLedger(stateDir = '.tamv/state') {
  const events = await readBookPiEvents(stateDir);
  return events.reduce((projection, event) => {
    projection.eventCount += 1;
    projection.eventTypes[event.header.type] = (projection.eventTypes[event.header.type] ?? 0) + 1;
    projection.domains[event.header.he_hep_context.domain] = (projection.domains[event.header.he_hep_context.domain] ?? 0) + 1;
    projection.hexagons[event.header.he_hep_context.hexagon] = (projection.hexagons[event.header.he_hep_context.hexagon] ?? 0) + 1;
    projection.latestEvent = event;
    return projection;
  }, { eventCount: 0, eventTypes: {}, domains: {}, hexagons: {}, latestEvent: null });
}
