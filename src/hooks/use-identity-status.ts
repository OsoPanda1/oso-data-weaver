import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  getIdentityStatus,
  type IdentityStatusResult,
} from "@/lib/integrations/ecosystem.functions";

const FALLBACK: IdentityStatusResult = {
  githubLinked: false,
  orcidLinked: false,
  zenodoLinked: false,
  figshareLinked: false,
  details: {},
};

export function useIdentityStatus() {
  const fn = useServerFn(getIdentityStatus);
  const { data } = useQuery({
    queryKey: ["tamv", "identity-status"],
    queryFn: () => fn(),
    refetchInterval: 120_000,
    staleTime: 60_000,
  });
  return data ?? FALLBACK;
}
