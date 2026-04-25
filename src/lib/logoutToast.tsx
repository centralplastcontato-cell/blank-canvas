import { toast } from "sonner";
import { LogOut, CheckCircle2 } from "lucide-react";

/**
 * Toast premium para logout realizado.
 * Layout maior, com ícone, gradiente e mensagem acolhedora.
 */
export function showLogoutToast() {
  toast.custom(
    (t) => (
      <div className="w-[380px] max-w-[92vw] overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-br from-background via-background to-primary/5 shadow-2xl">
        {/* Faixa superior */}
        <div className="h-1 w-full bg-gradient-to-r from-primary via-primary/70 to-primary/40" />

        <div className="flex gap-4 p-5">
          {/* Ícone */}
          <div className="relative shrink-0">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 ring-1 ring-primary/20">
              <LogOut className="h-6 w-6 text-primary" />
            </div>
            <div className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-background ring-2 ring-background">
              <CheckCircle2 className="h-5 w-5 text-emerald-500" fill="currentColor" stroke="white" strokeWidth={2} />
            </div>
          </div>

          {/* Conteúdo */}
          <div className="min-w-0 flex-1 space-y-1">
            <p className="text-base font-bold text-foreground leading-tight">
              Sessão encerrada com segurança
            </p>
            <p className="text-sm text-muted-foreground leading-snug">
              Até logo! Você saiu da sua conta. Foi ótimo ter você por aqui — volte sempre que precisar. 👋
            </p>
            <button
              onClick={() => toast.dismiss(t)}
              className="mt-2 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
            >
              Fechar
            </button>
          </div>
        </div>
      </div>
    ),
    { duration: 5000 }
  );
}
