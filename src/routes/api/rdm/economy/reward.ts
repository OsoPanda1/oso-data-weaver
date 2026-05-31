import { createFileRoute } from "@tanstack/react-router";

import { RewardWalletSchema } from "@/lib/territory/sot-contracts";
import { errorResponse, jsonResponse, optionsResponse, parseJsonBody } from "@/lib/territory/http";
import { rewardWallet } from "@/lib/territory/sot-store";

export const Route = createFileRoute("/api/rdm/economy/reward")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const input = await parseJsonBody(request, RewardWalletSchema);
        if (input instanceof Response) return input;
        try {
          return jsonResponse(await rewardWallet(input));
        } catch (error) {
          return errorResponse(error);
        }
      },
      OPTIONS: async () => optionsResponse(),
    },
  },
});
