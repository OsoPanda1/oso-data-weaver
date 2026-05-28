import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getKernelStatus, type KernelStatus } from "@/lib/integrations/ecosystem.functions";

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

export function useKernelStatus() {
  const fn = useServerFn(getKernelStatus);
  const { data } = useQuery({
    queryKey: ["tamv", "kernel-status"],
    queryFn: () => fn(),
    refetchInterval: 60_000,
    staleTime: 30_000,
  });
  return data ?? FALLBACK;
}
