import logoCelebrei from "@/assets/logo-celebrei-1.png";

export default function HubFooter() {
  return (
    <footer className="border-t border-border/40 py-10 bg-muted/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <img src={logoCelebrei} alt="Celebrei" className="h-7 w-auto opacity-60" />
          <span className="font-display text-sm font-semibold text-muted-foreground">Celebrei</span>
        </div>
        <p className="text-xs text-muted-foreground">
          © {new Date().getFullYear()} Celebrei. Todos os direitos reservados.
        </p>
      </div>
    </footer>
  );
}
