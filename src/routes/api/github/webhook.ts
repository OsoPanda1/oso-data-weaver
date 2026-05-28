import { createFileRoute } from "@tanstack/react-router";
import {
  appendGithubWebhookEvent,
  normalizeGithubWebhook,
  verifyGithubWebhookSignature,
} from "@/lib/integrations/github-webhook-store";

export const Route = createFileRoute("/api/github/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const rawBody = await request.text();
        const secret = process.env.GITHUB_WEBHOOK_SECRET;
        const signature = request.headers.get("x-hub-signature-256");
        const eventName = request.headers.get("x-github-event") ?? "unknown";
        const delivery = request.headers.get("x-github-delivery");

        if (!verifyGithubWebhookSignature(rawBody, signature, secret)) {
          return new Response(JSON.stringify({ error: "invalid_signature" }), {
            status: 401,
            headers: { "Content-Type": "application/json; charset=utf-8" },
          });
        }

        const payload = JSON.parse(rawBody);
        const record = normalizeGithubWebhook(eventName, delivery, payload);
        await appendGithubWebhookEvent(record);

        return new Response(JSON.stringify({ ok: true, event: record.event, repository: record.repository?.full_name ?? null }), {
          status: 202,
          headers: { "Content-Type": "application/json; charset=utf-8" },
        });
      },
      GET: async () =>
        new Response(JSON.stringify({ ok: true, configured: Boolean(process.env.GITHUB_WEBHOOK_SECRET), endpoint: "/api/github/webhook" }), {
          status: 200,
          headers: { "Content-Type": "application/json; charset=utf-8" },
        }),
    },
  },
});
