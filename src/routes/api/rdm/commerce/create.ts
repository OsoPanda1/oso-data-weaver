import { createFileRoute } from "@tanstack/react-router";

import { CreateCommerceSchema } from "@/lib/territory/sot-contracts";
import { errorResponse, jsonResponse, optionsResponse, parseJsonBody } from "@/lib/territory/http";
import { createCommerce } from "@/lib/territory/sot-store";

export const Route = createFileRoute("/api/rdm/commerce/create")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const input = await parseJsonBody(request, CreateCommerceSchema);
        if (input instanceof Response) return input;
        try {
          return jsonResponse(await createCommerce(input), 201);
        } catch (error) {
          return errorResponse(error);
        }
      },
      OPTIONS: async () => optionsResponse(),
    },
  },
});
