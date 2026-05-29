import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Panel({
  title,
  eyebrow,
  action,
  children,
  className,
  bodyClassName,
}: {
  title?: ReactNode;
  eyebrow?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section
      className={cn(
        "rounded-sm border border-border bg-card/60 backdrop-blur-sm",
        "shadow-[0_1px_0_0_oklch(1_0_0/0.03)_inset]",
        className,
      )}
    >
      {(title || eyebrow || action) && (
        <header className="flex items-start justify-between gap-4 border-b border-border px-4 py-3">
          <div className="min-w-0">
            {eyebrow && (
              <div className="mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground/70">
                {eyebrow}
              </div>
            )}
            {title && (
              <h3 className="text-sm font-medium tracking-tight text-foreground mt-0.5 truncate">
                {title}
              </h3>
            )}
          </div>
          {action && <div className="shrink-0 text-xs">{action}</div>}
        </header>
      )}
      <div className={cn("p-4", bodyClassName)}>{children}</div>
    </section>
  );
}

export function Stat({
  label,
  value,
  delta,
  hint,
}: {
  label: string;
  value: ReactNode;
  delta?: string;
  hint?: string;
}) {
  return (
    <div className="flex flex-col gap-1 rounded-sm border border-border bg-card/60 p-4">
      <div className="mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground/70">
        {label}
      </div>
      <div className="flex items-baseline gap-2">
        <div className="text-2xl font-medium tracking-tight tabular">{value}</div>
        {delta && (
          <span className="mono text-[10px] uppercase tracking-wider text-success">
            {delta}
          </span>
        )}
      </div>
      {hint && <div className="text-[11px] text-muted-foreground">{hint}</div>}
    </div>
  );
}

export function PageHeader({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-6 border-b border-border px-6 py-6">
      <div className="max-w-2xl">
        {eyebrow && (
          <div className="mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
            {eyebrow}
          </div>
        )}
        <h1 className="mt-2 text-2xl md:text-[28px] font-semibold tracking-tight text-foreground">
          {title}
        </h1>
        {description && (
          <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
            {description}
          </p>
        )}
      </div>
      {children && <div className="flex items-center gap-2">{children}</div>}
    </div>
  );
}