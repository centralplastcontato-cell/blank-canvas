import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { DuplicateMatch } from "@/hooks/useDuplicatePaymentCheck";

const METHOD_LABELS: Record<string, string> = {
  pix: "PIX",
  dinheiro: "Dinheiro",
  cartao_credito: "Cartão de Crédito",
  cartao_debito: "Cartão de Débito",
  cartao: "Cartão",
  transferencia: "Transferência",
  cheque: "Cheque",
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  matches: DuplicateMatch[];
  amount: number;
  onConfirm: () => void;
}

export function DuplicatePaymentWarningDialog({ open, onOpenChange, matches, amount, onConfirm }: Props) {
  const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const safeDate = (s: string) => {
    try {
      return format(new Date(s), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
    } catch {
      return s;
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-lg">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-amber-600 dark:text-amber-500">
            <AlertTriangle className="h-5 w-5" />
            Possível pagamento duplicado!
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3 pt-2">
              <p className="text-sm text-foreground">
                Um pagamento de <span className="font-bold text-foreground">{fmt(amount)}</span> já foi lançado recentemente em{" "}
                <span className="font-semibold">{matches.length === 1 ? "outra festa" : `${matches.length} outras festas`}</span>:
              </p>

              <div className="space-y-2 max-h-[260px] overflow-y-auto">
                {matches.map((m) => (
                  <div
                    key={`${m.event_id}-${m.paid_at}`}
                    className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3"
                  >
                    <p className="font-semibold text-sm text-foreground">{m.event_title}</p>
                    <div className="text-xs text-muted-foreground mt-1 space-y-0.5">
                      <p>📅 Festa em {format(new Date(m.event_date + "T12:00:00"), "dd/MM/yyyy", { locale: ptBR })}</p>
                      <p>💰 {fmt(m.amount)} {m.payment_method ? `• ${METHOD_LABELS[m.payment_method] || m.payment_method}` : ""}</p>
                      <p>🕒 Lançado em {safeDate(m.paid_at)}</p>
                    </div>
                  </div>
                ))}
              </div>

              <p className="text-sm text-muted-foreground">
                Tem certeza que este pagamento é <strong>diferente</strong> e deve ser registrado nesta festa também?
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="bg-amber-600 hover:bg-amber-700 text-white"
          >
            Sim, é diferente — registrar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
