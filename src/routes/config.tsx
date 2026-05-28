import { createFileRoute } from "@tanstack/react-router";
import { Header } from "@/components/tamv/Header";
import { useOpenScienceStatus } from "@/hooks/use-open-science-status";
import { useManifestSnapshots } from "@/hooks/use-manifest-snapshots";
import { useGithubWebhookStatus } from "@/hooks/use-github-webhook-status";

export const Route = createFileRoute("/config")({
  component: ConfigView,
});

function ConfigView() {
  const openScience = useOpenScienceStatus();
  const snapshots = useManifestSnapshots();
  const webhooks = useGithubWebhookStatus();

  return (
    <div className="min-h-screen bg-[#020202] text-zinc-100">
      <Header />
      <main className="mx-auto max-w-7xl px-6 py-10 space-y-8">
        <header className="border-b border-white/10 pb-5">
          <div className="text-[10px] uppercase tracking-[0.3em] text-amber-300/70">
            Configuracion canonica · ELITE HeHep · HEP-1
          </div>
          <h1 className="font-display text-3xl mt-1">Kernel sync & integraciones</h1>
          <p className="mt-2 max-w-3xl text-sm text-zinc-400">
            Validacion viva de ciencia abierta, snapshots versionados del manifest publico y estado de webhooks GitHub. La pantalla solo muestra estado, latencia y errores sanitizados; ningun secret cruza al cliente.
          </p>
        </header>

        <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <Panel title="ORCID · Zenodo · Figshare" subtitle="Validacion en vivo sin revelar secrets">
            {openScience.isLoading ? (
              <p className="font-mono text-xs text-zinc-500">Validando integraciones...</p>
            ) : openScience.error ? (
              <p className="font-mono text-xs text-red-400">{String(openScience.error)}</p>
            ) : (
              <div className="space-y-3">
                {openScience.data?.results.map((item) => (
                  <div key={item.key} className="grid gap-3 rounded-lg border border-white/5 bg-black/40 p-4 md:grid-cols-[140px_1fr_110px]">
                    <div>
                      <div className="font-mono text-sm text-zinc-100">{item.label}</div>
                      <div className="mt-1 text-[10px] uppercase tracking-[0.2em] text-zinc-500">{item.configured ? "configurado" : "pendiente"}</div>
                    </div>
                    <div className="min-w-0">
                      <div className={`font-mono text-xs ${item.ok ? "text-emerald-300" : "text-red-300"}`}>
                        {item.ok ? "OK" : item.error ?? "sin validar"}
                      </div>
                      <div className="mt-1 truncate font-mono text-[11px] text-zinc-500">{item.endpoint}</div>
                    </div>
                    <div className="text-right font-mono text-xs">
                      <div className="text-zinc-100">{item.latencyMs} ms</div>
                      <div className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">latencia</div>
                    </div>
                  </div>
                ))}
                <div className="grid gap-3 text-[11px] font-mono sm:grid-cols-4">
                  <Metric label="OK" value={String(openScience.data?.summary.ok ?? 0)} />
                  <Metric label="faltantes" value={String(openScience.data?.summary.missing ?? 0)} />
                  <Metric label="fallando" value={String(openScience.data?.summary.failing ?? 0)} />
                  <Metric label="max latency" value={`${openScience.data?.summary.maxLatencyMs ?? 0} ms`} />
                </div>
              </div>
            )}
          </Panel>

          <Panel title="GitHub webhooks" subtitle="Actualizacion del dashboard por eventos">
            <div className="space-y-4 font-mono text-xs">
              <div className="flex items-center justify-between rounded-lg border border-white/5 bg-black/40 p-4">
                <span className="uppercase tracking-[0.18em] text-zinc-500">secret</span>
                <span className={webhooks.data?.configured ? "text-emerald-300" : "text-red-300"}>
                  {webhooks.data?.configured ? "configurado" : "faltante"}
                </span>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-white/5 bg-black/40 p-4">
                <span className="uppercase tracking-[0.18em] text-zinc-500">eventos</span>
                <span className="text-zinc-100">{webhooks.data?.eventCount ?? 0}</span>
              </div>
              <div className="rounded-lg border border-white/5 bg-black/40 p-4">
                <div className="uppercase tracking-[0.18em] text-zinc-500">ultimo delivery</div>
                <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap text-[11px] text-zinc-300">
                  {JSON.stringify(webhooks.data?.latest ?? { status: "sin eventos" }, null, 2)}
                </pre>
              </div>
              <div className="rounded-lg border border-amber-400/20 bg-amber-400/5 p-4 text-[11px] text-amber-100/80">
                Configura GitHub con payload URL <code>/api/github/webhook</code>, content type <code>application/json</code> y secret <code>GITHUB_WEBHOOK_SECRET</code>. El dashboard lee el store local de eventos sin exponer el secret.
              </div>
            </div>
          </Panel>
        </section>

        <Panel title="Snapshots del manifest publico" subtitle="Historial versionado de /api/public/manifest">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">
                <tr className="border-b border-white/5">
                  <th className="px-3 py-2 text-left">Snapshot</th>
                  <th className="px-3 py-2 text-left">Fecha</th>
                  <th className="px-3 py-2 text-right">Repos</th>
                  <th className="px-3 py-2 text-left">SHA-256</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 font-mono text-xs">
                {(snapshots.data ?? []).map((snapshot) => (
                  <tr key={snapshot.id} className="hover:bg-white/5">
                    <td className="px-3 py-2 text-zinc-100">{snapshot.id}</td>
                    <td className="px-3 py-2 text-zinc-400">{snapshot.createdAt}</td>
                    <td className="px-3 py-2 text-right text-zinc-300">{snapshot.repoCount}</td>
                    <td className="px-3 py-2 text-zinc-500">{snapshot.sha256.slice(0, 24)}</td>
                  </tr>
                ))}
                {!snapshots.data?.length ? (
                  <tr>
                    <td className="px-3 py-4 text-zinc-500" colSpan={4}>
                      Aun no hay snapshots. Se crean automaticamente en cada sync de /api/public/manifest.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </Panel>
      </main>
    </div>
  );
}

function Panel({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-white/5 bg-[#050505]/90 shadow-2xl shadow-black/50">
      <div className="border-b border-white/5 px-5 py-3">
        <h2 className="font-display text-sm tracking-wide text-zinc-50">{title}</h2>
        <p className="text-[11px] text-zinc-500">{subtitle}</p>
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/5 bg-black/40 px-3 py-2">
      <div className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">{label}</div>
      <div className="mt-1 text-zinc-100">{value}</div>
    </div>
  );
}
