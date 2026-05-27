import { createFileRoute } from "@tanstack/react-router";
import { Header } from "@/components/tamv/Header";
import { Footer } from "@/components/tamv/Footer";
import { CONTRACT_VERSION, FEDERATIONS, type FederationId, type TamvEventType } from "@/lib/ecosystem/contracts";
import { FederationBadge } from "@/components/tamv/FederationBadge";

export const Route = createFileRoute("/contracts")({
  head: () => ({
    meta: [
      { title: "Contratos v1.0.0 — TAMV Kernel" },
      { name: "description", content: "Tipos compartidos, federaciones y eventos del BookPI. Fuente única de verdad consumida por todos los repos." },
      { property: "og:title", content: "Contratos TAMV v1.0.0" },
      { property: "og:description", content: "Schema heptafederado oficial." },
    ],
  }),
  component: ContractsPage,
});

const EVENT_TYPES: { type: TamvEventType; desc: string }[] = [
  { type: "IdentityUpdated", desc: "Un usuario o sigilo cambia. Users → BookPI → Finance/Territory." },
  { type: "RepoSynced", desc: "Un repo termina su CI. Ops → BookPI → Atlas." },
  { type: "ContractPublished", desc: "Nueva versión de @tamv/core-contracts. Central → todos." },
  { type: "DeployTriggered", desc: "Despliegue iniciado en una federación. Ops → BookPI." },
  { type: "EconomyRecalculated", desc: "Reputación o límites recalculados. Finance → BookPI → UI." },
  { type: "TerritoryOverlayChanged", desc: "Cambio en RDM o gemelo digital. Infra → BookPI." },
  { type: "AiContextRequested", desc: "Isabella consulta el ledger para responder. Users → BookPI." },
  { type: "FederationHeartbeat", desc: "Latido periódico. Cada federación → BookPI." },
];

export default function _x() { return null; } // placeholder to avoid tree-shake confusion in HMR

function ContractsPage() {
  const fedIds = Object.keys(FEDERATIONS) as FederationId[];
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 px-6 py-12">
        <div className="mx-auto max-w-5xl">
          <div className="text-[11px] font-mono uppercase tracking-[0.3em] text-primary">Contratos</div>
          <h1 className="mt-2 font-display text-4xl md:text-5xl">@tamv/core-contracts · v{CONTRACT_VERSION}</h1>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            Tipos, eventos y enums que cada repo del ecosistema importa. Sin esto no hay heptafederación viva.
          </p>

          <section className="mt-12">
            <h2 className="font-display text-2xl mb-4">FederationId</h2>
            <div className="rounded-xl border border-border/60 bg-card p-5 font-mono text-sm leading-relaxed overflow-auto">
              <span className="text-accent">export type</span> FederationId ={"\n"}
              {fedIds.map((id, i) => (
                <span key={id}>
                  {"  "}| <span className="text-primary">"{id}"</span>{i === fedIds.length - 1 ? ";" : ""}{"\n"}
                </span>
              ))}
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {fedIds.map((id) => <FederationBadge key={id} id={id} />)}
            </div>
          </section>

          <section className="mt-12">
            <h2 className="font-display text-2xl mb-4">TamvEvent</h2>
            <div className="rounded-xl border border-border/60 bg-card p-5 font-mono text-sm leading-relaxed overflow-auto">
              <span className="text-accent">export interface</span> TamvEvent&lt;T = Record&lt;string, unknown&gt;&gt; {"{"}
              {"\n  id: string;"}
              {"\n  type: TamvEventType;"}
              {"\n  origin: FederationId;"}
              {"\n  occurredAt: string;"}
              {"\n  contractVersion: string;"}
              {"\n  payload: T;"}
              {"\n}"}
            </div>
          </section>

          <section className="mt-12">
            <h2 className="font-display text-2xl mb-4">TamvEventType</h2>
            <ul className="grid sm:grid-cols-2 gap-3">
              {EVENT_TYPES.map((e) => (
                <li key={e.type} className="rounded-lg border border-border/60 bg-card p-4">
                  <div className="font-mono text-sm text-accent">{e.type}</div>
                  <div className="mt-1 text-xs text-muted-foreground leading-relaxed">{e.desc}</div>
                </li>
              ))}
            </ul>
          </section>

          <section className="mt-12">
            <h2 className="font-display text-2xl mb-4">Endpoint público</h2>
            <div className="rounded-xl border border-border/60 bg-card p-5">
              <div className="font-mono text-sm">
                <span className="text-accent">GET</span> <a className="text-primary hover:underline" href="/api/public/manifest">/api/public/manifest</a>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Cualquier repo del ecosistema puede consumir este manifest como fuente de verdad. Sin nodos extra.
              </p>
            </div>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}
