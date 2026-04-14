import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { useTasks } from "@/hooks/useTasks";
import { TaskDetailSheet } from "./TaskDetailSheet";
import { EventDetailSheet } from "./EventDetailSheet";
import { VisitDetailSheet } from "./VisitDetailSheet";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, MapPin, CheckCircle2, Clock, PartyPopper, CalendarDays } from "lucide-react";
import { format, startOfMonth, endOfMonth, isToday as isTodayFn, eachDayOfInterval, getDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { AgendaCalendar } from "./AgendaCalendar";
import { cn } from "@/lib/utils";

interface UnifiedItem {
  id: string;
  type: "festa" | "visita" | "tarefa";
  title: string;
  date: string;
  time?: string;
  status: string;
  extra?: string;
}

interface AgendaTudoTabProps {
  userId?: string;
}

const TYPE_COLORS: Record<string, string> = {
  festa: "bg-purple-100 text-purple-700 border-purple-200",
  visita: "bg-blue-100 text-blue-700 border-blue-200",
  tarefa: "bg-amber-100 text-amber-700 border-amber-200",
};

const TYPE_BORDER_COLORS: Record<string, string> = {
  festa: "border-l-purple-500",
  visita: "border-l-blue-500",
  tarefa: "border-l-amber-500",
};

const TYPE_LABELS: Record<string, string> = {
  festa: "🎉 Festa",
  visita: "📍 Visita",
  tarefa: "📋 Tarefa",
};

export function AgendaTudoTab({ userId }: AgendaTudoTabProps) {
  const { currentCompany } = useCompany();
  const { tasks, loading: tasksLoading, updateStatus, deleteTask } = useTasks();
  const [events, setEvents] = useState<any[]>([]);
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [taskSheetOpen, setTaskSheetOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [eventSheetOpen, setEventSheetOpen] = useState(false);
  const [visits, setVisits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState(startOfMonth(new Date()));
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());

  useEffect(() => {
    if (!currentCompany?.id) return;
    const fetchAll = async () => {
      setLoading(true);
      const from = format(startOfMonth(month), "yyyy-MM-dd");
      const to = format(endOfMonth(month), "yyyy-MM-dd");

      const [evRes, visitRes] = await Promise.all([
        supabase
          .from("company_events")
          .select("id, title, event_date, start_time, end_time, status, unit, event_type, package_name, guest_count, total_value, lead_id, child_name, child_age, notes, internal_notes, payment_method, created_by, created_at, updated_at, is_permuta, parent_names, gifts, extra_guest_value, event_optionals, birthday_children, child_birthdate, payment_details, data_fechamento_venda, vendedor_responsavel_id")
          .eq("company_id", currentCompany.id)
          .gte("event_date", from)
          .lte("event_date", to),
        supabase
          .from("lead_visits")
          .select("id, data_visita, horario_visita, status_visita, lead_id, campaign_leads(name, whatsapp)")
          .eq("company_id", currentCompany.id)
          .gte("data_visita", from)
          .lte("data_visita", to) as any,
      ]);

      setEvents(evRes.data || []);
      setVisits(visitRes.data || []);
      setLoading(false);
    };
    fetchAll();
  }, [currentCompany?.id, month]);

  // Helper: expand recurring tasks into individual date entries for the month
  const expandedTaskDates = useMemo(() => {
    const monthStart = startOfMonth(month);
    const monthEnd = endOfMonth(month);
    const results: { task: typeof tasks[0]; date: string }[] = [];

    tasks.forEach((t) => {
      const taskAny = t as any;
      if (taskAny.is_recurring && taskAny.recurrence_type === "semanal" && taskAny.recurrence_days?.length) {
        // Generate all matching weekdays in the month
        const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
        days.forEach((day) => {
          if ((taskAny.recurrence_days as number[]).includes(getDay(day))) {
            const dateStr = format(day, "yyyy-MM-dd");
            if (!taskAny.recurrence_end_date || dateStr <= taskAny.recurrence_end_date) {
              results.push({ task: t, date: dateStr });
            }
          }
        });
      } else if (taskAny.is_recurring && taskAny.recurrence_type === "diaria") {
        const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
        days.forEach((day) => {
          const dateStr = format(day, "yyyy-MM-dd");
          if (!taskAny.recurrence_end_date || dateStr <= taskAny.recurrence_end_date) {
            results.push({ task: t, date: dateStr });
          }
        });
      } else if (taskAny.is_recurring && taskAny.recurrence_type === "mensal" && t.due_date) {
        // Same day each month
        const dayNum = parseInt(t.due_date.split("-")[2]);
        const monthStr = format(monthStart, "yyyy-MM");
        const lastDay = parseInt(format(monthEnd, "dd"));
        const targetDay = Math.min(dayNum, lastDay);
        const dateStr = `${monthStr}-${String(targetDay).padStart(2, "0")}`;
        if (!taskAny.recurrence_end_date || dateStr <= taskAny.recurrence_end_date) {
          results.push({ task: t, date: dateStr });
        }
      } else if (t.due_date) {
        results.push({ task: t, date: t.due_date });
      }
    });

    return results;
  }, [tasks, month]);

  const unifiedItems = useMemo<UnifiedItem[]>(() => {
    const items: UnifiedItem[] = [];

    events.forEach((ev) => {
      items.push({
        id: ev.id,
        type: "festa",
        title: ev.title,
        date: ev.event_date,
        time: ev.start_time?.slice(0, 5),
        status: ev.status,
        extra: ev.unit,
      });
    });

    visits.forEach((v: any) => {
      items.push({
        id: v.id,
        type: "visita",
        title: v.campaign_leads?.name || "Visita",
        date: v.data_visita,
        time: v.horario_visita?.slice(0, 5),
        status: v.status_visita,
      });
    });

    expandedTaskDates.forEach(({ task: t, date }) => {
      items.push({
        id: `${t.id}-${date}`,
        type: "tarefa",
        title: t.title,
        date,
        time: t.due_time?.slice(0, 5),
        status: (t as any).status || (t.completed ? "concluída" : "pendente"),
      });
    });

    return items.sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      return (a.time || "").localeCompare(b.time || "");
    });
  }, [events, visits, expandedTaskDates]);

  const selectedDayItems = useMemo(() => {
    if (!selectedDate) return [];
    const key = format(selectedDate, "yyyy-MM-dd");
    return unifiedItems.filter((i) => i.date === key);
  }, [selectedDate, unifiedItems]);

  const calendarEvents = useMemo(() => {
    const items: { id: string; event_date: string; status: string; title: string; type: "festa" | "visita" | "tarefa" }[] = [];

    events.forEach((ev) => {
      items.push({ id: ev.id, event_date: ev.event_date, status: ev.status, title: ev.title, type: "festa" });
    });

    visits.forEach((v: any) => {
      items.push({
        id: `visit-${v.id}`,
        event_date: v.data_visita,
        status: v.status_visita === "confirmada" ? "confirmado" : "pendente",
        title: v.campaign_leads?.name || "Visita",
        type: "visita",
      });
    });

    expandedTaskDates.forEach(({ task: t, date }) => {
      items.push({
        id: `task-${t.id}-${date}`,
        event_date: date,
        status: t.completed ? "confirmado" : "pendente",
        title: t.title,
        type: "tarefa",
      });
    });

    return items;
  }, [events, visits, expandedTaskDates]);

  const isLoading = loading || tasksLoading;

  return (
    <div className="space-y-4">
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          {/* Summary */}
          <div className="grid grid-cols-3 gap-3">
            <Card className="border-border/30">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-purple-100 dark:bg-purple-900/30">
                  <PartyPopper className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold leading-none">{events.length}</p>
                  <p className="text-xs text-muted-foreground mt-1">Festas</p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-border/30">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-blue-100 dark:bg-blue-900/30">
                  <MapPin className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold leading-none">{visits.length}</p>
                  <p className="text-xs text-muted-foreground mt-1">Visitas</p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-border/30">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-amber-100 dark:bg-amber-900/30">
                  <CheckCircle2 className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold leading-none">{tasks.filter((t) => t.due_date).length}</p>
                  <p className="text-xs text-muted-foreground mt-1">Tarefas</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Calendar */}
          <Card className="border-border/30">
            <CardContent className="p-0">
              <div className="flex items-center justify-end px-3 pt-2">
                {selectedDate && !isTodayFn(selectedDate) && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => {
                      const today = new Date();
                      setSelectedDate(today);
                      setMonth(startOfMonth(today));
                    }}
                  >
                    <CalendarDays className="h-3.5 w-3.5 mr-1" />
                    Hoje
                  </Button>
                )}
              </div>
              <AgendaCalendar
                events={calendarEvents}
                month={month}
                onMonthChange={setMonth}
                onDayClick={setSelectedDate}
                selectedDate={selectedDate}
                showTypeLegend
              />
            </CardContent>
          </Card>

          {/* Selected day detail */}
          {selectedDate && (
            <Card className="border-border/30">
              <CardContent className="p-4">
                <h3 className="font-semibold text-sm mb-3">
                  {format(selectedDate, "dd 'de' MMMM", { locale: ptBR })}
                  <Badge variant="secondary" className="ml-2 text-[10px]">{selectedDayItems.length} itens</Badge>
                </h3>
                {selectedDayItems.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhum compromisso neste dia.</p>
                ) : (
                  <div className="space-y-2">
                     {selectedDayItems.map((item) => (
                      <div
                        key={item.id}
                        className={cn(
                          "flex items-center gap-3 p-3 rounded-xl border border-border/30 bg-card cursor-pointer hover:bg-muted/40 transition-colors border-l-4",
                          TYPE_BORDER_COLORS[item.type]
                        )}
                        onClick={() => {
                          if (item.type === "tarefa") {
                            const realId = item.id.includes("-") ? item.id.split("-")[0] : item.id;
                            const found = tasks.find(t => t.id === realId || item.id.startsWith(t.id));
                            if (found) {
                              setSelectedTask(found);
                              setTaskSheetOpen(true);
                            }
                          } else if (item.type === "festa") {
                            const found = events.find(e => e.id === item.id);
                            if (found) {
                              setSelectedEvent(found);
                              setEventSheetOpen(true);
                            }
                          }
                        }}
                      >
                         <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0.5 shrink-0", TYPE_COLORS[item.type])}>
                           {TYPE_LABELS[item.type]}
                         </Badge>
                         <span className="text-sm font-medium truncate flex-1">{item.title}</span>
                         {item.extra && (
                           <span className="text-xs text-muted-foreground flex items-center gap-1">
                             <MapPin className="h-3 w-3" /> {item.extra}
                           </span>
                         )}
                         {item.time && (
                           <span className="text-xs text-muted-foreground flex items-center gap-1">
                             <Clock className="h-3 w-3" /> {item.time}
                           </span>
                         )}
                       </div>
                     ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </>
      )}

      <TaskDetailSheet
        open={taskSheetOpen}
        onOpenChange={setTaskSheetOpen}
        task={selectedTask}
        onEdit={() => {}}
        onDelete={(id) => { deleteTask(id); setTaskSheetOpen(false); }}
        onStatusChange={(id, status) => { updateStatus(id, status); }}
      />

      <EventDetailSheet
        open={eventSheetOpen}
        onOpenChange={setEventSheetOpen}
        event={selectedEvent}
        onEdit={() => {}}
        onDelete={() => {}}
        userId={userId}
      />
    </div>
  );
}
