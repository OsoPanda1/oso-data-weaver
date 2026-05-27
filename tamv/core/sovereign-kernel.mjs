import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import {
  DEFAULT_STATE_DIR,
  appendEvent,
  createEvent,
  inspectState,
  loadManifest,
  pathExists,
  publishEvent,
  publishHeartbeat,
  readEvents,
  readJson,
  stableHash,
  writeJson,
} from './federation-bus.mjs';

const WORKFLOW_FILE = 'workflows.json';
const SNAPSHOT_FILE = 'kernel-snapshot.json';

export class TaskGraph {
  constructor(tasks = []) {
    this.tasks = new Map();
    for (const task of tasks) this.addTask(task);
  }

  addTask(task) {
    if (!task?.id) throw new Error('Task requires an id.');
    if (this.tasks.has(task.id)) throw new Error(`Duplicate task id: ${task.id}`);
    this.tasks.set(task.id, {
      dependsOn: [],
      retries: 0,
      timeoutMs: 300000,
      ...task,
    });
    return this;
  }

  validate() {
    for (const task of this.tasks.values()) {
      for (const dependency of task.dependsOn) {
        if (!this.tasks.has(dependency)) throw new Error(`Task ${task.id} depends on missing task ${dependency}.`);
      }
    }
    const visiting = new Set();
    const visited = new Set();
    const visit = (id) => {
      if (visited.has(id)) return;
      if (visiting.has(id)) throw new Error(`Cycle detected at task ${id}.`);
      visiting.add(id);
      for (const dependency of this.tasks.get(id).dependsOn) visit(dependency);
      visiting.delete(id);
      visited.add(id);
    };
    for (const id of this.tasks.keys()) visit(id);
    return true;
  }

  layers() {
    this.validate();
    const remaining = new Map(this.tasks);
    const completed = new Set();
    const layers = [];
    while (remaining.size) {
      const ready = [...remaining.values()].filter((task) => task.dependsOn.every((dependency) => completed.has(dependency)));
      if (!ready.length) throw new Error('Task graph cannot progress.');
      layers.push(ready);
      for (const task of ready) {
        remaining.delete(task.id);
        completed.add(task.id);
      }
    }
    return layers;
  }
}

export class AgentRegistry {
  constructor(agents = []) {
    this.agents = new Map();
    for (const agent of agents) this.register(agent);
  }

  register(agent) {
    if (!agent?.id || typeof agent.run !== 'function') throw new Error('Agent requires id and run(context).');
    this.agents.set(agent.id, agent);
    return this;
  }

  get(id) {
    const agent = this.agents.get(id);
    if (!agent) throw new Error(`Unknown TAMV agent: ${id}`);
    return agent;
  }

  list() {
    return [...this.agents.values()].map(({ id, role, capabilities = [] }) => ({ id, role, capabilities }));
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
          modules: ['head', 'torso', 'arms', 'legs', 'detachable-wings', 'base'],
          exports: ['glb', 'obj'],
          nextEvent: 'GEOMETRY_READY',
          contextHash: stableHash(context.parameters ?? {}),
        };
      },
    },
    {
      id: 'UnfoldAgent',
      role: 'geometry',
      capabilities: ['edge-classification', 'island-segmentation', 'uv-flattening'],
      async run(context) {
        return {
          algorithm: 'graph-based-unfold-v1',
          lineTypes: ['cut', 'mountain', 'valley'],
          overlapPolicy: 'resolve-by-island-translation',
          nextEvent: 'UNFOLD_READY',
          geometryRef: context.results?.GeometryAgent?.model ?? 'pending-geometry',
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
          nextEvent: 'PRINT_TEMPLATE_READY',
          unfoldingRef: context.results?.UnfoldAgent?.algorithm ?? 'pending-unfold',
        };
      },
    },
    {
      id: 'RenderAgent',
      role: 'print',
      capabilities: ['svg-generation', 'pdf-compilation', 'gold-overlay'],
      async run(context) {
        return {
          outputs: ['white-system.pdf', 'gold-overlay.pdf', 'commercial-bundle.zip'],
          colorSystem: 'white-gold-cmyk-simulation',
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
          nextEvent: 'QUALITY_SCORE_REPORTED',
          bottlenecks: qualityScore >= 90 ? [] : ['manual-pdf-validation', 'geometry-asset-verification'],
        };
      },
    },
  ]);
}

export class TamvSovereignKernel {
  constructor({ stateDir = DEFAULT_STATE_DIR, manifestPath = 'tamv/node.manifest.json', registryPath = 'tamv/registry/nodes.json', agents = createDefaultAgents() } = {}) {
    this.stateDir = stateDir;
    this.manifestPath = manifestPath;
    this.registryPath = registryPath;
    this.agents = agents;
  }

  async init() {
    await mkdir(resolve(this.stateDir), { recursive: true });
    this.manifest = await loadManifest(this.manifestPath);
    this.registry = await readJson(this.registryPath);
    return this.snapshot();
  }

  async snapshot(extra = {}) {
    const state = await inspectState(this.stateDir);
    const snapshot = {
      kernel: 'oso-data-weaver',
      generatedAt: new Date().toISOString(),
      manifest: this.manifest ?? await loadManifest(this.manifestPath),
      registry: this.registry ?? await readJson(this.registryPath),
      agents: this.agents.list(),
      state,
      ...extra,
    };
    await writeJson(resolve(this.stateDir, SNAPSHOT_FILE), snapshot);
    return snapshot;
  }

  async heartbeat() {
    await this.init();
    const event = await publishHeartbeat(this.manifest, this.stateDir);
    await this.snapshot({ latestHeartbeat: event });
    return event;
  }

  buildFairyPapercraftWorkflow() {
    return new TaskGraph([
      { id: 'geometry', agent: 'GeometryAgent', publishes: 'GEOMETRY_READY' },
      { id: 'unfold', agent: 'UnfoldAgent', dependsOn: ['geometry'], publishes: 'UNFOLD_READY' },
      { id: 'layout', agent: 'LayoutAgent', dependsOn: ['unfold'], publishes: 'PRINT_TEMPLATE_READY' },
      { id: 'render', agent: 'RenderAgent', dependsOn: ['layout'], publishes: 'PDF_READY' },
      { id: 'ui', agent: 'UIAgent', dependsOn: ['geometry'], publishes: 'UI_READY' },
      { id: 'optimize', agent: 'OptimizeAgent', dependsOn: ['render', 'ui'], publishes: 'QUALITY_SCORE_REPORTED' },
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
    };
    await this.persistWorkflow(workflowState);
    await publishEvent(this.manifest, 'PIPELINE_STARTED', { workflowId, parameters }, {}, this.stateDir);

    try {
      for (const layer of graph.layers()) {
        const outputs = await Promise.all(layer.map((task) => this.runTask(task, workflowState)));
        for (const output of outputs) {
          workflowState.results[output.agentId] = output.result;
          workflowState.completedTasks.push(output.taskId);
          await publishEvent(this.manifest, output.eventType, { workflowId, taskId: output.taskId, agentId: output.agentId, result: output.result }, {}, this.stateDir);
        }
        await this.persistWorkflow(workflowState);
      }
      workflowState.status = 'completed';
      workflowState.completedAt = new Date().toISOString();
      await publishEvent(this.manifest, 'PIPELINE_COMPLETED', { workflowId, results: workflowState.results }, {}, this.stateDir);
      await this.persistWorkflow(workflowState);
      await this.snapshot({ latestWorkflow: workflowState });
      return workflowState;
    } catch (error) {
      workflowState.status = 'failed';
      workflowState.failedAt = new Date().toISOString();
      workflowState.error = { message: error.message, stack: error.stack };
      await publishEvent(this.manifest, 'FAILURE_REPORTED', { workflowId, error: workflowState.error }, {}, this.stateDir);
      await this.persistWorkflow(workflowState);
      throw error;
    }
  }

  async runTask(task, workflowState) {
    const agent = this.agents.get(task.agent);
    const result = await agent.run({
      manifest: this.manifest,
      registry: this.registry,
      parameters: workflowState.parameters,
      results: workflowState.results,
      task,
    });
    return {
      taskId: task.id,
      agentId: agent.id,
      eventType: task.publishes || result.nextEvent || 'TASK_COMPLETED',
      result,
    };
  }

  async persistWorkflow(workflowState) {
    const workflowsPath = resolve(this.stateDir, WORKFLOW_FILE);
    const workflows = await pathExists(workflowsPath) ? await readJson(workflowsPath) : {};
    workflows[workflowState.workflowId] = workflowState;
    await writeJson(workflowsPath, workflows);
    return workflowState;
  }

  async recoverWorkflow(workflowId) {
    await this.init();
    const workflowsPath = resolve(this.stateDir, WORKFLOW_FILE);
    const workflows = await pathExists(workflowsPath) ? await readJson(workflowsPath) : {};
    const workflow = workflows[workflowId];
    if (!workflow) throw new Error(`Workflow not found: ${workflowId}`);
    return workflow;
  }

  async dispatchPlanForLatestEvent() {
    await this.init();
    const events = await readEvents(this.stateDir);
    const latest = events.at(-1) ?? createEvent(this.manifest, 'NODE_HEARTBEAT', { dryRun: true });
    const { planDispatch } = await import('./federation-bus.mjs');
    return {
      event: latest,
      dispatch: planDispatch(this.registry, latest),
    };
  }
}
