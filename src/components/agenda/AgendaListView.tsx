import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { Clock, Users, MapPin, AlertTriangle } from "lucide-react";

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
}

export function AgendaListView({ events, onEventClick, getConflicts }: AgendaListViewProps) {
  // Group by date
  const grouped = new Map<string, CompanyEvent[]>();
  events.forEach((ev) => {
    const key = ev.event_date;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(ev);
  });

  const sortedDates = Array.from(grouped.keys()).sort();

  if (sortedDates.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-12">Nenhum evento neste mês.</p>
    );
  }

  return (
    <div className="space-y-4">
      {sortedDates.map((dateStr) => {
        const dayEvents = grouped.get(dateStr)!;
        const date = new Date(dateStr + "T12:00:00");
        return (
          <div key={dateStr}>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              {format(date, "EEEE, dd 'de' MMMM", { locale: ptBR })}
            </h4>
            <div className="space-y-2">
              {dayEvents.map((ev) => {
                const conflicts = getConflicts(ev);
                return (
                  <button
                    key={ev.id}
                    onClick={() => onEventClick(ev)}
                    className="w-full text-left p-3 rounded-lg border border-border hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="font-medium text-sm truncate">{ev.title}</span>
                      <Badge
                        variant={ev.status === "confirmado" ? "default" : ev.status === "cancelado" ? "destructive" : "secondary"}
                        className="text-xs shrink-0"
                      >
                        {ev.status}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                      {ev.start_time && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {ev.start_time.slice(0, 5)}{ev.end_time ? ` - ${ev.end_time.slice(0, 5)}` : ""}
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
                        <span className="font-medium text-foreground">
                          R$ {ev.total_value.toLocaleString("pt-BR")}
                        </span>
                      )}
                    </div>
                    {conflicts.length > 0 && (
                      <div className="flex items-center gap-1 text-xs text-destructive mt-1">
                        <AlertTriangle className="h-3 w-3" /> Conflito de horário
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
