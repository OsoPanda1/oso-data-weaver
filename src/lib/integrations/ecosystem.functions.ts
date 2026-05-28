/**
 * TAMV Core Kernel · Interconexión viva con el ecosistema externo.
 *
 * Server functions que consumen:
 *   - GitHub (OsoPanda1)  → repos, heartbeats, lenguajes, último push
 *   - ORCID               → presencia de credenciales (HE-Identity / HEP-7)
 *   - Zenodo              → ping a /api/deposit/depositions
 *   - Figshare            → ping a /v2/account
 *
 * Todo se ejecuta en el servidor (Worker). Los secrets nunca cruzan al cliente.
 */

import { createServerFn } from "@tanstack/react-start";
import { createHash } from "node:crypto";

import { REPOS, GITHUB_OWNER } from "../ecosystem/manifest";
import { FEDERATIONS, CONTRACT_VERSION } from "../ecosystem/contracts";

// -----------------------------
//  Tipos compartidos cliente ↔ servidor
// -----------------------------

export interface GithubRepoLive {
  slug: string;
  full_name: string;
  description: string | null;
  language: string | null;
  stargazers_count: number;
  open_issues_count: number;
  pushed_at: string;
  updated_at: string;
  default_branch: string;
  html_url: string;
  archived: boolean;
  fork: boolean;
}

export interface IdentityStatusResult {
  orcidLinked: boolean;
  zenodoLinked: boolean;
  figshareLinked: boolean;
  githubLinked: boolean;
  details: Record<string, { ok: boolean; latencyMs: number; error?: string }>;
}

export interface KernelStatus {
  isLedgerSynced: boolean;
  activeFederations: number;
  healthScore: number;
  lastTopologyHash: string;
  totalRepos: number;
  liveRepos: number;
  lastSyncAt: string;
  contractVersion: string;
}

// -----------------------------
//  GitHub
// -----------------------------

async function ghFetch(path: string, token?: string): Promise<Response> {
  return fetch(`https://api.github.com${path}`, {
    headers: {
      "Accept": "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "tamv-core-kernel",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
}

export const getGithubRepos = createServerFn({ method: "GET" }).handler(
  async (): Promise<GithubRepoLive[]> => {
    const token = process.env.GITHUB_TOKEN;
    const res = await ghFetch(
      `/users/${GITHUB_OWNER}/repos?per_page=100&sort=pushed`,
      token,
    );
    if (!res.ok) {
      console.error("[github] list repos failed", res.status);
      return [];
    }
    const data = (await res.json()) as Array<Record<string, unknown>>;
    return data.map((r) => ({
      slug: String(r.name),
      full_name: String(r.full_name),
      description: (r.description as string | null) ?? null,
      language: (r.language as string | null) ?? null,
      stargazers_count: Number(r.stargazers_count ?? 0),
      open_issues_count: Number(r.open_issues_count ?? 0),
      pushed_at: String(r.pushed_at ?? ""),
      updated_at: String(r.updated_at ?? ""),
      default_branch: String(r.default_branch ?? "main"),
      html_url: String(r.html_url ?? ""),
      archived: Boolean(r.archived),
      fork: Boolean(r.fork),
    }));
  },
);

// -----------------------------
//  Identidad académica
// -----------------------------

async function pingZenodo(): Promise<{ ok: boolean; latencyMs: number; error?: string }> {
  const token = process.env.ZENODO_ACCESS_TOKEN ?? process.env.ZENODO_API_KEY;
  if (!token) return { ok: false, latencyMs: 0, error: "missing_token" };
  const t0 = Date.now();
  try {
    const res = await fetch(
      `https://zenodo.org/api/deposit/depositions?size=1&access_token=${encodeURIComponent(token)}`,
    );
    return { ok: res.ok, latencyMs: Date.now() - t0, error: res.ok ? undefined : `http_${res.status}` };
  } catch (e: any) {
    return { ok: false, latencyMs: Date.now() - t0, error: e?.message ?? "network_error" };
  }
}

async function pingFigshare(): Promise<{ ok: boolean; latencyMs: number; error?: string }> {
  const token = process.env.FIGSHARE_TOKEN;
  if (!token) return { ok: false, latencyMs: 0, error: "missing_token" };
  const t0 = Date.now();
  try {
    const res = await fetch("https://api.figshare.com/v2/account", {
      headers: { Authorization: `token ${token}` },
    });
    return { ok: res.ok, latencyMs: Date.now() - t0, error: res.ok ? undefined : `http_${res.status}` };
  } catch (e: any) {
    return { ok: false, latencyMs: Date.now() - t0, error: e?.message ?? "network_error" };
  }
}

async function pingOrcid(): Promise<{ ok: boolean; latencyMs: number; error?: string }> {
  const clientId = process.env.ORCID_CLIENT_ID;
  const apiKey = process.env.ORCID_API_KEY;
  if (!clientId || !apiKey) return { ok: false, latencyMs: 0, error: "missing_credentials" };
  const t0 = Date.now();
  // Public API health check — no user ORCID iD available yet, validamos endpoint base.
  try {
    const res = await fetch("https://pub.orcid.org/v3.0/expanded-search/?q=*&rows=0", {
      headers: { Accept: "application/json" },
    });
    return { ok: res.ok, latencyMs: Date.now() - t0, error: res.ok ? undefined : `http_${res.status}` };
  } catch (e: any) {
    return { ok: false, latencyMs: Date.now() - t0, error: e?.message ?? "network_error" };
  }
}

async function pingGithub(): Promise<{ ok: boolean; latencyMs: number; error?: string }> {
  const token = process.env.GITHUB_TOKEN;
  if (!token) return { ok: false, latencyMs: 0, error: "missing_token" };
  const t0 = Date.now();
  try {
    const res = await ghFetch("/user", token);
    return { ok: res.ok, latencyMs: Date.now() - t0, error: res.ok ? undefined : `http_${res.status}` };
  } catch (e: any) {
    return { ok: false, latencyMs: Date.now() - t0, error: e?.message ?? "network_error" };
  }
}

export const getIdentityStatus = createServerFn({ method: "GET" }).handler(
  async (): Promise<IdentityStatusResult> => {
    const [github, orcid, zenodo, figshare] = await Promise.all([
      pingGithub(),
      pingOrcid(),
      pingZenodo(),
      pingFigshare(),
    ]);
    return {
      githubLinked: github.ok,
      orcidLinked: orcid.ok,
      zenodoLinked: zenodo.ok,
      figshareLinked: figshare.ok,
      details: { github, orcid, zenodo, figshare },
    };
  },
);

// -----------------------------
//  Kernel status (telemetría agregada)
// -----------------------------

export const getKernelStatus = createServerFn({ method: "GET" }).handler(
  async (): Promise<KernelStatus> => {
    const live = await getGithubRepos();
    const liveSlugs = new Set(live.map((r) => r.slug.toLowerCase()));
    const matched = REPOS.filter((r) => liveSlugs.has(r.slug.toLowerCase())).length;

    const activeFederations = new Set(
      REPOS.filter((r) => liveSlugs.has(r.slug.toLowerCase())).map((r) => r.federation),
    ).size;

    const topologyInput = REPOS.map((r) => `${r.slug}:${r.federation}:${r.layer}`).join("|");
    const lastTopologyHash = createHash("sha256").update(topologyInput).digest("hex");

    const healthScore = REPOS.length === 0 ? 0 : Math.round((matched / REPOS.length) * 100);

    return {
      isLedgerSynced: live.length > 0,
      activeFederations,
      healthScore,
      lastTopologyHash,
      totalRepos: REPOS.length,
      liveRepos: matched,
      lastSyncAt: new Date().toISOString(),
      contractVersion: CONTRACT_VERSION,
    };
  },
);

// -----------------------------
//  Topología cognitiva (placeholder evolutivo)
// -----------------------------

export interface KnowledgeTopology {
  totalCells: number;
  totalArtifacts: number;
  deterministicRatio: number;
}

export const getKnowledgeTopology = createServerFn({ method: "GET" }).handler(
  async (): Promise<KnowledgeTopology> => {
    // Mientras no exista persistencia (Lovable Cloud / BookPI real),
    // derivamos métricas estructurales del manifest.
    const totalCells = REPOS.length;
    const totalArtifacts = REPOS.reduce((acc, r) => acc + r.emits.length, 0);
    const deterministic = REPOS.filter((r) => r.layer === "kernel" || r.layer === "identity").length;
    return {
      totalCells,
      totalArtifacts,
      deterministicRatio: totalCells === 0 ? 0 : deterministic / totalCells,
    };
  },
);

// -----------------------------
//  Manifest enriquecido (para /api/public/manifest)
// -----------------------------

export async function buildEnrichedManifest() {
  const [live, identity, kernel] = await Promise.all([
    getGithubRepos(),
    getIdentityStatus(),
    getKernelStatus(),
  ]);
  const liveBySlug = new Map(live.map((r) => [r.slug.toLowerCase(), r]));

  const enrichedRepos = REPOS.map((r) => {
    const gh = liveBySlug.get(r.slug.toLowerCase());
    return {
      ...r,
      live: gh
        ? {
            stars: gh.stargazers_count,
            openIssues: gh.open_issues_count,
            pushedAt: gh.pushed_at,
            language: gh.language,
            archived: gh.archived,
            url: gh.html_url,
          }
        : null,
    };
  });

  return {
    name: "tamv-core-kernel",
    contractVersion: CONTRACT_VERSION,
    generatedAt: new Date().toISOString(),
    kernel,
    identity: {
      github: identity.githubLinked,
      orcid: identity.orcidLinked,
      zenodo: identity.zenodoLinked,
      figshare: identity.figshareLinked,
    },
    federations: FEDERATIONS,
    repos: enrichedRepos,
  };
}
