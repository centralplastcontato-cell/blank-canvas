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
    { label: "Total de Festas", value: total, icon: CalendarDays, color: "text-primary", bg: "bg-primary/10", border: "border-l-primary", tint: "bg-primary/[0.02]" },
    { label: "Confirmadas", value: confirmados, icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-500/10", border: "border-l-emerald-500", tint: "bg-emerald-500/[0.02]" },
    { label: "Pendentes", value: pendentes, icon: Clock, color: "text-amber-600", bg: "bg-amber-500/10", border: "border-l-amber-500", tint: "bg-amber-500/[0.02]" },
    { label: "Canceladas", value: cancelados, icon: XCircle, color: "text-red-600", bg: "bg-red-500/10", border: "border-l-red-500", tint: "bg-red-500/[0.02]" },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-5 animate-fade-up">
      {cards.map((c) => (
        <div
          key={c.label}
          className={`group relative rounded-2xl border border-border/40 border-l-[3px] ${c.border} ${c.tint} backdrop-blur-sm shadow-[0_4px_24px_rgba(0,0,0,0.04)] hover:shadow-[0_8px_32px_rgba(0,0,0,0.08)] hover:-translate-y-1 transition-all duration-200 ease-out cursor-default overflow-hidden`}
        >
          <div className="p-5 md:p-6 flex items-start gap-4">
            <div className={`p-3 rounded-2xl ${c.bg} shrink-0 transition-transform duration-200 group-hover:scale-105`}>
              <c.icon className={`h-5 w-5 md:h-6 md:w-6 ${c.color}`} />
            </div>
            <div className="min-w-0 flex flex-col">
              <p className="text-3xl md:text-4xl font-extrabold tracking-tight leading-none">{c.value}</p>
              <p className="text-[10px] md:text-[11px] text-muted-foreground/80 font-medium uppercase tracking-widest mt-1.5">{c.label}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
