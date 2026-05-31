import { createFileRoute } from "@tanstack/react-router";

import { CreatePaymentIntentSchema } from "@/lib/territory/sot-contracts";
import { errorResponse, jsonResponse, optionsResponse, parseJsonBody } from "@/lib/territory/http";
import { createPaymentIntent } from "@/lib/territory/sot-store";

export const Route = createFileRoute("/api/rdm/payments/create")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const input = await parseJsonBody(request, CreatePaymentIntentSchema);
        if (input instanceof Response) return input;
        try {
          return jsonResponse(await createPaymentIntent(input), 201);
        } catch (error) {
          return errorResponse(error);
        }
      },
      OPTIONS: async () => optionsResponse(),
    },
  },
});
