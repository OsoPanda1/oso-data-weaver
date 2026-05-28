import { appendFile, mkdir, readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { createHash, randomUUID } from 'node:crypto';

// ---------------------------------------------------------------------------
// Ejes estructurales del Atlas ELITE / TAMV
// ---------------------------------------------------------------------------

// Hexágonos: ejes funcionales del HeHep
export const HE_HEXAGONS = [
  'HE-Ingest',
  'HE-Transform',
  'HE-Publish',
  'HE-Science',
  'HE-Economy',
  'HE-Identity',
  'HE-Security',
  'HE-Governance',
];

// Dominios HeP: 7 federaciones doctrinales
export const HEP_DOMAINS = [
  'HEP-1', // Doctrina / Canon / Publicación
  'HEP-2', // Transformación / Modelado
  'HEP-3', // Infraestructura / Transporte
  'HEP-4', // Resiliencia / Fallas
  'HEP-5', // Economía / Valor
  'HEP-6', // Territorio / Observatorio
  'HEP-7', // Identidad / Comunidad
];

// Ejes doctrinales TAMV: linajes / cadenas / entidades clave
export const TAMV_DOCTRINE_TAGS = Object.freeze({
  DEKATEOTL: 'dekateotl',
  AZTEK_GODS: 'aztek-gods',
  EOCT: 'eoct',
  MSR_BLOCKCHAIN: 'msr-blockchain',
  HEPTAFED: 'heptafed',
  RDM_DIGITAL: 'rdm-digital',
  ISABELLA: 'isabella-ai',
  TAMV_CORE: 'tamv-core',
  GENESIS_CANON: 'genesis-canon',
  MDX4: 'md-x4',
});

// Territorios / nodos (ejemplos; puedes extender según tu canon)
export const TAMV_TERRITORIES = Object.freeze({
  RDM: 'real-del-monte',
  LATAM: 'latam',
});

// Contexto por defecto para eventos generados por el kernel
export const KERNEL_ELITE_CONTEXT = {
  hexagon: 'HE-Publish',
  domain: 'HEP-1',
};

// ---------------------------------------------------------------------------
// Utilidades base
// ---------------------------------------------------------------------------
export function sortKeys(value) {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (!value || typeof value !== 'object') return value;
  return Object.keys(value)
    .sort()
    .reduce((acc, key) => {
      acc[key] = sortKeys(value[key]);
      return acc;
    }, {});
}

export function sha256(value) {
  return createHash('sha256')
    .update(JSON.stringify(sortKeys(value)))
    .digest('hex');
}

// ---------------------------------------------------------------------------
// Validación de contexto He/HeP
// ---------------------------------------------------------------------------
export function validateHeHepContext(context) {
  if (
    !context ||
    !HE_HEXAGONS.includes(context.hexagon) ||
    !HEP_DOMAINS.includes(context.domain)
  ) {
    throw new Error(`Invalid ELITE HeHep context: ${JSON.stringify(context)}`);
  }
  return context;
}

// ---------------------------------------------------------------------------
// Clasificación doctrinal / simbólica TAMV
// ---------------------------------------------------------------------------

/**
 * Extrae etiquetas doctrinales a partir del type/meta/payload.
 * Esto es el puente entre eventos crudos y el Atlas civilizatorio.
 */
export function inferDoctrineTags(event) {
  const tags = new Set();

  const header = event.header || {};
  const meta = event.meta || {};
  const payload = event.payload || {};

  const doctrine =
    meta.doctrine ||
    meta.doctrineId ||
    meta.doctrineTags ||
    payload.doctrine ||
    payload.doctrineId ||
    '';

  const doctrineStr = String(doctrine).toLowerCase();
  const typeStr = String(header.type || '').toLowerCase();

  const text = `${doctrineStr} ${typeStr} ${JSON.stringify(meta).toLowerCase()} ${JSON.stringify(
    payload,
  ).toLowerCase()}`;

  // Núcleo TAMV / MD-X4
  if (text.includes('tamv') || text.includes('core-kernel')) {
    tags.add(TAMV_DOCTRINE_TAGS.TAMV_CORE);
  }
  if (text.includes('genesis') || text.includes('canon')) {
    tags.add(TAMV_DOCTRINE_TAGS.GENESIS_CANON);
  }
  if (meta.doctrine === 'MD-X4' || doctrineStr.includes('md-x4')) {
    tags.add(TAMV_DOCTRINE_TAGS.MDX4);
  }

  // Linajes / deidades
  if (text.includes('dekateotl')) tags.add(TAMV_DOCTRINE_TAGS.DEKATEOTL);
  if (text.includes('aztek') || text.includes('aztek-gods')) {
    tags.add(TAMV_DOCTRINE_TAGS.AZTEK_GODS);
  }

  // EOCT, MSR, heptafed, etc.
  if (text.includes('eoct')) tags.add(TAMV_DOCTRINE_TAGS.EOCT);
  if (text.includes('msr') || text.includes('blockchain')) {
    tags.add(TAMV_DOCTRINE_TAGS.MSR_BLOCKCHAIN);
  }
  if (text.includes('heptafed') || text.includes('heptafederación')) {
    tags.add(TAMV_DOCTRINE_TAGS.HEPTAFED);
  }

  // Territorio / nodos
  if (text.includes('rdm') || text.includes('real del monte')) {
    tags.add(TAMV_DOCTRINE_TAGS.RDM_DIGITAL);
  }

  // IA / Isabella
  if (text.includes('isabella')) tags.add(TAMV_DOCTRINE_TAGS.ISABELLA);

  return Array.from(tags);
}

/**
 * Extrae territorio a partir de meta/payload.
 */
export function inferTerritory(event) {
  const meta = event.meta || {};
  const payload = event.payload || {};
  const territory =
    meta.territory || payload.territory || payload.nodeTerritory || '';

  const t = String(territory).toLowerCase();
  if (t.includes('real') && t.includes('monte')) return TAMV_TERRITORIES.RDM;
  if (t.includes('latam')) return TAMV_TERRITORIES.LATAM;
  return null;
}

// ---------------------------------------------------------------------------
// Validación de eventos BookPI
// ---------------------------------------------------------------------------
export function validateEliteHeHepEvent(event) {
  if (!event || typeof event !== 'object') {
    throw new Error('Invalid BookPI event: not an object.');
  }

  validateHeHepContext(event?.header?.he_hep_context);

  for (const key of [
    'id',
    'createdAt',
    'source',
    'repository',
    'protocol',
    'type',
  ]) {
    if (!event.header?.[key]) {
      throw new Error(`Invalid BookPI event header: missing ${key}.`);
    }
  }

  if (!event.integrity?.sha256) {
    throw new Error('Invalid BookPI event: missing integrity.sha256.');
  }

  const { integrity, ...unsignedEvent } = event;
  if (integrity.sha256 !== sha256(unsignedEvent)) {
    throw new Error('Invalid BookPI event integrity hash.');
  }

  return event;
}

// ---------------------------------------------------------------------------
// Emisión de eventos
// ---------------------------------------------------------------------------
export async function emitEliteBookPiEvent(params) {
  const heContext = validateHeHepContext(
    params.context ?? KERNEL_ELITE_CONTEXT,
  );

  const header = {
    id: randomUUID(),
    createdAt: new Date().toISOString(),
    source: params.source,
    repository: params.repository,
    protocol: params.protocol,
    type: params.type,
    he_hep_context: heContext,
  };

  const baseMeta = params.meta || {};
  const basePayload = params.payload ?? {};

  const unsignedEvent = {
    header,
    payload: basePayload,
    meta: {
      ...baseMeta,
      doctrine: baseMeta.doctrine || 'MD-X4',
      doctrineTags: inferDoctrineTags({
        header,
        payload: basePayload,
        meta: baseMeta,
      }),
      territory: inferTerritory({ header, payload: basePayload, meta: baseMeta }),
    },
  };

  const event = {
    ...unsignedEvent,
    integrity: { sha256: sha256(unsignedEvent) },
  };

  validateEliteHeHepEvent(event);

  if (params.transport?.publish) {
    return params.transport.publish(event);
  }

  return event;
}

// ---------------------------------------------------------------------------
// Persistencia local BookPI
// ---------------------------------------------------------------------------
export async function appendBookPiEvent(event, stateDir = '.tamv/state') {
  validateEliteHeHepEvent(event);
  const file = resolve(stateDir, 'bookpi-events.jsonl');
  await mkdir(dirname(file), { recursive: true });
  await appendFile(file, `${JSON.stringify(event)}\n`, 'utf8');
  return event;
}

export async function emitLocalEliteBookPiEvent(
  params,
  stateDir = '.tamv/state',
) {
  const event = await emitEliteBookPiEvent(params);
  await appendBookPiEvent(event, stateDir);
  return event;
}

export async function readBookPiEvents(stateDir = '.tamv/state') {
  try {
    const text = await readFile(
      resolve(stateDir, 'bookpi-events.jsonl'),
      'utf8',
    );
    return text
      .split('\n')
      .filter(Boolean)
      .map((line) => {
        try {
          return JSON.parse(line);
        } catch {
          return null;
        }
      })
      .filter(Boolean);
  } catch (error) {
    if (error.code === 'ENOENT') return [];
    throw error;
  }
}

// ---------------------------------------------------------------------------
// Proyección BookPI / Atlas
// ---------------------------------------------------------------------------
export async function projectBookPiLedger(stateDir = '.tamv/state') {
  const events = await readBookPiEvents(stateDir);

  return events.reduce(
    (projection, event) => {
      projection.eventCount += 1;

      const type = event.header.type;
      const domain = event.header.he_hep_context.domain;
      const hexagon = event.header.he_hep_context.hexagon;

      projection.eventTypes[type] =
        (projection.eventTypes[type] ?? 0) + 1;
      projection.domains[domain] = (projection.domains[domain] ?? 0) + 1;
      projection.hexagons[hexagon] =
        (projection.hexagons[hexagon] ?? 0) + 1;

      const doctrineTags =
        event.meta?.doctrineTags ?? inferDoctrineTags(event);
      for (const tag of doctrineTags) {
        projection.doctrine[tag] = (projection.doctrine[tag] ?? 0) + 1;
      }

      const territory =
        event.meta?.territory ?? inferTerritory(event) ?? 'unknown';
      projection.territories[territory] =
        (projection.territories[territory] ?? 0) + 1;

      projection.latestEvent = event;
      return projection;
    },
    {
      eventCount: 0,
      eventTypes: {},
      domains: {},
      hexagons: {},
      doctrine: {},
      territories: {},
      latestEvent: null,
    },
  );
}
