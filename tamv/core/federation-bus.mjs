import { mkdir, readFile, writeFile, appendFile, readdir, stat } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { createHash, randomUUID } from 'node:crypto';

export const TAMV_PROTOCOL = 'tamv-federation-v1';
export const DEFAULT_STATE_DIR = '.tamv/state';
export const EVENT_FILE = 'events.jsonl';

export class TamvFederationError extends Error {
  constructor(message, details = {}) {
    super(message);
    this.name = 'TamvFederationError';
    this.details = details;
  }
}

export function sortKeys(value) {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (!value || typeof value !== 'object') return value;
  return Object.keys(value).sort().reduce((acc, key) => {
    acc[key] = sortKeys(value[key]);
    return acc;
  }, {});
}

export function stableHash(value) {
  return createHash('sha256').update(JSON.stringify(sortKeys(value))).digest('hex');
}

export async function pathExists(path) {
  try {
    await stat(path);
    return true;
  } catch (error) {
    if (error.code === 'ENOENT') return false;
    throw error;
  }
}

export function validateManifest(manifest) {
  const required = ['protocol', 'nodeId', 'repository', 'role', 'version', 'capabilities', 'channels', 'state'];
  const missing = required.filter((key) => manifest?.[key] === undefined);
  if (missing.length) {
    throw new TamvFederationError('Invalid TAMV manifest: missing required fields.', { missing });
  }
  if (manifest.protocol !== TAMV_PROTOCOL) {
    throw new TamvFederationError('Unsupported TAMV federation protocol.', {
      expected: TAMV_PROTOCOL,
      received: manifest.protocol,
    });
  }
  if (!Array.isArray(manifest.capabilities)) {
    throw new TamvFederationError('Invalid TAMV manifest: capabilities must be an array.');
  }
  if (!Array.isArray(manifest.channels?.publishes) || !Array.isArray(manifest.channels?.subscribes)) {
    throw new TamvFederationError('Invalid TAMV manifest: channels.publishes and channels.subscribes must be arrays.');
  }
  return manifest;
}

export async function readJson(path) {
  return JSON.parse(await readFile(path, 'utf8'));
}

export async function writeJson(path, value) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(sortKeys(value), null, 2)}\n`, 'utf8');
  return value;
}

export async function loadManifest(path = 'tamv/node.manifest.json') {
  return validateManifest(await readJson(path));
}

export function createEvent(manifest, type, payload = {}, meta = {}) {
  validateManifest(manifest);
  if (!type || typeof type !== 'string') {
    throw new TamvFederationError('Event type must be a non-empty string.');
  }
  const event = {
    id: randomUUID(),
    protocol: TAMV_PROTOCOL,
    type,
    source: manifest.nodeId,
    repository: manifest.repository,
    createdAt: new Date().toISOString(),
    payload,
    meta: {
      role: manifest.role,
      version: manifest.version,
      ...meta,
    },
  };
  return { ...event, integrity: stableHash(event) };
}

export function verifyEventIntegrity(event) {
  if (!event?.integrity) return false;
  const { integrity, ...unsignedEvent } = event;
  return stableHash(unsignedEvent) === integrity;
}

export async function appendEvent(event, stateDir = DEFAULT_STATE_DIR) {
  if (!verifyEventIntegrity(event)) {
    throw new TamvFederationError('Refusing to append event with invalid integrity.', { eventId: event?.id });
  }
  const file = resolve(stateDir, EVENT_FILE);
  await mkdir(dirname(file), { recursive: true });
  await appendFile(file, `${JSON.stringify(event)}\n`, 'utf8');
  return event;
}

export async function readEvents(stateDir = DEFAULT_STATE_DIR) {
  const file = resolve(stateDir, EVENT_FILE);
  try {
    const text = await readFile(file, 'utf8');
    return text.split('\n').filter(Boolean).map((line) => JSON.parse(line));
  } catch (error) {
    if (error.code === 'ENOENT') return [];
    throw error;
  }
}

export async function publishEvent(manifest, type, payload = {}, meta = {}, stateDir = DEFAULT_STATE_DIR) {
  const event = createEvent(manifest, type, payload, meta);
  return appendEvent(event, stateDir);
}

export async function publishHeartbeat(manifest, stateDir = DEFAULT_STATE_DIR) {
  return publishEvent(manifest, 'NODE_HEARTBEAT', {
    health: 'ready',
    capabilities: manifest.capabilities,
    channels: manifest.channels,
    checksum: stableHash(manifest),
  }, {}, stateDir);
}

export async function mergePeerManifests(registryPath, manifests) {
  const validated = manifests.map(validateManifest);
  const registry = {
    protocol: TAMV_PROTOCOL,
    generatedAt: new Date().toISOString(),
    nodeCount: validated.length,
    nodes: validated.map((node) => ({
      nodeId: node.nodeId,
      repository: node.repository,
      role: node.role,
      capabilities: node.capabilities,
      publishes: node.channels.publishes,
      subscribes: node.channels.subscribes,
      checksum: stableHash(node),
    })),
  };
  return writeJson(registryPath, registry);
}

export function planDispatch(registry, event) {
  const nodes = registry.nodes ?? [];
  return nodes
    .filter((node) => node.nodeId !== event.source)
    .filter((node) => node.subscribes.includes(event.type) || node.subscribes.includes('*'))
    .map((node) => ({
      eventId: event.id,
      target: node.nodeId,
      repository: node.repository,
      type: event.type,
      score: scoreNodeForEvent(node, event),
    }))
    .sort((a, b) => b.score - a.score || a.target.localeCompare(b.target));
}

export function scoreNodeForEvent(node, event) {
  const exactSubscription = node.subscribes.includes(event.type) ? 50 : 0;
  const wildcardSubscription = node.subscribes.includes('*') ? 10 : 0;
  const roleAffinity = String(event.type).toLowerCase().includes(String(node.role).toLowerCase()) ? 25 : 0;
  return exactSubscription + wildcardSubscription + roleAffinity + (node.capabilities?.length ?? 0);
}

export async function inspectState(stateDir = DEFAULT_STATE_DIR) {
  const events = await readEvents(stateDir);
  const validEvents = events.filter(verifyEventIntegrity);
  const eventTypes = events.reduce((acc, event) => {
    acc[event.type] = (acc[event.type] ?? 0) + 1;
    return acc;
  }, {});
  return {
    stateDir: resolve(stateDir),
    eventCount: events.length,
    validEventCount: validEvents.length,
    invalidEventCount: events.length - validEvents.length,
    eventTypes,
    latestEvent: events.at(-1) ?? null,
  };
}

export async function discoverLocalManifests(root = '.', fileName = 'node.manifest.json') {
  const found = [];
  async function walk(dir) {
    const entries = await readdir(dir, { withFileTypes: true });
    await Promise.all(entries.map(async (entry) => {
      const full = join(dir, entry.name);
      if (entry.isDirectory() && !['node_modules', '.git', '.tamv', 'dist', 'build', '.next'].includes(entry.name)) {
        await walk(full);
      }
      if (entry.isFile() && entry.name === fileName) {
        found.push(validateManifest(await readJson(full)));
      }
    }));
  }
  await walk(root);
  return found;
}
