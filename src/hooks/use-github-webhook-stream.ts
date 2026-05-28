import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";

export function useGithubWebhookStream(enabled = true) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!enabled || typeof window === "undefined" || typeof EventSource === "undefined") return;
    const source = new EventSource("/api/github/events/stream");
    const invalidate = () => {
      queryClient.invalidateQueries({ queryKey: ["tamv", "github-repos"] });
      queryClient.invalidateQueries({ queryKey: ["tamv", "github-webhook-status"] });
      queryClient.invalidateQueries({ queryKey: ["tamv", "kernel-status"] });
    };
    source.addEventListener("github-webhook", invalidate);
    source.onerror = () => {
      source.close();
    };
    return () => source.close();
  }, [enabled, queryClient]);
}
