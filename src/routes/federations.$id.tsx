import { createFileRoute, notFound, Link } from "@tanstack/react-router";
import { Header } from "@/components/tamv/Header";
import { Footer } from "@/components/tamv/Footer";
import { RepoCard } from "@/components/tamv/RepoCard";
import { FEDERATIONS, type FederationId } from "@/lib/ecosystem/contracts";
import { reposByFederation, REPOS } from "@/lib/ecosystem/manifest";

const VALID = new Set(Object.keys(FEDERATIONS));

export const Route = createFileRoute("/federations/$id")({
  loader: ({ params }) => {
    if (!VALID.has(params.id)) throw notFound();
    const id = params.id as FederationId;
    return { id, fed: FEDERATIONS[id], repos: reposByFederation(id) };
  },
  head: ({ loaderData }) => {
    const f = loaderData?.fed;
    return {
      meta: [
        { title: f ? `${f.name} — TAMV Kernel` : "Federación — TAMV" },
        { name: "description", content: f?.mission ?? "Federación TAMV" },
        { property: "og:title", content: f?.name ?? "Federación TAMV" },
        { property: "og:description", content: f?.mission ?? "" },
      ],
    };
  },
  notFoundComponent: () => (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 grid place-items-center px-6">
        <div className="text-center">
          <div className="font-mono text-xs text-muted-foreground">404</div>
          <h1 className="mt-2 font-display text-3xl">Federación no encontrada</h1>
          <Link to="/" className="mt-4 inline-block text-primary hover:underline">← volver al kernel</Link>
        </div>
      </main>
      <Footer />
    </div>
  ),
  errorComponent: ({ error, reset }) => (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 grid place-items-center px-6 text-center">
        <div>
          <h1 className="font-display text-2xl">Algo falló en la federación</h1>
          <p className="text-sm text-muted-foreground mt-2">{error.message}</p>
          <button onClick={reset} className="mt-4 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm">Reintentar</button>
        </div>
      </main>
      <Footer />
    </div>
  ),
  component: FederationDetail,
});

function FederationDetail() {
  const { fed, repos } = Route.useLoaderData();
  const consumedBy = REPOS.filter((r) => repos.some((rr) => r.consumes.includes(rr.slug)));

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 px-6 py-12">
        <div className="mx-auto max-w-7xl">
          <Link to="/" className="font-mono text-xs text-muted-foreground hover:text-primary">← kernel</Link>

          <div className="mt-6 flex items-start gap-6">
            <div
              className="size-20 rounded-2xl grid place-items-center font-display text-4xl shrink-0"
              style={{ color: fed.color, background: `color-mix(in oklab, ${fed.color} 12%, transparent)`, border: `1px solid color-mix(in oklab, ${fed.color} 40%, transparent)` }}
            >
              {fed.sigil}
            </div>
            <div>
              <div className="font-mono text-[11px] uppercase tracking-[0.3em]" style={{ color: fed.color }}>
                Federación · {fed.id}
              </div>
              <h1 className="mt-1 font-display text-4xl md:text-5xl">{fed.name}</h1>
              <p className="mt-3 max-w-2xl text-muted-foreground">{fed.mission}</p>
              <p className="mt-1 max-w-2xl text-sm text-muted-foreground/80 italic">{fed.domain}</p>
            </div>
          </div>

          <section className="mt-12">
            <h2 className="font-display text-2xl mb-4">Repos en esta federación · {repos.length}</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {repos.map((r) => <RepoCard key={r.slug} repo={r} />)}
            </div>
          </section>

          {consumedBy.length > 0 && (
            <section className="mt-12">
              <h2 className="font-display text-2xl mb-4">Consumida en serie por</h2>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {consumedBy.map((r) => <RepoCard key={r.slug} repo={r} />)}
              </div>
            </section>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
