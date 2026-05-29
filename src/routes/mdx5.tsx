import { createFileRoute } from "@tanstack/react-router";
import { CheckCircle2, Clock, GitMerge, RotateCcw } from "lucide-react";
import { PageHeader, Panel, Stat } from "@/components/common/Panel";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/mdx5")({
  head: () => ({
    meta: [
      { title: "MD-X5 Orchestration · TAMV" },
      { name: "description", content: "Runtime de pipelines, event sourcing, execution graph, retry y self-healing." },
      { property: "og:title", content: "MD-X5 Orchestration · TAMV" },
      { property: "og:description", content: "Orchestration runtime for the heptafederated kernel." },
    ],
  }),
  component: MdX5Page,
});

const PIPELINES = [
  { id: "PL-001", name: "sync-orcid → zenodo", fed: "F1", status: "running", steps: 7, ok: 6, retries: 0 },
  { id: "PL-002", name: "bookpi-seal-block", fed: "F6", status: "running", steps: 4, ok: 4, retries: 0 },
  { id: "PL-003", name: "atlas-snapshot-daily", fed: "F2", status: "running", steps: 9, ok: 8, retries: 1 },
  { id: "PL-004", name: "isabella-eval-pass", fed: "F3", status: "running", steps: 12, ok: 11, retries: 0 },
  { id: "PL-005", name: "horus-anubis-sweep", fed: "F7", status: "running", steps: 5, ok: 5, retries: 0 },
  { id: "PL-006", name: "korima-ontology-rebuild", fed: "F3", status: "scheduled", steps: 8, ok: 0, retries: 0 },
  { id: "PL-007", name: "msr-quorum-emit", fed: "F6", status: "completed", steps: 3, ok: 3, retries: 0 },
];

function MdX5Page() {
  return (
    <div>
      <PageHeader
        eyebrow="MD-X5 · ORCHESTRATION RUNTIME"
        title="Pipelines · event sourcing · self healing"
        description="MD-X5 ejecuta tareas federadas, replays con checkpoint, routing federativo y reconstitución automática ante fallos."
      />
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Stat label="Pipelines activos" value={48} delta="+3 / 24h" />
          <Stat label="Tareas · 24h" value="14,902" />
          <Stat label="Retries · 24h" value={37} hint="<0.3%" />
          <Stat label="p99 latency" value="82ms" delta="estable" />
        </div>

        <Panel eyebrow="PIPELINES" title="Execution graph" bodyClassName="p-0">
          <ul className="divide-y divide-border">
            {PIPELINES.map((p) => {
              const pct = (p.ok / p.steps) * 100;
              return (
                <li key={p.id} className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <span className={cn(
                      "h-2 w-2 rounded-full",
                      p.status === "running" && "bg-success animate-pulse",
                      p.status === "scheduled" && "bg-muted-foreground",
                      p.status === "completed" && "bg-accent",
                    )} />
                    <span className="mono text-[10px] uppercase tracking-wider text-muted-foreground w-12">{p.id}</span>
                    <span className="text-sm flex-1 truncate">{p.name}</span>
                    <span className="mono text-[10px] uppercase tracking-wider text-muted-foreground">{p.fed}</span>
                    <span className="mono text-[10px] uppercase tracking-wider text-muted-foreground tabular w-16 text-right">
                      {p.ok}/{p.steps}
                    </span>
                    {p.retries > 0 && (
                      <span className="mono text-[10px] uppercase tracking-wider text-warning flex items-center gap-1">
                        <RotateCcw className="h-3 w-3" />
                        {p.retries}
                      </span>
                    )}
                  </div>
                  <div className="mt-2 ml-[60px] h-1 bg-secondary rounded-sm overflow-hidden">
                    <div className="h-full bg-primary/70" style={{ width: `${pct}%` }} />
                  </div>
                </li>
              );
            })}
          </ul>
        </Panel>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Panel eyebrow="EVENT SOURCING" title="Last sealed blocks">
            <ul className="space-y-3 text-sm">
              {[0, 1, 2, 3, 4].map((i) => (
                <li key={i} className="flex items-center gap-3">
                  <GitMerge className="h-4 w-4 text-muted-foreground" />
                  <div className="flex-1">
                    <div className="mono text-xs">#18,392,{(12 - i).toString().padStart(3, "0")}</div>
                    <div className="mono text-[10px] uppercase tracking-wider text-muted-foreground">412 events · ack · DOI batch</div>
                  </div>
                  <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                </li>
              ))}
            </ul>
          </Panel>
          <Panel eyebrow="CHECKPOINTS" title="Replay-ready">
            <ul className="space-y-3 text-sm">
              {["sync-orcid", "atlas-snapshot", "isabella-eval", "korima-rebuild"].map((c) => (
                <li key={c} className="flex items-center gap-3">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="flex-1">{c}</span>
                  <span className="mono text-[10px] uppercase tracking-wider text-muted-foreground">ckpt-OK</span>
                </li>
              ))}
            </ul>
          </Panel>
          <Panel eyebrow="SELF HEALING" title="Last 24h">
            <ul className="space-y-3 text-sm">
              <li className="text-xs text-muted-foreground">3 federation re-routes (sin impacto)</li>
              <li className="text-xs text-muted-foreground">11 retries automáticos completados</li>
              <li className="text-xs text-muted-foreground">0 fallos en quorum HeHep</li>
              <li className="text-xs text-muted-foreground">1 checkpoint replay (PL-003)</li>
            </ul>
          </Panel>
        </div>
      </div>
    </div>
  );
}