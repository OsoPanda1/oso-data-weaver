import { createFileRoute, notFound, Link } from "@tanstack/react-router";
import { FEDERATIONS, type FederationId } from "@/lib/ecosystem/contracts";
import { reposByFederation, type Repo } from "@/lib/ecosystem/manifest";
import { EventStream } from "@/components/tamv/EventStream";
import { useKernelStatus } from "@/hooks/use-kernel-status";
import { Header } from "@/components/tamv/Header";

export const Route = createFileRoute("/federations/$id")({
  loader: async ({ params }) => {
    const id = params.id as FederationId;
    const federation = FEDERATIONS[id];
    if (!federation) throw notFound();
    return { federation, repos: reposByFederation(id) };
  },
  component: FederationView,
  notFoundComponent: () => (
    <div className="min-h-screen flex items-center justify-center bg-[#020202] text-zinc-300">
      Federación no encontrada
    </div>
  ),
});

function FederationView() {
  const { federation, repos } = Route.useLoaderData();
  const { healthScore } = useKernelStatus();

  return (
    <div className="min-h-screen bg-[#020202] text-zinc-100">
      <Header />
      <main className="mx-auto max-w-6xl px-6 py-10 space-y-8">
        <header className="flex flex-col gap-3 border-b border-white/10 pb-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-3xl" style={{ color: federation.color }}>
                {federation.sigil}
              </div>
              <h1 className="font-display text-3xl tracking-tight text-zinc-50">
                {federation.name}
              </h1>
              <p className="mt-1 text-sm text-zinc-400">{federation.mission}</p>
              <p className="text-xs text-zinc-500">{federation.domain}</p>
            </div>
            <div className="text-right text-[11px] font-mono uppercase tracking-[0.2em] text-zinc-500">
              <div>FEDERACIÓN MD-X4</div>
              <div className="text-zinc-300">{federation.id}</div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-[11px] font-mono uppercase tracking-[0.2em]">
            <Badge label="Repos vinculados" value={String(repos.length)} />
            <Badge
              label="Salud del kernel"
              value={`${healthScore.toFixed(0)}%`}
              tone={healthScore >= 90 ? "ok" : healthScore >= 70 ? "warn" : "alert"}
            />
          </div>
        </header>

        <section className="grid gap-8 lg:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.9fr)]">
          <PanelShell title="Repos federados" subtitle="Contratos consumidos y eventos emitidos">
            <ul className="divide-y divide-white/5">
              {repos.map((r: Repo) => (
                <li key={r.slug} className="py-3">
                  <div className="flex items-baseline justify-between gap-3">
                    <a
                      href={r.url}
                      target="_blank"
                      rel="noreferrer"
                      className="font-mono text-sm text-zinc-100 hover:text-amber-300"
                    >
                      {r.slug}
                    </a>
                    <span className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">
                      {r.layer} · {r.language}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400 mt-1">{r.summary}</p>
                  <div className="mt-2 flex flex-wrap gap-1.5 text-[10px] font-mono">
                    {r.consumes.map((c: string) => (
                      <span key={c} className="rounded border border-white/10 px-1.5 py-0.5 text-zinc-500">
                        ← {c}
                      </span>
                    ))}
                    {r.emits.map((e: string) => (
                      <span
                        key={e}
                        className="rounded border border-emerald-500/30 px-1.5 py-0.5 text-emerald-300/80"
                      >
                        ↑ {e}
                      </span>
                    ))}
                  </div>
                </li>
              ))}
            </ul>
          </PanelShell>

          <PanelShell title="Eventos recientes" subtitle="BookPI · ledger en vivo">
            <EventStream max={15} />
          </PanelShell>
        </section>

        <Link to="/" className="text-xs font-mono text-zinc-500 hover:text-amber-300">
          ← volver al kernel
        </Link>
      </main>
    </div>
  );
}

function Badge({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "ok" | "warn" | "alert";
}) {
  const toneClass =
    tone === "ok"
      ? "border-emerald-500/60 text-emerald-300"
      : tone === "warn"
        ? "border-amber-500/60 text-amber-300"
        : tone === "alert"
          ? "border-red-500/70 text-red-300"
          : "border-white/10 text-zinc-300";
  return (
    <div className={`flex items-baseline gap-2 rounded-full border px-3 py-1.5 bg-black/30 ${toneClass}`}>
      <span className="text-[10px] uppercase tracking-[0.25em] text-zinc-500">{label}</span>
      <span className="text-xs font-semibold">{value}</span>
    </div>
  );
}

function PanelShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-white/5 bg-[#050505]/90 shadow-2xl shadow-black/60 backdrop-blur">
      <div className="flex items-baseline justify-between border-b border-white/5 px-5 py-3">
        <div>
          <h2 className="font-display text-sm tracking-wide text-zinc-50">{title}</h2>
          {subtitle ? <p className="text-[11px] text-zinc-500">{subtitle}</p> : null}
        </div>
        <div className="h-2 w-10 rounded-full bg-gradient-to-r from-emerald-500/40 via-gold/50 to-sky-500/40" />
      </div>
      <div className="px-5 py-4">{children}</div>
    </div>
  );
}
