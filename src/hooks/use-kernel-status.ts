import { useMemo } from "react";
import {
  useQuery,
  type UseQueryResult,
  type QueryKey,
} from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  getKernelStatus,
  type KernelStatus,
} from "@/lib/integrations/ecosystem.functions";

const FALLBACK: KernelStatus = {
  isLedgerSynced: false,
  activeFederations: 0,
  healthScore: 0,
  lastTopologyHash: "0000000000000000",
  totalRepos: 0,
  liveRepos: 0,
  lastSyncAt: new Date(0).toISOString(),
  contractVersion: "1.0.0",
};

interface UseKernelStatusOptions {
  refetchIntervalMs?: number;
  staleTimeMs?: number;
  enabled?: boolean;
  /**
   * Máx. errores consecutivos antes de reducir el polling drásticamente.
   */
  maxConsecutiveErrors?: number;
}

interface KernelStatusHook {
  status: KernelStatus;
  isLoading: boolean;
  isFetching: boolean;
  isError: boolean;
  error: UseQueryResult<KernelStatus>["error"];
  refetch: UseQueryResult<KernelStatus>["refetch"];
  lastUpdatedAt: number;
  queryState: UseQueryResult<KernelStatus>["status"];
  /**
   * Nivel de degradación derivado:
   * - "nominal": todo normal
   * - "warning": errores recientes pero recuperables
   * - "critical": demasiados fallos; se reduce la presión sobre el kernel
   */
  degradationLevel: "nominal" | "warning" | "critical";
}

/**
 * Hook antifrágil para monitorear el TAMV Kernel Status.
 * Incluye:
 *  - normalización defensiva
 *  - control de errores consecutivos
 *  - reducción automática de frecuencia en modo crítico
 *  - fallback coherente para dashboards y HUDs.
 */
export function useKernelStatus(
  options: UseKernelStatusOptions = {},
): KernelStatusHook {
  const {
    refetchIntervalMs = 60_000,
    staleTimeMs = 30_000,
    enabled = true,
    maxConsecutiveErrors = 3,
  } = options;

  const fn = useServerFn(getKernelStatus);

  const queryKey: QueryKey = ["tamv", "kernel-status"];

  // Pequeño estado de errores consecutivos gestionado por React Query meta
  const query = useQuery<KernelStatus>({
    queryKey,
    queryFn: async () => {
      const result = await fn();
      return normalizeKernelStatus(result);
    },
    // Polling adaptativo: se ajusta con base en errorCount en meta
    refetchInterval: (q) => {
      if (!enabled) return false;

      const errorCount = (q.meta?.errorCount as number | undefined) ?? 0;

      if (errorCount >= maxConsecutiveErrors) {
        // Modo crítico: bajar intensidad para no reventar el kernel
        return refetchIntervalMs * 5; // p.ej. 5 minutos si el kernel está muy mal
      }

      if (errorCount > 0) {
        // Modo warning: backoff suave
        return refetchIntervalMs * 2;
      }

      // Modo nominal
      return refetchIntervalMs;
    },
    staleTime: staleTimeMs,
    retry: (failureCount, error) => {
      // Podemos cortar retries si detectamos errores "duros" (p.ej. 5xx repetidos)
      if (failureCount >= maxConsecutiveErrors) return false;
      // Ejemplo: no tiene sentido reintentar en ciertos errores
      if (isHardKernelError(error)) return false;
      return true;
    },
    meta: {
      source: "kernel-status",
      kernel: "tamv-k5",
      errorCount: 0,
    },
    onError: (error, _variables, ctx) => {
      if (!ctx) return;
      const current = (ctx.meta?.errorCount as number | undefined) ?? 0;
      ctx.meta = {
        ...ctx.meta,
        errorCount: current + 1,
      };
      // Aquí podrías emitir un evento a tu BookPI: tamv.kernel.status.error
      // para registrar degradación en el ledger, si quieres.
      // emitKernelStatusErrorEvent(error);
    },
    onSuccess: (_data, _vars, ctx) => {
      if (!ctx) return;
      // Reset de contador de errores cuando recupera
      ctx.meta = {
        ...ctx.meta,
        errorCount: 0,
      };
    },
  });

  const status = useMemo(() => {
    return query.data ?? FALLBACK;
  }, [query.data]);

  const degradationLevel: KernelStatusHook["degradationLevel"] =
    useMemo(() => {
      const errorCount = (query.meta?.errorCount as number | undefined) ?? 0;

      if (errorCount >= maxConsecutiveErrors) return "critical";
      if (errorCount > 0) return "warning";
      return "nominal";
    }, [query.meta, maxConsecutiveErrors]);

  return {
    status,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
    lastUpdatedAt: query.dataUpdatedAt || 0,
    queryState: query.status,
    degradationLevel,
  };
}

// ---------- Normalización y hardening ----------

function normalizeKernelStatus(input: KernelStatus | unknown): KernelStatus {
  if (!input || typeof input !== "object") {
    return FALLBACK;
  }

  const ks = input as Partial<KernelStatus>;

  return {
    isLedgerSynced: Boolean(ks.isLedgerSynced),
    activeFederations: safeNumber(
      ks.activeFederations,
      FALLBACK.activeFederations,
    ),
    healthScore: clampNumber(
      safeNumber(ks.healthScore, FALLBACK.healthScore),
      0,
      100,
    ),
    lastTopologyHash:
      typeof ks.lastTopologyHash === "string"
        ? ks.lastTopologyHash
        : FALLBACK.lastTopologyHash,
    totalRepos: safeNumber(ks.totalRepos, FALLBACK.totalRepos),
    liveRepos: safeNumber(ks.liveRepos, FALLBACK.liveRepos),
    lastSyncAt:
      typeof ks.lastSyncAt === "string"
        ? ks.lastSyncAt
        : FALLBACK.lastSyncAt,
    contractVersion:
      typeof ks.contractVersion === "string"
        ? ks.contractVersion
        : FALLBACK.contractVersion,
  };
}

function safeNumber(value: unknown, fallback: number): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function clampNumber(value: number, min: number, max: number): number {
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

function isHardKernelError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const anyError = error as { message?: string };
  const msg = anyError.message ?? "";

  // Aquí podrías codificar tus propios “errores duros”:
  // por ejemplo cuando el kernel responde con "UNRECOVERABLE" o algo así.
  if (msg.includes("UNRECOVERABLE")) return true;
  return false;
}
