// routes/federations.$id.tsx
import { createFileRoute, notFound } from '@tanstack/react-router'
import { FEDERATIONS } from '@/lib/ecosystem/contracts'
import type { KnowledgeCell, TAMVArtifact } from '@/lib/knowledge/model'
import { FederationAtlas } from '@/components/tamv/FederationAtlas'
import { EventStream } from '@/components/tamv/EventStream'
import { useKernelStatus } from '@/hooks/use-kernel-status'

export const Route = createFileRoute('/federations/$id')({
  loader: async ({ params }) => {
    const federation = FEDERATIONS[params.id as keyof typeof FEDERATIONS]
    if (!federation) {
      throw notFound({
        message: `Federación "${params.id}" no existe en el ledger doctrinal`,
      })
    }

    // Punto de extensión: aquí podrás leer del ledger (GitHub/BookPI)
    // para inyectar celdas y artefactos asociados a esta federación.
    const cells: KnowledgeCell[] = []
    const artifacts: TAMVArtifact[] = []

    return { federation, cells, artifacts }
  },
  component: FederationView,
})

function FederationView() {
  const { federation, cells, artifacts } = Route.useLoaderData()
  const { healthScore } = useKernelStatus()

  return (
    <div className="min-h-screen bg-[#020202] text-zinc-100">
      <main className="mx-auto max-w-6xl px-6 py-10 space-y-8">
        {/* Encabezado doctrinal de la federación */}
        <header className="flex flex-col gap-3 border-b border-white/10 pb-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1
                className="font-display text-3xl tracking-tight"
                style={{ color: federation.color }}
              >
                {federation.name}
              </h1>
              {federation.motto ? (
                <p className="mt-1 text-sm text-zinc-400">
                  {federation.motto}
                </p>
              ) : null}
            </div>
            <div className="text-right text-[11px] font-mono uppercase tracking-[0.2em] text-zinc-500">
              <div>FEDERACIÓN MD‑X4</div>
              <div className="text-zinc-300">{federation.id}</div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-[11px] font-mono uppercase tracking-[0.2em]">
            <Badge label="Repos vinculados" value={String(federation.repos?.length ?? 0)} />
            <Badge label="Celdas cognitivas" value={String(cells.length)} />
            <Badge label="Artefactos científicos" value={String(artifacts.length)} />
            <Badge
              label="Salud del kernel"
              value={`${healthScore.toFixed(0)}%`}
              tone={healthScore >= 90 ? 'ok' : healthScore >= 70 ? 'warn' : 'alert'}
            />
          </div>
        </header>

        {/* Atlas filtrado por federación */}
        <section className="grid gap-8 lg:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.9fr)]">
          <div className="space-y-4">
            <PanelShell
              title="Atlas de Heptafederación"
              subtitle="Celdas y dependencias filtradas por federación"
            >
              <FederationAtlas federationId={federation.id} cells={cells} />
            </PanelShell>
          </div>

          <div className="space-y-4">
            <PanelShell
              title="Eventos recientes"
              subtitle="BookPI · Telemetría de esta federación"
            >
              <EventStream max={15} filterByFederationId={federation.id} />
            </PanelShell>
          </div>
        </section>
      </main>
    </div>
  )
}

function Badge({
  label,
  value,
  tone = 'default',
}: {
  label: string
  value: string
  tone?: 'default' | 'ok' | 'warn' | 'alert'
}) {
  const toneClass =
    tone === 'ok'
      ? 'border-emerald-500/60 text-emerald-300'
      : tone === 'warn'
      ? 'border-amber-500/60 text-amber-300'
      : tone === 'alert'
      ? 'border-red-500/70 text-red-300'
      : 'border-white/10 text-zinc-300'

  return (
    <div
      className={`flex items-baseline gap-2 rounded-full border px-3 py-1.5 bg-black/30 ${toneClass}`}
    >
      <span className="text-[10px] uppercase tracking-[0.25em] text-zinc-500">
        {label}
      </span>
      <span className="text-xs font-semibold">{value}</span>
    </div>
  )
}

function PanelShell({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle?: string
  children: React.ReactNode
}) {
  return (
    <div className="rounded-xl border border-white/5 bg-[#050505]/90 shadow-2xl shadow-black/60 backdrop-blur">
      <div className="flex items-baseline justify-between border-b border-white/5 px-5 py-3">
        <div>
          <h2 className="font-display text-sm tracking-wide text-zinc-50">
            {title}
          </h2>
          {subtitle ? (
            <p className="text-[11px] text-zinc-500">{subtitle}</p>
          ) : null}
        </div>
        <div className="h-2 w-10 rounded-full bg-gradient-to-r from-emerald-500/40 via-gold/50 to-sky-500/40" />
      </div>
      <div className="px-5 py-4">{children}</div>
    </div>
  )
}
