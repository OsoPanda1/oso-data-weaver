#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import { TamvSovereignKernel } from '../core/sovereign-kernel.mjs';
import {
  inspectState,
  loadManifest,
  planDispatch,
  publishEvent,
  readEvents,
  readJson,
  mergePeerManifests,
  discoverLocalManifests,
} from '../core/federation-bus.mjs';
import {
  ELITE_HEHEP_MANIFEST,
  ISABELLA_HEHEP_MODULE_MAP,
} from '../core/elite-manifest.mjs';
import {
  emitLocalEliteBookPiEvent,
  projectBookPiLedger,
  readBookPiEvents,
} from '../core/elite-bookpi.mjs';

const command = process.argv[2] ?? 'help';
const args = process.argv.slice(3);

const stateDir = process.env.TAMV_STATE_DIR || '.tamv/state';
const registryPath = process.env.TAMV_REGISTRY_PATH || 'tamv/registry/nodes.json';

const kernel = new TamvSovereignKernel({ stateDir });

function print(value) {
  console.log(JSON.stringify(value, null, 2));
}

function parseJsonArg(index, fallback = {}) {
  const raw = args[index];
  if (!raw) return fallback;
  return JSON.parse(raw);
}

async function ensureRegistry() {
  const manifests = await discoverLocalManifests('.');
  return mergePeerManifests(registryPath, manifests);
}

async function main() {
  if (command === 'help' || command === '--help' || command === '-h') {
    console.log(`TAMV ATLAS CORE ENGINE — Sovereign Kernel CLI

Commands núcleo / runtime:
  heartbeat                    Publica NODE_HEARTBEAT en .tamv/state/events.jsonl y BookPI
  inspect                      Inspecciona el estado de eventos locales del kernel
  snapshot                     Escribe e imprime snapshot del kernel
  run-demo [json]              Corre workflow demo (ej. fairy 80cm papercraft) con parámetros JSON opcionales
  recover <workflowId>         Recupera el estado persistido de un workflow

Federación / dispatch:
  dispatch                     Calcula plan de despacho para el último evento local
  publish <type> [json]        Publica un evento custom de federación
  registry                     Imprime el registro de nodos fusionado
  registry:refresh             Descubre manifests locales y regenera registry/nodes.json

BookPI / ELITE HeHep:
  bookpi                       Imprime proyección local BookPI / Atlas
  bookpi:events                Lista eventos locales BookPI
  bookpi:emit <type> [json] [contextJson]
                              Emite evento BookPI local con payload/contexto opcional
  elite                        Imprime manifest ELITE HeHep e Isabella module map

Herramientas:
  cat <file>                   Imprime un archivo
  version                      Muestra versión de manifest TAMV y canon
`);
    return;
  }

  // ---------------- Núcleo / runtime ----------------

  if (command === 'heartbeat') {
    await kernel.init();
    const manifest = await loadManifest();
    const fedResult = await kernel.heartbeat();
    const bookpiEvent = await emitLocalEliteBookPiEvent(
      {
        protocol: manifest.protocol,
        type: 'NODE_HEARTBEAT_CANON',
        source: manifest.nodeId,
        repository: manifest.repository,
        payload: {
          capabilities: manifest.capabilities,
          channels: manifest.channels,
          heptafederation: manifest.heptafederation,
        },
        meta: {
          role: manifest.role,
          kernel: 'tamv-atlas-core-engine',
          doctrine: 'MD-X4',
          canonRoot: manifest.canon?.rootVersion,
          alignment: manifest.canon?.alignment,
        },
      },
      stateDir,
    );

    print({
      status: 'ok',
      federated: fedResult,
      bookpi: bookpiEvent,
    });
    return;
  }

  if (command === 'inspect') {
    print(await inspectState(stateDir));
    return;
  }

  if (command === 'snapshot') {
    await kernel.init();
    print(await kernel.snapshot());
    return;
  }

  if (command === 'run-demo') {
    const parameters = parseJsonArg(0, {
      product: 'fairy-collectible-papercraft',
      scaleCm: 80,
      pages: '100+',
      colorSystem: 'white-gold',
    });
    print(await kernel.runWorkflow({ parameters }));
    return;
  }

  if (command === 'recover') {
    const workflowId = args[0];
    if (!workflowId) throw new Error('recover requires workflowId.');
    print(await kernel.recoverWorkflow(workflowId));
    return;
  }

  // ---------------- Federación / dispatch ----------------

  if (command === 'dispatch') {
    const events = await readEvents(stateDir);
    const latest = events.at(-1);
    if (!latest) {
      print({ event: null, dispatch: [] });
      return;
    }
    const registry = await readJson(registryPath);
    print({ event: latest, dispatch: planDispatch(registry, latest) });
    return;
  }

  if (command === 'publish') {
    const type = args[0];
    if (!type) throw new Error('publish requires an event type.');
    const payload = args[1] ? JSON.parse(args[1]) : {};
    const manifest = await loadManifest();
    print(await publishEvent(manifest, type, payload, {}, stateDir));
    return;
  }

  if (command === 'registry') {
    print(await readJson(registryPath));
    return;
  }

  if (command === 'registry:refresh') {
    print(await ensureRegistry());
    return;
  }

  // ---------------- BookPI / ELITE HeHep ----------------

  if (command === 'bookpi') {
    print(await projectBookPiLedger(stateDir));
    return;
  }

  if (command === 'bookpi:events') {
    print(await readBookPiEvents(stateDir));
    return;
  }

  if (command === 'bookpi:emit') {
    const type = args[0];
    if (!type) throw new Error('bookpi:emit requires an event type.');
    const payload = args[1] ? JSON.parse(args[1]) : {};
    const context = args[2] ? JSON.parse(args[2]) : undefined;
    const manifest = await loadManifest();

    print(
      await emitLocalEliteBookPiEvent(
        {
          protocol: manifest.protocol,
          type,
          source: manifest.nodeId,
          repository: manifest.repository,
          payload,
          meta: {
            role: manifest.role,
            kernel: 'tamv-atlas-core-engine',
            doctrine: 'MD-X4',
          },
          context,
        },
        stateDir,
      ),
    );
    return;
  }

  if (command === 'elite') {
    print({
      manifest: ELITE_HEHEP_MANIFEST,
      isabellaModules: ISABELLA_HEHEP_MODULE_MAP,
    });
    return;
  }

  // ---------------- Herramientas ----------------

  if (command === 'cat') {
    const file = args[0];
    if (!file) throw new Error('cat requires a file path.');
    console.log(await readFile(file, 'utf8'));
    return;
  }

  if (command === 'version') {
    const manifest = await loadManifest();
    print({
      kernelVersion: manifest.version,
      canonRoot: manifest.canon?.rootVersion ?? null,
      alignment: manifest.canon?.alignment ?? null,
      nodeId: manifest.nodeId,
      protocol: manifest.protocol,
    });
    return;
  }

  throw new Error(`Unknown TAMV command: ${command}`);
}

main().catch((error) => {
  console.error(
    JSON.stringify(
      {
        status: 'error',
        message: error.message,
        stack: error.stack,
      },
      null,
      2,
    ),
  );
  process.exitCode = 1;
});
