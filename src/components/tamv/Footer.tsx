export function Footer() {
  return (
    <footer className="border-t border-border/40 mt-32">
      <div className="mx-auto max-w-7xl px-6 py-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 text-xs text-muted-foreground font-mono">
        <div>
          <div className="text-foreground font-display tracking-wider">TAMV ONLINE NETWORK</div>
          <div>Pioneros en tecnología latinoamericana — Orgullosamente Mexicanos.</div>
          <div className="mt-1">CEO Fundador · Edwin O. Castillo Trejo · Pachuca, Hidalgo</div>
        </div>
        <div className="flex flex-col md:items-end gap-1">
          <div>contratos v1.0.0 · 7/7 federaciones</div>
          <div>core → dominios → deploy</div>
        </div>
      </div>
    </footer>
  );
}
