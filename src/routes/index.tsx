import { createFileRoute, Link } from "@tanstack/react-router";
import { Header } from "@/components/tamv/Header";
import { Footer } from "@/components/tamv/Footer";
import { NexusGraph } from "@/components/tamv/NexusGraph";
import { EventStream } from "@/components/tamv/EventStream";
import { RepoCard } from "@/components/tamv/RepoCard";
import { FederationBadge } from "@/components/tamv/FederationBadge";
import { FEDERATIONS, type FederationId } from "@/lib/ecosystem/contracts";
import { REPOS, reposByFederation } from "@/lib/ecosystem/manifest";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "TAMV Core Kernel — Heptafederación viva" },
      { name: "description", content: "Hub orquestador del ecosistema TAMV. Núcleo MD-X4, router heptafederado, BookPI y Atlas vivo de los 14 repos en serie." },
      { property: "og:title", content: "TAMV Core Kernel — Heptafederación viva" },
      { property: "og:description", content: "Kernel central, contratos y BookPI ledger del ecosistema TAMV ONLINE." },
    ],
  }),
  component: Home,
});

function Home() {
  const fedIds = Object.keys(FEDERATIONS) as FederationId[];
  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      {/* HERO */}
      <section className="relative px-6 pt-20 pb-16">
        <div className="mx-auto max-w-7xl">
          <div className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-[0.3em] text-muted-foreground">
            <span className="size-1.5 rounded-full bg-primary animate-pulse-node" />
            TAMV Online Network · Volvió la elite
          </div>
          <h1 className="mt-6 font-display text-5xl md:text-7xl font-semibold leading-[1.05] tracking-tight max-w-4xl">
            El <span className="text-elite">kernel central</span> que pone a los 14 repos a hablar en serie.
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-muted-foreground leading-relaxed">
            Cada repo es una federación lógica. Aquí viven los contratos, el BookPI y el router heptafederado.
            Sin nodos extra: <span className="text-foreground">core → dominio → deploy</span>, en cadena.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              to="/atlas"
              className="inline-flex items-center gap-2 rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity shadow-elite"
            >
              Abrir el Atlas vivo →
            </Link>
            <Link
              to="/contracts"
              className="inline-flex items-center gap-2 rounded-md border border-border px-5 py-2.5 text-sm font-medium hover:border-primary/50 transition-colors"
            >
              Ver contratos v1.0.0
            </Link>
            <a
              href="/api/public/manifest"
              className="inline-flex items-center gap-2 rounded-md px-3 py-2.5 text-xs font-mono text-muted-foreground hover:text-accent transition-colors"
            >
              GET /api/public/manifest ↗
            </a>
          </div>

          {/* stats */}
          <div className="mt-14 grid grid-cols-2 md:grid-cols-4 gap-px bg-border/40 rounded-xl overflow-hidden border border-border/40">
            {[
              { k: "Federaciones", v: "7/7" },
              { k: "Repos activos", v: String(REPOS.length) },
              { k: "Contratos", v: "v1.0.0" },
              { k: "Saltos en serie", v: "2 máx." },
            ].map((s) => (
              <div key={s.k} className="bg-card p-5">
                <div className="font-display text-3xl text-primary">{s.v}</div>
                <div className="mt-1 text-[11px] font-mono uppercase tracking-wider text-muted-foreground">{s.k}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* NEXUS + STREAM */}
      <section className="px-6 py-16">
        <div className="mx-auto max-w-7xl grid lg:grid-cols-[1fr_360px] gap-8 items-start">
          <div>
            <SectionTitle eyebrow="Atlas Nexus" title="14 repos · 7 federaciones · 1 kernel" />
            <NexusGraph />
          </div>
          <div className="lg:sticky lg:top-24">
            <SectionTitle eyebrow="BookPI" title="Eventos en vivo" />
            <EventStream max={10} />
          </div>
        </div>
      </section>

      {/* FEDERACIONES */}
      <section className="px-6 py-16">
        <div className="mx-auto max-w-7xl">
          <SectionTitle eyebrow="Heptafederación" title="Las 7 federaciones doctrinales" />
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {fedIds.map((id) => {
              const f = FEDERATIONS[id];
              const count = reposByFederation(id).length;
              return (
                <Link
                  key={id}
                  to="/federations/$id"
                  params={{ id }}
                  className="group rounded-xl border border-border/60 bg-card p-5 hover:border-primary/40 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-display text-3xl" style={{ color: f.color }}>{f.sigil}</span>
                    <span className="font-mono text-xs text-muted-foreground">{count} repos</span>
                  </div>
                  <h3 className="mt-3 font-display text-lg group-hover:text-primary transition-colors">{f.name}</h3>
                  <p className="mt-1 text-xs text-muted-foreground leading-relaxed line-clamp-2">{f.mission}</p>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* REPOS */}
      <section className="px-6 py-16">
        <div className="mx-auto max-w-7xl">
          <SectionTitle eyebrow="Manifest" title="Repos del ecosistema" />
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {REPOS.map((r) => (
              <RepoCard key={r.slug} repo={r} />
            ))}
          </div>
        </div>
      </section>

      {/* DOCTRINA */}
      <section className="px-6 py-16">
        <div className="mx-auto max-w-7xl rounded-2xl border-elite p-8 md:p-12 bg-card/60 backdrop-blur">
          <div className="text-[11px] font-mono uppercase tracking-[0.3em] text-primary">Doctrina · MD-X4</div>
          <h2 className="mt-4 font-display text-3xl md:text-4xl max-w-3xl leading-tight">
            Repos como federaciones, no como microservicios caóticos.
          </h2>
          <div className="mt-8 grid md:grid-cols-3 gap-6 text-sm">
            <Pillar n="01" title="Contratos compartidos">
              SDKs, OpenAPI y schemas de eventos versionados. Una sola fuente de verdad.
            </Pillar>
            <Pillar n="02" title="Eventos vía BookPI">
              Ningún dominio llama directo a otro. Todo pasa por el ledger del kernel.
            </Pillar>
            <Pillar n="03" title="CI/CD en cadena">
              core → dominios → deploy. Repository dispatch, no integraciones ad-hoc.
            </Pillar>
          </div>
          <div className="mt-8 inline-flex items-center gap-2">
            {(["central","ops","infra","security","finance","logistics","users"] as FederationId[]).map((id) => (
              <FederationBadge key={id} id={id} />
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}

function SectionTitle({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div className="mb-6">
      <div className="text-[11px] font-mono uppercase tracking-[0.3em] text-primary">{eyebrow}</div>
      <h2 className="mt-2 font-display text-2xl md:text-3xl">{title}</h2>
    </div>
  );
}

function Pillar({ n, title, children }: { n: string; title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="font-mono text-xs text-accent">{n}</div>
      <div className="mt-1 font-display text-lg">{title}</div>
      <p className="mt-1 text-muted-foreground leading-relaxed">{children}</p>
    </div>
  );
}
