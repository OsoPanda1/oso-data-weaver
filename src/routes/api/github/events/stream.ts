import { createFileRoute } from "@tanstack/react-router";
import { listGithubWebhookEvents } from "@/lib/integrations/github-webhook-store";

export const Route = createFileRoute("/api/github/events/stream")({
  server: {
    handlers: {
      GET: async () => {
        const encoder = new TextEncoder();
        let lastId = "";
        const stream = new ReadableStream({
          async start(controller) {
            const send = (event: string, data: unknown) => {
              controller.enqueue(encoder.encode(`event: ${event}\n`));
              controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
            };

            send("ready", { ok: true, configured: Boolean(process.env.GITHUB_WEBHOOK_SECRET) });

            const interval = setInterval(async () => {
              try {
                const events = await listGithubWebhookEvents();
                const latest = events[0] ?? null;
                if (latest?.id && latest.id !== lastId) {
                  lastId = latest.id;
                  send("github-webhook", latest);
                } else {
                  send("heartbeat", { at: new Date().toISOString() });
                }
              } catch (error) {
                send("error", { message: error instanceof Error ? error.message : String(error) });
              }
            }, 5000);

            setTimeout(() => {
              clearInterval(interval);
              controller.close();
            }, 60000);
          },
        });

        return new Response(stream, {
          status: 200,
          headers: {
            "Content-Type": "text/event-stream; charset=utf-8",
            "Cache-Control": "no-store",
            "Connection": "keep-alive",
            "Access-Control-Allow-Origin": "*",
          },
        });
      },
    },
  },
});
