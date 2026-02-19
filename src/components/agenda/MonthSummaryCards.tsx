import { CalendarDays, CheckCircle2, Clock, XCircle } from "lucide-react";

interface MonthSummaryCardsProps {
  events: Array<{ status: string; total_value: number | null }>;
}

export function MonthSummaryCards({ events }: MonthSummaryCardsProps) {
  const total = events.length;
  const confirmados = events.filter(e => e.status === "confirmado").length;
  const pendentes = events.filter(e => e.status === "pendente").length;
  const cancelados = events.filter(e => e.status === "cancelado").length;

  const cards = [
    { label: "Total de Festas", value: total, icon: CalendarDays, color: "text-primary", bg: "bg-primary/10", border: "border-l-primary", tint: "bg-primary/[0.03]" },
    { label: "Confirmadas", value: confirmados, icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-500/10", border: "border-l-emerald-500", tint: "bg-emerald-500/[0.03]" },
    { label: "Pendentes", value: pendentes, icon: Clock, color: "text-amber-600", bg: "bg-amber-500/10", border: "border-l-amber-500", tint: "bg-amber-500/[0.03]" },
    { label: "Canceladas", value: cancelados, icon: XCircle, color: "text-red-600", bg: "bg-red-500/10", border: "border-l-red-500", tint: "bg-red-500/[0.03]" },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
      {cards.map((c) => (
        <div
          key={c.label}
          className={`group relative rounded-xl border border-border/60 border-l-[3px] ${c.border} ${c.tint} shadow-[var(--shadow-premium)] hover:-translate-y-1 hover:shadow-lg transition-all duration-300 ease-out cursor-default overflow-hidden`}
        >
          <div className="p-4 md:p-5 flex items-start gap-3">
            <div className={`p-2.5 rounded-xl ${c.bg} shrink-0 transition-transform duration-300 group-hover:scale-110`}>
              <c.icon className={`h-5 w-5 md:h-6 md:w-6 ${c.color}`} />
            </div>
            <div className="min-w-0 flex flex-col">
              <p className="text-3xl md:text-4xl font-extrabold tracking-tight leading-none">{c.value}</p>
              <p className="text-[11px] md:text-xs text-muted-foreground font-medium uppercase tracking-wider mt-1">{c.label}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
