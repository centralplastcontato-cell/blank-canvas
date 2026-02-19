import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { useCompanyModules } from "@/hooks/useCompanyModules";
import { useCompanyUnits } from "@/hooks/useCompanyUnits";
import { useUnitPermissions } from "@/hooks/useUnitPermissions";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { MobileMenu } from "@/components/admin/MobileMenu";
import { NotificationBell } from "@/components/admin/NotificationBell";
import { PullToRefresh } from "@/components/ui/pull-to-refresh";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AgendaCalendar } from "@/components/agenda/AgendaCalendar";
import { AgendaListView } from "@/components/agenda/AgendaListView";
import { EventFormDialog, EventFormData } from "@/components/agenda/EventFormDialog";
import { EventDetailSheet } from "@/components/agenda/EventDetailSheet";
import { MonthSummaryCards } from "@/components/agenda/MonthSummaryCards";
import { CalendarDays, Plus, Loader2, ShieldAlert, Menu, Clock, AlertTriangle, List, ListChecks, MapPin, Users, DollarSign } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "@/hooks/use-toast";
import logoCastelo from "@/assets/logo-castelo.png";

interface CompanyEvent {
  id: string;
  company_id: string;
  lead_id: string | null;
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
  created_by: string;
}

export default function Agenda() {
  const navigate = useNavigate();
  const { currentCompany } = useCompany();
  const modules = useCompanyModules();
  const { units } = useCompanyUnits(currentCompany?.id);

  const [isAdmin, setIsAdmin] = useState(false);
  const [permLoading, setPermLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<{ id: string; name: string; email: string; avatar?: string | null } | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const [events, setEvents] = useState<CompanyEvent[]>([]);
  const [checklistProgress, setChecklistProgress] = useState<Record<string, { total: number; completed: number }>>({});
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState(startOfMonth(new Date()));
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedUnit, setSelectedUnit] = useState("all");

  const { canViewAll, allowedUnits, unitAccess, isLoading: permUnitLoading } = useUnitPermissions(currentUser?.id, currentCompany?.id);

  const [formOpen, setFormOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<EventFormData | null>(null);
  const [detailEvent, setDetailEvent] = useState<CompanyEvent | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"calendar" | "list">("calendar");

  // Auth check
  useEffect(() => {
    async function check() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/auth"); return; }
      const [profileResult, adminResult] = await Promise.all([
        supabase.from("profiles").select("full_name, avatar_url").eq("user_id", user.id).single(),
        supabase.rpc("is_admin", { _user_id: user.id }),
      ]);
      setCurrentUser({ id: user.id, name: profileResult.data?.full_name || "Usuário", email: user.email || "", avatar: profileResult.data?.avatar_url });
      setIsAdmin(adminResult.data === true);
      setPermLoading(false);
    }
    check();
  }, [navigate]);

  // Fetch events for current month
  const fetchEvents = async () => {
    if (!currentCompany?.id) return;
    setLoading(true);
    const start = format(startOfMonth(month), "yyyy-MM-dd");
    const end = format(endOfMonth(month), "yyyy-MM-dd");
    const [eventsRes, checklistRes] = await Promise.all([
      supabase
        .from("company_events")
        .select("*")
        .eq("company_id", currentCompany.id)
        .gte("event_date", start)
        .lte("event_date", end)
        .order("event_date")
        .order("start_time"),
      supabase
        .from("event_checklist_items")
        .select("event_id, is_completed")
        .eq("company_id", currentCompany.id),
    ]);

    if (!eventsRes.error && eventsRes.data) setEvents(eventsRes.data as CompanyEvent[]);

    // Build checklist progress map
    const progressMap: Record<string, { total: number; completed: number }> = {};
    (checklistRes.data || []).forEach((item: any) => {
      if (!progressMap[item.event_id]) progressMap[item.event_id] = { total: 0, completed: 0 };
      progressMap[item.event_id].total++;
      if (item.is_completed) progressMap[item.event_id].completed++;
    });
    setChecklistProgress(progressMap);

    setLoading(false);
  };

  useEffect(() => { fetchEvents(); }, [currentCompany?.id, month]);

  // Auto-select unit based on permissions
  useEffect(() => {
    if (permUnitLoading) return;
    if (!canViewAll) {
      const permitted = allowedUnits.filter(u => u !== "As duas");
      if (permitted.length === 1) {
        setSelectedUnit(permitted[0]);
      }
    }
  }, [canViewAll, allowedUnits, permUnitLoading]);

  // Filtered events (respects unit permissions)
  const filteredEvents = useMemo(() => {
    let filtered = events;
    // Apply permission filter first
    if (!canViewAll) {
      const permitted = allowedUnits.filter(u => u !== "As duas");
      filtered = filtered.filter(e => e.unit && permitted.includes(e.unit));
    }
    // Then apply manual unit filter
    if (selectedUnit !== "all") {
      filtered = filtered.filter(e => e.unit === selectedUnit);
    }
    return filtered;
  }, [events, selectedUnit, canViewAll, allowedUnits]);

  // Events for selected day
  const dayEvents = useMemo(() => {
    if (!selectedDate) return [];
    const dateStr = format(selectedDate, "yyyy-MM-dd");
    return filteredEvents.filter(e => e.event_date === dateStr);
  }, [filteredEvents, selectedDate]);

  // Detect conflicts (same unit + overlapping time)
  const getConflicts = (event: CompanyEvent) => {
    if (!event.start_time || !event.unit) return [];
    return events.filter(e =>
      e.id !== event.id &&
      e.event_date === event.event_date &&
      e.unit === event.unit &&
      e.status !== "cancelado" &&
      e.start_time &&
      ((e.start_time < (event.end_time || "23:59")) && ((e.end_time || "23:59") > event.start_time))
    );
  };

  const physicalUnits = units.filter(u => u.slug !== "trabalhe-conosco");

  const handleSubmit = async (data: EventFormData) => {
    if (!currentCompany?.id || !currentUser?.id) return;
    const payload = {
      company_id: currentCompany.id,
      title: data.title,
      event_date: data.event_date,
      start_time: data.start_time || null,
      end_time: data.end_time || null,
      event_type: data.event_type || null,
      guest_count: data.guest_count,
      unit: data.unit || null,
      status: data.status,
      package_name: data.package_name || null,
      total_value: data.total_value,
      notes: data.notes || null,
      created_by: currentUser.id,
      lead_id: data.lead_id || null,
    };

    if (data.id) {
      const { error } = await supabase.from("company_events").update(payload).eq("id", data.id);
      if (error) { toast({ title: "Erro ao atualizar", description: error.message, variant: "destructive" }); return; }
      toast({ title: "Festa atualizada!" });
    } else {
      const { data: newEvent, error } = await supabase.from("company_events").insert(payload).select("id").single();
      if (error) { toast({ title: "Erro ao criar", description: error.message, variant: "destructive" }); return; }

      // Apply checklist template if selected
      if (newEvent && data.checklist_template_id && data.checklist_template_id !== "none") {
        const { data: tmpl } = await supabase
          .from("event_checklist_templates")
          .select("items")
          .eq("id", data.checklist_template_id)
          .single();
        if (tmpl && Array.isArray(tmpl.items)) {
          const checklistItems = (tmpl.items as string[]).map((title: string, idx: number) => ({
            event_id: newEvent.id,
            company_id: currentCompany.id,
            title,
            sort_order: idx,
          }));
          await supabase.from("event_checklist_items").insert(checklistItems);
        }
      }

      toast({ title: "Festa criada!" });
    }
    fetchEvents();
  };

  const handleDelete = async (id: string) => {
    // Delete dependent records first to avoid foreign key violations
    await (supabase as any).from("freelancer_evaluations").delete().eq("event_id", id);
    await (supabase as any).from("event_checklist_items").delete().eq("event_id", id);
    await (supabase as any).from("event_staff_entries").delete().eq("event_id", id);
    await (supabase as any).from("event_info_entries").delete().eq("event_id", id);
    await (supabase as any).from("attendance_entries").delete().eq("event_id", id);

    const { error } = await supabase.from("company_events").delete().eq("id", id);
    if (error) { toast({ title: "Erro ao excluir", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Festa excluída" });
    setDetailOpen(false);
    fetchEvents();
  };

  const handleEdit = (ev: CompanyEvent) => {
    setEditingEvent({
      id: ev.id,
      title: ev.title,
      event_date: ev.event_date,
      start_time: ev.start_time || "",
      end_time: ev.end_time || "",
      event_type: ev.event_type || "infantil",
      guest_count: ev.guest_count,
      unit: ev.unit || "",
      status: ev.status,
      package_name: ev.package_name || "",
      total_value: ev.total_value,
      notes: ev.notes || "",
      lead_id: ev.lead_id || null,
    });
    setDetailOpen(false);
    setFormOpen(true);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  if (permLoading) {
    return <div className="flex items-center justify-center min-h-screen"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  if (!modules.agenda && !isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-3">
          <ShieldAlert className="h-12 w-12 text-muted-foreground mx-auto" />
          <p className="text-muted-foreground">Módulo Agenda não está habilitado.</p>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider defaultOpen={false}>
      <div className="min-h-screen flex w-full bg-background">
        <AdminSidebar
          canManageUsers={isAdmin}
          isAdmin={isAdmin}
          currentUserName={currentUser?.name || ""}
          onRefresh={fetchEvents}
          onLogout={handleLogout}
        />
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Mobile Header */}
          <header className="bg-card border-b border-border shrink-0 z-10 md:hidden">
            <div className="px-3 py-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <MobileMenu
                    isOpen={isMobileMenuOpen}
                    onOpenChange={setIsMobileMenuOpen}
                    trigger={<Button variant="ghost" size="icon" className="h-9 w-9"><Menu className="w-5 h-5" /></Button>}
                    currentPage="agenda"
                    userName={currentUser?.name || ""}
                    userEmail={currentUser?.email || ""}
                    userAvatar={currentUser?.avatar}
                    canManageUsers={isAdmin}
                    isAdmin={isAdmin}
                    onRefresh={fetchEvents}
                    onLogout={handleLogout}
                  />
                  <div className="flex items-center gap-2 min-w-0">
                    <img src={logoCastelo} alt="Logo" className="h-8 w-auto shrink-0" />
                    <h1 className="font-display font-bold text-foreground text-sm truncate">Agenda</h1>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button variant="default" size="sm" onClick={() => { setEditingEvent(null); setFormOpen(true); }}>
                    <Plus className="h-4 w-4 mr-1" /> Nova
                  </Button>
                  <NotificationBell />
                </div>
              </div>
            </div>
          </header>

          <PullToRefresh onRefresh={async () => { await fetchEvents(); }} className="flex-1 p-3 md:p-6 lg:p-8 overflow-x-hidden overflow-y-auto">
            <div className="max-w-7xl mx-auto space-y-6">
              {/* Desktop header */}
              <div className="hidden md:flex items-center justify-between gap-3">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-2xl bg-gradient-to-br from-primary/15 to-primary/5 shadow-sm">
                    <CalendarDays className="h-7 w-7 text-primary" />
                  </div>
                  <div>
                    <h1 className="text-3xl font-extrabold tracking-tight text-foreground">Agenda de Festas</h1>
                    <p className="text-sm text-muted-foreground/80 mt-0.5">Calendário mensal de eventos</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as "calendar" | "list")}>
                    <TabsList className="h-9">
                      <TabsTrigger value="calendar" className="px-3"><CalendarDays className="h-4 w-4" /></TabsTrigger>
                      <TabsTrigger value="list" className="px-3"><List className="h-4 w-4" /></TabsTrigger>
                    </TabsList>
                  </Tabs>
                  {(() => {
                    const visibleUnits = canViewAll ? physicalUnits : physicalUnits.filter(u => unitAccess[u.name]);
                    if (visibleUnits.length <= 1) return null;
                    return (
                      <Select value={selectedUnit} onValueChange={setSelectedUnit}>
                        <SelectTrigger className="w-[180px]"><SelectValue placeholder="Todas" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todas as unidades</SelectItem>
                          {visibleUnits.map(u => <SelectItem key={u.name} value={u.name}>{u.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    );
                  })()}
                  <Button onClick={() => { setEditingEvent(null); setFormOpen(true); }}>
                    <Plus className="h-4 w-4 mr-2" /> Nova Festa
                  </Button>
                </div>
              </div>

              {/* Summary */}
              <MonthSummaryCards events={filteredEvents} month={month} />

              {/* Calendar + Day detail */}
              {viewMode === "calendar" ? (
              <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-5 min-h-[520px]">
                <Card className="bg-card border-border/30 shadow-[0_4px_24px_rgba(0,0,0,0.04)] rounded-2xl">
                  <CardContent className="p-2 md:p-4 lg:p-5">
                    {loading ? (
                      <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
                    ) : (
                      <AgendaCalendar
                        events={filteredEvents}
                        month={month}
                        onMonthChange={setMonth}
                        onDayClick={setSelectedDate}
                        selectedDate={selectedDate}
                        checklistProgress={checklistProgress}
                      />
                    )}
                  </CardContent>
                </Card>

                <Card className="bg-muted/20 border-border/30 shadow-[0_4px_24px_rgba(0,0,0,0.04)] rounded-2xl">
                  <CardContent className="p-5 md:p-6">
                    <h3 className="font-semibold text-sm tracking-tight text-foreground/90 mb-0.5">
                      {selectedDate
                        ? format(selectedDate, "dd 'de' MMMM", { locale: ptBR })
                        : "Selecione um dia"}
                    </h3>
                    {!selectedDate && (
                      <p className="text-xs text-muted-foreground/60 mt-3">Clique em um dia no calendário para ver os eventos.</p>
                    )}
                    {selectedDate && dayEvents.length === 0 && (
                      <p className="text-xs text-muted-foreground/60 mt-3">Nenhuma festa neste dia.</p>
                    )}
                    <div className="space-y-2.5 mt-4">
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
                            onClick={() => { setDetailEvent(ev); setDetailOpen(true); }}
                            className={`w-full text-left p-4 rounded-2xl border border-border/30 border-l-[3px] ${statusColors} hover:shadow-[0_4px_16px_rgba(0,0,0,0.06)] hover:-translate-y-0.5 transition-all duration-200 ease-out cursor-pointer`}
                          >
                            <div className="flex items-center justify-between gap-2 mb-1.5">
                              <span className="font-semibold text-[13px] truncate">{ev.title}</span>
                              <Badge
                                variant={ev.status === "confirmado" ? "default" : ev.status === "cancelado" ? "destructive" : "secondary"}
                                className="text-[10px] shrink-0 font-medium uppercase tracking-wider px-2 py-0.5"
                              >
                                {ev.status}
                              </Badge>
                            </div>
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground mt-1">
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
                              {ev.total_value != null && ev.total_value > 0 && (
                                <span className="flex items-center gap-1 font-medium text-foreground/80">
                                  <DollarSign className="h-3 w-3" />
                                  R$ {ev.total_value.toLocaleString("pt-BR")}
                                </span>
                              )}
                            </div>
                            {conflicts.length > 0 && (
                              <div className="flex items-center gap-1 text-xs text-destructive font-medium mt-1.5">
                                <AlertTriangle className="h-3 w-3" /> Conflito de horário
                              </div>
                            )}
                            {checklistProgress[ev.id] && checklistProgress[ev.id].total > 0 && (
                              <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                                <ListChecks className="h-3 w-3" />
                                {checklistProgress[ev.id].completed}/{checklistProgress[ev.id].total} tarefas
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                    {selectedDate && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full mt-3"
                        onClick={() => {
                          setEditingEvent({ ...({} as EventFormData), event_date: format(selectedDate, "yyyy-MM-dd"), title: "", start_time: "", end_time: "", event_type: "infantil", guest_count: null, unit: "", status: "pendente", package_name: "", total_value: null, notes: "" });
                          setFormOpen(true);
                        }}
                      >
                        <Plus className="h-4 w-4 mr-1" /> Adicionar neste dia
                      </Button>
                    )}
                  </CardContent>
                </Card>
              </div>
              ) : (
                <Card className="bg-card border-border/30 shadow-[0_4px_24px_rgba(0,0,0,0.04)] rounded-2xl">
                  <CardContent className="p-4">
                    {loading ? (
                      <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
                    ) : (
                      <AgendaListView
                        events={filteredEvents}
                        onEventClick={(ev) => { setDetailEvent(ev as CompanyEvent); setDetailOpen(true); }}
                        getConflicts={(ev) => getConflicts(ev as CompanyEvent)}
                      />
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          </PullToRefresh>
        </div>
      </div>

      <EventFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        onSubmit={handleSubmit}
        initialData={editingEvent}
        units={physicalUnits}
      />

      <EventDetailSheet
        open={detailOpen}
        onOpenChange={setDetailOpen}
        event={detailEvent}
        onEdit={(ev) => handleEdit(ev as CompanyEvent)}
        onDelete={handleDelete}
        conflicts={detailEvent ? getConflicts(detailEvent) : []}
      />
    </SidebarProvider>
  );
}
