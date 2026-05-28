import { createFileRoute, Link } from "@tanstack/react-router";
import { Header } from "@/components/tamv/Header";
import { REPOS } from "@/lib/ecosystem/manifest";
import { FEDERATIONS } from "@/lib/ecosystem/contracts";
import { useGithubRepos } from "@/hooks/use-github-repos";
import { useIdentityStatus } from "@/hooks/use-identity-status";

export const Route = createFileRoute("/repos")({
  component: ReposView,
});

function ReposView() {
  const { data: live, isLoading, error } = useGithubRepos();
  const identity = useIdentityStatus();

  const liveBySlug = new Map((live ?? []).map((r) => [r.slug.toLowerCase(), r]));

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
            Lectura directa desde GitHub <span className="font-mono">OsoPanda1</span>.
            Cada fila cruza el contrato doctrinal del manifest con el heartbeat real
            del repo: lenguaje, último push, estrellas y enlace canónico.
          </p>
          <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-mono">
            <Tag ok={identity.githubLinked} label="GitHub" />
            <Tag ok={identity.orcidLinked} label="ORCID" />
            <Tag ok={identity.zenodoLinked} label="Zenodo" />
            <Tag ok={identity.figshareLinked} label="Figshare" />
          </div>
        </header>

        {isLoading ? (
          <p className="text-xs text-zinc-500 font-mono">Sincronizando ledger GitHub…</p>
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
              {REPOS.map((r) => {
                const gh = liveBySlug.get(r.slug.toLowerCase());
                const fed = FEDERATIONS[r.federation];
                return (
                  <tr key={r.slug} className="hover:bg-white/5">
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
                            gh ? "bg-emerald-400" : "bg-zinc-600"
                          }`}
                        />
                        {gh ? (gh.archived ? "archivado" : "vivo") : "pendiente"}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <p className="text-[11px] font-mono text-zinc-500">
          Endpoint público: <code className="text-amber-300">/api/public/manifest</code> · sirve este mismo grafo enriquecido como JSON para que cada repo del ecosistema lo consuma sin nodos extra.
        </p>
      </main>
    </div>
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
