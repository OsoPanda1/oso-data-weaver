import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Header } from "@/components/tamv/Header";
import { REPOS } from "@/lib/ecosystem/manifest";
import { FEDERATIONS, type FederationId } from "@/lib/ecosystem/contracts";
import { useGithubRepos } from "@/hooks/use-github-repos";
import { useIdentityStatus } from "@/hooks/use-identity-status";
import { useGithubWebhookStatus } from "@/hooks/use-github-webhook-status";

export const Route = createFileRoute("/repos")({
  component: ReposView,
});

type ArchiveFilter = "active" | "archived" | "all";

function ReposView() {
  const { data: live, isLoading, error } = useGithubRepos();
  const identity = useIdentityStatus();
  const webhooks = useGithubWebhookStatus();
  const [query, setQuery] = useState("");
  const [federation, setFederation] = useState<FederationId | "all">("all");
  const [language, setLanguage] = useState("all");
  const [archiveFilter, setArchiveFilter] = useState<ArchiveFilter>("active");

  const liveBySlug = new Map((live ?? []).map((r) => [r.slug.toLowerCase(), r]));
  const languages = useMemo(() => {
    const values = new Set<string>();
    for (const repo of REPOS) values.add(repo.language);
    for (const repo of live ?? []) if (repo.language) values.add(repo.language);
    return ["all", ...Array.from(values).sort()];
  }, [live]);

  const filteredRepos = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return REPOS.filter((repo) => {
      const gh = liveBySlug.get(repo.slug.toLowerCase());
      const repoLanguage = gh?.language ?? repo.language;
      const archived = Boolean(gh?.archived);
      const matchesQuery = !normalizedQuery || [repo.slug, repo.title, repo.summary, repo.layer, repoLanguage]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalizedQuery));
      const matchesFederation = federation === "all" || repo.federation === federation;
      const matchesLanguage = language === "all" || repoLanguage === language;
      const matchesArchive = archiveFilter === "all" || (archiveFilter === "archived" ? archived : !archived);
      return matchesQuery && matchesFederation && matchesLanguage && matchesArchive;
    });
  }, [archiveFilter, federation, language, liveBySlug, query]);

  return (
    <div className="min-h-screen bg-[#020202] text-zinc-100">
      <Header />
      <main className="mx-auto max-w-7xl px-6 py-10 space-y-8">
        <header className="border-b border-white/10 pb-5">
          <div className="text-[10px] uppercase tracking-[0.3em] text-amber-300/70">
            Heptafederación · interconexión viva
          </div>
          <h1 className="font-display text-3xl mt-1">Repos del ecosistema</h1>
          <p className="text-sm text-zinc-400 mt-2 max-w-3xl">
            Lectura directa desde GitHub <span className="font-mono">OsoPanda1</span>. Cada fila cruza el contrato doctrinal del manifest con heartbeat real del repo, filtros operativos y eventos de webhook.
          </p>
          <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-mono">
            <Tag ok={identity.githubLinked} label="GitHub" />
            <Tag ok={identity.orcidLinked} label="ORCID" />
            <Tag ok={identity.zenodoLinked} label="Zenodo" />
            <Tag ok={identity.figshareLinked} label="Figshare" />
            <Tag ok={Boolean(webhooks.data?.configured)} label="Webhook" />
          </div>
        </header>

        <section className="rounded-xl border border-white/5 bg-[#050505]/90 p-4">
          <div className="grid gap-3 md:grid-cols-[minmax(220px,1fr)_180px_180px_160px]">
            <label className="space-y-1">
              <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-500">Buscar</span>
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="repo, capa, resumen..."
                className="w-full rounded-md border border-white/10 bg-black/40 px-3 py-2 font-mono text-sm text-zinc-100 outline-none focus:border-amber-300/60"
              />
            </label>
            <Select label="Federación" value={federation} onChange={(value) => setFederation(value as FederationId | "all")}>
              <option value="all">Todas</option>
              {Object.values(FEDERATIONS).map((fed) => (
                <option key={fed.id} value={fed.id}>{fed.id}</option>
              ))}
            </Select>
            <Select label="Lenguaje" value={language} onChange={setLanguage}>
              {languages.map((value) => (
                <option key={value} value={value}>{value === "all" ? "Todos" : value}</option>
              ))}
            </Select>
            <Select label="Archivados" value={archiveFilter} onChange={(value) => setArchiveFilter(value as ArchiveFilter)}>
              <option value="active">Solo vivos</option>
              <option value="archived">Archivados</option>
              <option value="all">Todos</option>
            </Select>
          </div>
          <div className="mt-3 flex flex-wrap justify-between gap-3 font-mono text-[11px] text-zinc-500">
            <span>{filteredRepos.length} relevantes de {REPOS.length}</span>
            <span>Webhook events: {webhooks.data?.eventCount ?? 0} · latest: {webhooks.data?.latest?.repository?.full_name ?? "sin eventos"}</span>
          </div>
        </section>

        {isLoading ? (
          <p className="text-xs text-zinc-500 font-mono">Sincronizando ledger GitHub...</p>
        ) : error ? (
          <p className="text-xs text-red-400 font-mono">Error: {String(error)}</p>
        ) : null}

        <div className="overflow-x-auto rounded-xl border border-white/5">
          <table className="min-w-full text-sm">
            <thead className="bg-black/50 text-[10px] uppercase tracking-[0.2em] text-zinc-500">
              <tr>
                <th className="px-4 py-3 text-left">Repo</th>
                <th className="px-4 py-3 text-left">Federación</th>
                <th className="px-4 py-3 text-left">Capa</th>
                <th className="px-4 py-3 text-left">Lang</th>
                <th className="px-4 py-3 text-right">★</th>
                <th className="px-4 py-3 text-left">Último push</th>
                <th className="px-4 py-3 text-left">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredRepos.map((r) => {
                const gh = liveBySlug.get(r.slug.toLowerCase());
                const fed = FEDERATIONS[r.federation];
                const latestWebhookRepo = webhooks.data?.latest?.repository?.name?.toLowerCase() === r.slug.toLowerCase();
                return (
                  <tr key={r.slug} className={latestWebhookRepo ? "bg-emerald-400/5" : "hover:bg-white/5"}>
                    <td className="px-4 py-3">
                      <a
                        href={gh?.html_url ?? r.url}
                        target="_blank"
                        rel="noreferrer"
                        className="font-mono text-zinc-100 hover:text-amber-300"
                      >
                        {r.slug}
                      </a>
                      <div className="text-[11px] text-zinc-500">{r.summary}</div>
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        to="/federations/$id"
                        params={{ id: r.federation }}
                        className="inline-flex items-center gap-1.5 text-xs"
                        style={{ color: fed.color }}
                      >
                        <span>{fed.sigil}</span>
                        <span>{fed.id}</span>
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-xs text-zinc-400 font-mono">{r.layer}</td>
                    <td className="px-4 py-3 text-xs text-zinc-400 font-mono">
                      {gh?.language ?? r.language}
                    </td>
                    <td className="px-4 py-3 text-right text-xs text-zinc-300 font-mono">
                      {gh?.stargazers_count ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-xs text-zinc-400 font-mono">
                      {gh?.pushed_at ? new Date(gh.pushed_at).toLocaleDateString("es-MX") : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-[0.18em] ${
                          gh ? "text-emerald-300" : "text-zinc-500"
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            latestWebhookRepo ? "bg-amber-300" : gh ? "bg-emerald-400" : "bg-zinc-600"
                          }`}
                        />
                        {latestWebhookRepo ? "webhook" : gh ? (gh.archived ? "archivado" : "vivo") : "pendiente"}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <p className="text-[11px] font-mono text-zinc-500">
          Endpoint público: <code className="text-amber-300">/api/public/manifest</code> · snapshots: <code className="text-amber-300">/api/public/manifest/history</code> · webhooks: <code className="text-amber-300">/api/github/webhook</code>.
        </p>
      </main>
    </div>
  );
}

function Select({ label, value, onChange, children }: { label: string; value: string; onChange: (value: string) => void; children: React.ReactNode }) {
  return (
    <label className="space-y-1">
      <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-500">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-md border border-white/10 bg-black/40 px-3 py-2 font-mono text-sm text-zinc-100 outline-none focus:border-amber-300/60"
      >
        {children}
      </select>
    </label>
  );
}

function Tag({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 ${
        ok ? "border-emerald-500/40 text-emerald-300" : "border-red-500/40 text-red-300"
      }`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${ok ? "bg-emerald-400" : "bg-red-400"}`} />
      {label}
    </span>
  );
}
