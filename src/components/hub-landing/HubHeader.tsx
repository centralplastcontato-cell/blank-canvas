import { Button } from "@/components/ui/button";
import logoCelebrei from "@/assets/logo-celebrei-1.png";

interface HubHeaderProps {
  onOpenWizard?: () => void;
}

export default function HubHeader({ onOpenWizard }: HubHeaderProps) {

  return (
    <header className="sticky top-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img src={logoCelebrei} alt="Celebrei" className="h-9 w-auto" />
          <span className="font-display text-xl font-bold text-foreground tracking-tight">
            Celebrei
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={onOpenWizard}
            className="hidden sm:inline-flex"
          >
            Diagnóstico gratuito
          </Button>
          <Button
            onClick={onOpenWizard}
            size="sm"
            className="rounded-xl font-semibold"
          >
            Começar agora
          </Button>
        </div>
      </div>
    </header>
  );
}
