import { useState } from "react";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";

import { Header } from "@/components/tamv/Header";
import {
  kernelEvents,
  kernelHealth,
  kernelQuery,
} from "@/lib/integrations/kernel.functions";

export const Route = createFileRoute("/kernel")({
  head: () => ({
    meta: [
      { title: "Kernel — TAMV Core" },
      {
        name: "description",
        content:
          "Consola del Kernel TAMV/UTAMV/ATLAS. Estado, eventos canónicos, consultas con RAG estricto y auditoría.",
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
  notFoundComponent: () => <div>404</div>,
});

function KernelPage() {
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

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <main className="mx-auto max-w-7xl px-6 py-10 space-y-10">
        <header className="space-y-2">
          <h1 className="font-display text-3xl">Kernel TAMV/UTAMV/ATLAS</h1>
          <p className="text-sm text-muted-foreground max-w-3xl">
            Microkernel MD-X4. Orquesta ingesta → canonización → retrieval →
            validación → síntesis → auditoría. Principio RAG estricto: sin
            evidencia primaria no se fabrica contenido.
          </p>
        </header>

        <HealthPanel data={health.data} loading={health.isLoading} />
        <QueryConsole />
        <EventsTable data={events.data ?? []} />
      </main>
    </div>
  );
}

function HealthPanel({
  data,
  loading,
}: {
  data: Awaited<ReturnType<typeof kernelHealth>> | undefined;
  loading: boolean;
}) {
  if (loading || !data)
    return <div className="text-xs text-muted-foreground">cargando estado…</div>;
  const items: Array<[string, string | number | boolean | undefined]> = [
    ["Estado", data.state],
    ["Nodos", data.nodes],
    ["Eventos", data.events],
    ["Cadena íntegra", data.chainOk ? "sí" : `roto@${data.chainBrokenAt}`],
    [
      "Integridad",
      `${data.integrity.valid}/${data.integrity.total} (${data.integrity.corrupted} corruptos)`,
    ],
  ];
  return (
    <section className="grid grid-cols-2 md:grid-cols-5 gap-3">
      {items.map(([k, v]) => (
        <div
          key={k}
          className="border border-border/60 rounded-md p-3 bg-card/30"
        >
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
            {k}
          </div>
          <div className="font-mono text-sm mt-1">{String(v)}</div>
        </div>
      ))}
    </section>
  );
}

function QueryConsole() {
  const queryClient = useQueryClient();
  const runQuery = useServerFn(kernelQuery);
  const [q, setQ] = useState("BookPI integridad");
  const mut = useMutation({
    mutationFn: (query: string) => runQuery({ data: { query } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["kernel"] });
    },
  });
  const result = mut.data;
  return (
    <section className="space-y-3">
      <h2 className="font-display text-xl">Consola</h2>
      <div className="flex gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="flex-1 bg-card/40 border border-border/60 rounded-md px-3 py-2 text-sm font-mono"
          placeholder="Pregunta al kernel…"
        />
        <button
          onClick={() => mut.mutate(q)}
          disabled={mut.isPending || !q.trim()}
          className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm disabled:opacity-50"
        >
          {mut.isPending ? "…" : "Consultar"}
        </button>
      </div>
      {result && (
        <div className="border border-border/60 rounded-md p-4 bg-card/30 space-y-3">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
            traceId: <span className="font-mono">{result.R.traceId}</span> ·
            status: <span className="font-mono">{result.R.status}</span>
          </div>
          <pre className="text-xs whitespace-pre-wrap font-mono">
            {result.R.data?.text}
          </pre>
          {result.E.length > 0 && (
            <div>
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">
                Evidencia
              </div>
              <ul className="text-xs space-y-1">
                {result.E.map((e) => (
                  <li key={e.nodeId} className="font-mono">
                    [{e.score.toFixed(2)}] {e.title} —{" "}
                    <span className="text-muted-foreground">
                      {e.citation.sha256.slice(0, 12)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">
              Decisiones
            </div>
            <ul className="text-xs font-mono">
              {result.R.decisions.map((d) => (
                <li key={d.policyId}>
                  {d.policyId} → {d.decision} {d.reason ? `(${d.reason})` : ""}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </section>
  );
}

function EventsTable({
  data,
}: {
  data: Awaited<ReturnType<typeof kernelEvents>>;
}) {
  return (
    <section className="space-y-3">
      <h2 className="font-display text-xl">Eventos canónicos</h2>
      <div className="overflow-x-auto border border-border/60 rounded-md">
        <table className="min-w-full text-xs font-mono">
          <thead className="bg-card/40 text-muted-foreground">
            <tr>
              <th className="text-left p-2">tipo</th>
              <th className="text-left p-2">actor</th>
              <th className="text-left p-2">nodo</th>
              <th className="text-left p-2">hash</th>
              <th className="text-left p-2">ts</th>
            </tr>
          </thead>
          <tbody>
            {data.map((e) => (
              <tr key={e.eventId} className="border-t border-border/40">
                <td className="p-2">{e.eventType}</td>
                <td className="p-2">{e.actorId}</td>
                <td className="p-2">{e.nodeId ?? "—"}</td>
                <td className="p-2">{e.eventHash.slice(0, 16)}…</td>
                <td className="p-2 text-muted-foreground">
                  {e.timestamp.slice(11, 19)}
                </td>
              </tr>
            ))}
            {!data.length && (
              <tr>
                <td colSpan={5} className="p-4 text-center text-muted-foreground">
                  sin eventos aún
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
