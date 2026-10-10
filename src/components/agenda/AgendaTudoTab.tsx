import { useState, useEffect, useMemo, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { useTasks, type CompanyTask, type TaskFormData } from "@/hooks/useTasks";
import { useCompanyPeople } from "@/hooks/useCompanyPeople";
import { TaskDetailSheet } from "./TaskDetailSheet";
import { TaskFormDialog } from "./TaskFormDialog";
import { EventDetailSheet, type EventData } from "./EventDetailSheet";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Loader2, MapPin, Clock, PartyPopper, CalendarDays, ListChecks, type LucideIcon } from "lucide-react";
import { format, startOfMonth, endOfMonth, isToday as isTodayFn } from "date-fns";
import { ptBR } from "date-fns/locale";
import { AgendaCalendar } from "./AgendaCalendar";
import { tasksInRange } from "@/lib/taskOccurrences";
import { cn } from "@/lib/utils";

type ItemType = "festa" | "visita" | "tarefa";

interface GeralVisit {
  id: string;
  data_visita: string;
  horario_visita: string | null;
  status_visita: string;
  visit_type: string | null;
  unit: string | null;
  campaign_leads: { name: string | null } | null;
}

interface DayItem {
  key: string;
  type: ItemType;
  title: string;
  date: string;
  time?: string;
  unit?: string | null;
  /** situação e cor do selo */
  status: { label: string; tone: string };
  cancelled?: boolean;
  /** repetição que o sistema ainda vai criar: só aparece, não abre */
  forecast?: boolean;
  label: string;
  open?: () => void;
}

interface AgendaTudoTabProps {
  userId?: string;
  /** mostra o valor da festa (permissão de ver faturamento) */
  showRevenue?: boolean;
  /** editar/excluir festa usam o formulário e a confirmação da página da Agenda */
  onEditEvent?: (event: EventData) => void;
  onDeleteEvent?: (id: string) => void;
  /** muda quando uma festa é salva ou excluída (recarrega a lista) */
  eventsVersion?: number;
  /** unidades que a pessoa pode ver (mesma regra das abas Festas e Visitas) */
  canSeeEvent?: (ev: { unit: string | null }) => boolean;
  canSeeVisitUnit?: (unit: string | null) => boolean;
  /** abre a visita na aba Visitas, com os botões de lá */
  onOpenVisit?: (visitId: string) => void;
}

const TYPE_BORDER: Record<ItemType, string> = {
  festa: "border-l-purple-500",
  visita: "border-l-blue-500",
  tarefa: "border-l-amber-500",
};

const TYPE_CHIP: Record<ItemType, string> = {
  festa: "bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800/50",
  visita: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800/50",
  tarefa: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/50",
};

const TONE = {
  green: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  amber: "bg-amber-500/15 text-amber-800 dark:text-amber-400",
  red: "bg-red-500/10 text-red-700 dark:text-red-400",
  blue: "bg-sky-500/10 text-sky-700 dark:text-sky-400",
  gray: "bg-muted text-muted-foreground",
};

const EVENT_STATUS: Record<string, { label: string; tone: string }> = {
  confirmado: { label: "Confirmada", tone: TONE.green },
  pendente: { label: "Pendente", tone: TONE.amber },
  cancelado: { label: "Cancelada", tone: TONE.red },
};

const VISIT_STATUS: Record<string, { label: string; tone: string }> = {
  agendada: { label: "Agendada", tone: TONE.blue },
  confirmada: { label: "Confirmada", tone: TONE.green },
  remarcada: { label: "Remarcada", tone: TONE.amber },
  realizada: { label: "Veio", tone: TONE.green },
  nao_compareceu: { label: "Não veio", tone: TONE.red },
  cancelada: { label: "Cancelada", tone: TONE.red },
};

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

function taskStatus(t: CompanyTask, date: string, today: string, forecast: boolean) {
  if (forecast) return { label: "Prevista", tone: TONE.gray };
  if (t.status === "concluida") return { label: "Feita", tone: TONE.green };
  if (date < today) return { label: "Atrasada", tone: TONE.red };
  if (t.status === "em_andamento") return { label: "Em andamento", tone: TONE.blue };
  return { label: "Pendente", tone: TONE.amber };
}

function Stat({ icon: Icon, tone, value, label, hint }: { icon: LucideIcon; tone: string; value: number; label: string; hint?: string }) {
  return (
    <div className="rounded-2xl border border-border/50 bg-card p-3 shadow-sm flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 min-w-0">
      <div className={cn("h-9 w-9 sm:h-10 sm:w-10 rounded-full flex items-center justify-center shrink-0", tone)}>
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

const EVENT_COLUMNS = "id, company_id, title, event_date, start_time, end_time, status, unit, event_type, package_name, guest_count, total_value, lead_id, child_name, child_age, notes, internal_notes, payment_method, created_by, created_at, updated_at, is_permuta, parent_names, gifts, extra_guest_value, extra_guest_value_antecipado, extra_guest_value_no_dia, event_optionals, birthday_children, child_birthdate, payment_details, data_fechamento_venda, vendedor_responsavel_id";

// Aba Geral: festas, visitas e tarefas do mês num calendário só.
export function AgendaTudoTab({
  userId,
  showRevenue = false,
  onEditEvent,
  onDeleteEvent,
  eventsVersion = 0,
  canSeeEvent = () => true,
  canSeeVisitUnit = () => true,
  onOpenVisit,
}: AgendaTudoTabProps) {
  const { currentCompany } = useCompany();
  const { tasks, loading: tasksLoading, updateTask, updateStatus, deleteTask } = useTasks();
  const people = useCompanyPeople(currentCompany?.id);
  const names = useMemo(() => new Map(people.map((p) => [p.user_id, p.full_name || "Sem nome"])), [people]);
  const [events, setEvents] = useState<EventData[]>([]);
  const [visits, setVisits] = useState<GeralVisit[]>([]);
  const [loading, setLoading] = useState(true);
  // Só a 1ª carga mostra o "carregando" no lugar do calendário; trocando de mês ele fica na tela
  const hasLoaded = useRef(false);
  const fetchSeq = useRef(0);
  const [month, setMonth] = useState(startOfMonth(new Date()));
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedTask, setSelectedTask] = useState<CompanyTask | null>(null);
  const [taskSheetOpen, setTaskSheetOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<CompanyTask | null>(null);
  const [taskFormOpen, setTaskFormOpen] = useState(false);
  const [deleteTaskId, setDeleteTaskId] = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<EventData | null>(null);
  const [eventSheetOpen, setEventSheetOpen] = useState(false);
  const dayPanelRef = useRef<HTMLDivElement>(null);

  const todayYmd = format(new Date(), "yyyy-MM-dd");
  const from = format(startOfMonth(month), "yyyy-MM-dd");
  const to = format(endOfMonth(month), "yyyy-MM-dd");

  useEffect(() => {
    if (!currentCompany?.id) return;
    // Só a busca mais recente vale (trocar de mês rápido não deixa resposta antiga por cima)
    const seq = ++fetchSeq.current;
    setLoading(true);
    (async () => {
      const [evRes, visitRes] = await Promise.all([
        supabase
          .from("company_events")
          .select(EVENT_COLUMNS)
          .eq("company_id", currentCompany.id)
          .gte("event_date", from)
          .lte("event_date", to),
        supabase
          .from("lead_visits")
          .select("id, data_visita, horario_visita, status_visita, visit_type, unit, campaign_leads(name)")
          .eq("company_id", currentCompany.id)
          .gte("data_visita", from)
          .lte("data_visita", to),
      ]);
      if (seq !== fetchSeq.current) return;
      setEvents((evRes.data || []) as unknown as EventData[]);
      setVisits((visitRes.data || []) as unknown as GeralVisit[]);
      hasLoaded.current = true;
      setLoading(false);
    })();
  }, [currentCompany?.id, from, to, eventsVersion]);

  const visibleEvents = useMemo(() => events.filter((e) => canSeeEvent(e)), [events, canSeeEvent]);
  const visibleVisits = useMemo(() => visits.filter((v) => canSeeVisitUnit(v.unit)), [visits, canSeeVisitUnit]);
  // Tarefas do mês: sem a repetida em dobro e com as próximas repetições previstas
  const occurrences = useMemo(() => tasksInRange(tasks, from, to, todayYmd), [tasks, from, to, todayYmd]);

  const items = useMemo<DayItem[]>(() => {
    const list: DayItem[] = [];
    for (const ev of visibleEvents) {
      list.push({
        key: `festa-${ev.id}`,
        type: "festa",
        label: "🎉 Festa",
        title: ev.title,
        date: ev.event_date,
        time: ev.start_time?.slice(0, 5),
        unit: ev.unit,
        status: EVENT_STATUS[ev.status] || { label: ev.status, tone: TONE.gray },
        cancelled: ev.status === "cancelado",
        open: () => { setSelectedEvent(ev); setEventSheetOpen(true); },
      });
    }
    for (const v of visibleVisits) {
      const isAtendimento = (v.visit_type || "visita") === "atendimento";
      list.push({
        key: `visita-${v.id}`,
        type: "visita",
        label: isAtendimento ? "📦 Atendimento" : "📍 Visita",
        title: v.campaign_leads?.name || "Cliente",
        date: v.data_visita,
        time: v.horario_visita?.slice(0, 5),
        unit: v.unit,
        status: VISIT_STATUS[v.status_visita] || { label: v.status_visita, tone: TONE.gray },
        cancelled: v.status_visita === "cancelada",
        open: onOpenVisit ? () => onOpenVisit(v.id) : undefined,
      });
    }
    for (const o of occurrences) {
      list.push({
        key: `tarefa-${o.task.id}-${o.date}`,
        type: "tarefa",
        label: "📋 Tarefa",
        title: o.task.title,
        date: o.date,
        time: o.task.due_time?.slice(0, 5),
        status: taskStatus(o.task, o.date, todayYmd, o.forecast),
        forecast: o.forecast,
        open: o.forecast ? undefined : () => { setSelectedTask(o.task); setTaskSheetOpen(true); },
      });
    }
    return list;
  }, [visibleEvents, visibleVisits, occurrences, todayYmd, onOpenVisit]);

  const selectedKey = format(selectedDate, "yyyy-MM-dd");
  // No dia: com horário primeiro (em ordem), sem horário depois; canceladas no fim
  const dayItems = useMemo(
    () =>
      items
        .filter((i) => i.date === selectedKey)
        .sort((a, b) => Number(!!a.cancelled) - Number(!!b.cancelled) || (a.time || "99:99").localeCompare(b.time || "99:99")),
    [items, selectedKey],
  );

  // Calendário: o que vai acontecer (canceladas não entram)
  const calendarItems = useMemo(
    () => items.filter((i) => !i.cancelled).map((i) => ({ id: i.key, event_date: i.date, status: "confirmado", title: i.title, type: i.type })),
    [items],
  );

  const counts = useMemo(() => {
    const festas = items.filter((i) => i.type === "festa");
    const visitas = visibleVisits.filter((v) => v.status_visita !== "cancelada");
    const atendimentos = visitas.filter((v) => (v.visit_type || "visita") === "atendimento").length;
    const feitas = occurrences.filter((o) => !o.forecast && o.task.status === "concluida").length;
    return {
      festas: festas.filter((i) => !i.cancelled).length,
      festasCanceladas: festas.filter((i) => i.cancelled).length,
      visitas: visitas.length - atendimentos,
      atendimentos,
      tarefas: occurrences.length,
      feitas,
    };
  }, [items, visibleVisits, occurrences]);

  // No celular a lista do dia fica embaixo do calendário: ao tocar numa data, rola até ela
  const handleDayClick = (date: Date) => {
    setSelectedDate(date);
    if (window.matchMedia("(max-width: 767px)").matches) {
      setTimeout(() => dayPanelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
    }
  };

  const goToday = () => {
    const today = new Date();
    setSelectedDate(today);
    setMonth(startOfMonth(today));
  };

  const handleTaskSubmit = (data: TaskFormData) => {
    if (editingTask) updateTask(editingTask.id, data);
  };

  const firstLoad = (loading && !hasLoaded.current) || tasksLoading;
  const isToday = isTodayFn(selectedDate);

  return (
    <div className="space-y-4">
      {/* Números do mês: mesmo visual das abas Festas e Visitas */}
      <div className="grid grid-cols-3 gap-2.5 md:gap-3 animate-fade-up">
        <Stat
          icon={PartyPopper}
          tone="bg-purple-500/15 text-purple-600"
          value={counts.festas}
          label="Festas no mês"
          hint={counts.festasCanceladas > 0 ? `+${counts.festasCanceladas} cancelada${counts.festasCanceladas > 1 ? "s" : ""}` : undefined}
        />
        <Stat
          icon={MapPin}
          tone="bg-blue-500/15 text-blue-600"
          value={counts.visitas}
          label="Visitas no mês"
          hint={counts.atendimentos > 0 ? `+${counts.atendimentos} atendimento${counts.atendimentos > 1 ? "s" : ""}` : undefined}
        />
        <Stat
          icon={ListChecks}
          tone="bg-amber-500/15 text-amber-600"
          value={counts.tarefas}
          label="Tarefas no mês"
          hint={counts.feitas > 0 ? `${counts.feitas} feita${counts.feitas > 1 ? "s" : ""}` : undefined}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-5">
        <Card className="relative bg-card border-border/20 shadow-[0_8px_40px_rgba(0,0,0,0.06)] rounded-2xl overflow-hidden">
          <CardContent className="relative p-2 md:p-4 lg:p-5">
            {firstLoad ? (
              <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
            ) : (
              // Trocando de mês: o calendário fica na tela (um pouco apagado) enquanto carrega
              <div className={cn("relative transition-opacity", loading && "opacity-60")}>
                {loading && <Loader2 className="absolute right-3 bottom-3 z-10 h-4 w-4 animate-spin text-muted-foreground" />}
                <AgendaCalendar
                  events={calendarItems}
                  month={month}
                  onMonthChange={setMonth}
                  onDayClick={handleDayClick}
                  selectedDate={selectedDate}
                  showTypeLegend
                />
              </div>
            )}
          </CardContent>
        </Card>

        <Card ref={dayPanelRef} className="relative scroll-mt-3 bg-gradient-to-b from-card to-muted/10 border-border/20 shadow-[0_8px_40px_rgba(0,0,0,0.06)] rounded-2xl overflow-hidden">
          <CardContent className="relative p-4 md:p-6">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h3 className="font-bold text-base tracking-tight text-foreground">
                  {isToday ? "Hoje" : format(selectedDate, "dd 'de' MMMM", { locale: ptBR })}
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {capitalize(format(selectedDate, isToday ? "EEEE, dd 'de' MMMM" : "EEEE", { locale: ptBR }))}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {!isToday && (
                  <Button variant="outline" size="sm" className="h-7 text-xs rounded-full" onClick={goToday}>
                    <CalendarDays className="h-3.5 w-3.5 mr-1" /> Hoje
                  </Button>
                )}
                <Badge variant="secondary" className="text-[11px]">
                  {dayItems.length} {dayItems.length === 1 ? "item" : "itens"}
                </Badge>
              </div>
            </div>
            <div className="h-[2px] w-10 rounded-full bg-gradient-to-r from-primary/40 to-transparent mt-2 mb-3" />

            {dayItems.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">Nada marcado neste dia.</p>
            ) : (
              <div className="space-y-2">
                {dayItems.map((item) => {
                  const Row = item.open ? "button" : "div";
                  return (
                    <Row
                      key={item.key}
                      {...(item.open ? { type: "button" as const, onClick: item.open } : {})}
                      className={cn(
                        "w-full text-left flex flex-col gap-1.5 p-3 rounded-xl border border-border/40 bg-card border-l-4 transition-colors",
                        TYPE_BORDER[item.type],
                        item.open && "hover:bg-muted/40 cursor-pointer",
                        (item.cancelled || item.forecast) && "opacity-70",
                      )}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0 shrink-0", TYPE_CHIP[item.type])}>
                          {item.label}
                        </Badge>
                        <span className={cn("text-sm font-semibold truncate flex-1", item.cancelled && "line-through text-muted-foreground")}>
                          {item.title}
                        </span>
                        {item.time && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1 shrink-0">
                            <Clock className="h-3 w-3" /> {item.time}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-medium", item.status.tone)}>{item.status.label}</span>
                        {item.unit && (
                          <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                            <MapPin className="h-3 w-3" /> {item.unit}
                          </span>
                        )}
                        {item.forecast && <span className="text-[11px] text-muted-foreground">o sistema cria 7 dias antes</span>}
                      </div>
                    </Row>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <TaskDetailSheet
        open={taskSheetOpen}
        onOpenChange={setTaskSheetOpen}
        task={selectedTask}
        assigneeName={selectedTask?.assigned_to ? names.get(selectedTask.assigned_to) : undefined}
        onEdit={(t) => { setEditingTask(t); setTaskFormOpen(true); }}
        onDelete={(id) => setDeleteTaskId(id)}
        onStatusChange={(id, status) => {
          updateStatus(id, status);
          setSelectedTask((prev) => (prev?.id === id ? { ...prev, status } : prev));
        }}
      />

      <TaskFormDialog
        open={taskFormOpen}
        onOpenChange={setTaskFormOpen}
        onSubmit={handleTaskSubmit}
        initialData={editingTask}
      />

      <AlertDialog open={!!deleteTaskId} onOpenChange={(open) => { if (!open) setDeleteTaskId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir tarefa?</AlertDialogTitle>
            <AlertDialogDescription>Essa ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => { if (deleteTaskId) { deleteTask(deleteTaskId); setDeleteTaskId(null); } }}
              className="bg-destructive text-destructive-foreground"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <EventDetailSheet
        open={eventSheetOpen}
        onOpenChange={setEventSheetOpen}
        event={selectedEvent}
        onEdit={(ev) => { setEventSheetOpen(false); onEditEvent?.(ev); }}
        onDelete={(id) => { setEventSheetOpen(false); onDeleteEvent?.(id); }}
        userId={userId}
        showRevenue={showRevenue}
        onEventPatch={(eventId, updates) => setSelectedEvent((prev) => (prev?.id === eventId ? { ...prev, ...updates } : prev))}
      />
    </div>
  );
}
