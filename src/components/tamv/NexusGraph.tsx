import { useMemo, useState } from "react";
import { FEDERATIONS, type FederationId } from "@/lib/ecosystem/contracts";
import { REPOS } from "@/lib/ecosystem/manifest";

/**
 * Atlas/Nexus — grafo SVG.
 * Centro: kernel. Anillo medio: 7 federaciones. Anillo externo: repos.
 * Líneas animadas = flujo de eventos en serie.
 */
export function NexusGraph() {
  const [hovered, setHovered] = useState<string | null>(null);

  const W = 900;
  const H = 700;
  const cx = W / 2;
  const cy = H / 2;

  const fedIds = Object.keys(FEDERATIONS) as FederationId[];
  const fedRadius = 200;
  const repoRadius = 310;

  const fedNodes = useMemo(
    () =>
      fedIds.map((id, i) => {
        const angle = (i / fedIds.length) * Math.PI * 2 - Math.PI / 2;
        return {
          id,
          x: cx + Math.cos(angle) * fedRadius,
          y: cy + Math.sin(angle) * fedRadius,
          color: FEDERATIONS[id].color,
        };
      }),
    [fedIds],
  );

  const repoNodes = useMemo(() => {
    const groups: Record<FederationId, typeof REPOS> = {} as never;
    fedIds.forEach((id) => (groups[id] = REPOS.filter((r) => r.federation === id && r.layer !== "kernel")));

    const nodes: { slug: string; x: number; y: number; fed: FederationId; title: string }[] = [];
    fedIds.forEach((id, fi) => {
      const baseAngle = (fi / fedIds.length) * Math.PI * 2 - Math.PI / 2;
      const list = groups[id];
      const spread = 0.35;
      list.forEach((r, ri) => {
        const offset = list.length === 1 ? 0 : (ri / (list.length - 1) - 0.5) * spread;
        const angle = baseAngle + offset;
        nodes.push({
          slug: r.slug,
          x: cx + Math.cos(angle) * repoRadius,
          y: cy + Math.sin(angle) * repoRadius,
          fed: id,
          title: r.title,
        });
      });
    });
    return nodes;
  }, [fedIds]);

  return (
    <div className="relative rounded-2xl border border-border/60 bg-card/40 backdrop-blur grid-bg overflow-hidden">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto">
        <defs>
          <radialGradient id="coreGlow">
            <stop offset="0%" stopColor="oklch(0.82 0.14 86)" stopOpacity="0.9" />
            <stop offset="100%" stopColor="oklch(0.82 0.14 86)" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="oklch(0.82 0.14 86)" stopOpacity="0.0" />
            <stop offset="50%" stopColor="oklch(0.82 0.14 86)" stopOpacity="0.7" />
            <stop offset="100%" stopColor="oklch(0.7 0.2 200)" stopOpacity="0.0" />
          </linearGradient>
        </defs>

        {/* halo central */}
        <circle cx={cx} cy={cy} r="160" fill="url(#coreGlow)" />

        {/* anillos */}
        <circle cx={cx} cy={cy} r={fedRadius} fill="none" stroke="oklch(1 0 0 / 0.06)" strokeDasharray="2 6" />
        <circle cx={cx} cy={cy} r={repoRadius} fill="none" stroke="oklch(1 0 0 / 0.05)" strokeDasharray="2 6" />

        {/* líneas kernel → federación */}
        {fedNodes.map((n) => (
          <line
            key={`k-${n.id}`}
            x1={cx}
            y1={cy}
            x2={n.x}
            y2={n.y}
            stroke="url(#lineGrad)"
            strokeWidth={hovered === n.id ? 2 : 1}
            className="animate-flow"
            style={{ strokeDasharray: "6 6" }}
          />
        ))}

        {/* líneas federación → repo */}
        {repoNodes.map((r) => {
          const f = fedNodes.find((n) => n.id === r.fed)!;
          const active = hovered === r.slug || hovered === r.fed;
          return (
            <line
              key={`f-${r.slug}`}
              x1={f.x}
              y1={f.y}
              x2={r.x}
              y2={r.y}
              stroke={f.color}
              strokeOpacity={active ? 0.9 : 0.25}
              strokeWidth={active ? 1.5 : 0.8}
            />
          );
        })}

        {/* kernel */}
        <g>
          <circle cx={cx} cy={cy} r="38" fill="oklch(0.13 0.012 270)" stroke="oklch(0.82 0.14 86)" strokeWidth="1.5" />
          <text x={cx} y={cy - 2} textAnchor="middle" className="fill-primary font-display" fontSize="22">
            ◉
          </text>
          <text x={cx} y={cy + 18} textAnchor="middle" className="fill-foreground font-mono" fontSize="9">
            KERNEL
          </text>
        </g>

        {/* federaciones */}
        {fedNodes.map((n) => {
          const f = FEDERATIONS[n.id];
          const active = hovered === n.id;
          return (
            <g
              key={n.id}
              onMouseEnter={() => setHovered(n.id)}
              onMouseLeave={() => setHovered(null)}
              style={{ cursor: "pointer" }}
            >
              <circle cx={n.x} cy={n.y} r={active ? 22 : 18} fill="oklch(0.17 0.015 270)" stroke={n.color} strokeWidth="1.5" />
              <text x={n.x} y={n.y + 4} textAnchor="middle" fill={n.color} fontSize="14" className="font-display">
                {f.sigil}
              </text>
              <text x={n.x} y={n.y + 36} textAnchor="middle" className="fill-muted-foreground font-mono uppercase" fontSize="8" letterSpacing="2">
                {f.id}
              </text>
            </g>
          );
        })}

        {/* repos */}
        {repoNodes.map((r) => {
          const f = fedNodes.find((n) => n.id === r.fed)!;
          const active = hovered === r.slug;
          return (
            <g
              key={r.slug}
              onMouseEnter={() => setHovered(r.slug)}
              onMouseLeave={() => setHovered(null)}
              style={{ cursor: "pointer" }}
            >
              <circle
                cx={r.x}
                cy={r.y}
                r={active ? 7 : 4.5}
                fill={f.color}
                className="animate-pulse-node"
                style={{ animationDelay: `${(r.x * 13) % 2400}ms` }}
              />
              {active && (
                <text x={r.x} y={r.y - 12} textAnchor="middle" className="fill-foreground font-mono" fontSize="10">
                  {r.title}
                </text>
              )}
            </g>
          );
        })}
      </svg>

      <div className="absolute bottom-4 left-4 text-[10px] font-mono text-muted-foreground uppercase tracking-widest">
        nexus · kernel → federación → repo · flujo en serie
      </div>
    </div>
  );
}
