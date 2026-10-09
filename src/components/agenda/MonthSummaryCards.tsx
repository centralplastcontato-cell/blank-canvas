import { CalendarDays, CheckCircle2, CalendarClock, TrendingUp, DollarSign, Handshake, type LucideIcon } from "lucide-react";
import { format, getDaysInMonth } from "date-fns";
import { eventSummary, occupancy, type KpiEvent } from "@/lib/agendaKpis";
import { cn } from "@/lib/utils";

interface MonthSummaryCardsProps {
  events: KpiEvent[];
  month?: Date;
  periodLabel?: string;
  totalDaysOverride?: number;
  showRevenue?: boolean;
  /** vendas fechadas no mês/período (pela data de fechamento) */
  closed: { count: number; cancelled: number; revenue: number };
  /** unidades para mostrar a ocupação de cada uma (só com "Todas as unidades") */
  units?: string[];
}

const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function Stat({ icon: Icon, tone, value, label, hint }: { icon: LucideIcon; tone: string; value: number; label: string; hint?: string }) {
  return (
    <div className="rounded-2xl border border-border/50 bg-card p-3 shadow-sm flex items-center gap-3 min-w-0">
      <div className={cn("h-10 w-10 rounded-full flex items-center justify-center shrink-0", tone)}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <p className="text-xl md:text-2xl font-extrabold tracking-tight leading-none">{value}</p>
        <p className="text-xs font-medium text-muted-foreground mt-1 truncate">{label}</p>
        {hint && <p className="text-[11px] text-muted-foreground/70 truncate">{hint}</p>}
      </div>
    </div>
  );
}

function Money({ icon: Icon, tone, value, label, hint, extra }: { icon: LucideIcon; tone: string; value: number; label: string; hint: string; extra?: string }) {
  return (
    <div className="rounded-2xl border border-border/50 bg-card p-3 md:p-4 shadow-sm flex items-center gap-3 min-w-0">
      <div className={cn("h-10 w-10 rounded-full flex items-center justify-center shrink-0", tone)}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-semibold text-muted-foreground">{label}</p>
        <p className="text-lg md:text-xl font-extrabold tracking-tight leading-tight">{brl(value)}</p>
        <p className="text-[11px] text-muted-foreground/80">{hint}</p>
        {extra && <p className="text-[11px] font-medium text-amber-700 dark:text-amber-400">{extra}</p>}
      </div>
    </div>
  );
}

// Números do topo da Agenda. As contas ficam em src/lib/agendaKpis.ts:
// cancelada não conta como venda nem faturamento; permuta não tem faturamento.
export function MonthSummaryCards({ events, month, periodLabel, totalDaysOverride, showRevenue = true, closed, units = [] }: MonthSummaryCardsProps) {
  const inPeriod = !!periodLabel;
  const s = eventSummary(events, format(new Date(), "yyyy-MM-dd"));
  const totalDays = totalDaysOverride || getDaysInMonth(month || new Date());
  const occ = occupancy(events, totalDays, units);
  const when = inPeriod ? "no período" : "no mês";

  return (
    <div className="space-y-3 animate-fade-up">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 md:gap-3">
        <Stat
          icon={CalendarDays}
          tone="bg-primary/10 text-primary"
          value={s.total}
          label={inPeriod ? "Festas no período" : "Festas no mês"}
          hint={s.canceladas > 0 ? `${s.canceladas} cancelada${s.canceladas > 1 ? "s" : ""}` : undefined}
        />
        <Stat icon={CheckCircle2} tone="bg-emerald-500/15 text-emerald-600" value={s.realizadas} label="Realizadas" hint="já passaram" />
        <Stat icon={CalendarClock} tone="bg-sky-500/15 text-sky-600" value={s.aRealizar} label="A realizar" hint="de hoje em diante" />
        <Stat
          icon={Handshake}
          tone="bg-violet-500/15 text-violet-600"
          value={closed.count}
          label={`Fechadas ${when}`}
          hint={closed.cancelled > 0 ? `+${closed.cancelled} cancelada${closed.cancelled > 1 ? "s" : ""}` : "pela data da venda"}
        />
      </div>

      {showRevenue && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 md:gap-3">
          <Money
            icon={DollarSign}
            tone="bg-emerald-500/15 text-emerald-600"
            value={closed.revenue}
            label={`Faturamento fechado ${when}`}
            hint="vendas fechadas, já sem a taxa do cartão"
          />
          <Money
            icon={CalendarDays}
            tone="bg-sky-500/15 text-sky-600"
            value={s.agendadoConfirmado}
            label={`Faturamento agendado ${when}`}
            hint="festas confirmadas que acontecem nesse tempo"
            extra={s.agendadoPendente > 0 ? `+ ${brl(s.agendadoPendente)} em festas pendentes` : undefined}
          />
        </div>
      )}

      {/* Ocupação */}
      <div className="rounded-2xl border border-border/50 bg-card p-3 md:p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <TrendingUp className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-muted-foreground">{inPeriod ? "Ocupação do período" : "Ocupação do mês"}</p>
            <p className="flex items-baseline gap-2 flex-wrap">
              <span className="text-xl font-extrabold tracking-tight">{occ.rate}%</span>
              <span className="text-xs text-muted-foreground">
                {occ.days} dia{occ.days === 1 ? "" : "s"} com festa · {occ.freeDays} livre{occ.freeDays === 1 ? "" : "s"}
              </span>
            </p>
          </div>
        </div>
        <div className="mt-3 h-2 rounded-full bg-muted overflow-hidden">
          <div className="h-full rounded-full bg-primary transition-all duration-500 ease-out" style={{ width: `${occ.rate}%` }} />
        </div>
        {occ.byUnit.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {occ.byUnit.map((u) => (
              <span key={u.unit} className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-[11px] font-medium text-foreground/80">
                {u.unit}
                <span className="font-bold text-foreground">{u.rate}%</span>
                <span className="text-muted-foreground">({u.days} dia{u.days === 1 ? "" : "s"})</span>
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
