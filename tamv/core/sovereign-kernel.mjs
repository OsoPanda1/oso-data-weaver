import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { randomUUID } from "node:crypto";
import {
  loadManifest,
  publishEvent,
  publishHeartbeat,
  inspectState,
  readJson,
  planDispatch,
  stableHash,
} from "./federation-bus.mjs";
import { emitLocalEliteBookPiEvent, projectBookPiLedger } from "./elite-bookpi.mjs";

const DEFAULT_MANIFEST_PATH = "tamv/node.manifest.json";
const DEFAULT_REGISTRY_PATH = "tamv/registry/nodes.json";
const KERNEL_CONTEXT = Object.freeze({ hexagon: "HE-Publish", domain: "HEP-1" });
const INGEST_CONTEXT = Object.freeze({ hexagon: "HE-Ingest", domain: "HEP-1" });
const TRANSFORM_CONTEXT = Object.freeze({ hexagon: "HE-Transform", domain: "HEP-1" });

function normalizePositiveNumber(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

function normalizePageTarget(value) {
  if (typeof value === "number") return Math.max(1, Math.round(value));
  const match = String(value ?? "").match(/\d+/);
  return match ? Math.max(1, Number(match[0])) : 100;
}

function nowIso() {
  return new Date().toISOString();
}

async function writeJson(path, value) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  return value;
}

async function readJsonIfExists(path) {
  try {
    return JSON.parse(await readFile(path, "utf8"));
  } catch (error) {
    if (error.code === "ENOENT") return null;
    throw error;
  }
}

function summarizeRegistry(registry) {
  const nodes = Array.isArray(registry?.nodes) ? registry.nodes : [];
  const eventCoverage = nodes.reduce((acc, node) => {
    for (const eventType of node.subscribes ?? []) {
      acc[eventType] = (acc[eventType] ?? 0) + 1;
    }
    return acc;
  }, {});

  return {
    protocol: registry?.protocol,
    generatedAt: registry?.generatedAt,
    nodeCount: nodes.length,
    repositories: nodes.map((node) => node.repository),
    roles: nodes.reduce((acc, node) => {
      acc[node.role] = (acc[node.role] ?? 0) + 1;
      return acc;
    }, {}),
    eventCoverage,
  };
}

function buildWorkflowPlan(parameters) {
  const product = String(parameters.product ?? "tamv-artifact");
  const scaleCm = normalizePositiveNumber(parameters.scaleCm, 80);
  const pages = normalizePageTarget(parameters.pages);
  const colorSystem = String(parameters.colorSystem ?? "white-gold");
  const complexity = Math.min(1, (pages / 120 + scaleCm / 100) / 2);
  const estimatedBuildHours = Number((pages * 0.18 + scaleCm * 0.07).toFixed(2));
  const panels = Math.max(8, Math.ceil(scaleCm / 5));

  return {
    product,
    scaleCm,
    pages,
    colorSystem,
    complexity,
    estimatedBuildHours,
    artifactTargets: [
      `${product}:geometry:${scaleCm}cm`,
      `${product}:unfold:${pages}pages`,
      `${product}:print-template:${colorSystem}`,
      `${product}:quality-ledger`,
    ],
    tasks: [
      {
        id: "ingest-brief",
        eventType: "TASK_ASSIGNED",
        hexagon: "HE-Ingest",
        ownerRole: "kernel",
        summary: "Normalizar brief y parámetros de producto.",
      },
      {
        id: "geometry-model",
        eventType: "GEOMETRY_READY",
        hexagon: "HE-Transform",
        ownerRole: "core-engine",
        summary: `Modelo paramétrico base con ${panels} paneles estructurales.`,
      },
      {
        id: "unfold-layout",
        eventType: "UNFOLD_READY",
        hexagon: "HE-Transform",
        ownerRole: "print",
        summary: `Despliegue calculado para ${pages} páginas objetivo.`,
      },
      {
        id: "print-template",
        eventType: "PRINT_TEMPLATE_READY",
        hexagon: "HE-Publish",
        ownerRole: "print",
        summary: `Plantilla imprimible con sistema ${colorSystem}.`,
      },
      {
        id: "bundle-pdf",
        eventType: "PDF_READY",
        hexagon: "HE-Publish",
        ownerRole: "asset",
        summary: "Paquete de exportación registrable para entrega.",
      },
      {
        id: "ui-handoff",
        eventType: "UI_READY",
        hexagon: "HE-Publish",
        ownerRole: "frontend",
        summary: "Handoff de vista y estado para consola TAMV.",
      },
    ],
  };
}

function computeQuality(plan) {
  const completeness = plan.artifactTargets.length / 4;
  const portability = plan.pages >= 20 ? 1 : 0.65;
  const scaleRisk = plan.scaleCm > 120 ? 0.7 : 1;
  const complexityRisk = 1 - Math.max(0, plan.complexity - 0.85) * 0.5;
  const score = Math.round(100 * completeness * portability * scaleRisk * complexityRisk);

  return {
    score: Math.max(1, Math.min(100, score)),
    gates: {
      canonicalBrief: true,
      recoverableState: true,
      dispatchPlanned: true,
      bookPiAudit: true,
      scaleRisk: scaleRisk === 1 ? "LOW" : "MEDIUM",
    },
  };
}

export class TamvSovereignKernel {
  constructor({
    stateDir = ".tamv/state",
    manifestPath = DEFAULT_MANIFEST_PATH,
    registryPath = DEFAULT_REGISTRY_PATH,
  } = {}) {
    this.stateDir = stateDir;
    this.manifestPath = manifestPath;
    this.registryPath = registryPath;
    this.manifest = null;
    this.registry = null;
  }

  async init() {
    this.manifest = await loadManifest(this.manifestPath);
    this.registry = await readJson(this.registryPath);
    await mkdir(resolve(this.stateDir), { recursive: true });
    await mkdir(resolve(this.stateDir, "workflows"), { recursive: true });
    await mkdir(resolve(this.stateDir, "snapshots"), { recursive: true });
    return {
      nodeId: this.manifest.nodeId,
      repository: this.manifest.repository,
      registry: summarizeRegistry(this.registry),
    };
  }

  async ensureReady() {
    if (!this.manifest || !this.registry) await this.init();
  }

  async emitBookPiMirror(type, payload, context = KERNEL_CONTEXT, meta = {}) {
    await this.ensureReady();
    return emitLocalEliteBookPiEvent(
      {
        protocol: this.manifest.protocol,
        type,
        source: this.manifest.nodeId,
        repository: this.manifest.repository,
        payload,
        meta: {
          role: this.manifest.role,
          kernel: "oso-data-weaver",
          doctrine: "MD-X4",
          ...meta,
        },
        context,
      },
      this.stateDir,
    );
  }

  dispatchFor(event) {
    return planDispatch(this.registry, event);
  }

  async publish(type, payload = {}, meta = {}, context = KERNEL_CONTEXT) {
    await this.ensureReady();
    const event = await publishEvent(this.manifest, type, payload, meta, this.stateDir);
    const dispatch = this.dispatchFor(event);
    const bookpiEvent = await this.emitBookPiMirror(
      type,
      { federationEventId: event.id, dispatch, ...payload },
      context,
      { federationEventType: type },
    );
    return { event, bookpiEvent, dispatch };
  }

  async heartbeat() {
    await this.ensureReady();
    const event = await publishHeartbeat(this.manifest, this.stateDir);
    const dispatch = this.dispatchFor(event);
    const bookpiEvent = await this.emitBookPiMirror(
      "NODE_HEARTBEAT",
      {
        federationEventId: event.id,
        health: "ready",
        checksum: stableHash(this.manifest),
        dispatch,
      },
      KERNEL_CONTEXT,
    );
    return { event, bookpiEvent, dispatch };
  }

  workflowPath(workflowId) {
    return resolve(this.stateDir, "workflows", `${workflowId}.json`);
  }

  async persistWorkflow(state) {
    state.updatedAt = nowIso();
    state.stateHash = stableHash({ ...state, stateHash: undefined });
    return writeJson(this.workflowPath(state.workflowId), state);
  }

  async runWorkflow({ parameters = {} } = {}) {
    await this.ensureReady();
    const workflowId = randomUUID();
    const startedAt = nowIso();
    const plan = buildWorkflowPlan(parameters);
    const quality = computeQuality(plan);
    const state = {
      workflowId,
      status: "RUNNING",
      protocol: this.manifest.protocol,
      source: this.manifest.nodeId,
      repository: this.manifest.repository,
      startedAt,
      updatedAt: startedAt,
      parameters,
      plan,
      events: [],
      artifacts: [],
      dispatch: [],
      quality: null,
      stateHash: null,
    };

    await this.persistWorkflow(state);

    const record = async (type, payload, context, meta = {}) => {
      const result = await this.publish(
        type,
        { workflowId, ...payload },
        { workflowId, ...meta },
        context,
      );
      state.events.push({
        id: result.event.id,
        type: result.event.type,
        createdAt: result.event.createdAt,
        integrity: result.event.integrity,
        bookpiId: result.bookpiEvent.header.id,
      });
      state.dispatch.push(...result.dispatch);
      await this.persistWorkflow(state);
      return result;
    };

    await record(
      "PIPELINE_STARTED",
      { product: plan.product, artifactTargets: plan.artifactTargets },
      INGEST_CONTEXT,
    );

    for (const task of plan.tasks) {
      const artifact = {
        id: `${workflowId}:${task.id}`,
        taskId: task.id,
        ownerRole: task.ownerRole,
        summary: task.summary,
        hash: stableHash({ workflowId, task, plan }),
      };
      state.artifacts.push(artifact);
      await record(
        task.eventType,
        { task, artifact },
        { hexagon: task.hexagon, domain: "HEP-1" },
        { ownerRole: task.ownerRole },
      );
    }

    state.quality = quality;
    await record("QUALITY_SCORE_REPORTED", { quality }, TRANSFORM_CONTEXT);
    state.status = "COMPLETED";
    await record(
      "PIPELINE_COMPLETED",
      {
        quality,
        artifactCount: state.artifacts.length,
        completedAt: nowIso(),
      },
      KERNEL_CONTEXT,
    );

    await this.persistWorkflow(state);
    return state;
  }

  async recoverWorkflow(workflowId) {
    if (!workflowId) throw new Error("workflowId is required.");
    const state = await readJsonIfExists(this.workflowPath(workflowId));
    if (!state) {
      return { workflowId, status: "NOT_FOUND", recovered: false };
    }
    const expected = stableHash({ ...state, stateHash: undefined });
    return {
      ...state,
      recovered: true,
      integrity: {
        ok: expected === state.stateHash,
        expected,
        received: state.stateHash,
      },
    };
  }

  async snapshot() {
    await this.ensureReady();
    const inspected = await inspectState(this.stateDir);
    const bookpi = await projectBookPiLedger(this.stateDir);
    const snapshot = {
      id: randomUUID(),
      createdAt: nowIso(),
      manifest: {
        nodeId: this.manifest.nodeId,
        repository: this.manifest.repository,
        version: this.manifest.version,
        capabilities: this.manifest.capabilities,
        channels: this.manifest.channels,
        elite_context: this.manifest.elite_context,
      },
      registry: summarizeRegistry(this.registry),
      federation: inspected,
      bookpi,
    };
    snapshot.integrity = stableHash(snapshot);
    const path = resolve(this.stateDir, "snapshots", `${snapshot.id}.json`);
    await writeJson(path, snapshot);
    const written = await this.publish(
      "KERNEL_SNAPSHOT_WRITTEN",
      { snapshotId: snapshot.id, path, integrity: snapshot.integrity },
      { snapshotId: snapshot.id },
      KERNEL_CONTEXT,
    );
    return {
      snapshot,
      path,
      event: written.event,
      bookpiEvent: written.bookpiEvent,
      dispatch: written.dispatch,
    };
  }
}
