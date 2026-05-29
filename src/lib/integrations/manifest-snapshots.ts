import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

export interface ManifestSnapshotIndexEntry {
  id: string;
  createdAt: string;
  sha256: string;
  repoCount: number;
  federationCount: number;
  path: string;
}

const SNAPSHOT_DIR = ".tamv/manifest-snapshots";
const INDEX_FILE = "index.json";

function stableSort(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableSort);
  if (!value || typeof value !== "object") return value;
  return Object.keys(value as Record<string, unknown>).sort().reduce<Record<string, unknown>>((acc, key) => {
    acc[key] = stableSort((value as Record<string, unknown>)[key]);
    return acc;
  }, {});
}

function sha256(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(stableSort(value))).digest("hex");
}

async function ensureDir() {
  await mkdir(SNAPSHOT_DIR, { recursive: true });
}

async function readIndex(): Promise<ManifestSnapshotIndexEntry[]> {
  try {
    return JSON.parse(await readFile(join(SNAPSHOT_DIR, INDEX_FILE), "utf8"));
  } catch (error: any) {
    if (error?.code === "ENOENT") return [];
    throw error;
  }
}

async function writeIndex(index: ManifestSnapshotIndexEntry[]) {
  await ensureDir();
  await writeFile(join(SNAPSHOT_DIR, INDEX_FILE), `${JSON.stringify(index, null, 2)}\n`, "utf8");
}

export async function saveManifestSnapshot(manifest: any): Promise<ManifestSnapshotIndexEntry> {
  await ensureDir();
  const hash = sha256(manifest);
  const currentIndex = await readIndex();
  const latest = currentIndex[0];
  if (latest?.sha256 === hash) return latest;

  const createdAt = new Date().toISOString();
  const id = `${createdAt.replace(/[:.]/g, "-")}-${hash.slice(0, 12)}`;
  const filename = `${id}.json`;
  const path = join(SNAPSHOT_DIR, filename);
  const entry: ManifestSnapshotIndexEntry = {
    id,
    createdAt,
    sha256: hash,
    repoCount: Array.isArray(manifest?.repos) ? manifest.repos.length : 0,
    federationCount: manifest?.federations ? Object.keys(manifest.federations).length : 0,
    path,
  };
  await writeFile(path, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  await writeIndex([entry, ...currentIndex].slice(0, 100));
  return entry;
}

export async function listManifestSnapshots(): Promise<ManifestSnapshotIndexEntry[]> {
  await ensureDir();
  const index = await readIndex();
  if (index.length) return index;
  const files = (await readdir(SNAPSHOT_DIR)).filter((file) => file.endsWith(".json") && file !== INDEX_FILE);
  return files.sort().reverse().map((file) => ({
    id: file.replace(/\.json$/, ""),
    createdAt: file.slice(0, 24),
    sha256: "unknown",
    repoCount: 0,
    federationCount: 0,
    path: join(SNAPSHOT_DIR, file),
  }));
}

export async function readManifestSnapshot(id: string): Promise<any> {
  const index = await listManifestSnapshots();
  const entry = index.find((snapshot) => snapshot.id === id);
  if (!entry) throw new Error(`Manifest snapshot not found: ${id}`);
  return JSON.parse(await readFile(entry.path, "utf8"));
}

export interface ManifestDiff {
  before: string | null;
  after: string | null;
  added: string[];
  removed: string[];
  changed: string[];
  counts: {
    beforeRepos: number;
    afterRepos: number;
    added: number;
    removed: number;
    changed: number;
  };
}

export function diffManifestSnapshots(before: any, after: any): ManifestDiff {
  const beforeRepos = new Map<string, any>(
    (before?.repos ?? []).map((repo: any) => [repo.slug as string, repo]),
  );
  const afterRepos = new Map<string, any>(
    (after?.repos ?? []).map((repo: any) => [repo.slug as string, repo]),
  );
  const added = [...afterRepos.keys()].filter((slug) => !beforeRepos.has(slug));
  const removed = [...beforeRepos.keys()].filter((slug) => !afterRepos.has(slug));
  const changed = [...afterRepos.keys()].filter((slug) => {
    if (!beforeRepos.has(slug)) return false;
    return sha256(beforeRepos.get(slug)) !== sha256(afterRepos.get(slug));
  });
  return {
    before: before?.generatedAt ?? null,
    after: after?.generatedAt ?? null,
    added,
    removed,
    changed,
    counts: {
      beforeRepos: beforeRepos.size,
      afterRepos: afterRepos.size,
      added: added.length,
      removed: removed.length,
      changed: changed.length,
    },
  };
}
