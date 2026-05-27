#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import { TamvSovereignKernel } from '../core/sovereign-kernel.mjs';
import { inspectState, loadManifest, planDispatch, publishEvent, readEvents, readJson } from '../core/federation-bus.mjs';
import { ELITE_HEHEP_MANIFEST, ISABELLA_HEHEP_MODULE_MAP } from '../core/elite-manifest.mjs';
import { emitLocalEliteBookPiEvent, projectBookPiLedger, readBookPiEvents } from '../core/elite-bookpi.mjs';

const command = process.argv[2] ?? 'help';
const args = process.argv.slice(3);
const stateDir = process.env.TAMV_STATE_DIR || '.tamv/state';
const kernel = new TamvSovereignKernel({ stateDir });

function print(value) {
  console.log(JSON.stringify(value, null, 2));
}

function parseJsonArg(index, fallback = {}) {
  const raw = args[index];
  if (!raw) return fallback;
  return JSON.parse(raw);
}

async function main() {
  if (command === 'help' || command === '--help' || command === '-h') {
    console.log(`TAMV oso-data-weaver kernel

Commands:
  heartbeat               Publish NODE_HEARTBEAT into .tamv/state/events.jsonl and BookPI
  inspect                 Inspect local kernel event state
  snapshot                Write and print kernel snapshot
  run-demo [json]          Run fairy 80cm papercraft workflow with optional JSON parameters
  recover <workflowId>     Read persisted workflow state
  dispatch                Build dispatch plan for latest local event
  publish <type> [json]    Publish a custom federation event
  bookpi                  Print BookPI local projection
  bookpi:events           Print BookPI local events
  bookpi:emit <type> [json] [contextJson]
  elite                   Print ELITE HeHep manifest and Isabella map
  registry                Print fused node registry
`);
    return;
  }

  if (command === 'heartbeat') {
    await kernel.init();
    print(await kernel.heartbeat());
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

  if (command === 'dispatch') {
    const events = await readEvents(stateDir);
    const latest = events.at(-1);
    if (!latest) {
      print({ event: null, dispatch: [] });
      return;
    }
    const registry = await readJson('tamv/registry/nodes.json');
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
    print(await emitLocalEliteBookPiEvent({
      protocol: manifest.protocol,
      type,
      source: manifest.nodeId,
      repository: manifest.repository,
      payload,
      meta: { role: manifest.role, kernel: 'oso-data-weaver', doctrine: 'MD-X4' },
      context,
    }, stateDir));
    return;
  }

  if (command === 'elite') {
    print({ manifest: ELITE_HEHEP_MANIFEST, isabellaModules: ISABELLA_HEHEP_MODULE_MAP });
    return;
  }

  if (command === 'registry') {
    print(await readJson('tamv/registry/nodes.json'));
    return;
  }

  if (command === 'cat') {
    const file = args[0];
    if (!file) throw new Error('cat requires a file path.');
    console.log(await readFile(file, 'utf8'));
    return;
  }

  throw new Error(`Unknown TAMV command: ${command}`);
}

main().catch((error) => {
  console.error(JSON.stringify({ status: 'error', message: error.message, stack: error.stack }, null, 2));
  process.exitCode = 1;
});
