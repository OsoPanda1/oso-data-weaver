/**
 * @file kernel-admin.functions.ts
 * @description Capa de transporte y control para la administración del Kernel TAMV-K5.
 * Integra observabilidad por defecto, protección de memoria O(n) y contratos estrictos
 * para las 7 federaciones operativas.
 */

import { createServerFn, createMiddleware } from "@tanstack/react-start";
import { z } from "zod";

import { validateOpenScienceIntegrations } from "./open-science";
import {
  diffManifestSnapshots,
  listManifestSnapshots,
  readManifestSnapshot,
} from "./manifest-snapshots";
import { listGithubWebhookEvents } from "./github-webhook-store";
import { type FederationId } from "@/lib/ecosystem/contracts";

// --- 1. CONTRATOS ESTRICTOS (ZOD) ---

const SnapshotIdSchema = z
  .string()
  .min(1, "Snapshot ID requerido")
  .max(256, "Snapshot ID excede la longitud permitida");

const CompareSnapshotsInputSchema = z.object({
  before: SnapshotIdSchema,
  after: SnapshotIdSchema,
});

type CompareSnapshotsInput = z.infer<typeof CompareSnapshotsInputSchema>;

// Contrato passthrough para aislar ruido externo (GitHub)
const GithubEventSchema = z.object({
  repository: z.object({ full_name: z.string().optional() }).optional(),
  timestamp: z.string().or(z.number()).optional(),
  createdAt: z.string().or(z.number()).optional(),
}).passthrough();

type GithubEventLatest = {
  repository?: { full_name?: string };
  timestamp?: string | number;
  createdAt?: string | number;
  [key: string]: unknown;
};

interface GithubWebhookStatus {
  configured: boolean;
  eventCount: number;
  latest: GithubEventLatest | null;
  repositories: string[];
}

// --- 2. TELEMETRÍA Y CONTROL DE EXCEPCIONES ---

const generateTraceId = (): string => {
  const now = Date.now().toString(36);
  const rand = Math.random().toString(36).substring(2, 10);
  return `${now}-${rand}`; // Trazabilidad determinista temporal-espacial
};

interface TAMVKernelErrorMetadata {
  hexagon: string;
  federationId?: FederationId;
  timestamp?: string;
  [key: string]: unknown;
}

export class TAMVKernelError extends Error {
  public readonly code: string;
  public readonly status: number;
  public readonly traceId: string;
  public readonly metadata: TAMVKernelErrorMetadata;

  constructor(
    message: string,
    code = "KERNEL_FAULT",
    status = 500,
    metadata: TAMVKernelErrorMetadata
  ) {
    super(message);
    this.name = "TAMVKernelError";
    this.code = code;
    this.status = status;
    this.traceId = generateTraceId();
    this.metadata = { timestamp: new Date().toISOString(), ...metadata };

    // Minimización de impacto en V8
    if (typeof (Error as any).captureStackTrace === "function") {
      (Error as any).captureStackTrace(this, this.constructor);
    }
  }
}

function assertEnv(name: string, required = true): string | undefined {
  const value = process.env[name];
  if (required && !value) {
    throw new TAMVKernelError(
      `Variable de entorno crítica ausente: ${name}`,
      "ENV_MISSING",
      500,
      { hexagon: "sys-core" }
    );
  }
  return value;
}

// --- 3. MIDDLEWARE DE OBSERVABILIDAD (BOOKPI) ---

/**
 * Envuelve las funciones del servidor para medir latencia y capturar excepciones globales.
 * Prepara el terreno para la emisión asíncrona hacia el ledger de BookPI o Isabella AI.
 */
const withBookPiTelemetry = (hexagon: string, federationId?: FederationId) =>
  createMiddleware().server(async ({ next }) => {
    const start = performance.now();
    try {
      const result = await next();
      // El pipeline de éxito fluye sin interrupción.
      // Futura inserción: emitir métricas de rendimiento positivas aquí si es requerido.
      return result;
    } catch (error) {
      const ms = performance.now() - start;
      const kernelError =
        error instanceof TAMVKernelError
          ? error
          : new TAMVKernelError(
              "Excepción no controlada en el runtime o capa inferior",
              "UNHANDLED_EXCEPTION",
              500,
              { hexagon, federationId, originalError: String(error) }
            );

      // Despliegue de logging asíncrono (Fire & Forget)
      console.error(
        `[TAMV:${hexagon.toUpperCase()}] Falla crítica interceptada (${ms.toFixed(2)}ms). Trace: ${kernelError.traceId}`,
        JSON.stringify(kernelError.metadata)
      );

      throw kernelError;
    }
  });

// --- 4. EXPORTACIÓN DE FUNCIONES DE SERVIDOR ---

export const validateOpenScienceStatus = createServerFn({ method: "GET" })
  .middleware([withBookPiTelemetry("open-science", "central")])
  .handler(async () => {
    const result = await validateOpenScienceIntegrations();
    return result;
  });

export const getManifestSnapshotHistory = createServerFn({ method: "GET" })
  .middleware([withBookPiTelemetry("manifest-ledger", "central")])
  .handler(async () => {
    const snapshots = await listManifestSnapshots();
    return snapshots.slice(0, 100);
  });

export const compareManifestSnapshots = createServerFn({ method: "GET" })
  .middleware([withBookPiTelemetry("manifest-diff", "central")])
  .inputValidator(CompareSnapshotsInputSchema)
  .handler(async ({ data }: { data: CompareSnapshotsInput }) => {
    const [before, after] = await Promise.all([
      readManifestSnapshot(data.before),
      readManifestSnapshot(data.after),
    ]);

    if (!before || !after) {
      throw new TAMVKernelError(
        "Incoherencia en el consenso: snapshots no localizados en el origen",
        "SNAPSHOT_ORPHANED",
        404,
        { hexagon: "manifest-diff", requested: { before: data.before, after: data.after } }
      );
    }

    return await diffManifestSnapshots(before, after);
  });

export const getGithubWebhookStatus = createServerFn({ method: "GET" })
  .middleware([withBookPiTelemetry("github-webhooks", "ops")])
  .handler(async (): Promise<GithubWebhookStatus> => {
    const isConfigured = Boolean(process.env.GITHUB_WEBHOOK_SECRET);
    const rawEvents = await listGithubWebhookEvents();

    let latestEvent: GithubEventLatest | null = null;
    let latestTime = 0;
    const reposSet = new Set<string>();

    for (const rawEvent of rawEvents) {
      const parsed = GithubEventSchema.safeParse(rawEvent);
      if (!parsed.success) continue;

      const event = parsed.data as GithubEventLatest;
      const repoName = event.repository?.full_name;
      if (repoName) reposSet.add(repoName);

      const rawTime = event.timestamp ?? event.createdAt ?? 0;
      const eventTime = new Date(rawTime as string | number).getTime();

      if (eventTime > latestTime) {
        latestTime = eventTime;
        latestEvent = event;
      }
    }

    return {
      configured: isConfigured,
      eventCount: rawEvents.length,
      latest: latestEvent,
      repositories: Array.from(reposSet),
    };
  });
