import { format, addMonths, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, Users, MapPin, AlertTriangle, ChevronLeft, ChevronRight } from "lucide-react";

interface CompanyEvent {
  id: string;
  title: string;
  event_date: string;
  start_time: string | null;
  end_time: string | null;
  event_type: string | null;
  guest_count: number | null;
  unit: string | null;
  status: string;
  package_name: string | null;
  total_value: number | null;
  notes: string | null;
}

interface AgendaListViewProps {
  events: CompanyEvent[];
  onEventClick: (event: CompanyEvent) => void;
  getConflicts: (event: CompanyEvent) => CompanyEvent[];
  month: Date;
  onMonthChange: (date: Date) => void;
}

export function AgendaListView({ events, onEventClick, getConflicts, month, onMonthChange }: AgendaListViewProps) {
  const grouped = new Map<string, CompanyEvent[]>();
  events.forEach((ev) => {
    const key = ev.event_date;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(ev);
  });

  const sortedDates = Array.from(grouped.keys()).sort();

  return (
    <div className="space-y-6">
      {/* Month navigation */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => onMonthChange(subMonths(month, 1))}>
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <h3 className="text-base font-semibold capitalize">
          {format(month, "MMMM yyyy", { locale: ptBR })}
        </h3>
        <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => onMonthChange(addMonths(month, 1))}>
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>

      {sortedDates.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-12">Nenhum evento neste mês.</p>
      ) : (
        sortedDates.map((dateStr) => {
          const dayEvents = grouped.get(dateStr)!;
          const date = new Date(dateStr + "T12:00:00");
          return (
            <div key={dateStr}>
              <h4 className="text-[11px] font-bold text-muted-foreground/70 uppercase tracking-widest mb-2.5">
                {format(date, "EEEE, dd 'de' MMMM", { locale: ptBR })}
              </h4>
              <div className="space-y-2">
                {dayEvents.map((ev) => {
                  const conflicts = getConflicts(ev);
                  const statusColors = ev.status === "confirmado"
                    ? "border-l-emerald-500 bg-emerald-500/[0.03]"
                    : ev.status === "cancelado"
                      ? "border-l-red-500 bg-red-500/[0.03]"
                      : "border-l-amber-500 bg-amber-500/[0.03]";
                  return (
                    <button
                      key={ev.id}
                      onClick={() => onEventClick(ev)}
                      className={`w-full text-left p-3.5 rounded-xl border border-border/50 border-l-[3px] ${statusColors} hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 ease-out`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <span className="font-bold text-sm truncate">{ev.title}</span>
                        <Badge
                          variant={ev.status === "confirmado" ? "default" : ev.status === "cancelado" ? "destructive" : "secondary"}
                          className="text-[10px] shrink-0 font-semibold uppercase tracking-wide"
                        >
                          {ev.status}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                        {ev.start_time && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {ev.start_time.slice(0, 5)}{ev.end_time ? ` – ${ev.end_time.slice(0, 5)}` : ""}
                          </span>
                        )}
                        {ev.unit && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {ev.unit}
                          </span>
                        )}
                        {ev.guest_count && (
                          <span className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {ev.guest_count}
                          </span>
                        )}
                        {ev.total_value != null && (
                          <span className="font-semibold text-foreground">
                            R$ {ev.total_value.toLocaleString("pt-BR")}
                          </span>
                        )}
                      </div>
                      {conflicts.length > 0 && (
                        <div className="flex items-center gap-1 text-xs text-destructive font-medium mt-1.5">
                          <AlertTriangle className="h-3 w-3" /> Conflito de horário
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
