import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DollarSign, TrendingUp, TrendingDown, CheckCircle } from "lucide-react";
import type { FinancialSummary } from "@/hooks/useEventFinancial";

const STATUS_CONFIG = {
  pago: { label: "Pago", color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" },
  parcial: { label: "Parcial", color: "bg-amber-500/20 text-amber-400 border-amber-500/30" },
  atrasado: { label: "Atrasado", color: "bg-red-500/20 text-red-400 border-red-500/30" },
  pendente: { label: "Pendente", color: "bg-muted text-muted-foreground border-border" },
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
    <div className="grid grid-cols-2 gap-2">
      <Card className="p-3 bg-card border-border">
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
          <DollarSign className="h-3.5 w-3.5" /> Valor Total
        </div>
        <p className="text-lg font-bold text-foreground">
          {showValues ? formatCurrency(summary.totalAmount) : "••••"}
        </p>
      </Card>
      <Card className="p-3 bg-card border-border">
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
          <CheckCircle className="h-3.5 w-3.5" /> Recebido
        </div>
        <p className="text-lg font-bold text-emerald-400">
          {showValues ? formatCurrency(summary.receivedAmount) : "••••"}
        </p>
      </Card>
      <Card className="p-3 bg-card border-border">
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
          <TrendingDown className="h-3.5 w-3.5" /> Pendente
        </div>
        <p className="text-lg font-bold text-amber-400">
          {showValues ? formatCurrency(summary.pendingAmount) : "••••"}
        </p>
      </Card>
      <Card className="p-3 bg-card border-border flex items-center justify-center">
        <Badge className={`text-sm px-3 py-1 ${status.color}`}>
          {summary.status === "pago" && "🟢"}
          {summary.status === "parcial" && "🟡"}
          {summary.status === "atrasado" && "🔴"}
          {summary.status === "pendente" && "⚪"}
          {" "}{status.label}
        </Badge>
      </Card>
    </div>
  );
}
