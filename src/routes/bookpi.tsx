import { createFileRoute } from "@tanstack/react-router";
import { Header } from "@/components/tamv/Header";
import { Footer } from "@/components/tamv/Footer";
import { EventStream } from "@/components/tamv/EventStream";
import { FEDERATIONS, type FederationId } from "@/lib/ecosystem/contracts";

export const Route = createFileRoute("/bookpi")({
  head: () => ({
    meta: [
      { title: "BookPI — Ledger soberano TAMV" },
      { name: "description", content: "Ledger viviente de la heptafederación. Cada evento se escribe aquí antes de propagarse en serie." },
      { property: "og:title", content: "BookPI · TAMV" },
      { property: "og:description", content: "Ledger soberano del ecosistema." },
    ],
  }),
  component: BookpiPage,
});

function BookpiPage() {
  const fedIds = Object.keys(FEDERATIONS) as FederationId[];
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 px-6 py-12">
        <div className="mx-auto max-w-6xl">
          <div className="text-[11px] font-mono uppercase tracking-[0.3em] text-primary">BookPI</div>
          <h1 className="mt-2 font-display text-4xl md:text-5xl">Ledger soberano</h1>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            Toda federación escribe aquí antes de propagar. Identity no llama a Economy: ambos leen del mismo libro.
          </p>

          <div className="mt-10 grid lg:grid-cols-[1fr_320px] gap-8 items-start">
            <EventStream max={20} />

            <aside className="rounded-xl border border-border/60 bg-card p-5">
              <h2 className="font-display text-lg">Federaciones suscritas</h2>
              <ul className="mt-4 space-y-2">
                {fedIds.map((id) => {
                  const f = FEDERATIONS[id];
                  return (
                    <li key={id} className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2">
                        <span className="size-2 rounded-full" style={{ background: f.color, boxShadow: `0 0 8px ${f.color}` }} />
                        <span style={{ color: f.color }}>{f.sigil}</span>
                        <span className="font-mono text-xs uppercase tracking-wider">{f.id}</span>
                      </span>
                      <span className="font-mono text-[10px] text-muted-foreground">activo</span>
                    </li>
                  );
                })}
              </ul>
              <div className="mt-6 pt-4 border-t border-border/40 text-[11px] font-mono text-muted-foreground">
                Flujo en serie: <span className="text-foreground">core → dominios → deploy</span>. 2 saltos máx.
              </div>
            </aside>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
