import { createFileRoute } from "@tanstack/react-router";

import { getSotProjection } from "@/lib/territory/sot-store";
import { jsonResponse, optionsResponse } from "@/lib/territory/http";
import { RDM_TOS_VERSION } from "@/lib/territory/sot-contracts";

export const Route = createFileRoute("/api/rdm/manifest")({
  server: {
    handlers: {
      GET: async () => {
        const projection = getSotProjection();
        return jsonResponse({
          system: "RDM Digital — Sistema Operativo Territorial",
          version: RDM_TOS_VERSION,
          deployment: "TanStack Start/Vercel ready",
          doctrine: ["MD-X4", "CQRS", "Event Sourcing", "Ports & Adapters", "BookPI audit trail"],
          endpoints: {
            register: "/api/rdm/auth/register",
            reward: "/api/rdm/economy/reward",
            commerce: "/api/rdm/commerce/create",
            ai: "/api/rdm/ai/ask",
            payments: "/api/rdm/payments/create",
            stripeWebhook: "/api/rdm/webhooks/stripe",
          },
          projection: {
            users: projection.users.length,
            wallets: projection.wallets.length,
            transactions: projection.transactions.length,
            places: projection.places.length,
            commerce: projection.commerce.length,
            payments: projection.payments.length,
            auditTrail: projection.auditTrail.slice(0, 10),
          },
        });
      },
      OPTIONS: async () => optionsResponse(),
    },
  },
});
