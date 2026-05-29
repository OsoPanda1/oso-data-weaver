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
}

export interface KernelStatusHook extends KernelStatus {
  status: KernelStatus;
  isLoading: boolean;
  isFetching: boolean;
  isError: boolean;
  error: UseQueryResult<KernelStatus>["error"];
  refetch: UseQueryResult<KernelStatus>["refetch"];
  lastUpdatedAt: number;
  queryState: UseQueryResult<KernelStatus>["status"];
  degradationLevel: "nominal" | "warning" | "critical";
}

/**
 * Hook antifrágil para monitorear el TAMV Kernel Status.
 * Compatible con React Query v5 (sin onError/onSuccess).
 * Expone tanto `status` (objeto completo) como los campos spread para
 * conservar compatibilidad con consumidores existentes.
 */
export function useKernelStatus(
  options: UseKernelStatusOptions = {},
): KernelStatusHook {
  const {
    refetchIntervalMs = 60_000,
    staleTimeMs = 30_000,
    enabled = true,
  } = options;

  const fn = useServerFn(getKernelStatus);
  const queryKey: QueryKey = ["tamv", "kernel-status"];

  const query = useQuery<KernelStatus>({
    queryKey,
    enabled,
    queryFn: async () => normalizeKernelStatus(await fn()),
    refetchInterval: refetchIntervalMs,
    staleTime: staleTimeMs,
    retry: (failureCount, error) => {
      if (failureCount >= 3) return false;
      if (isHardKernelError(error)) return false;
      return true;
    },
  });

  const status = useMemo<KernelStatus>(
    () => query.data ?? FALLBACK,
    [query.data],
  );

  const degradationLevel: KernelStatusHook["degradationLevel"] = useMemo(() => {
    if (query.failureCount >= 3) return "critical";
    if (query.failureCount > 0) return "warning";
    return "nominal";
  }, [query.failureCount]);

  return {
    ...status,
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

function normalizeKernelStatus(input: KernelStatus | unknown): KernelStatus {
  if (!input || typeof input !== "object") return FALLBACK;
  const ks = input as Partial<KernelStatus>;
  return {
    isLedgerSynced: Boolean(ks.isLedgerSynced),
    activeFederations: safeNumber(ks.activeFederations, FALLBACK.activeFederations),
    healthScore: clampNumber(safeNumber(ks.healthScore, FALLBACK.healthScore), 0, 100),
    lastTopologyHash:
      typeof ks.lastTopologyHash === "string" ? ks.lastTopologyHash : FALLBACK.lastTopologyHash,
    totalRepos: safeNumber(ks.totalRepos, FALLBACK.totalRepos),
    liveRepos: safeNumber(ks.liveRepos, FALLBACK.liveRepos),
    lastSyncAt: typeof ks.lastSyncAt === "string" ? ks.lastSyncAt : FALLBACK.lastSyncAt,
    contractVersion:
      typeof ks.contractVersion === "string" ? ks.contractVersion : FALLBACK.contractVersion,
  };
}

function safeNumber(value: unknown, fallback: number): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function clampNumber(value: number, min: number, max: number): number {
  return value < min ? min : value > max ? max : value;
}

function isHardKernelError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const msg = (error as { message?: string }).message ?? "";
  return msg.includes("UNRECOVERABLE");
}
