// routes/index.tsx (TAMV Core Kernel · Heptafederación Viva)
// Panel de mando civilizatorio v4 — Futurismo sobrio + rigor académico

import { createFileRoute } from "@tanstack/react-router";
import { Header } from "@/components/tamv/Header";
import { NexusGraph } from "@/components/tamv/NexusGraph";
import { EventStream } from "@/components/tamv/EventStream";
import { useKernelStatus } from "@/hooks/use-kernel-status";
import { useKnowledgeTopology } from "@/hooks/use-knowledge-topology";
import { useIdentityStatus } from "@/hooks/use-identity-status";

export const Route = createFileRoute("/")({
  component: Home,
});

function Home() {
  const { isLedgerSynced, activeFederations, healthScore, lastTopologyHash } =
    useKernelStatus();
  const { totalCells, totalArtifacts, deterministicRatio } =
    useKnowledgeTopology();
  const { orcidLinked, zenodoLinked, figshareLinked } = useIdentityStatus();

  return (
    <div className="min-h-screen bg-[#020202] text-zinc-100 selection:bg-gold/30">
      <Header />

      <main className="mx-auto max-w-7xl px-6 pt-10 pb-16 space-y-10">
        {/* BARRA SUPERIOR · ESTADO DEL SISTEMA */}
        <div className="flex flex-col gap-6 border-b border-white/10 pb-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3 text-[11px] font-mono uppercase tracking-[0.2em]">
              <StatusIndicator active={isLedgerSynced} label="Ledger Sync" />
              <StatusIndicator
                active={healthScore >= 90}
                label="System Integrity"
              />
              <StatusIndicator
                active={deterministicRatio >= 0.7}
                label="Deterministic Cells"
              />
              <StatusIndicator
                active={orcidLinked}
                label="ORCID"
              />
              <StatusIndicator
                active={zenodoLinked}
                label="Zenodo"
              />
              <StatusIndicator
                active={figshareLinked}
                label="Figshare"
              />
            </div>

            <div className="text-right">
              <div className="font-mono text-[10px] text-gold/70 tracking-[0.28em] uppercase">
                TAMV CORE KERNEL · MD-X4
              </div>
              <div className="font-mono text-[10px] text-zinc-500">
                v4.0.0 · Topology {lastTopologyHash.slice(0, 8)}
              </div>
            </div>
          </div>

          {/* TELEMETRÍA ESTRUCTURAL */}
          <div className="grid gap-3 text-[11px] font-mono text-zinc-400 sm:grid-cols-3">
            <TelemetryStat
              label="Federaciones activas"
              value={`${activeFederations}/7`}
            />
            <TelemetryStat
              label="Celdas cognitivas"
              value={totalCells.toString()}
            />
            <TelemetryStat
              label="Artefactos científicos"
              value={totalArtifacts.toString()}
            />
          </div>
        </div>

        {/* TABLERO PRINCIPAL */}
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1.4fr)_minmax(360px,0.9fr)]">
          {/* IZQUIERDA: GRAFO + ANALÍTICA COGNITIVA */}
          <section className="space-y-6">
            <PanelShell title="Heptafederación viva" subtitle="Estado del grafo operativo">
              <NexusGraph />
            </PanelShell>

            <PanelShell
              title="Análisis cognitivo"
              subtitle="Celdas, capacidades y reproducibilidad"
            >
              {/* Aquí puede ir un futuro <CellAnalysisPanel /> basado en KnowledgeCell/TAMVArtifact */}
              <p className="text-xs text-zinc-400">
                Cada nodo es una KnowledgeCell versionada y firmada. El grafo
                refleja dependencias, flujos de datos y canales cuánticos bajo
                la doctrina MD‑X4.
              </p>
            </PanelShell>
          </section>

          {/* DERECHA: EVENTOS + IDENTIDAD ACADÉMICA */}
          <section className="space-y-6">
            <PanelShell title="Live event feed" subtitle="BookPI · Canon en tiempo real">
              <EventStream max={20} />
            </PanelShell>

            <PanelShell
              title="Identidad y ciencia abierta"
              subtitle="ORCID · Zenodo · Figshare · GitHub"
            >
              <IdentityMatrix
                orcidLinked={orcidLinked}
                zenodoLinked={zenodoLinked}
                figshareLinked={figshareLinked}
              />
            </PanelShell>
          </section>
        </div>
      </main>
    </div>
  );
}

// -----------------------------
//  Subcomponentes de presentación
// -----------------------------

function StatusIndicator(props: { active: boolean; label?: string; small?: boolean }) {
  if (props.small) {
    return (
      <div
        className={`h-1.5 w-1.5 rounded-full ${
          props.active ? "bg-emerald-400" : "bg-red-400/80"
        }`}
      />
    );
  }
  return (
    <div className="flex items-center gap-2">
      <div
        className={`h-2 w-2 rounded-full transition-colors ${
          props.active
            ? "bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.7)]"
            : "bg-red-500/80 shadow-[0_0_6px_rgba(248,113,113,0.5)]"
        }`}
      />
      {props.label ? (
        <span
          className={`select-none text-[11px] uppercase tracking-[0.2em] ${
            props.active ? "text-zinc-200" : "text-red-400"
          }`}
        >
          {props.label}
        </span>
      ) : null}
    </div>
  );
}

function TelemetryStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between border border-white/5 bg-black/30 px-3 py-2 rounded-lg">
      <span className="text-[10px] uppercase tracking-[0.28em] text-zinc-500">
        {label}
      </span>
      <span className="text-xs font-semibold text-zinc-100">{value}</span>
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
          <h3 className="font-display text-sm tracking-wide text-zinc-50">{title}</h3>
          {subtitle ? (
            <p className="text-[11px] text-zinc-500">{subtitle}</p>
          ) : null}
        </div>
        <div className="h-2 w-12 rounded-full bg-gradient-to-r from-emerald-500/40 via-gold/50 to-sky-500/40" />
      </div>
      <div className="px-5 py-4">{children}</div>
    </div>
  );
}

function IdentityMatrix({
  orcidLinked,
  zenodoLinked,
  figshareLinked,
}: {
  orcidLinked: boolean;
  zenodoLinked: boolean;
  figshareLinked: boolean;
}) {
  const items = [
    { label: "ORCID", active: orcidLinked, hint: "Identidad académica" },
    { label: "Zenodo", active: zenodoLinked, hint: "DOIs y depósitos" },
    { label: "Figshare", active: figshareLinked, hint: "Datasets y outputs" },
  ];
  return (
    <div className="grid grid-cols-3 gap-3 text-[11px] font-mono">
      {items.map((item) => (
        <div
          key={item.label}
          className="flex flex-col gap-1 rounded-md border border-white/5 bg-black/40 p-2.5"
        >
          <div className="flex items-center justify-between">
            <span className="uppercase tracking-[0.18em] text-zinc-300">{item.label}</span>
            <StatusIndicator small active={item.active} />
          </div>
          <span className="text-[10px] text-zinc-500">{item.hint}</span>
        </div>
      ))}
    </div>
  );
}
