import { useEffect, useState } from "react";
import { SAMPLE_EVENTS } from "@/lib/ecosystem/manifest";
import { CONTRACT_VERSION, FEDERATIONS, type FederationId } from "@/lib/ecosystem/contracts";

interface LiveEvent {
  id: string;
  type: string;
  origin: FederationId;
  note: string;
  ts: string;
}

function rand() {
  return Math.random().toString(36).slice(2, 8);
}

export function EventStream({ max = 12 }: { max?: number }) {
  const [events, setEvents] = useState<LiveEvent[]>(() =>
    SAMPLE_EVENTS.slice(0, 6).map((e) => ({
      ...e,
      id: rand(),
      ts: new Date(Date.now() - Math.random() * 60_000).toISOString(),
    })),
  );

  useEffect(() => {
    const t = setInterval(() => {
      const e = SAMPLE_EVENTS[Math.floor(Math.random() * SAMPLE_EVENTS.length)];
      setEvents((prev) =>
        [
          { ...e, id: rand(), ts: new Date().toISOString() },
          ...prev,
        ].slice(0, max),
      );
    }, 3200);
    return () => clearInterval(t);
  }, [max]);

  return (
    <div className="rounded-xl border border-border/60 bg-card/60 backdrop-blur overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
        <div className="flex items-center gap-2">
          <span className="size-2 rounded-full bg-accent animate-pulse-node" />
          <span className="font-display text-sm">BookPI · ledger en vivo</span>
        </div>
        <span className="font-mono text-[10px] text-muted-foreground">contracts v{CONTRACT_VERSION}</span>
      </div>
      <ul className="divide-y divide-border/40 max-h-[420px] overflow-auto">
        {events.map((e) => {
          const f = FEDERATIONS[e.origin];
          return (
            <li key={e.id} className="px-4 py-2.5 flex items-start gap-3 hover:bg-muted/30 transition-colors">
              <span
                className="mt-1 size-2 rounded-full shrink-0"
                style={{ background: f.color, boxShadow: `0 0 8px ${f.color}` }}
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 text-[11px] font-mono">
                  <span className="text-accent">{e.type}</span>
                  <span className="text-muted-foreground">·</span>
                  <span style={{ color: f.color }}>{f.id}</span>
                </div>
                <div className="text-sm text-foreground/90 truncate">{e.note}</div>
              </div>
              <span className="font-mono text-[10px] text-muted-foreground shrink-0">
                {new Date(e.ts).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
