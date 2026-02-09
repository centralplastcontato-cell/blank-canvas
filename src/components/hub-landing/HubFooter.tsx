import { Sparkles } from "lucide-react";

export default function HubFooter() {
  return (
    <footer className="border-t border-border/40 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <span className="font-display text-sm font-semibold text-foreground">Celebrei</span>
        </div>
        <p className="text-xs text-muted-foreground">
          © {new Date().getFullYear()} Celebrei. Todos os direitos reservados.
        </p>
      </div>
    </footer>
  );
}
