import { Button } from "@/components/ui/button";
import logoCelebrei from "@/assets/logo-celebrei-1.png";

interface HubHeaderProps {
  onOpenWizard?: () => void;
}

export default function HubHeader({ onOpenWizard }: HubHeaderProps) {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-white/[0.06] bg-[hsl(225_35%_10%/0.85)] backdrop-blur-3xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <img src={logoCelebrei} alt="Celebrei" className="h-8 w-auto" />
          <span className="font-display text-lg sm:text-xl font-bold text-white tracking-tight">
            Celebrei
          </span>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={onOpenWizard}
            className="hidden sm:inline-flex text-white/60 hover:text-white hover:bg-white/10 text-sm"
          >
            Saiba mais
          </Button>
          <Button
            onClick={onOpenWizard}
            size="sm"
            className="rounded-full font-semibold bg-white text-[hsl(225_35%_10%)] hover:bg-white/90 px-5 shadow-[0_0_20px_rgba(255,255,255,0.1)]"
          >
            Começar agora
          </Button>
        </div>
      </div>
    </header>
  );
}
