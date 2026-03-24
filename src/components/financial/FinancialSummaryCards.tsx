import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DollarSign, TrendingDown, CheckCircle } from "lucide-react";
import type { FinancialSummary } from "@/hooks/useEventFinancial";

const STATUS_CONFIG = {
  pago: { label: "Pago", emoji: "🟢", color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" },
  parcial: { label: "Parcial", emoji: "🟡", color: "bg-amber-500/20 text-amber-400 border-amber-500/30" },
  atrasado: { label: "Atrasado", emoji: "🔴", color: "bg-red-500/20 text-red-400 border-red-500/30" },
  pendente: { label: "Pendente", emoji: "⚪", color: "bg-muted text-muted-foreground border-border" },
};

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

interface Props {
  summary: FinancialSummary;
  showValues?: boolean;
}

export function FinancialSummaryCards({ summary, showValues = true }: Props) {
  const status = STATUS_CONFIG[summary.status];

  return (
    <div className="space-y-2">
      {/* Main row: Total + Recebido */}
      <div className="grid grid-cols-2 gap-2">
        <Card className="p-3 bg-card border-border/40 shadow-sm">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
            <DollarSign className="h-3.5 w-3.5" /> Valor Total
          </div>
          <p className="text-lg font-bold text-foreground">
            {showValues ? formatCurrency(summary.totalAmount) : "••••"}
          </p>
        </Card>
        <Card className="p-3 bg-card border-border/40 shadow-sm">
          <div className="flex items-center gap-2 text-xs text-emerald-400/80 mb-1">
            <CheckCircle className="h-3.5 w-3.5" /> Recebido
          </div>
          <p className="text-lg font-bold text-emerald-400">
            {showValues ? formatCurrency(summary.receivedAmount) : "••••"}
          </p>
        </Card>
      </div>

      {/* Highlighted row: Pendente (hero card) + Status */}
      <div className="grid grid-cols-3 gap-2">
        <Card className={`col-span-2 p-3 shadow-sm relative overflow-hidden border ${
          summary.status === "atrasado"
            ? "border-red-500/30 bg-red-500/[0.04]"
            : summary.status === "parcial"
            ? "border-amber-500/30 bg-amber-500/[0.04]"
            : summary.status === "pago"
            ? "border-emerald-500/30 bg-emerald-500/[0.04]"
            : "border-border/40 bg-card"
        }`}>
          {summary.pendingAmount > 0 && (
            <div className="absolute inset-0 bg-gradient-to-r from-transparent to-amber-500/[0.03] pointer-events-none" />
          )}
          <div className="relative">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
              <TrendingDown className="h-3.5 w-3.5" /> Pendente
            </div>
            <p className={`text-xl font-extrabold ${
              summary.status === "atrasado"
                ? "text-red-400"
                : summary.status === "parcial"
                ? "text-amber-400"
                : summary.status === "pago"
                ? "text-emerald-400"
                : "text-amber-400"
            }`}>
              {showValues ? formatCurrency(summary.pendingAmount) : "••••"}
            </p>
          </div>
        </Card>
        <Card className="p-3 bg-card border-border/40 shadow-sm flex items-center justify-center">
          <Badge className={`text-sm px-3 py-1.5 font-semibold ${status.color}`}>
            {status.emoji} {status.label}
          </Badge>
        </Card>
      </div>
    </div>
  );
}
