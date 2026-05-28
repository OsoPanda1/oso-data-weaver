import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { validateOpenScienceStatus } from "@/lib/integrations/kernel-admin.functions";

export function useOpenScienceStatus() {
  const fn = useServerFn(validateOpenScienceStatus);
  return useQuery({
    queryKey: ["tamv", "open-science-status"],
    queryFn: () => fn(),
    refetchInterval: 30_000,
    staleTime: 10_000,
  });
}
