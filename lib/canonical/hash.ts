import { createHash } from "node:crypto";
import type { CanonicalEvent, CanonicalNode } from "./types";

/** Serialización canónica determinista (JSON con claves ordenadas). */
export function canonicalSerialize(value: unknown): string {
  return JSON.stringify(sortKeys(value));
}

function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (!value || typeof value !== "object") return value;
  const obj = value as Record<string, unknown>;
  return Object.keys(obj)
    .sort()
    .reduce<Record<string, unknown>>((acc, k) => {
      acc[k] = sortKeys(obj[k]);
      return acc;
    }, {});
}

export function sha256(value: unknown): string {
  return createHash("sha256")
    .update(typeof value === "string" ? value : canonicalSerialize(value))
    .digest("hex");
}

/** Identidad estable del nodo (no cambia con versiones). */
export function identityHash(node: CanonicalNode): string {
  return sha256({
    id: node.id,
    type: node.type,
    title: node.title,
    source: node.metadata.source,
    ontologyClass: node.semantic.ontologyClass,
  });
}

/** Hash de versión: cubre estado mutable y contenido. */
export function versionHash(node: CanonicalNode): string {
  return sha256({
    id: node.id,
    body: node.body ?? null,
    relations: node.relations,
    dependencies: node.dependencies,
    metadata: { ...node.metadata, updatedAt: undefined },
    semantic: node.semantic,
  });
}

/** Hash de evento excluye la firma. */
export function eventHash(event: Omit<CanonicalEvent, "eventHash" | "signature">): string {
  return sha256(event);
}
