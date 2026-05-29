import { createFileRoute } from "@tanstack/react-router";
import { AlertTriangle, CheckCircle2, Search } from "lucide-react";
import { PageHeader, Panel, Stat } from "@/components/common/Panel";

export const Route = createFileRoute("/korima")({
  head: () => ({
    meta: [
      { title: "Korima Engine · TAMV Core Kodex" },
      { name: "description", content: "Ontology validation, lexicon explorer and constitutional constraints engine." },
      { property: "og:title", content: "Korima Engine · TAMV" },
      { property: "og:description", content: "Semantic integrity for the TAMV canon." },
    ],
  }),
  component: KorimaPage,
});

const LEXEMES = [
  { term: "soberanía", domain: "governance", status: "canon", refs: 412 },
  { term: "nodo cero", domain: "infra", status: "canon", refs: 187 },
  { term: "heptafederación", domain: "governance", status: "canon", refs: 263 },
  { term: "TAMV-K5", domain: "kernel", status: "canon", refs: 521 },
  { term: "Isabella Villaseñor IA", domain: "cognition", status: "canon", refs: 894 },
  { term: "ADN Anubis", domain: "doctrine", status: "canon", refs: 332 },
  { term: "sovereignty", domain: "governance", status: "conflict", refs: 47 },
  { term: "AI agent", domain: "cognition", status: "review", refs: 22 },
];

const CONSTRAINTS = [
  { id: "C-001", rule: "No sexualización de identidades IA", scope: "Isabella · global" },
  { id: "C-002", rule: "Trazabilidad obligatoria en BookPI", scope: "all federations" },
  { id: "C-003", rule: "Custodio canónico humano · EOCT", scope: "governance" },
  { id: "C-004", rule: "Kill switch dual humano + IA", scope: "Isabella · runtime" },
  { id: "C-005", rule: "Prohibido fork sin firma quorum", scope: "kernels" },
];

function KorimaPage() {
  return (
    <div>
      <PageHeader
        eyebrow="KORIMA · ONTOLOGY ENGINE"
        title="Semantic integrity & constitutional constraints"
        description="Korima valida el canon TAMV: ontologías, lexemas, doctrinas y restricciones constitucionales. Toda deriva semántica se detecta y reporta."
      />
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Stat label="Lexemas canónicos" value={1284} delta="+12 / 24h" />
          <Stat label="Validaciones · 24h" value={"38,917"} />
          <Stat label="Conflictos abiertos" value={3} hint="ver bandeja" />
          <Stat label="Coherencia" value={"98.4%"} delta="estable" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Panel
            eyebrow="LEXICON · EXPLORER"
            title="Términos canónicos"
            className="lg:col-span-2"
            action={
              <div className="flex items-center gap-2 rounded-sm border border-border bg-secondary/50 px-2 py-1 text-xs text-muted-foreground">
                <Search className="h-3 w-3" />
                <span>buscar lexema…</span>
              </div>
            }
            bodyClassName="p-0"
          >
            <table className="w-full text-sm">
              <thead className="mono text-[10px] uppercase tracking-wider text-muted-foreground">
                <tr className="border-b border-border">
                  <th className="text-left px-4 py-2 font-normal">Término</th>
                  <th className="text-left px-4 py-2 font-normal">Dominio</th>
                  <th className="text-left px-4 py-2 font-normal">Estado</th>
                  <th className="text-right px-4 py-2 font-normal">Refs</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {LEXEMES.map((l) => (
                  <tr key={l.term} className="hover:bg-secondary/40">
                    <td className="px-4 py-2.5">{l.term}</td>
                    <td className="px-4 py-2.5 mono text-[11px] uppercase tracking-wider text-muted-foreground">{l.domain}</td>
                    <td className="px-4 py-2.5">
                      <span className={
                        l.status === "canon"
                          ? "mono text-[10px] uppercase tracking-wider text-success"
                          : l.status === "conflict"
                            ? "mono text-[10px] uppercase tracking-wider text-destructive"
                            : "mono text-[10px] uppercase tracking-wider text-warning"
                      }>
                        {l.status}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-right mono tabular text-muted-foreground">{l.refs}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Panel>

          <Panel eyebrow="CONSTITUTIONAL CONSTRAINTS" title="Reglas estrictas activas" bodyClassName="p-0">
            <ul className="divide-y divide-border">
              {CONSTRAINTS.map((c) => (
                <li key={c.id} className="px-4 py-3">
                  <div className="flex items-center justify-between">
                    <span className="mono text-[10px] uppercase tracking-wider text-muted-foreground">{c.id}</span>
                    <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                  </div>
                  <div className="mt-1 text-sm">{c.rule}</div>
                  <div className="mono text-[10px] uppercase tracking-wider text-muted-foreground">{c.scope}</div>
                </li>
              ))}
            </ul>
          </Panel>
        </div>

        <Panel eyebrow="ONTOLOGY · CONFLICTS" title="Bandeja de conflictos ontológicos" bodyClassName="p-0">
          <ul className="divide-y divide-border">
            <li className="px-4 py-3 flex items-start gap-3">
              <AlertTriangle className="h-4 w-4 text-warning mt-0.5" />
              <div className="flex-1">
                <div className="text-sm">Lexema "sovereignty" en uso anglosajón sin mapeo canónico a "soberanía".</div>
                <div className="mono text-[10px] uppercase tracking-wider text-muted-foreground mt-1">propuesta · alias bidireccional · trust impact +0.2</div>
              </div>
              <button className="mono text-[10px] uppercase tracking-wider rounded-sm border border-border bg-secondary px-2 py-1 hover:bg-secondary/70">Resolve</button>
            </li>
            <li className="px-4 py-3 flex items-start gap-3">
              <AlertTriangle className="h-4 w-4 text-warning mt-0.5" />
              <div className="flex-1">
                <div className="text-sm">Definición duplicada para "Nodo Cero" entre Tomo II y Wiki Central.</div>
                <div className="mono text-[10px] uppercase tracking-wider text-muted-foreground mt-1">propuesta · unificar a Tomo II como fuente canónica</div>
              </div>
              <button className="mono text-[10px] uppercase tracking-wider rounded-sm border border-border bg-secondary px-2 py-1 hover:bg-secondary/70">Resolve</button>
            </li>
          </ul>
        </Panel>
      </div>
    </div>
  );
}