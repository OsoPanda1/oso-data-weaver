import { createFileRoute } from "@tanstack/react-router";

import { AskTerritorialAISchema } from "@/lib/territory/sot-contracts";
import { errorResponse, jsonResponse, optionsResponse, parseJsonBody } from "@/lib/territory/http";
import { askTerritorialAI } from "@/lib/territory/sot-store";

export const Route = createFileRoute("/api/rdm/ai/ask")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const input = await parseJsonBody(request, AskTerritorialAISchema);
        if (input instanceof Response) return input;
        try {
          return jsonResponse(await askTerritorialAI(input));
        } catch (error) {
          return errorResponse(error);
        }
      },
      OPTIONS: async () => optionsResponse(),
    },
  },
});
