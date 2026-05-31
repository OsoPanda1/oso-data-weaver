import {
  mkdir,
  readFile,
  writeFile,
  appendFile,
  readdir,
  stat,
} from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { createHash, randomUUID } from 'node:crypto';

export const TAMV_PROTOCOL = 'tamv-federation-v1';
export const DEFAULT_STATE_DIR = '.tamv/state';
export const EVENT_FILE = 'events.jsonl';
export const MAX_EVENT_FILE_BYTES = 10 * 1024 * 1024; // 10 MB

export class TamvFederationError extends Error {
  constructor(message: string, details: Record<string, unknown> = {}) {
    super(message);
    this.name = 'TamvFederationError';
    this.details = details;
  }
}

// ---------- Utilidades de hashing determinista ----------

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

export function stableHash(value: unknown): string {
  return createHash('sha256')
    .update(JSON.stringify(sortKeys(value)))
    .digest('hex');
}

// ---------- FS helpers ----------

export async function pathExists(path: string): Promise<boolean> {
  try {
    await stat(path);
    return true;
  } catch (error: any) {
    if (error?.code === 'ENOENT') return false;
    throw error;
  }
}

// ---------- Tipos ligeros (alineados al schema extendido) ----------

export type TamvNodeMode = 'active' | 'passive' | 'planned' | 'island';

export interface TamvNodeState {
  mode: TamvNodeMode;
  persistence: string;
  heartbeat: string;
}

export interface TamvNodeChannels {
  publishes: string[];
  subscribes: string[];
}

export interface TamvNodeIdentity {
  did: string;
  type: 'sovereign-node' | 'community-node' | 'lab-node' | 'experimental-node';
  owner: string;
  contact?: string;
}

export interface TamvHeptaLayer {
  code: 'L0' | 'L1' | 'L2' | 'L3' | 'L4' | 'L5' | 'L6' | 'L7';
  name: string;
  role: string;
  modules?: string[];
}

export interface TamvHeptafederation {
  primaryLayer: TamvHeptaLayer['code'];
  layers: TamvHeptaLayer[];
}

export interface TamvSecuritySection {
  level: 'core' | 'enhanced' | 'hardened' | 'military-grade';
  features: (
    | 'anubis-sentinel'
    | 'horus-watch'
    | 'waf'
    | 'ids'
    | 'ips'
    | 'rate-limit'
    | 'csrf-protection'
    | 'pqc-ready'
    | 'ledger-signed'
  )[];
}

export interface TamvObservabilitySection {
  logging: {
    provider: 'pino' | 'winston' | 'bunyan';
    level: 'debug' | 'info' | 'warn' | 'error';
  };
  metrics: {
    enabled: boolean;
    export: ('prometheus' | 'otlp' | 'none')[];
  };
  tracing: {
    enabled: boolean;
    sampler:
      | 'always_on'
      | 'always_off'
      | 'parentbased_always_on'
      | 'ratio';
  };
}

export interface TamvCanonSection {
  rootVersion: string;
  alignment: 'strict' | 'compatible' | 'experimental';
}

export interface TamvFederationManifest {
  protocol: typeof TAMV_PROTOCOL;
  nodeId: string;
  repository: string;
  role: string;
  version: string;
  description?: string;
  capabilities: string[];
  channels: TamvNodeChannels;
  state: TamvNodeState;
  links?: Record<string, string>;
  identity: TamvNodeIdentity;
  heptafederation: TamvHeptafederation;
  security: TamvSecuritySection;
  observability: TamvObservabilitySection;
  canon: TamvCanonSection;
}

// ---------- Manifest ----------

export function validateManifest(manifest: unknown): TamvFederationManifest {
  const m = manifest as TamvFederationManifest;

  const required = [
    'protocol',
    'nodeId',
    'repository',
    'role',
    'version',
    'capabilities',
    'channels',
    'state',
    'identity',
    'heptafederation',
    'security',
    'observability',
    'canon',
  ] as const;

  const missing = required.filter((key) => (m as any)?.[key] === undefined);
  if (missing.length) {
    throw new TamvFederationError(
      'Invalid TAMV manifest: missing required fields.',
      { missing },
    );
  }

  if (m.protocol !== TAMV_PROTOCOL) {
    throw new TamvFederationError('Unsupported TAMV federation protocol.', {
      expected: TAMV_PROTOCOL,
      received: m.protocol,
    });
  }

  if (!Array.isArray(m.capabilities)) {
    throw new TamvFederationError(
      'Invalid TAMV manifest: capabilities must be an array.',
    );
  }

  if (
    !Array.isArray(m.channels?.publishes) ||
    !Array.isArray(m.channels?.subscribes)
  ) {
    throw new TamvFederationError(
      'Invalid TAMV manifest: channels.publishes and channels.subscribes must be arrays.',
    );
  }

  if (!m.heptafederation?.primaryLayer) {
    throw new TamvFederationError(
      'Invalid TAMV manifest: heptafederation.primaryLayer is required.',
    );
  }

  if (!Array.isArray(m.heptafederation.layers)) {
    throw new TamvFederationError(
      'Invalid TAMV manifest: heptafederation.layers must be an array.',
    );
  }

  if (!m.identity?.did || !m.identity?.owner) {
    throw new TamvFederationError(
      'Invalid TAMV manifest: identity.did and identity.owner are required.',
    );
  }

  if (!m.canon?.rootVersion) {
    throw new TamvFederationError(
      'Invalid TAMV manifest: canon.rootVersion is required.',
    );
  }

  return m;
}

export async function readJson<T = unknown>(path: string): Promise<T> {
  const raw = await readFile(path, 'utf8');
  return JSON.parse(raw) as T;
}

export async function writeJson<T = unknown>(
  path: string,
  value: T,
): Promise<T> {
  await mkdir(dirname(path), { recursive: true });
  const json = `${JSON.stringify(sortKeys(value), null, 2)}\n`;
  await writeFile(path, json, 'utf8');
  return value;
}

export async function loadManifest(
  path = 'tamv/node.manifest.json',
): Promise<TamvFederationManifest> {
  return validateManifest(await readJson(path));
}

// ---------- Eventos ----------

export interface TamvEvent {
  id: string;
  protocol: string;
  type: string;
  source: string;
  repository: string;
  createdAt: string;
  payload: Record<string, unknown>;
  meta: Record<string, unknown>;
  integrity: string;
}

export function createEvent(
  manifest: TamvFederationManifest,
  type: string,
  payload: Record<string, unknown> = {},
  meta: Record<string, unknown> = {},
): TamvEvent {
  validateManifest(manifest);

  if (!type || typeof type !== 'string') {
    throw new TamvFederationError('Event type must be a non-empty string.');
  }

  if (payload && typeof payload === 'object') {
    const { stack, ...restPayload } = payload as Record<string, unknown>;
    payload = restPayload;
  }

  const eventBase = {
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
      primaryLayer: manifest.heptafederation.primaryLayer,
      canonRoot: manifest.canon.rootVersion,
      alignment: manifest.canon.alignment,
      securityLevel: manifest.security.level,
      ...meta,
    },
  };

  return { ...eventBase, integrity: stableHash(eventBase) };
}

export function verifyEventIntegrity(event: TamvEvent): boolean {
  if (!event?.integrity) return false;
  const { integrity, ...unsignedEvent } = event;
  return stableHash(unsignedEvent) === integrity;
}

async function ensureEventFileWithinLimit(filePath: string): Promise<void> {
  if (!(await pathExists(filePath))) return;
  const stats = await stat(filePath);
  if (stats.size <= MAX_EVENT_FILE_BYTES) return;

  const text = await readFile(filePath, 'utf8');
  const lines = text.split('\n').filter(Boolean);
  const trimmed = lines.slice(-5000).join('\n') + '\n';
  await writeFile(filePath, trimmed, 'utf8');
}

export async function appendEvent(
  event: TamvEvent,
  stateDir = DEFAULT_STATE_DIR,
): Promise<TamvEvent> {
  if (!verifyEventIntegrity(event)) {
    throw new TamvFederationError(
      'Refusing to append event with invalid integrity.',
      { eventId: event?.id },
    );
  }

  const file = resolve(stateDir, EVENT_FILE);
  await mkdir(dirname(file), { recursive: true });
  await ensureEventFileWithinLimit(file);
  await appendFile(file, `${JSON.stringify(event)}\n`, 'utf8');
  return event;
}

export async function readEvents(
  stateDir = DEFAULT_STATE_DIR,
): Promise<TamvEvent[]> {
  const file = resolve(stateDir, EVENT_FILE);
  try {
    const text = await readFile(file, 'utf8');
    return text
      .split('\n')
      .filter(Boolean)
      .map((line) => {
        try {
          return JSON.parse(line) as TamvEvent;
        } catch {
          return null;
        }
      })
      .filter(Boolean) as TamvEvent[];
  } catch (error: any) {
    if (error?.code === 'ENOENT') return [];
    throw error;
  }
}

export async function publishEvent(
  manifest: TamvFederationManifest,
  type: string,
  payload: Record<string, unknown> = {},
  meta: Record<string, unknown> = {},
  stateDir = DEFAULT_STATE_DIR,
): Promise<TamvEvent> {
  const event = createEvent(manifest, type, payload, meta);
  return appendEvent(event, stateDir);
}

export async function publishHeartbeat(
  manifest: TamvFederationManifest,
  stateDir = DEFAULT_STATE_DIR,
): Promise<TamvEvent> {
  return publishEvent(
    manifest,
    'NODE_HEARTBEAT',
    {
      health: 'ready',
      capabilities: manifest.capabilities,
      channels: manifest.channels,
      heptafederation: manifest.heptafederation,
      checksum: stableHash(manifest),
    },
    {},
    stateDir,
  );
}

// ---------- Registro de nodos / Manifests ----------

export interface TamvRegistryNode {
  nodeId: string;
  repository: string;
  role: string;
  capabilities: string[];
  publishes: string[];
  subscribes: string[];
  primaryLayer: TamvHeptafederation['primaryLayer'];
  canonRoot: string;
  alignment: TamvCanonSection['alignment'];
  checksum: string;
}

export interface TamvRegistry {
  protocol: string;
  generatedAt: string;
  nodeCount: number;
  nodes: TamvRegistryNode[];
}

export async function mergePeerManifests(
  registryPath: string,
  manifests: TamvFederationManifest[],
): Promise<TamvRegistry> {
  const validated = manifests.map(validateManifest);
  const nodes: TamvRegistryNode[] = validated.map((node) => ({
    nodeId: node.nodeId,
    repository: node.repository,
    role: node.role,
    capabilities: node.capabilities,
    publishes: node.channels.publishes,
    subscribes: node.channels.subscribes,
    primaryLayer: node.heptafederation.primaryLayer,
    canonRoot: node.canon.rootVersion,
    alignment: node.canon.alignment,
    checksum: stableHash(node),
  }));

  const registry: TamvRegistry = {
    protocol: TAMV_PROTOCOL,
    generatedAt: new Date().toISOString(),
    nodeCount: nodes.length,
    nodes,
  };

  return writeJson(registryPath, registry);
}

// ---------- Despacho / plan de federación ----------

export interface TamvDispatchPlan {
  eventId: string;
  target: string;
  repository: string;
  type: string;
  score: number;
  primaryLayer: string;
}

export function scoreNodeForEvent(
  node: TamvRegistryNode,
  event: TamvEvent,
): number {
  const subs = node.subscribes || [];
  const caps = node.capabilities || [];

  const exactSubscription = subs.includes(event.type) ? 50 : 0;
  const wildcardSubscription = subs.includes('*') ? 10 : 0;

  const roleStr = String(node.role || '').toLowerCase();
  const typeStr = String(event.type || '').toLowerCase();
  const roleAffinity = typeStr.includes(roleStr) ? 25 : 0;

  const primaryLayerAffinity =
    event.meta?.['primaryLayer'] === node.primaryLayer ? 20 : 0;

  return (
    exactSubscription +
    wildcardSubscription +
    roleAffinity +
    primaryLayerAffinity +
    (caps.length ?? 0)
  );
}

export function planDispatch(
  registry: TamvRegistry,
  event: TamvEvent,
): TamvDispatchPlan[] {
  const nodes = Array.isArray(registry.nodes) ? registry.nodes : [];
  if (!event || !event.type) return [];

  return nodes
    .filter((node) => node.nodeId && node.nodeId !== event.source)
    .filter((node) => {
      const subs = node.subscribes || [];
      return subs.includes(event.type) || subs.includes('*');
    })
    .map((node) => ({
      eventId: event.id,
      target: node.nodeId,
      repository: node.repository,
      type: event.type,
      primaryLayer: node.primaryLayer,
      score: scoreNodeForEvent(node, event),
    }))
    .sort((a, b) => b.score - a.score || a.target.localeCompare(b.target));
}

// ---------- Estado local ----------

export interface TamvStateInspection {
  stateDir: string;
  eventCount: number;
  validEventCount: number;
  invalidEventCount: number;
  eventTypes: Record<string, number>;
  latestEvent: TamvEvent | null;
}

export async function inspectState(
  stateDir = DEFAULT_STATE_DIR,
): Promise<TamvStateInspection> {
  const events = await readEvents(stateDir);
  const validEvents = events.filter(verifyEventIntegrity);
  const eventTypes = events.reduce<Record<string, number>>((acc, event) => {
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

// ---------- Descubrimiento de manifests locales ----------

export async function discoverLocalManifests(
  root = '.',
  fileName = 'node.manifest.json',
): Promise<TamvFederationManifest[]> {
  const found: TamvFederationManifest[] = [];

  async function walk(dir: string): Promise<void> {
    const entries = await readdir(dir, { withFileTypes: true });

    await Promise.all(
      entries.map(async (entry) => {
        const full = join(dir, entry.name);

        if (
          entry.isDirectory() &&
          !['node_modules', '.git', '.tamv', 'dist', 'build', '.next'].includes(
            entry.name,
          )
        ) {
          await walk(full);
        }

        if (entry.isFile() && entry.name === fileName) {
          const manifest = await readJson(full);
          const validated = validateManifest(manifest);
          found.push(validated);
        }
      }),
    );
  }

  await walk(root);
  return found;
}
