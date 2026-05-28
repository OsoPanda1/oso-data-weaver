import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getManifestSnapshotHistory } from "@/lib/integrations/kernel-admin.functions";

export function useManifestSnapshots() {
  const fn = useServerFn(getManifestSnapshotHistory);
  return useQuery({
    queryKey: ["tamv", "manifest-snapshots"],
    queryFn: () => fn(),
    refetchInterval: 60_000,
    staleTime: 15_000,
  });
}
