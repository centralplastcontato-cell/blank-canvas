import logoCelebrei from "@/assets/logo-celebrei-1.png";
import { Instagram } from "lucide-react";

export default function HubFooter() {
  return (
    <footer className="border-t border-border/40 py-10 bg-muted/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <img src={logoCelebrei} alt="Celebrei" className="h-7 w-auto opacity-60" />
          <div>
            <span className="font-display text-sm font-semibold text-muted-foreground block">Celebrei</span>
            <span className="text-[10px] text-muted-foreground/60">Plataforma #1 para buffets infantis</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <a
            href="https://www.instagram.com/celebrei.app"
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground/60 hover:text-primary transition-colors"
          >
            <Instagram className="h-4 w-4" />
          </a>
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} Celebrei. Todos os direitos reservados.
          </p>
        </div>
      </div>
    </footer>
  );
}
