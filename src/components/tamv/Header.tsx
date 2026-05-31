import { Link } from "@tanstack/react-router";

const NAV = [
  { to: "/", label: "Home" },
  { to: "/kernel", label: "Kernel" },
  { to: "/atlas", label: "Atlas" },
  { to: "/mdx5", label: "MD-X5" },
  { to: "/korima", label: "Korima" },
  { to: "/rdm", label: "RDM-TOS" },
  { to: "/eoct", label: "EOCT" },
  { to: "/repos", label: "Repos" },
  { to: "/contracts", label: "Contratos" },
  { to: "/bookpi", label: "BookPI" },
  { to: "/config", label: "Config" },
] as const;

export function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-border/40 backdrop-blur-xl bg-background/70">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <Link to="/" className="flex items-center gap-3 group">
          <div className="relative">
            <div className="size-8 rounded-md border-elite flex items-center justify-center font-display font-bold text-primary">
              ◉
            </div>
            <div className="absolute inset-0 rounded-md glow-accent opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
          <div className="leading-tight">
            <div className="font-display font-semibold text-sm tracking-wider">
              TAMV<span className="text-primary"> · </span>CORE KERNEL
            </div>
            <div className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
              Heptafederación · MD-X4
            </div>
          </div>
        </Link>

        <nav className="flex items-center gap-1">
          {NAV.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              activeOptions={{ exact: n.to === "/" }}
              className="px-3 py-1.5 text-sm font-medium text-muted-foreground rounded-md transition-colors hover:text-foreground hover:bg-muted/40"
              activeProps={{ className: "text-primary bg-muted/40" }}
            >
              {n.label}
            </Link>
          ))}
          <a
            href="https://github.com/OsoPanda1"
            target="_blank"
            rel="noreferrer"
            className="ml-2 px-3 py-1.5 text-xs font-mono text-muted-foreground hover:text-primary transition-colors"
          >
            github ↗
          </a>
        </nav>
      </div>
    </header>
  );
}
