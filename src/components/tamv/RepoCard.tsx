import type { Repo } from "@/lib/ecosystem/manifest";
import { FederationBadge } from "./FederationBadge";

export function RepoCard({ repo }: { repo: Repo }) {
  const isKernel = repo.layer === "kernel";
  return (
    <a
      href={repo.url}
      target={repo.url.startsWith("http") ? "_blank" : undefined}
      rel="noreferrer"
      className={`group relative block rounded-xl border bg-card p-5 transition-all hover:-translate-y-0.5 hover:shadow-elite ${
        isKernel ? "border-elite" : "border-border/60 hover:border-primary/40"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.2em] text-muted-foreground">
            <span>{repo.layer}</span>
            <span>·</span>
            <span>{repo.language}</span>
          </div>
          <h3 className="mt-1 font-display text-lg font-semibold truncate">
            {repo.title}
          </h3>
          <p className="mt-1 text-xs font-mono text-muted-foreground truncate">
            {repo.slug}
          </p>
        </div>
        <FederationBadge id={repo.federation} asLink={false} />
      </div>

      <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
        {repo.summary}
      </p>

      <div className="mt-4 grid grid-cols-2 gap-3 text-[11px] font-mono">
        <div>
          <div className="text-muted-foreground uppercase tracking-wider mb-1">Consume</div>
          {repo.consumes.length === 0 ? (
            <div className="text-muted-foreground/60">—</div>
          ) : (
            <ul className="space-y-0.5">
              {repo.consumes.slice(0, 3).map((c) => (
                <li key={c} className="text-foreground/80 truncate">↳ {c}</li>
              ))}
            </ul>
          )}
        </div>
        <div>
          <div className="text-muted-foreground uppercase tracking-wider mb-1">Emite</div>
          {repo.emits.length === 0 ? (
            <div className="text-muted-foreground/60">—</div>
          ) : (
            <ul className="space-y-0.5">
              {repo.emits.slice(0, 3).map((e) => (
                <li key={e} className="text-accent truncate">⤳ {e}</li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between text-[10px] font-mono text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <span className="size-1.5 rounded-full bg-accent animate-pulse-node" />
          activo
        </span>
        <span className="group-hover:text-primary transition-colors">abrir ↗</span>
      </div>
    </a>
  );
}
