import { FEDERATIONS, type FederationId } from '@/lib/ecosystem/contracts';
import { Link } from '@tanstack/react-router';

interface FederationBadgeProps {
  id: FederationId;
  asLink?: boolean;
  'aria-label'?: string;
}

export function FederationBadge({
  id,
  asLink = true,
  'aria-label': ariaLabel,
}: FederationBadgeProps) {
  const f = FEDERATIONS[id];

  if (!f) {
    // Falla segura: no revienta el árbol si el id es inválido
    return null;
  }

  const label =
    ariaLabel ??
    `Federación ${f.id}${f.name ? ` — ${f.name}` : ''}`;

  const content = (
    <span
      className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-mono uppercase tracking-wider transition-colors"
      style={{
        // Fallback sólido para navegadores sin color-mix/oklab
        borderColor: f.color,
        color: f.color,
        backgroundColor: 'rgba(0,0,0,0.02)',
        // Mejora progresiva: color-mix con oklab si está soportado
        backgroundImage: `linear-gradient(
          to right,
          color-mix(in oklab, ${f.color} 10%, transparent),
          color-mix(in oklab, ${f.color} 5%, transparent)
        )`,
      }}
      aria-label={label}
    >
      <span aria-hidden>{f.sigil}</span>
      <span>{f.id}</span>
    </span>
  );

  if (!asLink) return content;

  return (
    <Link
      to="/federations/$id"
      params={{ id }}
      className="hover:opacity-80 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[color:var(--color-accent,_#38bdf8)] rounded-full"
      aria-label={label}
    >
      {content}
    </Link>
  );
}
