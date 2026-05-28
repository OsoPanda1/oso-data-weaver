import { createFileRoute } from "@tanstack/react-router";
import { listGithubWebhookEvents } from "@/lib/integrations/github-webhook-store";

export const Route = createFileRoute("/api/github/events")({
  server: {
    handlers: {
      GET: async () => {
        const events = await listGithubWebhookEvents();
        return new Response(JSON.stringify({
          configured: Boolean(process.env.GITHUB_WEBHOOK_SECRET),
          eventCount: events.length,
          latest: events[0] ?? null,
          events: events.slice(0, 50),
        }, null, 2), {
          status: 200,
          headers: {
            "Content-Type": "application/json; charset=utf-8",
            "Cache-Control": "no-store",
            "Access-Control-Allow-Origin": "*",
          },
        });
      },
      OPTIONS: async () =>
        new Response(null, {
          status: 204,
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type",
          },
        }),
    },
  },
});
