import { createFileRoute } from "@tanstack/react-router";
import { ShieldCheck } from "lucide-react";
import { PageHeader, Panel, Stat } from "@/components/common/Panel";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/eoct")({
  head: () => ({
    meta: [
      { title: "EOCT Constitutional Runtime · TAMV" },
      { name: "description", content: "ABAC policies, mandate validation, trust engine and sovereign permissions." },
      { property: "og:title", content: "EOCT Constitutional Runtime · TAMV" },
      { property: "og:description", content: "The constitutional core of the TAMV ecosystem." },
    ],
  }),
  component: EoctPage,
});

const POLICIES = [
  { id: "P-7421", name: "open-science.read", scope: "F1 · science", subjects: 412, decisions: "14,902", grant: 98.2 },
  { id: "P-7422", name: "ledger.write", scope: "F6 · economy", subjects: 38, decisions: "2,317", grant: 76.4 },
  { id: "P-7423", name: "isabella.invoke", scope: "F3 · cognition", subjects: 184, decisions: "9,841", grant: 91.7 },
  { id: "P-7424", name: "territory.deploy", scope: "F2 · infra", subjects: 12, decisions: "208", grant: 88.0 },
  { id: "P-7425", name: "kernel.fork", scope: "all", subjects: 4, decisions: "11", grant: 27.3 },
];

const MANDATES = [
  { id: "M-9001", title: "Sync ORCID → Zenodo (semanal)", actor: "MD-X5", trust: 0.96 },
  { id: "M-9002", title: "Auditoría Anubis sobre Isabella", actor: "Anubis", trust: 0.99 },
  { id: "M-9003", title: "Quorum HeHep para emisión MSR", actor: "ELITE HeHep", trust: 0.94 },
  { id: "M-9004", title: "Snapshot Atlas diario", actor: "BookPI", trust: 0.97 },
];

function EoctPage() {
  return (
    <div>
      <PageHeader
        eyebrow="EOCT · CONSTITUTIONAL RUNTIME"
        title="Sovereign permissions, mandates & trust"
        description="EOCT es el núcleo constitucional: políticas ABAC, validación de mandatos, motor de trust y riesgo, autorización de tareas y gobernanza en tiempo de ejecución."
      />
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Stat label="Constitutional score" value="96.4" delta="+0.3 / 24h" />
          <Stat label="Decisiones · 24h" value="27,279" />
          <Stat label="Mandatos activos" value={48} />
          <Stat label="Quorum humano" value="3/3" hint="custodio + 2 jueces" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Panel eyebrow="ABAC · POLICIES" title="Active policy matrix" className="lg:col-span-2" bodyClassName="p-0">
            <table className="w-full text-sm">
              <thead className="mono text-[10px] uppercase tracking-wider text-muted-foreground">
                <tr className="border-b border-border">
                  <th className="text-left px-4 py-2 font-normal">ID</th>
                  <th className="text-left px-4 py-2 font-normal">Policy</th>
                  <th className="text-left px-4 py-2 font-normal">Scope</th>
                  <th className="text-right px-4 py-2 font-normal">Subjects</th>
                  <th className="text-right px-4 py-2 font-normal">Decisions</th>
                  <th className="text-right px-4 py-2 font-normal">Grant %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {POLICIES.map((p) => (
                  <tr key={p.id} className="hover:bg-secondary/40">
                    <td className="px-4 py-2.5 mono text-xs text-muted-foreground">{p.id}</td>
                    <td className="px-4 py-2.5 mono text-xs">{p.name}</td>
                    <td className="px-4 py-2.5 mono text-[11px] uppercase tracking-wider text-muted-foreground">{p.scope}</td>
                    <td className="px-4 py-2.5 text-right tabular">{p.subjects}</td>
                    <td className="px-4 py-2.5 text-right tabular">{p.decisions}</td>
                    <td className="px-4 py-2.5 text-right tabular">
                      <span className={cn(
                        p.grant >= 90 && "text-success",
                        p.grant < 90 && p.grant >= 60 && "text-warning",
                        p.grant < 60 && "text-destructive",
                      )}>
                        {p.grant}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Panel>

          <Panel eyebrow="MANDATES" title="Active mandates" bodyClassName="p-0">
            <ul className="divide-y divide-border">
              {MANDATES.map((m) => (
                <li key={m.id} className="px-4 py-3">
                  <div className="flex items-center justify-between">
                    <span className="mono text-[10px] uppercase tracking-wider text-muted-foreground">{m.id}</span>
                    <span className="mono text-[10px] uppercase tracking-wider text-success">active</span>
                  </div>
                  <div className="mt-1 text-sm">{m.title}</div>
                  <div className="mt-1 flex items-center justify-between mono text-[10px] uppercase tracking-wider text-muted-foreground tabular">
                    <span>actor · {m.actor}</span>
                    <span>trust · {m.trust.toFixed(2)}</span>
                  </div>
                </li>
              ))}
            </ul>
          </Panel>
        </div>

        <Panel eyebrow="TRUST · RISK" title="Engine telemetry">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <BarStack label="Trust by federation" rows={[
              { name: "F4 Governance", v: 96 }, { name: "F5 Identity", v: 93 }, { name: "F1 Science", v: 94 },
              { name: "F2 Infra", v: 91 }, { name: "F7 Defense", v: 90 }, { name: "F3 Cognition", v: 88 }, { name: "F6 Economy", v: 87 },
            ]} tone="success" />
            <BarStack label="Risk by federation" rows={[
              { name: "F4 Governance", v: 4 }, { name: "F1 Science", v: 6 }, { name: "F5 Identity", v: 7 },
              { name: "F2 Infra", v: 11 }, { name: "F6 Economy", v: 13 }, { name: "F3 Cognition", v: 14 }, { name: "F7 Defense", v: 18 },
            ]} tone="warning" />
          </div>
        </Panel>

        <Panel eyebrow="HUMAN-IN-THE-LOOP" title="Sovereign quorum">
          <div className="flex items-center gap-4 text-sm">
            <ShieldCheck className="h-8 w-8 text-success" />
            <div>
              <div>3 / 3 firmas activas · custodio canónico Edwin O. Castillo + 2 jueces federativos.</div>
              <div className="mono text-[10px] uppercase tracking-wider text-muted-foreground mt-1">
                kill switch · doble autorización · auditable bajo ORCID 0009-0008-5050-1539
              </div>
            </div>
          </div>
        </Panel>
      </div>
    </div>
  );
}

function BarStack({ label, rows, tone }: { label: string; rows: { name: string; v: number }[]; tone: "success" | "warning" }) {
  const max = Math.max(...rows.map((r) => r.v));
  return (
    <div>
      <div className="mono text-[10px] uppercase tracking-wider text-muted-foreground mb-3">{label}</div>
      <ul className="space-y-2">
        {rows.map((r) => (
          <li key={r.name} className="flex items-center gap-3 text-xs">
            <span className="w-32 truncate text-muted-foreground">{r.name}</span>
            <div className="flex-1 h-1.5 bg-secondary rounded-sm overflow-hidden">
              <div
                className={tone === "success" ? "h-full bg-success/70" : "h-full bg-warning/70"}
                style={{ width: `${(r.v / max) * 100}%` }}
              />
            </div>
            <span className="mono tabular w-8 text-right">{r.v}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}