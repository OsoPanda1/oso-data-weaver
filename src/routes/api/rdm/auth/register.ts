import { createFileRoute } from "@tanstack/react-router";

import { RegisterCitizenSchema } from "@/lib/territory/sot-contracts";
import { errorResponse, jsonResponse, optionsResponse, parseJsonBody } from "@/lib/territory/http";
import { registerCitizen } from "@/lib/territory/sot-store";

export const Route = createFileRoute("/api/rdm/auth/register")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const input = await parseJsonBody(request, RegisterCitizenSchema);
        if (input instanceof Response) return input;
        try {
          return jsonResponse(await registerCitizen(input), 201);
        } catch (error) {
          return errorResponse(error);
        }
      },
      OPTIONS: async () => optionsResponse(),
    },
  },
});
