/**
 * Configuración de adaptadores de persistencia.
 * Lee variables de entorno en el Worker (sólo en runtime de server functions).
 * Sin envs → modo `in-memory` (default desarrollo).
 */

export interface StoreConfig {
  graph: { driver: "memory" | "neo4j"; url?: string; configured: boolean };
  vector: {
    driver: "memory" | "qdrant";
    url?: string;
    collection?: string;
    configured: boolean;
  };
}

export function readStoreConfig(): StoreConfig {
  const neo4jUrl = process.env.NEO4J_URL;
  const qdrantUrl = process.env.QDRANT_URL;
  return {
    graph: {
      driver: neo4jUrl ? "neo4j" : "memory",
      url: neo4jUrl,
      configured: Boolean(neo4jUrl && process.env.NEO4J_AUTH),
    },
    vector: {
      driver: qdrantUrl ? "qdrant" : "memory",
      url: qdrantUrl,
      collection: process.env.QDRANT_COLLECTION ?? "tamv-canonical",
      configured: Boolean(qdrantUrl),
    },
  };
}
