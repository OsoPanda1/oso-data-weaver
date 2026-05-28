import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  getKnowledgeTopology,
  type KnowledgeTopology,
} from "@/lib/integrations/ecosystem.functions";

const FALLBACK: KnowledgeTopology = {
  totalCells: 0,
  totalArtifacts: 0,
  deterministicRatio: 0,
};

export function useKnowledgeTopology() {
  const fn = useServerFn(getKnowledgeTopology);
  const { data } = useQuery({
    queryKey: ["tamv", "knowledge-topology"],
    queryFn: () => fn(),
    staleTime: 5 * 60_000,
  });
  return data ?? FALLBACK;
}
