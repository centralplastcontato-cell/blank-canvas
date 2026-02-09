import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";

export default function HubHeader() {
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
            <Sparkles className="h-5 w-5 text-primary" />
          </div>
          <span className="font-display text-xl font-bold text-foreground tracking-tight">
            Celebrei
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/comercial-b2b")}
            className="hidden sm:inline-flex"
          >
            Contato
          </Button>
          <Button
            onClick={() => navigate("/hub-login")}
            size="sm"
            className="rounded-xl font-semibold"
          >
            Acessar Hub
          </Button>
        </div>
      </div>
    </header>
  );
}
