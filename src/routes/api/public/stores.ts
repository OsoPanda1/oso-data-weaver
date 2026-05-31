/**
 * GET /api/public/stores
 * Estado de los adaptadores de persistencia (Neo4j / Qdrant) y configuración.
 */

import { createFileRoute } from "@tanstack/react-router";

import { readStoreConfig } from "../../../../lib/memory/store-config";
import { pingNeo4j } from "../../../../lib/memory/graph-neo4j";
import { pingQdrant } from "../../../../lib/memory/vector-qdrant";

export const Route = createFileRoute("/api/public/stores")({
  server: {
    handlers: {
      GET: async () => {
        const cfg = readStoreConfig();
        const [neo4j, qdrant] = await Promise.all([pingNeo4j(), pingQdrant()]);
        return new Response(
          JSON.stringify(
            { config: cfg, probes: { neo4j, qdrant } },
            null,
            2,
          ),
          {
            status: 200,
            headers: {
              "Content-Type": "application/json; charset=utf-8",
              "Access-Control-Allow-Origin": "*",
            },
          },
        );
      },
    },
  },
});
