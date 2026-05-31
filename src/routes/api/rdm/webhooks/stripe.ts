import { createFileRoute } from "@tanstack/react-router";

import { StripeWebhookSchema, type PaymentStatus } from "@/lib/territory/sot-contracts";
import { errorResponse, jsonResponse, optionsResponse } from "@/lib/territory/http";
import { acknowledgePaymentWebhook, verifyStripeSignature } from "@/lib/territory/sot-store";

function mapStripeStatus(type: string, status?: string): PaymentStatus {
  if (type === "payment_intent.succeeded" || status === "succeeded") return "succeeded";
  if (type === "payment_intent.payment_failed" || status === "failed") return "failed";
  return "requires_confirmation";
}

export const Route = createFileRoute("/api/rdm/webhooks/stripe")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = await request.text();
          const parsed = StripeWebhookSchema.parse(JSON.parse(body));
          const object = parsed.data?.object;
          const signatureVerified = verifyStripeSignature(
            body,
            request.headers.get("stripe-signature"),
          );
          return jsonResponse(
            await acknowledgePaymentWebhook({
              provider: "stripe",
              status: mapStripeStatus(parsed.type, object?.status),
              externalId: object?.id,
              signatureVerified,
            }),
          );
        } catch (error) {
          return errorResponse(error);
        }
      },
      OPTIONS: async () => optionsResponse(),
    },
  },
});
