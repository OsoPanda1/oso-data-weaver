import {
  useEffect,
  useState,
  useRef,
  useCallback,
  useMemo,
  type MutableRefObject,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CONTRACT_VERSION,
  FEDERATIONS,
  type FederationId,
} from "@/lib/ecosystem/contracts";

// --- Tipos Centrales del Contrato ---

interface LiveEvent {
  id: string;
  type: string;
  origin: FederationId;
  note: string;
  ts: string;
  hash: string; // Firma corta visual / trazabilidad
}

type BookPiEvent = {
  header: {
    id: string;
    type: string;
    createdAt: string;
    source: string;
    repository: string;
    protocol: string;
    he_hep_context: { hexagon: string; domain: string };
  };
  payload: any;
  meta?: {
    doctrine?: string;
    doctrineTags?: string[];
    territory?: string;
    [key: string]: any;
  };
};

type BookPiResponse = { events: BookPiEvent[] };

type ConnectionState =
  | "connecting"
  | "live"
  | "degraded"
  | "disconnected"
  | "idle";

interface EventStreamProps {
  max?: number;
  refreshMs?: number;
  degradedRefreshMs?: number;
}

// ---------- Utilidad: seguro contra fugas ----------

function safeAbort(ref: MutableRefObject<AbortController | null>) {
  if (ref.current) {
    ref.current.abort();
    ref.current = null;
  }
}

// ---------- Componente principal ----------

export function EventStream({
  max = 12,
  refreshMs = 5000,
  degradedRefreshMs = 10000,
}: EventStreamProps) {
  const [events, setEvents] = useState<LiveEvent[]>([]);
  const [status, setStatus] = useState<ConnectionState>("connecting");
  const [lastSync, setLastSync] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Mapeo seguro con deduplicación y hashing rápido
  const processIncomingEvents = useCallback(
    (rawEvents: BookPiEvent[]) => {
      setEvents((prev) => {
        const newEvents = mapBookPiToLiveEvents(rawEvents);
        if (newEvents.length === 0 && prev.length === 0) return prev;

        // Fusión con deduplicación determinista (O(n)), preservando orden temporal
        const merged = [...newEvents, ...prev];
        const uniqueMap = new Map<string, LiveEvent>();
        for (const e of merged) {
          if (!uniqueMap.has(e.id)) uniqueMap.set(e.id, e);
        }

        const unique = Array.from(uniqueMap.values())
          .sort(
            (a, b) =>
              new Date(b.ts).getTime() - new Date(a.ts).getTime(),
          )
          .slice(0, max);

        return unique;
      });
    },
    [max],
  );

  // Pequeña telemetría de ritmo de eventos
  const eventsPerMinute = useMemo(() => {
    if (events.length < 2) return 0;
    const latest = new Date(events[0].ts).getTime();
    const oldest = new Date(
      events[Math.min(events.length - 1, max - 1)].ts,
    ).getTime();
    const deltaMs = latest - oldest || 1;
    const perMinute = (events.length / deltaMs) * 60_000;
    return Number.isFinite(perMinute) ? perMinute : 0;
  }, [events, max]);

  useEffect(() => {
    let cancelled = false;

    const scheduleNext = (ms: number) => {
      if (cancelled) return;
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(syncLedger, ms);
    };

    const syncLedger = async () => {
      if (cancelled) return;

      // Abortar petición previa si quedó colgada (previene fugas y race conditions)
      safeAbort(abortControllerRef);
      abortControllerRef.current = new AbortController();

      try {
        const res = await fetch(`/api/bookpi/events?limit=${max}`, {
          signal: abortControllerRef.current.signal,
          headers: {
            "Cache-Control": "no-cache",
          },
        });

        if (!res.ok) {
          throw new Error(`TAMV-Sync-Error: HTTP ${res.status}`);
        }

        const json = (await res.json()) as BookPiResponse;
        processIncomingEvents(json.events);
        setStatus("live");
        setLastSync(new Date().toISOString());

        // Polling programado SOLO si la petición anterior tuvo éxito
        scheduleNext(refreshMs);
      } catch (error: any) {
        if (cancelled) return;
        if (error?.name === "AbortError") {
          // Cancelación intencional, no cambiamos estado
          return;
        }

        console.error("[TAMV Ledger] Degradación detectada:", error?.message);
        setStatus((prev) => (prev === "connecting" ? "degraded" : prev));
        // Exponential backoff simple: no saturar red caída
        scheduleNext(degradedRefreshMs);
      }
    };

    // Primer sync con un ligero delay para evitar spikes al montar muchas vistas
    scheduleNext(500);

    return () => {
      cancelled = true;
      safeAbort(abortControllerRef);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      setStatus("disconnected");
    };
  }, [max, refreshMs, degradedRefreshMs, processIncomingEvents]);

  // UI Components
  const StatusIndicator = () => {
    const config = {
      live: {
        color: "bg-emerald-500",
        label: "Ledger Sincronizado",
        pulse: true,
      },
      degraded: {
        color: "bg-amber-500",
        label: "Red Degradada",
        pulse: false,
      },
      connecting: {
        color: "bg-blue-500",
        label: "Estableciendo Consenso",
        pulse: true,
      },
      disconnected: {
        color: "bg-red-500",
        label: "Desconectado",
        pulse: false,
      },
      idle: {
        color: "bg-muted",
        label: "Atlas en reposo",
        pulse: false,
      },
    }[status];

    return (
      <div className="flex items-center gap-2">
        <span
          className={`size-2 rounded-full ${
            config.color
          } ${config.pulse ? "animate-pulse" : ""}`}
        />
        <span className="font-display text-xs tracking-wide text-foreground/80 uppercase">
          {config.label}
        </span>
      </div>
    );
  };

  const eventsCountLabel = `${events.length}/${max} EVT`;

  const epmLabel =
    eventsPerMinute > 0
      ? `${eventsPerMinute.toFixed(1)} evt/min`
      : "0.0 evt/min";

  return (
    <div className="rounded-xl border border-border/40 bg-background/40 backdrop-blur-md overflow-hidden shadow-2xl shadow-black/10">
      {/* Cabecera del Kernel */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-border/40 bg-card/20">
        <StatusIndicator />
        <div className="flex gap-3 items-center">
          <span className="font-mono text-[10px] px-2 py-1 rounded bg-muted/50 text-muted-foreground border border-border/50">
            {eventsCountLabel}
          </span>
          <span className="font-mono text-[10px] px-2 py-1 rounded bg-muted/30 text-muted-foreground border border-border/40">
            {epmLabel}
          </span>
          <span className="font-mono text-[10px] text-muted-foreground">
            tamv-k5 v{CONTRACT_VERSION}
          </span>
        </div>
      </div>

      {/* Lista de Eventos con Animación Fluida */}
      <ul className="divide-y divide-border/20 max-h-[480px] overflow-auto scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
        <AnimatePresence mode="popLayout">
          {events.map((e) => {
            const f = FEDERATIONS[e.origin];
            if (!f) return null;

            return (
              <motion.li
                layout
                initial={{
                  opacity: 0,
                  x: -16,
                  backgroundColor: "rgba(212, 175, 55, 0.04)",
                }}
                animate={{
                  opacity: 1,
                  x: 0,
                  backgroundColor: "transparent",
                }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
                key={e.id}
                className="px-5 py-3 flex items-start gap-4 hover:bg-muted/20 transition-colors group"
              >
                {/* Indicador de Federación */}
                <div className="relative mt-1.5 flex items-center justify-center">
                  <span
                    className="absolute size-3 rounded-full opacity-40 group-hover:animate-ping"
                    style={{ background: f.color }}
                  />
                  <span
                    className="relative size-2 rounded-full shadow-sm"
                    style={{
                      background: f.color,
                      boxShadow: `0 0 10px ${f.color}`,
                    }}
                  />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between mb-0.5">
                    <div className="flex items-center gap-2 text-[11px] font-mono tracking-tight">
                      <span className="text-foreground/90 font-medium">
                        {e.type}
                      </span>
                      <span className="text-muted-foreground/40">/</span>
                      <span
                        style={{ color: f.color }}
                        className="font-bold"
                      >
                        {f.id}
                      </span>
                      <span className="text-muted-foreground/50">
                        #{e.hash}
                      </span>
                    </div>
                    {/* Timestamp formateado a nivel sistema */}
                    <span className="font-mono text-[10px] text-muted-foreground/70 shrink-0">
                      {new Date(e.ts)
                        .toISOString()
                        .split("T")[1]
                        ?.replace("Z", "")}
                    </span>
                  </div>
                  <div className="text-sm text-muted-foreground truncate font-sans">
                    {e.note}
                  </div>
                </div>
              </motion.li>
            );
          })}
        </AnimatePresence>

        {events.length === 0 && status === "live" && (
          <motion.li
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="px-5 py-8 text-center text-xs text-muted-foreground font-mono"
          >
            SISTEMA EN ESPERA: No hay transacciones en el BookPI.
          </motion.li>
        )}

        {events.length === 0 && status === "connecting" && (
          <motion.li
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="px-5 py-8 text-center text-xs text-muted-foreground font-mono"
          >
            INICIALIZANDO: Sincronizando ledger con el kernel TAMV-K5…
          </motion.li>
        )}
      </ul>

      {/* Pie opcional: última sincronización */}
      {lastSync && (
        <div className="px-5 py-2 border-t border-border/30 bg-card/10">
          <span className="font-mono text-[10px] text-muted-foreground">
            Última sincronización: {lastSync}
          </span>
        </div>
      )}
    </div>
  );
}

// ---------- Helpers Refactorizados (Puros y Seguros) ----------

function mapBookPiToLiveEvents(events: BookPiEvent[]): LiveEvent[] {
  return events
    .map((e): LiveEvent | null => {
      const heContext = e.header?.he_hep_context;
      if (!heContext) return null;

      const origin = mapHexDomainToFederation(
        heContext.hexagon,
        heContext.domain,
      );
      if (!origin) return null;

      const doctrineTags = e.meta?.doctrineTags ?? [];
      const doctrine = e.meta?.doctrine;

      const note =
        doctrineTags.length > 0
          ? `Contrato: ${doctrineTags.join(", ")}`
          : doctrine
          ? `Doctrina: ${doctrine}`
          : e.payload?.note ||
            e.payload?.summary ||
            `Tx ejecutada en ${e.header.repository}`;

      return {
        id: e.header.id,
        type: e.header.type,
        origin,
        note,
        ts: e.header.createdAt,
        hash: e.header.id.slice(-8),
      };
    })
    .filter((e): e is LiveEvent => e !== null);
}

function mapHexDomainToFederation(
  hexagon: string,
  domain: string,
): FederationId | null {
  const entries = Object.entries(FEDERATIONS) as Array<
    [FederationId, (typeof FEDERATIONS)[FederationId]]
  >;

  // Búsqueda estricta primero
  const exact = entries.find(
    ([, f]) => f.hexagon === hexagon && f.domain === domain,
  );
  if (exact) return exact[0];

  // Fallback a nivel de hexágono
  const byHex = entries.find(([, f]) => f.hexagon === hexagon);
  if (byHex) return byHex[0];

  return null;
}
