import type { CanonicalEdge, CanonicalNode, NodeType } from "../canonical/types";
import { identityHash, versionHash, sha256 } from "../canonical/hash";
import { validateNodeInvariants } from "../canonical/invariants";

const nodes = new Map<string, CanonicalNode>();
const edges: CanonicalEdge[] = [];

export interface UpsertResult {
  node: CanonicalNode;
  created: boolean;
  violations: { code: string; message: string }[];
}

export function upsertNode(input: Omit<CanonicalNode, "canonicalHash" | "identityHash" | "versionHash">): UpsertResult {
  const existing = nodes.get(input.id);
  const node: CanonicalNode = {
    ...input,
    canonicalHash: "",
    identityHash: "",
    versionHash: "",
  };
  node.identityHash = identityHash(node);
  node.versionHash = versionHash(node);
  node.canonicalHash = sha256({ id: node.identityHash, v: node.versionHash });
  const existingIds = new Set(nodes.keys());
  const violations = validateNodeInvariants(node, existingIds);
  nodes.set(node.id, node);
  return { node, created: !existing, violations };
}

export function getNode(id: string): CanonicalNode | undefined {
  return nodes.get(id);
}

export function listNodes(type?: NodeType): CanonicalNode[] {
  const arr = Array.from(nodes.values());
  return type ? arr.filter((n) => n.type === type) : arr;
}

export function nodeCount(): number {
  return nodes.size;
}

export function addEdge(edge: CanonicalEdge): void {
  if (!nodes.has(edge.from) || !nodes.has(edge.to))
    throw new Error(`Edge references unknown node: ${edge.from} -> ${edge.to}`);
  edges.push(edge);
}

export function listEdges(): CanonicalEdge[] {
  return [...edges];
}

export function searchByText(q: string, limit = 10): CanonicalNode[] {
  const needle = q.toLowerCase();
  return Array.from(nodes.values())
    .map((n) => ({
      n,
      score:
        (n.title.toLowerCase().includes(needle) ? 2 : 0) +
        (n.body?.toLowerCase().includes(needle) ? 1 : 0) +
        (n.semantic.tags.some((t) => t.toLowerCase().includes(needle)) ? 1 : 0),
    }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((x) => x.n);
}

export function integrityReport(): { total: number; valid: number; corrupted: number } {
  let valid = 0;
  let corrupted = 0;
  for (const n of nodes.values()) {
    const expected = versionHash(n);
    if (n.versionHash === expected) valid++;
    else corrupted++;
  }
  return { total: nodes.size, valid, corrupted };
}
