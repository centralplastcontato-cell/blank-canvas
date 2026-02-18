import { CalendarDays, CheckCircle2, Clock, XCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface MonthSummaryCardsProps {
  events: Array<{ status: string; total_value: number | null }>;
}

export function MonthSummaryCards({ events }: MonthSummaryCardsProps) {
  const total = events.length;
  const confirmados = events.filter(e => e.status === "confirmado").length;
  const pendentes = events.filter(e => e.status === "pendente").length;
  const cancelados = events.filter(e => e.status === "cancelado").length;
  const receita = events
    .filter(e => e.status !== "cancelado")
    .reduce((sum, e) => sum + (e.total_value || 0), 0);

  const cards = [
    { label: "Total de Festas", value: total, icon: CalendarDays, color: "text-primary" },
    { label: "Confirmadas", value: confirmados, icon: CheckCircle2, color: "text-green-500" },
    { label: "Pendentes", value: pendentes, icon: Clock, color: "text-yellow-500" },
    { label: "Canceladas", value: cancelados, icon: XCircle, color: "text-red-500" },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {cards.map((c) => (
        <Card key={c.label} className="bg-card border-border hover:-translate-y-0.5 hover:shadow-md transition-all duration-200">
          <CardContent className="p-4 flex items-center gap-3">
            <c.icon className={`h-5 w-5 ${c.color} shrink-0`} />
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground truncate">{c.label}</p>
              <p className="text-xl font-bold">{c.value}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
