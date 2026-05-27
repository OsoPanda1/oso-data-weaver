import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FEDERATIONS, type FederationId } from "@/lib/ecosystem/contracts";
import { REPOS } from "@/lib/ecosystem/manifest";

const W = 900;
const H = 700;
const cx = W / 2;
const cy = H / 2;

export function NexusGraph() {
  const [hovered, setHovered] = useState<string | null>(null);

  const fedIds = Object.keys(FEDERATIONS) as FederationId[];
  const fedRadius = 200;
  const repoRadius = 310;

  const fedNodes = useMemo(() => fedIds.map((id, i) => {
    const angle = (i / fedIds.length) * Math.PI * 2 - Math.PI / 2;
    return { id, x: cx + Math.cos(angle) * fedRadius, y: cy + Math.sin(angle) * fedRadius, color: FEDERATIONS[id].color };
  }), [fedIds]);

  const repoNodes = useMemo(() => {
    const nodes: any[] = [];
    fedIds.forEach((id, fi) => {
      const baseAngle = (fi / fedIds.length) * Math.PI * 2 - Math.PI / 2;
      const list = REPOS.filter((r) => r.federation === id && r.layer !== "kernel");
      list.forEach((r, ri) => {
        const offset = (ri / (list.length || 1) - 0.5) * 0.4;
        const angle = baseAngle + offset;
        nodes.push({ ...r, x: cx + Math.cos(angle) * repoRadius, y: cy + Math.sin(angle) * repoRadius, fed: id });
      });
    });
    return nodes;
  }, [fedIds]);

  return (
    <div className="relative w-full h-[700px] bg-[#050505] rounded-2xl border border-[#D4AF37]/20 overflow-hidden shadow-2xl">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full">
        <defs>
          <filter id="glow"><feGaussianBlur stdDeviation="2.5" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
          <linearGradient id="flowGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#D4AF37" stopOpacity="0" />
            <stop offset="50%" stopColor="#D4AF37" stopOpacity="1" />
            <stop offset="100%" stopColor="#D4AF37" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Conexiones Curvas (Bezier) */}
        {fedNodes.map(n => (
          <path key={`k-${n.id}`} d={`M ${cx} ${cy} Q ${cx} ${n.y} ${n.x} ${n.y}`} fill="none" stroke="url(#flowGrad)" strokeWidth="1" className="opacity-40" />
        ))}

        {/* Nodos de Federaciones */}
        {fedNodes.map(n => (
          <g key={n.id} onMouseEnter={() => setHovered(n.id)} onMouseLeave={() => setHovered(null)} className="cursor-pointer">
            <circle cx={n.x} cy={n.y} r={20} fill="#050505" stroke={n.color} strokeWidth="2" filter="url(#glow)" />
            <text x={n.x} y={n.y + 6} textAnchor="middle" fill={n.color} className="font-bold text-[12px]">{FEDERATIONS[n.id].sigil}</text>
          </g>
        ))}

        {/* Nodos Repos */}
        {repoNodes.map(r => (
          <circle key={r.slug} cx={r.x} cy={r.y} r={4} fill={FEDERATIONS[r.fed].color} className="animate-pulse" style={{ animationDelay: `${Math.random() * 2000}ms` }} />
        ))}

        {/* Kernel Central */}
        <circle cx={cx} cy={cy} r={40} fill="#1a1a1a" stroke="#D4AF37" strokeWidth="2" filter="url(#glow)" />
        <text x={cx} y={cy + 6} textAnchor="middle" fill="#D4AF37" className="font-mono font-bold text-[12px]">KERNEL</text>
      </svg>

      {/* Telemetría Dinámica */}
      <AnimatePresence>
        {hovered && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} 
            className="absolute top-6 right-6 p-6 bg-black/90 border border-[#D4AF37] text-[#D4AF37] backdrop-blur-md rounded-lg">
            <h3 className="text-xs tracking-[0.3em] uppercase">{hovered}</h3>
            <p className="text-[10px] mt-2 opacity-70 uppercase">Estado del nodo: operativo</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
