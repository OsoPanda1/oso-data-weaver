import { useEffect, useMemo, useState } from "react";
import { FEDERATIONS, type FederationId } from "@/lib/ecosystem/contracts";
import { REPOS } from "@/lib/ecosystem/manifest";

const W = 900;
const H = 700;
const cx = W / 2;
const cy = H / 2;

type AtlasLedger = {
  eventCount: number;
  eventTypes: Record<string, number>;
  domains: Record<string, number>;
  hexagons: Record<string, number>;
  doctrine: Record<string, number>;
  territories: Record<string, number>;
};

function useAtlasLedger() {
  const [data, setData] = useState<AtlasLedger | null>(null);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch("/api/atlas/summary");
        if (!res.ok) throw new Error(`Atlas error: ${res.status}`);
        const json = (await res.json()) as AtlasLedger;
        if (!cancelled) setData(json);
      } catch (err) {
        if (!cancelled) setError(err as Error);
      }
    }

    load();

    const id = setInterval(load, 10_000); // refresco periódico
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  return { data, error };
}

export function NexusGraph() {
  const [hovered, setHovered] = useState<FederationId | null>(null);
  const { data: atlas } = useAtlasLedger();

  const fedIds = Object.keys(FEDERATIONS) as FederationId[];
  const baseFedRadius = 200;
  const repoRadius = 310;

  const fedNodes = useMemo(() => {
    return fedIds.map((id, i) => {
      const angle = (i / fedIds.length) * Math.PI * 2 - Math.PI / 2;

      const hexagon = FEDERATIONS[id].hexagon; // ej. "HE-Identity"
      const domain = FEDERATIONS[id].domain;   // ej. "HEP-7"

      const hexCount = atlas?.hexagons?.[hexagon] ?? 0;
      const domainCount = atlas?.domains?.[domain] ?? 0;

      const activityScore = hexCount + domainCount;
      const radiusBoost = Math.min(60, activityScore * 4);
      const r = baseFedRadius + radiusBoost;

      return {
        id,
        x: cx + Math.cos(angle) * r,
        y: cy + Math.sin(angle) * r,
        color: FEDERATIONS[id].color,
        hexagon,
        domain,
        activityScore,
      };
    });
  }, [fedIds, atlas]);

  const repoNodes = useMemo(() => {
    const nodes: Array<{
      slug: string;
      x: number;
      y: number;
      fed: FederationId;
      activityScore: number;
    }> = [];

    fedIds.forEach((id, fi) => {
      const baseAngle = (fi / fedIds.length) * Math.PI * 2 - Math.PI / 2;
      const list = REPOS.filter(
        (r) => r.federation === id && r.layer !== "kernel",
      );

      const hexagon = FEDERATIONS[id].hexagon;
      const hexCount = atlas?.hexagons?.[hexagon] ?? 0;
      const repoActivity = Math.max(1, hexCount);

      list.forEach((r, ri) => {
        const offset = (ri / (list.length || 1) - 0.5) * 0.4;
        const angle = baseAngle + offset;
        nodes.push({
          slug: r.slug,
          x: cx + Math.cos(angle) * repoRadius,
          y: cy + Math.sin(angle) * repoRadius,
          fed: id,
          activityScore: repoActivity,
        });
      });
    });

    return nodes;
  }, [fedIds, atlas]);

  const doctrineRanking = useMemo(() => {
    if (!atlas?.doctrine) return [];
    return Object.entries(atlas.doctrine)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
  }, [atlas]);

  return (
    <div className="relative w-full h-[700px] bg-[#050505] rounded-2xl border border-[#D4AF37]/20 overflow-hidden shadow-2xl">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full">
        <defs>
          <filter id="glow">
            <feGaussianBlur stdDeviation="2.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <linearGradient id="flowGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#D4AF37" stopOpacity="0" />
            <stop offset="50%" stopColor="#D4AF37" stopOpacity="1" />
            <stop offset="100%" stopColor="#D4AF37" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Conexiones kernel -> federaciones, ponderadas por actividad */}
        {fedNodes.map((n) => {
          const width = 1 + Math.min(4, n.activityScore / 5);
          const opacity = 0.2 + Math.min(0.6, n.activityScore / 20);
          return (
            <path
              key={`k-${n.id}`}
              d={`M ${cx} ${cy} Q ${cx} ${n.y} ${n.x} ${n.y}`}
              fill="none"
              stroke="url(#flowGrad)"
              strokeWidth={width}
              className="transition-opacity transition-[stroke-width]"
              style={{ opacity }}
            />
          );
        })}

        {/* Nodos federación con radio según actividad */}
        {fedNodes.map((n) => {
          const r = 16 + Math.min(12, n.activityScore / 3);
          return (
            <g
              key={n.id}
              onMouseEnter={() => setHovered(n.id)}
              onMouseLeave={() => setHovered(null)}
              className="cursor-pointer"
            >
              <circle
                cx={n.x}
                cy={n.y}
                r={r}
                fill="#050505"
                stroke={n.color}
                strokeWidth={2}
                filter="url(#glow)"
              />
              <text
                x={n.x}
                y={n.y + 4}
                textAnchor="middle"
                fill={n.color}
                className="font-bold text-[11px]"
              >
                {FEDERATIONS[n.id].sigil}
              </text>
            </g>
          );
        })}

        {/* Repos: brillo según actividad de su federación */}
        {repoNodes.map((r) => {
          const baseRadius = 3;
          const rExtra = Math.min(2, r.activityScore / 10);
          return (
            <circle
              key={r.slug}
              cx={r.x}
              cy={r.y}
              r={baseRadius + rExtra}
              fill={FEDERATIONS[r.fed].color}
              className="animate-pulse"
              style={{ animationDelay: `${Math.random() * 2000}ms` }}
            />
          );
        })}

        {/* Kernel central */}
        <circle
          cx={cx}
          cy={cy}
          r={40}
          fill="#1a1a1a"
          stroke="#D4AF37"
          strokeWidth={2}
          filter="url(#glow)"
        />
        <text
          x={cx}
          y={cy + 6}
          textAnchor="middle"
          fill="#D4AF37"
          className="font-mono font-bold text-[12px]"
        >
          KERNEL
        </text>
      </svg>

      {/* Panel de federación con datos del Atlas */}
      {hovered ? (
        <div className="absolute top-6 right-6 p-6 bg-black/90 border border-[#D4AF37] text-[#D4AF37] backdrop-blur-md rounded-lg transition-opacity max-w-xs">
          <h3 className="text-xs tracking-[0.3em] uppercase">
            {FEDERATIONS[hovered].name}
          </h3>
          <p className="text-[10px] mt-2 opacity-70 uppercase">
            {FEDERATIONS[hovered].mission}
          </p>

          {atlas ? (
            <div className="mt-3 text-[10px] space-y-1">
              <p className="opacity-70">
                Eventos totales:{" "}
                <span className="font-mono">
                  {atlas.eventCount.toLocaleString()}
                </span>
              </p>
              <p className="opacity-70">
                Hexágono:{" "}
                <span className="font-mono">
                  {FEDERATIONS[hovered].hexagon}
                </span>{" "}
                (
                {atlas.hexagons[FEDERATIONS[hovered].hexagon] ?? 0}
                )
              </p>
              <p className="opacity-70">
                Dominio:{" "}
                <span className="font-mono">
                  {FEDERATIONS[hovered].domain}
                </span>{" "}
                (
                {atlas.domains[FEDERATIONS[hovered].domain] ?? 0}
                )
              </p>
            </div>
          ) : null}
        </div>
      ) : null}

      {/* Panel doctrinal global */}
      {atlas && doctrineRanking.length > 0 ? (
        <div className="absolute bottom-4 right-6 p-4 bg-black/70 border border-[#D4AF37]/40 text-[#D4AF37] backdrop-blur-md rounded-lg">
          <h4 className="text-[10px] uppercase tracking-[0.2em] opacity-80">
            Atlas Doctrinal
          </h4>
          <ul className="mt-2 space-y-1 text-[10px] font-mono">
            {doctrineRanking.map(([tag, count]) => (
              <li key={tag} className="flex justify-between gap-4">
                <span>{tag}</span>
                <span>{count}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
