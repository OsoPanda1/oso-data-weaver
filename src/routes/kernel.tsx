import { useMemo, useState } from "react";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { motion, AnimatePresence } from "framer-motion";

import { Header } from "@/components/tamv/Header";
import {
  kernelAudit,
  kernelEvents,
  kernelHealth,
  kernelIngest,
  kernelQuery,
  kernelStores,
} from "@/lib/integrations/kernel.functions";

export const Route = createFileRoute("/kernel")({
  head: () => ({
    meta: [
      { title: "Kernel — Consola TAMV MD-X4" },
      {
        name: "description",
        content:
          "Consola del Kernel TAMV/UTAMV/ATLAS. Ejecuta consultas con RAG estricto, ingesta de documentos canónicos, visualiza el estado MD-X4 y descarga auditorías por traceId.",
      },
      { property: "og:title", content: "Kernel — Consola TAMV MD-X4" },
      {
        property: "og:description",
        content:
          "RAG estricto, ingesta canónica, auditoría por traceId, telemetría de Neo4j/Qdrant.",
      },
    ],
  }),
  component: KernelPage,
  errorComponent: ({ error, reset }) => {
    const router = useRouter();
    return (
      <div className="min-h-screen bg-background text-foreground p-8">
        <pre className="text-destructive">{error.message}</pre>
        <button
          className="mt-4 px-3 py-1 border border-border rounded"
          onClick={() => {
            reset();
            router.invalidate();
          }}
        >
          Reintentar
        </button>
      </div>
    );
  },
  notFoundComponent: () => <div className="p-8">404</div>,
});

type Tab = "console" | "ingest" | "audit" | "stores";

function KernelPage() {
  const [tab, setTab] = useState<Tab>("console");

  const health = useQuery({
    queryKey: ["kernel", "health"],
    queryFn: () => kernelHealth(),
    refetchInterval: 5000,
  });
  const events = useQuery({
    queryKey: ["kernel", "events"],
    queryFn: () => kernelEvents(),
    refetchInterval: 5000,
  });
  const stores = useQuery({
    queryKey: ["kernel", "stores"],
    queryFn: () => kernelStores(),
    refetchInterval: 15000,
  });

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <Aurora />
      <main className="relative mx-auto max-w-7xl px-6 py-10 space-y-10">
        <Hero state={health.data?.state ?? "—"} />
        <HealthGrid data={health.data} />
        <StateMachine current={health.data?.state ?? "IDLE"} />

        <div className="flex flex-wrap gap-2 border-b border-border/40 pb-2">
          {(
            [
              ["console", "Consola RAG"],
              ["ingest", "Ingesta canónica"],
              ["audit", "Auditoría / traceId"],
              ["stores", "Persistencia"],
            ] as Array<[Tab, string]>
          ).map(([k, label]) => (
            <button
              key={k}
              onClick={() => setTab(k)}
              className={`relative px-4 py-2 text-sm font-mono uppercase tracking-widest transition-colors ${
                tab === k
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {label}
              {tab === k && (
                <motion.span
                  layoutId="tab-underline"
                  className="absolute inset-x-2 -bottom-0.5 h-px bg-primary"
                />
              )}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.section
            key={tab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.18 }}
          >
            {tab === "console" && <QueryConsole />}
            {tab === "ingest" && <IngestPanel />}
            {tab === "audit" && <AuditPanel />}
            {tab === "stores" && <StoresPanel data={stores.data} />}
          </motion.section>
        </AnimatePresence>

        <EventsTable data={events.data ?? []} />
      </main>
    </div>
  );
}

/* ──────────────────────────────────────────── presentation ── */

function Aurora() {
  return (
    <div className="pointer-events-none absolute inset-x-0 top-16 h-[420px] overflow-hidden -z-10">
      <div className="absolute -top-32 left-1/3 h-[480px] w-[480px] rounded-full bg-primary/15 blur-3xl" />
      <div className="absolute top-10 right-1/4 h-[320px] w-[320px] rounded-full bg-emerald-400/10 blur-3xl" />
    </div>
  );
}

function Hero({ state }: { state: string }) {
  return (
    <motion.header
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-3"
    >
      <div className="flex items-center gap-3 text-[10px] font-mono uppercase tracking-[0.28em] text-muted-foreground">
        <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
        kernel · md-x4 · {state}
      </div>
      <h1 className="font-display text-4xl md:text-5xl tracking-tight">
        Consola del Kernel{" "}
        <span className="bg-gradient-to-r from-primary via-amber-300 to-emerald-300 bg-clip-text text-transparent">
          TAMV / UTAMV / ATLAS
        </span>
      </h1>
      <p className="max-w-3xl text-sm text-muted-foreground">
        Microkernel canónico bajo doctrina MD-X4. Orquesta ingesta →
        canonización → recuperación → validación → síntesis → auditoría. RAG
        estricto: sin evidencia primaria no se fabrica contenido. Cada evento
        firmado con HMAC-SHA256 sobre la cadena <code>prevHash</code>.
      </p>
    </motion.header>
  );
}

function HealthGrid({
  data,
}: {
  data: Awaited<ReturnType<typeof kernelHealth>> | undefined;
}) {
  const items: Array<[string, string | number]> = data
    ? [
        ["Estado", data.state],
        ["Nodos", data.nodes],
        ["Eventos", data.events],
        ["Cadena", data.chainOk ? "íntegra" : `rota@${data.chainBrokenAt}`],
        [
          "Integridad",
          `${data.integrity.valid}/${data.integrity.total}`,
        ],
      ]
    : [["Estado", "—"]];
  return (
    <section className="grid grid-cols-2 md:grid-cols-5 gap-3">
      {items.map(([k, v], i) => (
        <motion.div
          key={k}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.04 }}
          className="rounded-lg border border-border/50 bg-card/40 backdrop-blur-sm p-4 hover:border-primary/40 transition-colors"
        >
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
            {k}
          </div>
          <div className="font-mono text-base mt-1">{String(v)}</div>
        </motion.div>
      ))}
    </section>
  );
}

const STATES = [
  "IDLE",
  "INGESTING",
  "CANONICALIZING",
  "RETRIEVING",
  "VALIDATING",
  "RESPONDING",
  "AUDITING",
] as const;

function StateMachine({ current }: { current: string }) {
  return (
    <section className="rounded-lg border border-border/50 bg-card/30 p-4">
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-3">
        Máquina de estados MD-X4
      </div>
      <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
        {STATES.map((s, i) => {
          const active = current === s;
          return (
            <div key={s} className="flex items-center gap-2">
              <motion.span
                animate={
                  active
                    ? { scale: [1, 1.05, 1], opacity: [0.9, 1, 0.9] }
                    : { scale: 1, opacity: 1 }
                }
                transition={{ repeat: Infinity, duration: 2 }}
                className={`px-3 py-1.5 rounded-md border ${
                  active
                    ? "border-primary text-primary bg-primary/10"
                    : "border-border/50 text-muted-foreground"
                }`}
              >
                {s}
              </motion.span>
              {i < STATES.length - 1 && (
                <span className="text-muted-foreground/40">→</span>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

/* ──────────────────────────────────────────── consola RAG ── */

function QueryConsole() {
  const queryClient = useQueryClient();
  const runQuery = useServerFn(kernelQuery);
  const [q, setQ] = useState("BookPI integridad");
  const mut = useMutation({
    mutationFn: (query: string) => runQuery({ data: { query } }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["kernel"] }),
  });
  const result = mut.data;
  return (
    <div className="space-y-4">
      <h2 className="font-display text-xl">Consulta canónica (RAG estricto)</h2>
      <div className="flex gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && q.trim()) mut.mutate(q);
          }}
          className="flex-1 bg-card/40 border border-border/50 focus:border-primary/60 outline-none rounded-md px-3 py-2 text-sm font-mono"
          placeholder="Pregunta al kernel…"
        />
        <button
          onClick={() => mut.mutate(q)}
          disabled={mut.isPending || !q.trim()}
          className="px-5 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50 hover:opacity-90"
        >
          {mut.isPending ? "Procesando…" : "Consultar"}
        </button>
      </div>
      {result && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-lg border border-border/50 bg-card/30 p-4 space-y-4"
        >
          <div className="flex items-center justify-between text-[10px] uppercase tracking-widest">
            <span className="text-muted-foreground">
              trace · <span className="font-mono">{result.R.traceId}</span>
            </span>
            <span
              className={`px-2 py-0.5 rounded font-mono ${
                result.R.status === "OK"
                  ? "bg-emerald-400/15 text-emerald-300"
                  : result.R.status === "BLOCKED"
                    ? "bg-red-400/15 text-red-300"
                    : "bg-amber-400/15 text-amber-300"
              }`}
            >
              {result.R.status}
            </span>
          </div>
          <pre className="text-xs whitespace-pre-wrap font-mono text-foreground/90">
            {result.R.data?.text}
          </pre>
          {result.E.length > 0 && (
            <div className="space-y-2">
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                Evidencia ordenada por score
              </div>
              <ul className="space-y-1">
                {result.E.map((e) => (
                  <li
                    key={e.nodeId}
                    className="flex items-baseline gap-3 text-xs font-mono"
                  >
                    <span className="text-primary tabular-nums w-12">
                      {e.score.toFixed(3)}
                    </span>
                    <span className="flex-1 truncate">{e.title}</span>
                    <span className="text-muted-foreground">
                      {e.citation.sha256.slice(0, 10)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">
              Decisiones políticas
            </div>
            <ul className="text-xs font-mono space-y-0.5">
              {result.R.decisions.map((d) => (
                <li key={d.policyId}>
                  <span
                    className={
                      d.decision === "ALLOW"
                        ? "text-emerald-300"
                        : "text-red-300"
                    }
                  >
                    {d.decision}
                  </span>{" "}
                  · {d.policyId}
                  {d.reason ? ` (${d.reason})` : ""}
                </li>
              ))}
            </ul>
          </div>
        </motion.div>
      )}
    </div>
  );
}

/* ──────────────────────────────────────────── ingesta ── */

function IngestPanel() {
  const queryClient = useQueryClient();
  const runIngest = useServerFn(kernelIngest);
  const [title, setTitle] = useState("Manifiesto MD-X4");
  const [body, setBody] = useState(
    "BookPI vincula eventos canónicos con cadena prevHash y firma HMAC.",
  );
  const [tags, setTags] = useState("mdx4, bookpi, doctrina");
  const id = useMemo(
    () => `doc:${title.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 64)}`,
    [title],
  );
  const mut = useMutation({
    mutationFn: () =>
      runIngest({
        data: {
          nodes: [
            {
              id,
              type: "DOCUMENT",
              title,
              body,
              tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
              source: "console:ingest",
              ontologyClass: "tamv.external",
            },
          ],
        },
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["kernel"] }),
  });
  return (
    <div className="space-y-4">
      <h2 className="font-display text-xl">Ingesta canónica firmada</h2>
      <div className="grid md:grid-cols-2 gap-3">
        <Field label="Título">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full bg-card/40 border border-border/50 rounded-md px-3 py-2 text-sm font-mono"
          />
        </Field>
        <Field label="ID (derivado)">
          <input
            value={id}
            readOnly
            className="w-full bg-card/20 border border-border/30 rounded-md px-3 py-2 text-sm font-mono text-muted-foreground"
          />
        </Field>
      </div>
      <Field label="Cuerpo">
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={4}
          className="w-full bg-card/40 border border-border/50 rounded-md px-3 py-2 text-sm font-mono"
        />
      </Field>
      <Field label="Tags (coma)">
        <input
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          className="w-full bg-card/40 border border-border/50 rounded-md px-3 py-2 text-sm font-mono"
        />
      </Field>
      <button
        onClick={() => mut.mutate()}
        disabled={mut.isPending || !title.trim()}
        className="px-5 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50"
      >
        {mut.isPending ? "Canonizando…" : "Ingestar y firmar"}
      </button>
      {mut.data && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="rounded-lg border border-emerald-400/30 bg-emerald-400/5 p-4 text-xs font-mono space-y-1"
        >
          <div className="text-emerald-300">
            ✓ {mut.data.nodes.length} nodo(s) canonizado(s)
          </div>
          <div>traceId: {mut.data.traceId}</div>
          {mut.data.events.map((e) => (
            <div key={e.eventId} className="text-muted-foreground">
              {e.eventType} · sig:{e.signature.slice(0, 24)}…
            </div>
          ))}
        </motion.div>
      )}
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1">
      <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
        {label}
      </span>
      {children}
    </label>
  );
}

/* ──────────────────────────────────────────── auditoría ── */

function AuditPanel() {
  const runAudit = useServerFn(kernelAudit);
  const [traceId, setTraceId] = useState("");
  const mut = useMutation({
    mutationFn: (id: string) => runAudit({ data: { traceId: id } }),
  });

  function download() {
    if (!mut.data?.found || !mut.data.report) return;
    const blob = new Blob([JSON.stringify(mut.data.report, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `tamv-audit-${traceId}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-4">
      <h2 className="font-display text-xl">Reporte de auditoría</h2>
      <div className="flex gap-2">
        <input
          value={traceId}
          onChange={(e) => setTraceId(e.target.value.trim())}
          placeholder="traceId UUID v4"
          className="flex-1 bg-card/40 border border-border/50 rounded-md px-3 py-2 text-sm font-mono"
        />
        <button
          onClick={() => traceId && mut.mutate(traceId)}
          disabled={mut.isPending || !traceId}
          className="px-5 py-2 rounded-md bg-primary text-primary-foreground text-sm disabled:opacity-50"
        >
          Auditar
        </button>
        <button
          onClick={download}
          disabled={!mut.data?.found}
          className="px-5 py-2 rounded-md border border-primary/40 text-primary text-sm disabled:opacity-30"
        >
          Descargar JSON
        </button>
      </div>
      {mut.data && !mut.data.found && (
        <div className="text-xs text-amber-300 font-mono">
          traceId no encontrado en el log del kernel.
        </div>
      )}
      {mut.data?.found && mut.data.report && (
        <pre className="text-[11px] font-mono whitespace-pre-wrap bg-card/30 border border-border/50 rounded-lg p-4 max-h-[420px] overflow-auto">
          {JSON.stringify(mut.data.report, null, 2)}
        </pre>
      )}
    </div>
  );
}

/* ──────────────────────────────────────────── stores ── */

function StoresPanel({
  data,
}: {
  data: Awaited<ReturnType<typeof kernelStores>> | undefined;
}) {
  if (!data)
    return (
      <div className="text-xs text-muted-foreground">cargando adaptadores…</div>
    );
  return (
    <div className="grid md:grid-cols-2 gap-4">
      <AdapterCard
        title="Grafo · Neo4j"
        driver={data.config.graph.driver}
        configured={data.config.graph.configured}
        probe={data.probes.neo4j}
        envHint="NEO4J_URL · NEO4J_AUTH (base64)"
      />
      <AdapterCard
        title="Vector · Qdrant"
        driver={data.config.vector.driver}
        configured={data.config.vector.configured}
        probe={data.probes.qdrant}
        envHint="QDRANT_URL · QDRANT_API_KEY · QDRANT_COLLECTION"
      />
    </div>
  );
}

function AdapterCard({
  title,
  driver,
  configured,
  probe,
  envHint,
}: {
  title: string;
  driver: string;
  configured: boolean;
  probe: { ok: boolean; latencyMs: number; error?: string };
  envHint: string;
}) {
  const status = probe.ok
    ? "online"
    : configured
      ? "unreachable"
      : "in-memory fallback";
  const color = probe.ok
    ? "text-emerald-300"
    : configured
      ? "text-red-300"
      : "text-amber-300";
  return (
    <div className="rounded-lg border border-border/50 bg-card/30 p-4 space-y-2">
      <div className="flex items-center justify-between">
        <div className="font-display text-base">{title}</div>
        <span className={`text-[10px] font-mono uppercase ${color}`}>
          {status}
        </span>
      </div>
      <div className="text-xs font-mono text-muted-foreground space-y-0.5">
        <div>driver: {driver}</div>
        <div>latencia: {probe.latencyMs} ms</div>
        {probe.error && <div className="text-red-300">error: {probe.error}</div>}
        <div className="text-[10px]">env: {envHint}</div>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────── eventos ── */

function EventsTable({
  data,
}: {
  data: Awaited<ReturnType<typeof kernelEvents>>;
}) {
  return (
    <section className="space-y-3">
      <h2 className="font-display text-xl">Eventos canónicos firmados</h2>
      <div className="overflow-x-auto rounded-lg border border-border/50">
        <table className="min-w-full text-xs font-mono">
          <thead className="bg-card/40 text-muted-foreground">
            <tr>
              <th className="text-left p-2">tipo</th>
              <th className="text-left p-2">actor</th>
              <th className="text-left p-2">nodo</th>
              <th className="text-left p-2">eventHash</th>
              <th className="text-left p-2">prevHash</th>
              <th className="text-left p-2">ts</th>
            </tr>
          </thead>
          <tbody>
            {data.map((e) => (
              <tr key={e.eventId} className="border-t border-border/40 hover:bg-card/20">
                <td className="p-2 text-primary">{e.eventType}</td>
                <td className="p-2">{e.actorId}</td>
                <td className="p-2">{e.nodeId ?? "—"}</td>
                <td className="p-2 text-muted-foreground">
                  {e.eventHash.slice(0, 16)}…
                </td>
                <td className="p-2 text-muted-foreground">
                  {e.prevHash.slice(0, 12)}…
                </td>
                <td className="p-2 text-muted-foreground">
                  {e.timestamp.slice(11, 19)}
                </td>
              </tr>
            ))}
            {!data.length && (
              <tr>
                <td colSpan={6} className="p-6 text-center text-muted-foreground">
                  sin eventos aún — usa la consola o la ingesta para emitir.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
