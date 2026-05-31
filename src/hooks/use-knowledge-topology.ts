import { useQuery } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import {
  getKnowledgeTopology,
  type KnowledgeTopology,
} from '@/lib/integrations/ecosystem.functions';

const FALLBACK: KnowledgeTopology = {
  totalCells: 0,
  totalArtifacts: 0,
  deterministicRatio: 0,
};

interface UseKnowledgeTopologyResult {
  data: KnowledgeTopology;
  isLoading: boolean;
  isError: boolean;
  error: unknown;
  isStale: boolean;
}

export function useKnowledgeTopology(): UseKnowledgeTopologyResult {
  const fn = useServerFn(getKnowledgeTopology);

  const {
    data,
    isLoading,
    isError,
    error,
    isStale,
  } = useQuery({
    queryKey: ['tamv', 'knowledge-topology'],
    queryFn: () => fn(),
    staleTime: 5 * 60_000, // 5 minutos de frescura
    refetchOnWindowFocus: false,
    retry: 1,
  });

  return {
    data: data ?? FALLBACK,
    isLoading,
    isError,
    error,
    isStale,
  };
}
