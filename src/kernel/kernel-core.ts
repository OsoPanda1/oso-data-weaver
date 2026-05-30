// ============================================================================
// kernel-core.ts - NÚCLEO SOBERANO UNIFICADO
// ============================================================================

import { createHash } from "node:crypto";
import { mkdir, writeFile, readFile, rename } from "node:fs/promises";
import { resolve, normalize } from "node:path";
import { z } from "zod";

// ============================================================================
// TIPOS CANÓNICOS BASE
// ============================================================================

export type UUID = string;
export type SHA256Hex = string;
export type ISODateTime = string;
export type FederationId = string;
export type HexagonId = string;

// ============================================================================
// CONTRATOS DE DOMINIO (ZOD)
// ============================================================================

export const TaskSchema = z.object({
  id: z.string().min(1),
  agent: z.string().min(1),
  dependsOn: z.array(z.string()).default([]),
  publishes: z.string().optional(),
  retries: z.number().int().min(0).max(10).default(3),
  timeoutMs: z.number().int().min(1000).max(600000).default(300000),
  metadata: z.record(z.unknown()).optional(),
});

export const AgentSchema = z.object({
  id: z.string().min(1),
  role: z.string(),
  capabilities: z.array(z.string()).default([]),
  run: z.function().args(z.any()).returns(z.promise(z.any())),
});

export const EventContextSchema = z.object({
  hexagon: z.string(),
  domain: z.string(),
  federationId: z.string().optional(),
});

export const WorkflowParametersSchema = z.record(z.unknown());

export const WorkflowStateSchema = z.object({
  workflowId: z.string(),
  status: z.enum(["pending", "running", "completed", "completed_with_errors", "failed"]),
  startedAt: z.string(),
  completedAt: z.string().optional(),
  failedAt: z.string().optional(),
  parameters: z.record(z.unknown()),
  results: z.record(z.unknown()),
  completedTasks: z.array(z.string()),
  failedTasks: z.array(z.object({
    taskId: z.string(),
    agentId: z.string(),
    message: z.string(),
    code: z.string(),
  })),
  cryptoTrace: z.array(z.string()),
});

// ============================================================================
// TIPOS DERIVADOS
// ============================================================================

export type Task = z.infer<typeof TaskSchema>;
export type Agent = z.infer<typeof AgentSchema>;
export type EventContext = z.infer<typeof EventContextSchema>;
export type WorkflowState = z.infer<typeof WorkflowStateSchema>;

// ============================================================================
// EVENTOS CANÓNICOS
// ============================================================================

export type KernelEventType =
  | "KERNEL_INITIALIZED"
  | "KERNEL_HEARTBEAT"
  | "PIPELINE_STARTED"
  | "PIPELINE_COMPLETED"
  | "PIPELINE_FAILED"
  | "TASK_STARTED"
  | "TASK_COMPLETED"
  | "TASK_FAILED"
  | "AGENT_REGISTERED"
  | "AGENT_UNREGISTERED"
  | "SNAPSHOT_CREATED"
  | "POLICY_EVALUATED"
  | "TELEMETRY_EMITTED"
  | "GEOMETRY_READY"
  | "UNFOLD_READY"
  | "PRINT_TEMPLATE_READY"
  | "PDF_READY"
  | "UI_READY"
  | "QUALITY_SCORE_REPORTED"
  | "FAILURE_REPORTED";

export interface KernelEvent<T = unknown> {
  eventId: UUID;
  eventType: KernelEventType;
  timestamp: ISODateTime;
  actorId: string;
  workflowId?: string;
  nodeId?: UUID;
  federationId?: FederationId;
  payload: T;
  context: EventContext;
  prevHash: SHA256Hex;
  eventHash: SHA256Hex;
  signature?: string;
}

// ============================================================================
// ESTADO KERNEL
// ============================================================================

export interface KernelStatus {
  isLedgerSynced: boolean;
  activeFederations: number;
  healthScore: number;
  lastTopologyHash: SHA256Hex;
  totalRepos: number;
  liveRepos: number;
  lastSyncAt: ISODateTime;
  contractVersion: string;
}

export interface KernelSnapshot {
  kernel: string;
  generatedAt: ISODateTime;
  merkleRoot: SHA256Hex;
  manifest: KernelManifest;
  registry: KernelRegistry;
  agents: AgentDescriptor[];
  state: KernelState;
  workflows: Record<string, WorkflowState>;
}

export interface KernelManifest {
  protocol: string;
  nodeId: string;
  repository: string;
  role: string;
  version: string;
}

export interface KernelRegistry {
  nodes: Record<string, unknown>;
  federations: Record<FederationId, unknown>;
}

export interface KernelState {
  initialized: boolean;
  lastHeartbeat: ISODateTime;
  eventCount: number;
  workflowCount: number;
}

export interface AgentDescriptor {
  id: string;
  role: string;
  capabilities: string[];
}

// ============================================================================
// EXCEPCIONES TIPADAS
// ============================================================================

export interface KernelErrorMetadata {
  hexagon: string;
  federationId?: FederationId;
  timestamp?: ISODateTime;
  [key: string]: unknown;
}

export class KernelError extends Error {
  public readonly code: string;
  public readonly status: number;
  public readonly traceId: UUID;
  public readonly metadata: KernelErrorMetadata;

  constructor(
    message: string,
    code = "KERNEL_FAULT",
    status = 500,
    metadata: KernelErrorMetadata
  ) {
    super(message);
    this.name = "KernelError";
    this.code = code;
    this.status = status;
    this.traceId = generateTraceId();
    this.metadata = { timestamp: new Date().toISOString(), ...metadata };

    if (typeof (Error as any).captureStackTrace === "function") {
      (Error as any).captureStackTrace(this, this.constructor);
    }
  }
}

function generateTraceId(): UUID {
  const now = Date.now().toString(36);
  const rand = Math.random().toString(36).substring(2, 10);
  return `${now}-${rand}`;
}

// ============================================================================
// MOTOR TOPOLÓGICO (TASKGRAPH)
// ============================================================================

export class TaskGraph {
  private tasks: Map<string, Task>;

  constructor(tasks: Task[] = []) {
    this.tasks = new Map();
    for (const task of tasks) {
      this.addTask(task);
    }
  }

  addTask(task: Task): this {
    const validated = TaskSchema.parse(task);
    
    if (this.tasks.has(validated.id)) {
      throw new KernelError(
        `Task ID duplicado: ${validated.id}`,
        "TASK_DUPLICATE",
        409,
        { hexagon: "core", taskId: validated.id }
      );
    }

    this.tasks.set(validated.id, {
      ...validated,
      dependsOn: [...new Set(validated.dependsOn)],
    });

    return this;
  }

  validateAndSort(): Task[][] {
    const inDegree = new Map<string, number>();
    const adjacency = new Map<string, string[]>();

    for (const id of this.tasks.keys()) {
      inDegree.set(id, 0);
      adjacency.set(id, []);
    }

    for (const [id, task] of this.tasks.entries()) {
      for (const dep of task.dependsOn) {
        if (!this.tasks.has(dep)) {
          throw new KernelError(
            `Tarea ${id} depende de tarea inexistente: ${dep}`,
            "TASK_DEP_MISSING",
            400,
            { hexagon: "core", taskId: id, missingDep: dep }
          );
        }
        inDegree.set(id, (inDegree.get(id) || 0) + 1);
        adjacency.get(dep)!.push(id);
      }
    }

    const queue: string[] = [];
    for (const [id, degree] of inDegree.entries()) {
      if (degree === 0) queue.push(id);
    }

    const sortedLayers: Task[][] = [];

    while (queue.length > 0) {
      const levelSize = queue.length;
      const currentLayer: Task[] = [];

      for (let i = 0; i < levelSize; i++) {
        const id = queue.shift()!;
        const task = this.tasks.get(id)!;
        currentLayer.push(task);

        for (const neighbor of adjacency.get(id)!) {
          const newDegree = inDegree.get(neighbor)! - 1;
          inDegree.set(neighbor, newDegree);
          if (newDegree === 0) queue.push(neighbor);
        }
      }

      sortedLayers.push(currentLayer);
    }

    const processedCount = sortedLayers.flat().length;
    if (processedCount !== this.tasks.size) {
      throw new KernelError(
        "Ciclo detectado en grafo de dependencias",
        "TASK_CYCLE",
        400,
        { hexagon: "core", taskCount: this.tasks.size, processedCount }
      );
    }

    return sortedLayers;
  }

  layers(): Task[][] {
    return this.validateAndSort();
  }

  getTask(id: string): Task | undefined {
    return this.tasks.get(id);
  }

  getAllTasks(): Task[] {
    return Array.from(this.tasks.values());
  }
}

// ============================================================================
// REGISTRO DE AGENTES (PLUGIN SYSTEM)
// ============================================================================

export class AgentRegistry {
  private agents: Map<string, Agent>;

  constructor(agents: Agent[] = []) {
    this.agents = new Map();
    for (const agent of agents) {
      this.register(agent);
    }
  }

  register(agent: Agent): this {
    const validated = AgentSchema.parse(agent);

    if (this.agents.has(validated.id)) {
      throw new KernelError(
        `Agente duplicado: ${validated.id}`,
        "AGENT_DUPLICATE",
        409,
        { hexagon: "core", agentId: validated.id }
      );
    }

    this.agents.set(validated.id, validated);
    return this;
  }

  unregister(agentId: string): boolean {
    return this.agents.delete(agentId);
  }

  get(id: string): Agent {
    const agent = this.agents.get(id);
    if (!agent) {
      throw new KernelError(
        `Agente no encontrado: ${id}`,
        "AGENT_NOT_FOUND",
        404,
        { hexagon: "core", agentId: id }
      );
    }
    return agent;
  }

  list(): AgentDescriptor[] {
    return Array.from(this.agents.values()).map(({ id, role, capabilities }) => ({
      id,
      role,
      capabilities,
    }));
  }

  has(id: string): boolean {
    return this.agents.has(id);
  }
}

// ============================================================================
// EVENT STORE (INMUTABLE, VERIFICABLE)
// ============================================================================

export class EventStore {
  private events: KernelEvent[] = [];
  private prevHash: SHA256Hex = "0".repeat(64);

  append<T>(
    eventType: KernelEventType,
    payload: T,
    context: EventContext,
    actorId: string,
    workflowId?: string
  ): KernelEvent<T> {
    const event: KernelEvent<T> = {
      eventId: generateTraceId(),
      eventType,
      timestamp: new Date().toISOString(),
      actorId,
      workflowId,
      payload,
      context,
      prevHash: this.prevHash,
      eventHash: "",
    };

    event.eventHash = this.hashEvent(event);
    this.prevHash = event.eventHash;
    this.events.push(event as KernelEvent);

    return event;
  }

  private hashEvent<T>(event: KernelEvent<T>): SHA256Hex {
    const canonical = {
      eventId: event.eventId,
      eventType: event.eventType,
      timestamp: event.timestamp,
      actorId: event.actorId,
      payload: event.payload,
      prevHash: event.prevHash,
    };
    return createHash("sha256")
      .update(JSON.stringify(canonical))
      .digest("hex");
  }

  getAll(): ReadonlyArray<KernelEvent> {
    return Object.freeze([...this.events]);
  }

  getLast(): KernelEvent | undefined {
    return this.events[this.events.length - 1];
  }

  getByWorkflow(workflowId: string): KernelEvent[] {
    return this.events.filter(e => e.workflowId === workflowId);
  }

  verify(): boolean {
    let prev = "0".repeat(64);
    for (const event of this.events) {
      if (event.prevHash !== prev) return false;
      const computed = this.hashEvent(event);
      if (computed !== event.eventHash) return false;
      prev = event.eventHash;
    }
    return true;
  }

  count(): number {
    return this.events.length;
  }
}

// ============================================================================
// STATE MANAGER (PERSISTENCIA ATÓMICA)
// ============================================================================

export class StateManager {
  constructor(private baseDir: string) {}

  secureResolve(targetPath: string, isInternal = false): string {
    const base = normalize(this.baseDir);
    const resolved = normalize(
      resolve(isInternal ? this.baseDir : process.cwd(), targetPath)
    );

    if (isInternal && !resolved.startsWith(base)) {
      throw new KernelError(
        `Path traversal detectado: ${targetPath}`,
        "PATH_TRAVERSAL",
        403,
        { hexagon: "security", path: targetPath }
      );
    }

    return resolved;
  }

  async atomicWrite(
    relativePath: string,
    data: unknown,
    options: { maxBytes?: number } = {}
  ): Promise<void> {
    const { maxBytes = 5 * 1024 * 1024 } = options;
    const targetPath = this.secureResolve(relativePath, true);
    const json = JSON.stringify(data, null, 2);
    const size = Buffer.byteLength(json, "utf8");

    if (size > maxBytes) {
      throw new KernelError(
        `Payload excede límite: ${size} bytes (máx: ${maxBytes})`,
        "PAYLOAD_TOO_LARGE",
        413,
        { hexagon: "storage", size, maxBytes }
      );
    }

    const tmpPath = `${targetPath}.tmp.${Date.now()}`;
    await writeFile(tmpPath, json, "utf8");
    await rename(tmpPath, targetPath);
  }

  async read<T>(relativePath: string): Promise<T> {
    const targetPath = this.secureResolve(relativePath, true);
    const raw = await readFile(targetPath, "utf8");
    return JSON.parse(raw) as T;
  }

  async ensureDir(relativePath: string): Promise<void> {
    const targetPath = this.secureResolve(relativePath, true);
    await mkdir(targetPath, { recursive: true });
  }
}

// ============================================================================
// TELEMETRY BUS
// ============================================================================

export interface TelemetryEvent {
  level: "info" | "warn" | "error" | "critical";
  hexagon: HexagonId;
  federationId?: FederationId;
  message: string;
  metadata?: Record<string, unknown>;
  timestamp: ISODateTime;
  traceId?: UUID;
}

export class TelemetryBus {
  private listeners: Array<(event: TelemetryEvent) => void> = [];

  emit(event: Omit<TelemetryEvent, "timestamp">): void {
    const fullEvent: TelemetryEvent = {
      ...event,
      timestamp: new Date().toISOString(),
    };

    // Logging síncrono interno
    console.log(`[TAMV:${event.hexagon}] ${event.level.toUpperCase()}: ${event.message}`);

    // Notificación asíncrona a listeners
    for (const listener of this.listeners) {
      try {
        listener(fullEvent);
      } catch (err) {
        console.error("Telemetry listener failed:", err);
      }
    }
  }

  subscribe(listener: (event: TelemetryEvent) => void): () => void {
    this.listeners.push(listener);
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index >= 0) this.listeners.splice(index, 1);
    };
  }
}

// ============================================================================
// KERNEL RUNTIME (ORQUESTADOR PRINCIPAL)
// ============================================================================

export interface KernelConfig {
  stateDir?: string;
  manifest: KernelManifest;
  registry?: KernelRegistry;
  agents?: Agent[];
}

export class KernelRuntime {
  private manifest: KernelManifest;
  private registry: KernelRegistry;
  private agents: AgentRegistry;
  private eventStore: EventStore;
  private stateManager: StateManager;
  private telemetry: TelemetryBus;
  private initialized = false;
  private workflows: Map<string, WorkflowState> = new Map();

  constructor(config: KernelConfig) {
    this.manifest = config.manifest;
    this.registry = config.registry || { nodes: {}, federations: {} };
    this.agents = new AgentRegistry(config.agents || []);
    this.eventStore = new EventStore();
    this.stateManager = new StateManager(config.stateDir || ".tamv/state");
    this.telemetry = new TelemetryBus();
  }

  async init(): Promise<void> {
    if (this.initialized) return;

    await this.stateManager.ensureDir("");
    
    this.eventStore.append(
      "KERNEL_INITIALIZED",
      { manifest: this.manifest },
      { hexagon: "core", domain: "system" },
      "kernel"
    );

    this.telemetry.emit({
      level: "info",
      hexagon: "core",
      message: "Kernel inicializado",
      metadata: { nodeId: this.manifest.nodeId },
    });

    this.initialized = true;
  }

  async heartbeat(): Promise<KernelEvent> {
    this.ensureInitialized();

    const event = this.eventStore.append(
      "KERNEL_HEARTBEAT",
      { health: "ready", timestamp: Date.now() },
      { hexagon: "core", domain: "system" },
      "kernel"
    );

    await this.createSnapshot();

    this.telemetry.emit({
      level: "info",
      hexagon: "core",
      message: "Heartbeat emitido",
    });

    return event;
  }

  async runWorkflow(params: {
    workflowId?: string;
    graph: TaskGraph;
    parameters?: Record<string, unknown>;
  }): Promise<WorkflowState> {
    this.ensureInitialized();

    const workflowId = params.workflowId || `wf-${Date.now()}`;
    const workflowState: WorkflowState = {
      workflowId,
      status: "running",
      startedAt: new Date().toISOString(),
      parameters: params.parameters || {},
      results: {},
      completedTasks: [],
      failedTasks: [],
      cryptoTrace: [],
    };

    this.workflows.set(workflowId, workflowState);

    this.eventStore.append(
      "PIPELINE_STARTED",
      { workflowId, parameters: params.parameters },
      { hexagon: "pipeline", domain: "execution" },
      "kernel",
      workflowId
    );

    try {
      for (const layer of params.graph.layers()) {
        const results = await Promise.allSettled(
          layer.map(task => this.executeTask(task, workflowState))
        );

        const allFailed = results.every(r => r.status === "rejected");
        if (allFailed) {
          workflowState.status = "failed";
          workflowState.failedAt = new Date().toISOString();
          throw new KernelError(
            "Capa completa falló",
            "LAYER_FAILURE",
            500,
            { hexagon: "pipeline", workflowId }
          );
        }
      }

      workflowState.status = workflowState.failedTasks.length > 0
        ? "completed_with_errors"
        : "completed";
      workflowState.completedAt = new Date().toISOString();

      this.eventStore.append(
        "PIPELINE_COMPLETED",
        { workflowId, results: workflowState.results },
        { hexagon: "pipeline", domain: "execution" },
        "kernel",
        workflowId
      );

    } catch (error) {
      workflowState.status = "failed";
      workflowState.failedAt = new Date().toISOString();

      this.eventStore.append(
        "PIPELINE_FAILED",
        { workflowId, error: String(error) },
        { hexagon: "pipeline", domain: "execution" },
        "kernel",
        workflowId
      );

      throw error;
    } finally {
      await this.persistWorkflow(workflowState);
      await this.createSnapshot();
    }

    return workflowState;
  }

  private async executeTask(
    task: Task,
    workflowState: WorkflowState
  ): Promise<void> {
    const agent = this.agents.get(task.agent);

    this.eventStore.append(
      "TASK_STARTED",
      { taskId: task.id, agentId: agent.id },
      { hexagon: "execution", domain: "task" },
      agent.id,
      workflowState.workflowId
    );

    const context = Object.freeze({
      manifest: this.manifest,
      registry: this.registry,
      parameters: workflowState.parameters,
      results: workflowState.results,
      task,
    });

    try {
      const result = await this.runWithRetries(agent, context, task);

      workflowState.results[agent.id] = result;
      workflowState.completedTasks.push(task.id);

      const eventType = (task.publishes || result.nextEvent) as KernelEventType;
      
      this.eventStore.append(
        eventType || "TASK_COMPLETED",
        { taskId: task.id, result },
        result.he_hep_context || { hexagon: "execution", domain: "task" },
        agent.id,
        workflowState.workflowId
      );

    } catch (error) {
      const errorInfo = {
        taskId: task.id,
        agentId: agent.id,
        message: error instanceof Error ? error.message : String(error),
        code: error instanceof KernelError ? error.code : "TASK_ERROR",
      };

      workflowState.failedTasks.push(errorInfo);

      this.eventStore.append(
        "TASK_FAILED",
        errorInfo,
        { hexagon: "execution", domain: "task" },
        agent.id,
        workflowState.workflowId
      );

      throw error;
    }
  }

  private async runWithRetries(
    agent: Agent,
    context: any,
    task: Task
  ): Promise<any> {
    let attempt = 0;
    let lastError: Error | undefined;

    while (attempt <= task.retries) {
      try {
        return await Promise.race([
          agent.run(context),
          new Promise((_, reject) =>
            setTimeout(
              () => reject(new KernelError(
                `Timeout: ${task.timeoutMs}ms`,
                "TASK_TIMEOUT",
                408,
                { hexagon: "execution", taskId: task.id }
              )),
              task.timeoutMs
            )
          ),
        ]);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        attempt++;
        if (attempt > task.retries) break;
      }
    }

    throw lastError;
  }

  private async persistWorkflow(state: WorkflowState): Promise<void> {
    await this.stateManager.atomicWrite(
      `workflows/${state.workflowId}.json`,
      state
    );
  }

  async getWorkflow(workflowId: string): Promise<WorkflowState> {
    return await this.stateManager.read<WorkflowState>(
      `workflows/${workflowId}.json`
    );
  }

  async createSnapshot(): Promise<KernelSnapshot> {
    const snapshot: KernelSnapshot = {
      kernel: "tamv-k5-unified",
      generatedAt: new Date().toISOString(),
      merkleRoot: this.eventStore.getLast()?.eventHash || "0".repeat(64),
      manifest: this.manifest,
      registry: this.registry,
      agents: this.agents.list(),
      state: {
        initialized: this.initialized,
        lastHeartbeat: new Date().toISOString(),
        eventCount: this.eventStore.count(),
        workflowCount: this.workflows.size,
      },
      workflows: Object.fromEntries(this.workflows),
    };

    this.eventStore.append(
      "SNAPSHOT_CREATED",
      { merkleRoot: snapshot.merkleRoot },
      { hexagon: "core", domain: "system" },
      "kernel"
    );

    await this.stateManager.atomicWrite("kernel-snapshot.json", snapshot);

    return snapshot;
  }

  getStatus(): KernelStatus {
    return {
      isLedgerSynced: this.eventStore.verify(),
      activeFederations: Object.keys(this.registry.federations || {}).length,
      healthScore: this.calculateHealthScore(),
      lastTopologyHash: this.eventStore.getLast()?.eventHash || "0".repeat(64),
      totalRepos: Object.keys(this.registry.nodes || {}).length,
      liveRepos: Object.keys(this.registry.nodes || {}).length,
      lastSyncAt: new Date().toISOString(),
      contractVersion: this.manifest.version,
    };
  }

  private calculateHealthScore(): number {
    if (!this.initialized) return 0;
    const baseScore = 60;
    const eventBonus = Math.min(20, this.eventStore.count() * 0.5);
    const workflowBonus = Math.min(20, this.workflows.size * 2);
    return Math.min(100, baseScore + eventBonus + workflowBonus);
  }

  registerAgent(agent: Agent): void {
    this.agents.register(agent);
    this.eventStore.append(
      "AGENT_REGISTERED",
      { agentId: agent.id },
      { hexagon: "core", domain: "system" },
      "kernel"
    );
  }

  unregisterAgent(agentId: string): void {
    this.agents.unregister(agentId);
    this.eventStore.append(
      "AGENT_UNREGISTERED",
      { agentId },
      { hexagon: "core", domain: "system" },
      "kernel"
    );
  }

  onTelemetry(listener: (event: TelemetryEvent) => void): () => void {
    return this.telemetry.subscribe(listener);
  }

  getEvents(): ReadonlyArray<KernelEvent> {
    return this.eventStore.getAll();
  }

  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new KernelError(
        "Kernel no inicializado",
        "NOT_INITIALIZED",
        500,
        { hexagon: "core" }
      );
    }
  }
}
