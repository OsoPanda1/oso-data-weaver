import type { CanonicalEvent, CanonicalNode } from "./types";
import { identityHash, versionHash, eventHash } from "./hash";

export interface InvariantViolation {
  code: string;
  message: string;
}

export function validateNodeInvariants(
  node: CanonicalNode,
  existingIds: Set<string>,
): InvariantViolation[] {
  const violations: InvariantViolation[] = [];
  if (!node.id) violations.push({ code: "NODE_ID_MISSING", message: "id requerido" });
  if (!node.metadata.source)
    violations.push({ code: "SOURCE_MISSING", message: "metadata.source requerido" });
  if (node.metadata.createdAt > node.metadata.updatedAt)
    violations.push({
      code: "TIMESTAMP_INVERSION",
      message: "createdAt > updatedAt",
    });
  if (!node.semantic.ontologyClass)
    violations.push({
      code: "ONTOLOGY_MISSING",
      message: "semantic.ontologyClass requerido",
    });

  const expectedIdentity = identityHash(node);
  if (node.identityHash && node.identityHash !== expectedIdentity)
    violations.push({
      code: "IDENTITY_HASH_MISMATCH",
      message: "identityHash no corresponde al contenido fijo",
    });

  const expectedVersion = versionHash(node);
  if (node.versionHash && node.versionHash !== expectedVersion)
    violations.push({
      code: "VERSION_HASH_MISMATCH",
      message: "versionHash no corresponde al contenido actual",
    });

  for (const edge of node.relations) {
    if (edge.from !== node.id && edge.to !== node.id)
      violations.push({
        code: "EDGE_ORPHAN",
        message: `arista ${edge.id} no toca al nodo`,
      });
    if (!existingIds.has(edge.from) && edge.from !== node.id)
      violations.push({ code: "EDGE_FROM_UNKNOWN", message: edge.from });
    if (!existingIds.has(edge.to) && edge.to !== node.id)
      violations.push({ code: "EDGE_TO_UNKNOWN", message: edge.to });
  }

  return violations;
}

export function validateEventChain(
  prev: CanonicalEvent | undefined,
  next: CanonicalEvent,
): InvariantViolation[] {
  const violations: InvariantViolation[] = [];
  const expectedPrev = prev?.eventHash ?? "GENESIS";
  if (next.prevHash !== expectedPrev)
    violations.push({
      code: "PREV_HASH_MISMATCH",
      message: `esperaba ${expectedPrev}, recibí ${next.prevHash}`,
    });
  const expected = eventHash({
    eventId: next.eventId,
    eventType: next.eventType,
    timestamp: next.timestamp,
    actorId: next.actorId,
    nodeId: next.nodeId,
    payload: next.payload,
    prevHash: next.prevHash,
  });
  if (expected !== next.eventHash)
    violations.push({ code: "EVENT_HASH_MISMATCH", message: "hash recalculado difiere" });
  return violations;
}
