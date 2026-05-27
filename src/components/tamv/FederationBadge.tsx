import { FEDERATIONS, type FederationId } from "@/lib/ecosystem/contracts";
import { Link } from "@tanstack/react-router";

export function FederationBadge({ id, asLink = true }: { id: FederationId; asLink?: boolean }) {
  const f = FEDERATIONS[id];
  const content = (
    <span
      className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-mono uppercase tracking-wider transition-colors"
      style={{
        borderColor: `color-mix(in oklab, ${f.color} 50%, transparent)`,
        color: f.color,
        background: `color-mix(in oklab, ${f.color} 10%, transparent)`,
      }}
    >
      <span aria-hidden>{f.sigil}</span>
      {f.id}
    </span>
  );
  if (!asLink) return content;
  return (
    <Link to="/federations/$id" params={{ id }} className="hover:opacity-80">
      {content}
    </Link>
  );
}
