import { CalendarDays, CheckCircle2, Clock, XCircle, TrendingUp } from "lucide-react";
import { getDaysInMonth } from "date-fns";

interface MonthSummaryCardsProps {
  events: Array<{ status: string; total_value: number | null; event_date: string }>;
  month?: Date;
}

export function MonthSummaryCards({ events, month }: MonthSummaryCardsProps) {
  const total = events.length;
  const confirmados = events.filter(e => e.status === "confirmado").length;
  const pendentes = events.filter(e => e.status === "pendente").length;
  const cancelados = events.filter(e => e.status === "cancelado").length;

  // Occupancy calculation
  const currentMonth = month || new Date();
  const totalDays = getDaysInMonth(currentMonth);
  const uniqueDaysWithEvents = new Set(events.filter(e => e.status !== "cancelado").map(e => e.event_date)).size;
  const freeDays = totalDays - uniqueDaysWithEvents;
  const occupancyRate = totalDays > 0 ? Math.round((uniqueDaysWithEvents / totalDays) * 100) : 0;

  const cards = [
    { label: "Total de Festas", value: total, icon: CalendarDays, color: "text-primary", bg: "bg-primary/10", border: "border-l-primary", tint: "bg-primary/[0.02]" },
    { label: "Confirmadas", value: confirmados, icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-500/10", border: "border-l-emerald-500", tint: "bg-emerald-500/[0.02]" },
    { label: "Pendentes", value: pendentes, icon: Clock, color: "text-amber-600", bg: "bg-amber-500/10", border: "border-l-amber-500", tint: "bg-amber-500/[0.02]" },
    { label: "Canceladas", value: cancelados, icon: XCircle, color: "text-red-600", bg: "bg-red-500/10", border: "border-l-red-500", tint: "bg-red-500/[0.02]" },
  ];

  return (
    <div className="space-y-4 animate-fade-up">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        {cards.map((c) => (
          <div
            key={c.label}
            className={`group relative rounded-2xl border border-border/40 border-l-[3px] ${c.border} ${c.tint} backdrop-blur-sm shadow-[0_4px_24px_rgba(0,0,0,0.04)] hover:shadow-[0_8px_32px_rgba(0,0,0,0.08)] hover:-translate-y-1 transition-all duration-200 ease-out cursor-default overflow-hidden`}
          >
            <div className="p-4 md:p-5 flex items-start gap-3">
              <div className={`p-2.5 rounded-xl ${c.bg} shrink-0 transition-transform duration-200 group-hover:scale-105`}>
                <c.icon className={`h-5 w-5 ${c.color}`} />
              </div>
              <div className="min-w-0 flex flex-col">
                <p className="text-2xl md:text-3xl font-extrabold tracking-tight leading-none">{c.value}</p>
                <p className="text-[10px] md:text-[11px] text-muted-foreground/80 font-medium uppercase tracking-widest mt-1">{c.label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Occupancy Bar */}
      <div className="rounded-2xl border border-border/30 bg-card shadow-[0_2px_12px_rgba(0,0,0,0.03)] p-4 md:p-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/10">
              <TrendingUp className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground/80 uppercase tracking-wider">Ocupação do Mês</p>
              <div className="flex items-baseline gap-2 mt-0.5">
                <span className="text-2xl font-extrabold tracking-tight">{occupancyRate}%</span>
                <span className="text-xs text-muted-foreground/60">
                  {uniqueDaysWithEvents} dias com evento · {freeDays} dias livres
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4 text-xs text-muted-foreground/70">
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              <span>{confirmados} conf.</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-amber-400" />
              <span>{pendentes} pend.</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-red-400" />
              <span>{cancelados} canc.</span>
            </div>
          </div>
        </div>
        {/* Progress bar */}
        <div className="mt-3 h-2 rounded-full bg-muted/50 overflow-hidden">
          <div className="h-full rounded-full bg-gradient-to-r from-primary to-primary/70 transition-all duration-500 ease-out" style={{ width: `${occupancyRate}%` }} />
        </div>
      </div>
    </div>
  );
}
