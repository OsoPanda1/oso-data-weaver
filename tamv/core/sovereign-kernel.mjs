import { mkdir, writeFile, readFile, rename } from 'node:fs/promises';
import { resolve, normalize } from 'node:path';
import { createHash } from 'node:crypto';
import {
  DEFAULT_STATE_DIR,
  createEvent,
  inspectState,
  loadManifest,
  pathExists,
  publishEvent,
  publishHeartbeat,
  readEvents,
  readJson,
  stableHash,
} from './federation-bus.mjs';
import {
  emitLocalEliteBookPiEvent,
  projectBookPiLedger,
} from './elite-bookpi.mjs';
import { ELITE_HEHEP_MANIFEST } from './elite-manifest.mjs';

const WORKFLOW_FILE_PREFIX = 'workflow-';
const SNAPSHOT_FILE = 'kernel-snapshot.json';

// Inmutabilidad estricta para los contextos de las 7 Federaciones
const EVENT_CONTEXTS = Object.freeze({
  PIPELINE_STARTED: { hexagon: 'HE-Publish', domain: 'HEP-1' },
  GEOMETRY_READY: { hexagon: 'HE-Transform', domain: 'HEP-2' },
  UNFOLD_READY: { hexagon: 'HE-Transform', domain: 'HEP-2' },
  PRINT_TEMPLATE_READY: { hexagon: 'HE-Publish', domain: 'HEP-1' },
  PDF_READY: { hexagon: 'HE-Publish', domain: 'HEP-1' },
  UI_READY: { hexagon: 'HE-Identity', domain: 'HEP-7' },
  QUALITY_SCORE_REPORTED: { hexagon: 'HE-Science', domain: 'HEP-1' },
  PIPELINE_COMPLETED: { hexagon: 'HE-Science', domain: 'HEP-1' },
  FAILURE_REPORTED: { hexagon: 'HE-Transform', domain: 'HEP-4' },
});

// ============================================================================
// MOTOR DE GRAFO TOPOLÓGICO ESTRICTO (ANTIFRÁGIL)
// ============================================================================
export class TaskGraph {
  constructor(tasks = []) {
    /** @type {Map<string, any>} */
    this.tasks = new Map();
    for (const task of tasks) this.addTask(task);
  }

  addTask(task) {
    if (!task?.id) {
      throw new Error('TAMV-CRITICAL: Task requiere un id.');
    }
    if (this.tasks.has(task.id)) {
      throw new Error(`TAMV-CRITICAL: ID de tarea duplicado: ${task.id}`);
    }

    const dependsOn = Array.isArray(task.dependsOn)
      ? [...new Set(task.dependsOn)]
      : [];

    this.tasks.set(task.id, {
      dependsOn,
      retries: Number.isInteger(task.retries) ? task.retries : 3,
      timeoutMs: Number.isInteger(task.timeoutMs) ? task.timeoutMs : 300000,
      ...task,
    });

    return this;
  }

  validateAndSort() {
    const inDegree = new Map();
    const adjacency = new Map();

    for (const id of this.tasks.keys()) {
      inDegree.set(id, 0);
      adjacency.set(id, []);
    }

    for (const [id, task] of this.tasks.entries()) {
      for (const dep of task.dependsOn) {
        if (!this.tasks.has(dep)) {
          throw new Error(
            `TAMV-CRITICAL: Tarea ${id} depende de una tarea inexistente ${dep}.`,
          );
        }
        inDegree.set(id, (inDegree.get(id) || 0) + 1);
        adjacency.get(dep).push(id);
      }
    }

    const queue = [];
    for (const [id, degree] of inDegree.entries()) {
      if (degree === 0) queue.push(id);
    }

    const sortedLayers = [];

    while (queue.length > 0) {
      const levelSize = queue.length;
      const currentLayer = [];

      for (let i = 0; i < levelSize; i++) {
        const id = queue.shift();
        const task = this.tasks.get(id);
        currentLayer.push(task);

        for (const neighbor of adjacency.get(id)) {
          const newDegree = inDegree.get(neighbor) - 1;
          inDegree.set(neighbor, newDegree);
          if (newDegree === 0) queue.push(neighbor);
        }
      }

      sortedLayers.push(currentLayer);
    }

    const processedCount = sortedLayers.flat().length;
    if (processedCount !== this.tasks.size) {
      throw new Error(
        'TAMV-CRITICAL: Deadlock (Ciclo) detectado en la topología de la Federación.',
      );
    }

    return sortedLayers;
  }

  layers() {
    return this.validateAndSort();
  }
}

// ============================================================================
// REGISTRO DE AGENTES AISLADOS (SANDBOXING)
// ============================================================================
export class AgentRegistry {
  constructor(agents = []) {
    this.agents = new Map();
    for (const agent of agents) this.register(agent);
  }

  register(agent) {
    if (!agent?.id || typeof agent.run !== 'function') {
      throw new Error(
        'TAMV-CRITICAL: Agente inválido. Requiere id y run().',
      );
    }
    if (this.agents.has(agent.id)) {
      throw new Error(`TAMV-CRITICAL: Agente duplicado: ${agent.id}`);
    }
    this.agents.set(agent.id, agent);
    return this;
  }

  get(id) {
    const agent = this.agents.get(id);
    if (!agent) {
      throw new Error(
        `TAMV-CRITICAL: Agente desconocido en las 7 federaciones: ${id}`,
      );
    }
    return agent;
  }

  list() {
    return [...this.agents.values()].map(
      ({ id, role, capabilities = [] }) => ({ id, role, capabilities }),
    );
  }
}

export function createDefaultAgents() {
  return new AgentRegistry([
    {
      id: 'GeometryAgent',
      role: 'geometry',
      capabilities: ['procedural-model-plan', 'mesh-export-contract'],
      async run(context) {
        return {
          model: 'fairy-collectible-80cm',
          scaleCm: 80,
          modules: [
            'head',
            'torso',
            'arms',
            'legs',
            'detachable-wings',
            'base',
          ],
          exports: ['glb', 'obj'],
          he_hep_context: EVENT_CONTEXTS.GEOMETRY_READY,
          nextEvent: 'GEOMETRY_READY',
          contextHash: stableHash(context.parameters ?? {}),
        };
      },
    },
    {
      id: 'UnfoldAgent',
      role: 'geometry',
      capabilities: [
        'edge-classification',
        'island-segmentation',
        'uv-flattening',
      ],
      async run(context) {
        return {
          algorithm: 'graph-based-unfold-v1',
          lineTypes: ['cut', 'mountain', 'valley'],
          overlapPolicy: 'resolve-by-island-translation',
          he_hep_context: EVENT_CONTEXTS.UNFOLD_READY,
          nextEvent: 'UNFOLD_READY',
          geometryRef:
            context.results?.GeometryAgent?.model ?? 'pending-geometry',
        };
      },
    },
    {
      id: 'LayoutAgent',
      role: 'print',
      capabilities: ['a4-layout', 'page-numbering', 'registration-marks'],
      async run(context) {
        return {
          media: 'A4',
          minimumPages: 100,
          marginMm: 8,
          he_hep_context: EVENT_CONTEXTS.PRINT_TEMPLATE_READY,
          nextEvent: 'PRINT_TEMPLATE_READY',
          unfoldingRef:
            context.results?.UnfoldAgent?.algorithm ?? 'pending-unfold',
        };
      },
    },
    {
      id: 'RenderAgent',
      role: 'print',
      capabilities: ['svg-generation', 'pdf-compilation', 'gold-overlay'],
      async run(context) {
        return {
          outputs: [
            'white-system.pdf',
            'gold-overlay.pdf',
            'commercial-bundle.zip',
          ],
          colorSystem: 'white-gold-cmyk-simulation',
          he_hep_context: EVENT_CONTEXTS.PDF_READY,
          nextEvent: 'PDF_READY',
          layoutRef: context.results?.LayoutAgent?.media ?? 'pending-layout',
        };
      },
    },
    {
      id: 'UIAgent',
      role: 'frontend',
      capabilities: ['parameter-controls', 'export-ui', 'pipeline-status'],
      async run(context) {
        return {
          controls: ['scale', 'wing-joints', 'paper-density', 'gold-overlay'],
          statusSurface: 'pipeline-dashboard',
          he_hep_context: EVENT_CONTEXTS.UI_READY,
          nextEvent: 'UI_READY',
          exportEnabled: Boolean(context.results?.RenderAgent),
        };
      },
    },
    {
      id: 'OptimizeAgent',
      role: 'optimization',
      capabilities: ['quality-scoring', 'feedback-loop', 'version-iteration'],
      async run(context) {
        const completed = Object.keys(context.results ?? {}).length;
        const qualityScore = Math.min(100, 60 + completed * 7);
        return {
          qualityScore,
          nextVersion: qualityScore >= 90 ? 'v2-ready' : 'v1-improve',
          he_hep_context: EVENT_CONTEXTS.QUALITY_SCORE_REPORTED,
          nextEvent: 'QUALITY_SCORE_REPORTED',
          bottlenecks:
            qualityScore >= 90
              ? []
              : ['manual-pdf-validation', 'geometry-asset-verification'],
        };
      },
    },
  ]);
}

// ============================================================================
// HELPERS: reintentos y timeout de agentes
// ============================================================================
async function runWithRetries(
  agent,
  secureContext,
  { retries, timeoutMs, taskId },
) {
  let attempt = 0;
  let lastError;

  const runWithTimeout = () =>
    new Promise((resolve, reject) => {
      let finished = false;

      const timer = setTimeout(() => {
        if (finished) return;
        finished = true;
        const err = new Error(
          `TAMV-TIMEOUT: Agente ${agent.id} excedió ${timeoutMs}ms en tarea ${taskId}.`,
        );
        err.code = 'TAMV_TIMEOUT';
        reject(err);
      }, timeoutMs);

      agent
        .run(secureContext)
        .then((res) => {
          if (finished) return;
          finished = true;
          clearTimeout(timer);
          resolve(res);
        })
        .catch((err) => {
          if (finished) return;
          finished = true;
          clearTimeout(timer);
          reject(err);
        });
    });

  while (attempt <= retries) {
    try {
      return await runWithTimeout();
    } catch (err) {
      lastError = err;
      attempt += 1;
      if (attempt > retries) break;
    }
  }

  throw lastError;
}

function validateAgentResult(task, agent, result) {
  if (!result || typeof result !== 'object') {
    const err = new Error(
      `TAMV-CRITICAL: Agente ${agent.id} devolvió resultado inválido en task ${task.id}`,
    );
    err.code = 'INVALID_RESULT';
    throw err;
  }

  // Para tareas que no definen publishes, exigimos nextEvent
  if (!task.publishes && !result.nextEvent) {
    const err = new Error(
      `TAMV-CRITICAL: Resultado sin nextEvent para task ${task.id}`,
    );
    err.code = 'MISSING_EVENT';
    throw err;
  }
}

// ============================================================================
// KERNEL HEPTAFEDERADO (TAMV-K5)
// ============================================================================
export class TamvSovereignKernel {
  constructor({
    stateDir = DEFAULT_STATE_DIR,
    manifestPath = 'tamv/node.manifest.json',
    registryPath = 'tamv/registry/nodes.json',
    agents = createDefaultAgents(),
  } = {}) {
    this.baseDir = resolve(stateDir);
    this.paths = {
      state: this.baseDir,
      manifest: this.secureResolve(manifestPath),
      registry: this.secureResolve(registryPath),
    };
    this.agents = agents;
    this.lastLedgerHash = null;
  }

  // PREVENCIÓN DE PATH TRAVERSAL (Jail)
  secureResolve(targetPath, isInternal = false) {
    const base = normalize(this.baseDir);
    const resolved = normalize(
      resolve(isInternal ? this.baseDir : process.cwd(), targetPath),
    );

    if (isInternal && !resolved.startsWith(base)) {
      throw new Error(
        `TAMV-SEC-VIOLATION: Intento de escape del Sandbox detectado -> ${targetPath}`,
      );
    }
    return resolved;
  }

  // PERSISTENCIA ATÓMICA CON LÍMITE
  async atomicWriteJson(targetPath, data, { maxBytes = 5 * 1024 * 1024 } = {}) {
    const json = JSON.stringify(data, null, 2);
    const size = Buffer.byteLength(json, 'utf8');

    if (size > maxBytes) {
      throw new Error(
        `TAMV-CRITICAL: Intento de escribir snapshot de ${size} bytes (límite ${maxBytes}).`,
      );
    }

    const tmpPath = `${targetPath}.tmp.${Date.now()}`;
    await writeFile(tmpPath, json, 'utf8');
    await rename(tmpPath, targetPath);
  }

  async init() {
    await mkdir(this.paths.state, { recursive: true });
    this.manifest = await loadManifest(this.paths.manifest);
    this.registry = await readJson(this.paths.registry);
    return this.snapshot();
  }

  async snapshot(extra = {}) {
    const state = await inspectState(this.paths.state);
    const bookpi = await projectBookPiLedger(this.paths.state);

    const payload = { state, bookpi, timestamp: Date.now() };
    const hashData = JSON.stringify(payload);
    this.lastLedgerHash = createHash('sha256').update(hashData).digest('hex');

    const snapshot = {
      kernel: 'oso-data-weaver-k5-hardened',
      elite: ELITE_HEHEP_MANIFEST,
      generatedAt: new Date().toISOString(),
      merkleRoot: this.lastLedgerHash,
      manifest: this.manifest,
      registry: this.registry,
      agents: this.agents.list(),
      state,
      bookpi,
      ...extra,
    };

    await this.atomicWriteJson(
      this.secureResolve(SNAPSHOT_FILE, true),
      snapshot,
    );

    return snapshot;
  }

  async heartbeat() {
    await this.init();
    const event = await publishHeartbeat(this.manifest, this.paths.state);
    await this.emitBookPi(
      'NODE_HEARTBEAT',
      { health: 'ready', event },
      EVENT_CONTEXTS.PIPELINE_STARTED,
    );
    await this.snapshot({ latestHeartbeat: event });
    return event;
  }

  buildFairyPapercraftWorkflow() {
    return new TaskGraph([
      { id: 'geometry', agent: 'GeometryAgent', publishes: 'GEOMETRY_READY' },
      {
        id: 'unfold',
        agent: 'UnfoldAgent',
        dependsOn: ['geometry'],
        publishes: 'UNFOLD_READY',
      },
      {
        id: 'layout',
        agent: 'LayoutAgent',
        dependsOn: ['unfold'],
        publishes: 'PRINT_TEMPLATE_READY',
      },
      {
        id: 'render',
        agent: 'RenderAgent',
        dependsOn: ['layout'],
        publishes: 'PDF_READY',
      },
      {
        id: 'ui',
        agent: 'UIAgent',
        dependsOn: ['geometry'],
        publishes: 'UI_READY',
      },
      {
        id: 'optimize',
        agent: 'OptimizeAgent',
        dependsOn: ['render', 'ui'],
        publishes: 'QUALITY_SCORE_REPORTED',
      },
    ]);
  }

  async runWorkflow({ workflowId = `tamv-${Date.now()}`, parameters = {} } = {}) {
    await this.init();
    const graph = this.buildFairyPapercraftWorkflow();

    const workflowState = {
      workflowId,
      status: 'running',
      startedAt: new Date().toISOString(),
      parameters,
      results: {},
      completedTasks: [],
      failedTasks: [],
      cryptoTrace: [],
    };

    await this.persistWorkflow(workflowState);
    await this.publishKernelEvent('PIPELINE_STARTED', {
      workflowId,
      parameters,
    });

    const taskErrors = [];

    for (const layer of graph.layers()) {
      const outputs = await Promise.all(
        layer.map(async (task) => {
          try {
            const output = await this.runTask(task, workflowState);

            workflowState.results[output.agentId] = output.result;
            workflowState.completedTasks.push(output.taskId);

            const eventRecord = await this.publishKernelEvent(
              output.eventType,
              {
                workflowId,
                taskId: output.taskId,
                agentId: output.agentId,
                result: output.result,
              },
              output.result.he_hep_context,
            );

            workflowState.cryptoTrace.push(stableHash(eventRecord));
            return { ok: true, output };
          } catch (err) {
            const errorInfo = {
              taskId: task.id,
              agentId: task.agent,
              message: err.message,
              code: err.code || 'TASK_ERR',
            };
            workflowState.failedTasks.push(errorInfo);
            taskErrors.push(errorInfo);

            await this.publishKernelEvent(
              'FAILURE_REPORTED',
              { workflowId, error: errorInfo },
              EVENT_CONTEXTS.FAILURE_REPORTED,
            );

            return { ok: false, error: errorInfo };
          }
        }),
      );

      const allFailed = outputs.every((o) => !o.ok);
      if (allFailed) {
        workflowState.status = 'failed';
        workflowState.failedAt = new Date().toISOString();
        await this.persistWorkflow(workflowState);
        await this.snapshot({ latestWorkflow: workflowState });
        const err = new Error(
          'TAMV-CRITICAL: Todas las tareas de una capa fallaron, abortando pipeline.',
        );
        err.code = 'LAYER_FAILURE';
        throw err;
      }

      await this.persistWorkflow(workflowState);
    }

    if (taskErrors.length > 0) {
      workflowState.status = 'completed_with_errors';
    } else {
      workflowState.status = 'completed';
    }

    workflowState.completedAt = new Date().toISOString();

    await this.publishKernelEvent('PIPELINE_COMPLETED', {
      workflowId,
      results: workflowState.results,
      failedTasks: workflowState.failedTasks,
    });

    await this.persistWorkflow(workflowState);
    await this.snapshot({ latestWorkflow: workflowState });

    return workflowState;
  }

  sanitizePayload(payload) {
    if (!payload || typeof payload !== 'object') return payload;
    const { error, stack, ...rest } = payload;
    if (error && typeof error === 'object') {
      const { message, code } = error;
      rest.error = { message, code };
    }
    return rest;
  }

  async publishKernelEvent(
    type,
    payload,
    context = EVENT_CONTEXTS[type] ?? {
      hexagon: 'HE-Publish',
      domain: 'HEP-1',
    },
  ) {
    const safePayload = this.sanitizePayload(payload);

    const event = await publishEvent(
      this.manifest,
      type,
      safePayload,
      { he_hep_context: context },
      this.paths.state,
    );

    await this.emitBookPi(type, safePayload, context);
    return event;
  }

  async emitBookPi(type, payload, context) {
    return emitLocalEliteBookPiEvent(
      {
        protocol: this.manifest.protocol,
        type,
        source: this.manifest.nodeId,
        repository: this.manifest.repository,
        payload,
        meta: {
          role: this.manifest.role,
          kernel: 'oso-data-weaver-k5',
          doctrine: 'MD-X4',
          merkleRef: this.lastLedgerHash,
        },
        context,
      },
      this.paths.state,
    );
  }

  async runTask(task, workflowState) {
    const agent = this.agents.get(task.agent);

    const secureContext = Object.freeze({
      manifest: Object.freeze(this.manifest),
      registry: Object.freeze(this.registry),
      parameters: Object.freeze({ ...(workflowState.parameters || {}) }),
      results: Object.freeze({ ...(workflowState.results || {}) }),
      task: Object.freeze({ ...task }),
    });

    const { retries, timeoutMs } = task;

    const result = await runWithRetries(agent, secureContext, {
      retries,
      timeoutMs,
      taskId: task.id,
    });

    validateAgentResult(task, agent, result);

    return {
      taskId: task.id,
      agentId: agent.id,
      eventType: task.publishes || result.nextEvent || 'TASK_COMPLETED',
      result,
    };
  }

  // Persistencia: un archivo por workflow
  async persistWorkflow(workflowState) {
    const wfFile = `${WORKFLOW_FILE_PREFIX}${workflowState.workflowId}.json`;
    const wfPath = this.secureResolve(wfFile, true);
    await this.atomicWriteJson(wfPath, workflowState);
    return workflowState;
  }

  async recoverWorkflow(workflowId) {
    await this.init();
    const wfFile = `${WORKFLOW_FILE_PREFIX}${workflowId}.json`;
    const wfPath = this.secureResolve(wfFile, true);
    if (!(await pathExists(wfPath))) {
      throw new Error(
        `TAMV-CRITICAL: Workflow extraviado en la federación: ${workflowId}`,
      );
    }
    const raw = await readFile(wfPath, 'utf8');
    return JSON.parse(raw);
  }

  async dispatchPlanForLatestEvent() {
    await this.init();
    const events = await readEvents(this.paths.state);
    const latest =
      events.at(-1) ??
      createEvent(this.manifest, 'NODE_HEARTBEAT', { dryRun: true });
    const { planDispatch } = await import('./federation-bus.mjs');
    return {
      event: latest,
      dispatch: planDispatch(this.registry, latest),
    };
  }
}
