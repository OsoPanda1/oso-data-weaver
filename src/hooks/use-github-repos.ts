import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getGithubRepos } from "@/lib/integrations/ecosystem.functions";

export function useGithubRepos() {
  const fn = useServerFn(getGithubRepos);
  return useQuery({
    queryKey: ["tamv", "github-repos"],
    queryFn: () => fn(),
    refetchInterval: 5 * 60_000,
    staleTime: 60_000,
  });
}
