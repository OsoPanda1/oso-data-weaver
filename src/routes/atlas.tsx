import { createFileRoute } from "@tanstack/react-router";
import { Header } from "@/components/tamv/Header";
import { Footer } from "@/components/tamv/Footer";
import { NexusGraph } from "@/components/tamv/NexusGraph";
import { FEDERATIONS, type FederationId } from "@/lib/ecosystem/contracts";
import { REPOS } from "@/lib/ecosystem/manifest";

export const Route = createFileRoute("/atlas")({
  head: () => ({
    meta: [
      { title: "Atlas Nexus — TAMV Core Kernel" },
      { name: "description", content: "Grafo vivo del ecosistema TAMV: kernel → 7 federaciones → 14 repos en serie." },
      { property: "og:title", content: "Atlas Nexus · TAMV" },
      { property: "og:description", content: "Cartografía viva de la heptafederación TAMV." },
    ],
  }),
  component: AtlasPage,
});

function AtlasPage() {
  const fedIds = Object.keys(FEDERATIONS) as FederationId[];
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 px-6 py-12">
        <div className="mx-auto max-w-7xl">
          <div className="text-[11px] font-mono uppercase tracking-[0.3em] text-primary">Atlas</div>
          <h1 className="mt-2 font-display text-4xl md:text-5xl">Nexus heptafederado</h1>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            Centro: kernel. Anillo medio: 7 federaciones doctrinales. Anillo externo: repos.
            Pasa el cursor sobre cualquier nodo para ver su conexión en serie.
          </p>

          <div className="mt-8">
            <NexusGraph />
          </div>

          <div className="mt-10 grid md:grid-cols-7 gap-3">
            {fedIds.map((id) => {
              const f = FEDERATIONS[id];
              const count = REPOS.filter((r) => r.federation === id).length;
              return (
                <div key={id} className="rounded-lg border border-border/60 bg-card p-3">
                  <div className="flex items-baseline justify-between">
                    <span className="font-display text-xl" style={{ color: f.color }}>{f.sigil}</span>
                    <span className="font-mono text-[10px] text-muted-foreground">{count}</span>
                  </div>
                  <div className="mt-1 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{f.id}</div>
                </div>
              );
            })}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
