import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getGithubWebhookStatus } from "@/lib/integrations/kernel-admin.functions";

export function useGithubWebhookStatus() {
  const fn = useServerFn(getGithubWebhookStatus);
  return useQuery({
    queryKey: ["tamv", "github-webhook-status"],
    queryFn: () => fn(),
    refetchInterval: 10_000,
    staleTime: 2_000,
  });
}
