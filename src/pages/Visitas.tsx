import { LoadingScreen } from "@/components/ui/loading-screen";
import { useState, useEffect, useMemo } from "react";
import { Helmet } from "react-helmet-async";
import { useNavigate } from "react-router-dom";
import { format, isSameDay, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { DayPicker } from "react-day-picker";
import { supabase } from "@/integrations/supabase/client";
import { getCurrentCompanyId } from "@/lib/supabase-helpers";
import { useCompany } from "@/contexts/CompanyContext";
import { User } from "@supabase/supabase-js";

import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { MobileMenu } from "@/components/admin/MobileMenu";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { Loader2, Menu, Clock, MapPin, ChevronLeft, ChevronRight, Phone, MessageSquare, Check, RefreshCw, X, Plus, User as UserIcon, AlertTriangle, Trash2, PartyPopper, FileText, Package } from "lucide-react";
import { ReportDialog } from "@/components/reports/ReportDialog";
import { generateVisitasPDF, generateVisitasXLSX } from "@/lib/generateVisitasPDF";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { useUserRole } from "@/hooks/useUserRole";
import { VisitQualification } from "@/components/visitas/VisitQualification";
import { useCompanyUnits } from "@/hooks/useCompanyUnits";
import { VisitFormDialog } from "@/components/visitas/VisitFormDialog";
import { SendVisitConfirmationDialog } from "@/components/visitas/SendVisitConfirmationDialog";
import { logActivity } from "@/lib/activityLog";

// Status config
const VISIT_STATUSES = [
  { value: "agendada", label: "Agendada", color: "bg-blue-500/15 text-blue-700 border-blue-300", dot: "bg-blue-500" },
  { value: "confirmada", label: "Confirmada", color: "bg-green-500/15 text-green-700 border-green-300", dot: "bg-green-500" },
  { value: "realizada", label: "Realizada", color: "bg-emerald-700/15 text-emerald-800 border-emerald-400", dot: "bg-emerald-700" },
  { value: "nao_compareceu", label: "Não compareceu", color: "bg-red-500/15 text-red-700 border-red-300", dot: "bg-red-500" },
  { value: "remarcada", label: "Remarcada", color: "bg-amber-500/15 text-amber-700 border-amber-300", dot: "bg-amber-500" },
  { value: "cancelada", label: "Cancelada", color: "bg-muted text-muted-foreground border-border", dot: "bg-muted-foreground" },
];

const VISIT_STATUS_DOT: Record<string, string> = {
  agendada: "bg-blue-500",
  confirmada: "bg-green-500",
  realizada: "bg-emerald-700",
  nao_compareceu: "bg-red-500",
  remarcada: "bg-amber-500",
  cancelada: "bg-muted-foreground/40",
};



const getStatusInfo = (status: string) => VISIT_STATUSES.find((s) => s.value === status) || VISIT_STATUSES[0];

interface Visit {
  id: string;
  lead_id: string;
  company_id: string;
  data_visita: string;
  horario_visita: string | null;
  status_visita: string;
  observacoes: string | null;
  responsavel_user_id: string | null;
  created_by: string | null;
  created_at: string;
  unit: string | null;
  lead_name?: string;
  lead_phone?: string;
  lead_guests?: string | null;
  lead_month?: string | null;
  // Qualification fields
  package_interest?: string | null;
  guest_count?: number | null;
  party_date_interest?: string | null;
  payment_preference?: string | null;
  interest_level?: string | null;
  restrictions?: any;
  client_questions?: string | null;
  seller_notes?: string | null;
  // Atendimento fields
  visit_type?: string;
  event_id?: string | null;
  items_description?: string | null;
  event_title?: string | null;
}

export default function Visitas() {
  const navigate = useNavigate();
  const { currentCompany } = useCompany();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [calendarMonth, setCalendarMonth] = useState<Date>(new Date());
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterResponsavel, setFilterResponsavel] = useState("all");
  const [filterUnit, setFilterUnit] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [detailVisit, setDetailVisit] = useState<Visit | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [createType, setCreateType] = useState<"visita" | "atendimento">("visita");
  const [confirmationOpen, setConfirmationOpen] = useState(false);
  const [profiles, setProfiles] = useState<{ user_id: string; full_name: string }[]>([]);

  const { units } = useCompanyUnits(currentCompany?.id);

  const [reportOpen, setReportOpen] = useState(false);

  const { isAdmin, canManageUsers } = useUserRole(user?.id);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setIsLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!isLoading && !user) navigate("/auth");
  }, [isLoading, user]);

  useEffect(() => {
    if (!currentCompany?.id) return;
    supabase.from("profiles").select("user_id, full_name")
      .then(({ data }) => { if (data) setProfiles(data); });
  }, [currentCompany?.id]);

  // Load visits for entire month
  const fetchVisits = async () => {
    const companyId = getCurrentCompanyId();
    if (!companyId) return;

    const startDate = format(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), 1), "yyyy-MM-dd");
    const endDate = format(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 0), "yyyy-MM-dd");

    const { data, error } = await (supabase as any)
      .from("lead_visits")
      .select("id, lead_id, company_id, data_visita, horario_visita, status_visita, observacoes, responsavel_user_id, created_by, created_at, unit, package_interest, guest_count, party_date_interest, payment_preference, interest_level, restrictions, client_questions, seller_notes, lead_channel, visit_type, event_id, items_description")
      .eq("company_id", companyId)
      .gte("data_visita", startDate)
      .lte("data_visita", endDate)
      .order("data_visita", { ascending: true })
      .order("horario_visita", { ascending: true });

    if (error) { console.error(error); return; }

    if (data && data.length > 0) {
      const leadIds = [...new Set(data.map((v: any) => v.lead_id))];
      const { data: leads } = await supabase
        .from("campaign_leads")
        .select("id, name, whatsapp, month, guests")
        .in("id", leadIds as string[]);

      const leadMap = new Map((leads || []).map((l: any) => [l.id, l]));
      // Fetch event titles for visits linked to events
      const eventIds = [...new Set(data.filter((v: any) => v.event_id).map((v: any) => v.event_id))];
      let eventMap = new Map<string, string>();
      if (eventIds.length > 0) {
        const { data: events } = await (supabase as any)
          .from("company_events")
          .select("id, title")
          .in("id", eventIds);
        eventMap = new Map((events || []).map((e: any) => [e.id, e.title]));
      }

      const mappedVisits = data.map((v: any) => ({
        ...v,
        lead_name: leadMap.get(v.lead_id)?.name || "Lead desconhecido",
        lead_phone: leadMap.get(v.lead_id)?.whatsapp || "",
        lead_guests: leadMap.get(v.lead_id)?.guests || null,
        lead_month: leadMap.get(v.lead_id)?.month || null,
        event_title: v.event_id ? eventMap.get(v.event_id) || null : null,
      }));

      setVisits(mappedVisits);
      setDetailVisit((current) => current ? mappedVisits.find((visit) => visit.id === current.id) || current : current);
    } else {
      setVisits([]);
      setDetailVisit((current) => current ? null : current);
    }
  };

  useEffect(() => {
    const companyId = currentCompany?.id || getCurrentCompanyId();
    if (companyId && user) fetchVisits();
  }, [currentCompany?.id, user, calendarMonth]);

  // Filtered visits
  const filteredVisits = useMemo(() => {
    return visits.filter(v => {
      if (filterStatus !== "all" && v.status_visita !== filterStatus) return false;
      if (filterResponsavel !== "all" && v.responsavel_user_id !== filterResponsavel) return false;
      if (filterUnit !== "all" && v.unit !== filterUnit) return false;
      if (filterType !== "all" && (v.visit_type || "visita") !== filterType) return false;
      return true;
    });
  }, [visits, filterStatus, filterResponsavel, filterUnit, filterType]);

  // Visits for selected day
  const selectedDayVisits = useMemo(() => {
    const dateStr = format(selectedDate, "yyyy-MM-dd");
    return filteredVisits
      .filter(v => v.data_visita === dateStr)
      .sort((a, b) => (a.horario_visita || "99:99").localeCompare(b.horario_visita || "99:99"));
  }, [filteredVisits, selectedDate]);

  // Visits grouped by date for calendar dots
  const visitsByDate = useMemo(() => {
    const map = new Map<string, Visit[]>();
    filteredVisits.forEach(v => {
      if (!map.has(v.data_visita)) map.set(v.data_visita, []);
      map.get(v.data_visita)!.push(v);
    });
    return map;
  }, [filteredVisits]);



  const updateVisitStatus = async (visitId: string, newStatus: string) => {
    const { error } = await (supabase as any).from("lead_visits").update({ status_visita: newStatus }).eq("id", visitId);
    if (error) {
      toast({ title: "Erro ao atualizar", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Status atualizado!" });
      fetchVisits();
      if (detailVisit?.id === visitId) setDetailVisit(prev => prev ? { ...prev, status_visita: newStatus } : null);
    }
  };

  const handleClosedAtVisit = async (visit: Visit) => {
    // Update lead status to "fechado"
    const { error: leadError } = await supabase
      .from("campaign_leads")
      .update({ status: "fechado" as any, observacoes: `Fechou na visita em ${format(parseISO(visit.data_visita + "T12:00:00"), "dd/MM/yyyy")}` })
      .eq("id", visit.lead_id);

    if (leadError) {
      toast({ title: "Erro ao atualizar lead", description: leadError.message, variant: "destructive" });
      return;
    }

    // Also mark visit as "realizada" if not already
    if (visit.status_visita !== "realizada") {
      await (supabase as any).from("lead_visits").update({ status_visita: "realizada" }).eq("id", visit.id);
    }

    toast({ title: "🎉 Festa fechada na visita!", description: `${visit.lead_name} marcado como Fechado.` });
    fetchVisits();
    if (detailVisit?.id === visit.id) {
      setDetailVisit(prev => prev ? { ...prev, status_visita: "realizada" } : null);
    }
  };

  const deleteVisit = async (visitId: string) => {
    const visitToDelete = visits.find((visit) => visit.id === visitId) ?? detailVisit;
    const { error } = await (supabase as any).from("lead_visits").delete().eq("id", visitId);
    if (error) {
      toast({ title: "Erro ao excluir", description: error.message, variant: "destructive" });
    } else {
      if (currentCompany?.id) {
        logActivity({
          companyId: currentCompany.id,
          action: 'delete',
          module: 'events',
          entityType: 'visit',
          entityId: visitId,
          entityName: visitToDelete?.lead_name || visitToDelete?.event_title || 'Visita',
          details: visitToDelete
            ? {
                visitType: visitToDelete.visit_type || 'visita',
                date: visitToDelete.data_visita,
                time: visitToDelete.horario_visita,
                status: visitToDelete.status_visita,
                leadId: visitToDelete.lead_id,
                unit: visitToDelete.unit,
              }
            : undefined,
        });
      }
      toast({ title: "Visita excluída!" });
      setDetailVisit(null);
      fetchVisits();
    }
  };

  const handleLogout = async () => { await supabase.auth.signOut(); navigate("/auth"); };

  if (isLoading || !user) {
    return <LoadingScreen message="Carregando visitas..." />;
  }

  const isMobile = typeof window !== "undefined" && window.innerWidth < 768;

  // ─── Calendar component (like AgendaCalendar) ───
  const visitsCalendar = (
    <DayPicker
      mode="single"
      selected={selectedDate}
      onSelect={(date) => date && setSelectedDate(date)}
      month={calendarMonth}
      onMonthChange={setCalendarMonth}
      locale={ptBR}
      showOutsideDays
      className="p-2 lg:p-5"
      classNames={{
        months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
        month: "space-y-4 w-full",
        caption: "flex justify-center pt-2 lg:pt-3 relative items-center mb-2",
        caption_label: "text-base lg:text-lg font-semibold capitalize tracking-tight text-foreground",
        nav: "space-x-1 flex items-center",
        nav_button: cn(
          buttonVariants({ variant: "ghost" }),
          "h-8 w-8 lg:h-9 lg:w-9 p-0 text-muted-foreground/60 hover:text-foreground hover:bg-accent rounded-xl transition-all duration-150"
        ),
        nav_button_previous: "absolute left-1",
        nav_button_next: "absolute right-1",
        table: "w-full border-collapse",
        head_row: "flex",
        head_cell: "text-muted-foreground/50 flex-1 font-medium text-[0.65rem] lg:text-[0.7rem] text-center uppercase tracking-[0.15em] pb-2",
        row: "flex w-full",
        cell: "flex-1 text-center text-sm p-0.5 lg:p-[3px] relative focus-within:relative focus-within:z-20",
        day: cn(
          buttonVariants({ variant: "ghost" }),
          "h-12 lg:h-[4.5rem] w-full p-0 font-normal aria-selected:opacity-100 relative rounded-xl",
          "hover:bg-primary/[0.06] transition-all duration-150 cursor-pointer"
        ),
        day_range_end: "day-range-end",
        day_selected: cn(
          "bg-gradient-to-br from-primary to-primary/90 text-primary-foreground",
          "hover:from-primary hover:to-primary/90 hover:text-primary-foreground",
          "focus:from-primary focus:to-primary/90 focus:text-primary-foreground",
          "shadow-[0_2px_12px_rgba(0,0,0,0.12)] ring-1 ring-primary/20"
        ),
        day_today: cn("bg-accent text-foreground font-semibold", "ring-1 ring-border"),
        day_outside: "day-outside text-muted-foreground/30",
        day_disabled: "text-muted-foreground/30",
        day_hidden: "invisible",
      }}
      components={{
        IconLeft: () => <ChevronLeft className="h-4 w-4" />,
        IconRight: () => <ChevronRight className="h-4 w-4" />,
        DayContent: ({ date }) => {
          const dateKey = format(date, "yyyy-MM-dd");
          const dayVisits = visitsByDate.get(dateKey) || [];
          const count = dayVisits.length;

          return (
            <div className="flex flex-col items-center gap-0.5 lg:gap-1 w-full h-full justify-center relative">
              <span className={cn(
                "text-sm lg:text-base transition-colors duration-150",
                count > 0 ? "font-semibold text-foreground" : "text-foreground/65"
              )}>
                {date.getDate()}
              </span>
              {count > 0 && (
                <div className="flex items-center gap-[2px] lg:gap-[3px] justify-center">
                    {dayVisits.slice(0, 3).map((v) => (
                      <span
                        key={v.id}
                        className={cn(
                          "h-[5px] w-[5px] lg:h-[6px] lg:w-[6px] rounded-full",
                          (v.visit_type || "visita") === "atendimento"
                            ? "bg-violet-500"
                            : (VISIT_STATUS_DOT[v.status_visita] || "bg-muted-foreground/40")
                        )}
                      />
                  ))}
                  {count > 3 && (
                    <span className="text-[7px] lg:text-[8px] font-bold text-muted-foreground/70 leading-none ml-0.5">
                      +{count - 3}
                    </span>
                  )}
                </div>
              )}
              {count >= 2 && (
                <span className="absolute top-0 right-0 lg:top-0.5 lg:right-0.5 h-3.5 w-3.5 lg:h-4 lg:w-4 rounded-full bg-primary/90 text-primary-foreground text-[7px] lg:text-[8px] font-bold flex items-center justify-center leading-none">
                  {count}
                </span>
              )}
            </div>
          );
        },
      }}
    />
  );

  // ─── Selected day visits panel ───
  const selectedDayLabel = format(selectedDate, "dd 'de' MMMM", { locale: ptBR });
  const isToday = isSameDay(selectedDate, new Date());

  const dayPanel = (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-base font-bold text-foreground">
            {isToday ? "Hoje" : selectedDayLabel}
          </h2>
          {!isToday && (
            <p className="text-xs text-muted-foreground mt-0.5">
              {format(selectedDate, "EEEE", { locale: ptBR })}
            </p>
          )}
        </div>
        <Badge variant="outline" className="text-xs font-semibold">
          {selectedDayVisits.length} agendamento{selectedDayVisits.length !== 1 ? "s" : ""}
        </Badge>
      </div>

      {selectedDayVisits.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-muted/60 flex items-center justify-center">
            <MapPin className="h-6 w-6 text-muted-foreground/40" />
          </div>
          <p className="text-sm font-medium text-muted-foreground">Nenhum agendamento neste dia</p>
          <p className="text-xs text-muted-foreground/60 mt-1">Clique em "Nova Visita" ou "Atendimento"</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {selectedDayVisits.map(visit => {
            const status = getStatusInfo(visit.status_visita);
            const responsavel = profiles.find(p => p.user_id === visit.responsavel_user_id);
            const isEntrega = (visit.visit_type || "visita") === "atendimento";
            return (
              <div
                key={visit.id}
                onClick={() => setDetailVisit(visit)}
                className={cn(
                  "group rounded-2xl border bg-card p-4 cursor-pointer transition-all duration-200",
                  "hover:shadow-lg hover:shadow-primary/5 hover:border-primary/30 hover:-translate-y-0.5",
                  isEntrega ? "border-violet-300/50" : "border-border/40"
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      {isEntrega && <Package className="h-4 w-4 text-violet-500 shrink-0" />}
                      <p className="font-bold text-[15px] truncate">{visit.lead_name}</p>
                    </div>
                    <div className="flex items-center gap-3 mt-1.5">
                      {visit.horario_visita && (
                        <span className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
                          <Clock className="h-3.5 w-3.5 text-primary/60" /> {visit.horario_visita}
                        </span>
                      )}
                      {responsavel && (
                        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <UserIcon className="h-3 w-3" /> {responsavel.full_name?.split(" ")[0]}
                        </span>
                      )}
                      {visit.unit && (
                        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <MapPin className="h-3 w-3" /> {visit.unit}
                        </span>
                      )}
                      {isEntrega && visit.event_title && (
                        <span className="flex items-center gap-1.5 text-xs text-violet-600 font-medium">
                          <PartyPopper className="h-3 w-3" /> {visit.event_title}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    {isEntrega && (
                      <Badge variant="outline" className="text-[10px] border font-semibold bg-violet-500/15 text-violet-700 border-violet-300">
                        Atendimento
                      </Badge>
                    )}
                    <Badge variant="outline" className={cn("text-[10px] border font-semibold", status.color)}>
                      {status.label}
                    </Badge>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  // ─── Unconfirmed alerts ───
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = format(tomorrow, "yyyy-MM-dd");
  const todayStr = format(new Date(), "yyyy-MM-dd");
  const unconfirmedSoon = visits.filter(
    v => (v.data_visita === tomorrowStr || v.data_visita === todayStr) && v.status_visita === "agendada"
  );

  // ─── Main content ───
  const mainContent = (
    <div className="space-y-6">
      {/* Alert */}
      {unconfirmedSoon.length > 0 && (
        <div className="mb-5 rounded-2xl border border-amber-300/50 bg-gradient-to-r from-amber-50/80 to-amber-50/30 dark:from-amber-950/30 dark:to-transparent p-4 flex items-start gap-3">
          <div className="p-2 rounded-xl bg-amber-100 dark:bg-amber-900/40 shrink-0">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
          </div>
          <div>
            <p className="text-sm font-bold text-amber-800 dark:text-amber-300">
              {unconfirmedSoon.length} visita{unconfirmedSoon.length > 1 ? "s" : ""} sem confirmação
            </p>
            <p className="text-xs text-amber-700/80 dark:text-amber-400/80 mt-0.5">
              {unconfirmedSoon.map(v => v.lead_name).join(", ")} — {unconfirmedSoon.some(v => v.data_visita === todayStr) ? "hoje" : "amanhã"}
            </p>
          </div>
        </div>
      )}

      {/* Filters + CTA row */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2 w-full">
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className={cn(
              "h-9 flex-1 min-w-0 text-xs rounded-xl border-border/50 bg-card shadow-sm transition-all duration-200",
              filterStatus !== "all" && "border-primary/40 bg-primary/5 text-primary font-semibold ring-1 ring-primary/20"
            )}>
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos status</SelectItem>
              {VISIT_STATUSES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
            </SelectContent>
          </Select>
          {units.length > 1 && (
            <Select value={filterUnit} onValueChange={setFilterUnit}>
              <SelectTrigger className={cn(
                "h-9 flex-1 min-w-0 text-xs rounded-xl border-border/50 bg-card shadow-sm transition-all duration-200",
                filterUnit !== "all" && "border-primary/40 bg-primary/5 text-primary font-semibold ring-1 ring-primary/20"
              )}>
                <SelectValue placeholder="Unidade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas unidades</SelectItem>
                {units.map(u => <SelectItem key={u.id} value={u.name}>{u.name}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
          <Select value={filterResponsavel} onValueChange={setFilterResponsavel}>
            <SelectTrigger className={cn(
              "h-9 flex-1 min-w-0 text-xs rounded-xl border-border/50 bg-card shadow-sm transition-all duration-200",
              filterResponsavel !== "all" && "border-primary/40 bg-primary/5 text-primary font-semibold ring-1 ring-primary/20"
            )}>
              <SelectValue placeholder="Responsável" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {profiles.map(p => <SelectItem key={p.user_id} value={p.user_id}>{p.full_name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className={cn(
              "h-9 flex-1 min-w-0 text-xs rounded-xl border-border/50 bg-card shadow-sm transition-all duration-200",
              filterType !== "all" && "border-violet-400 bg-violet-500/5 text-violet-700 font-semibold ring-1 ring-violet-300"
            )}>
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos tipos</SelectItem>
              <SelectItem value="visita">Visitas</SelectItem>
              <SelectItem value="atendimento">Atendimento</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button size="sm" className="h-10 px-5 rounded-xl gap-2 font-semibold shadow-sm" onClick={() => { setCreateType("visita"); setCreateOpen(true); }}>
            <Plus className="h-4 w-4" /> Nova Visita
          </Button>
          <Button size="sm" variant="outline" className="h-10 px-5 rounded-xl gap-2 font-semibold shadow-sm border-violet-300 text-violet-700 hover:bg-violet-50 dark:hover:bg-violet-950/30" onClick={() => { setCreateType("atendimento"); setCreateOpen(true); }}>
            <Package className="h-4 w-4" /> Atendimento
          </Button>
        </div>
      </div>

      {/* Visit Summary Cards */}
      {(() => {
        const visitasComerciais = filteredVisits.filter(v => (v.visit_type || "visita") !== "atendimento");
        const atendimentos = filteredVisits.filter(v => (v.visit_type || "visita") === "atendimento");
        const agendadas = filteredVisits.filter(v => v.status_visita === "agendada").length;
        const realizadas = filteredVisits.filter(v => v.status_visita === "realizada").length;
        const naoComp = filteredVisits.filter(v => v.status_visita === "nao_compareceu").length;
        const canceladas = filteredVisits.filter(v => v.status_visita === "cancelada").length;

        const summaryCards = [
          { label: "Visitas Comerciais", value: visitasComerciais.length, icon: MapPin, color: "text-primary", bg: "bg-primary/10", border: "border-l-primary", tint: "bg-primary/[0.02]" },
          { label: "Atendimentos", value: atendimentos.length, icon: Phone, color: "text-violet-600", bg: "bg-violet-500/10", border: "border-l-violet-500", tint: "bg-violet-500/[0.02]" },
          { label: "Agendadas", value: agendadas, icon: Clock, color: "text-blue-600", bg: "bg-blue-500/10", border: "border-l-blue-500", tint: "bg-blue-500/[0.02]" },
          { label: "Realizadas", value: realizadas, icon: Check, color: "text-green-700", bg: "bg-green-600/10", border: "border-l-green-700", tint: "bg-green-700/[0.02]" },
        ];

        const getDaysInMonthCount = (d: Date) => new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
        const totalDays = getDaysInMonthCount(calendarMonth);
        const uniqueDaysWithVisit = new Set(filteredVisits.filter(v => v.status_visita !== "cancelada").map(v => v.data_visita)).size;
        const freeDays = totalDays - uniqueDaysWithVisit;
        const occupancyRate = totalDays > 0 ? Math.round((uniqueDaysWithVisit / totalDays) * 100) : 0;

        return (
          <div className="space-y-4 mb-6 animate-fade-up">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
              {summaryCards.map((c) => (
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
                    <RefreshCw className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground/80 uppercase tracking-wider">Ocupação do Mês</p>
                    <div className="flex items-baseline gap-2 mt-0.5">
                      <span className="text-2xl font-extrabold tracking-tight">{occupancyRate}%</span>
                      <span className="text-xs text-muted-foreground/60">{uniqueDaysWithVisit} dias com visita · {freeDays} dias livres</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-xs text-muted-foreground/70">
                  <div className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-emerald-500" /><span>{realizadas} realiz.</span></div>
                  <div className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-blue-500" /><span>{agendadas} agend.</span></div>
                  <div className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-red-400" /><span>{naoComp + canceladas} canc./falta</span></div>
                </div>
              </div>
              <div className="mt-3 h-2 rounded-full bg-muted/50 overflow-hidden">
                <div className="h-full rounded-full bg-gradient-to-r from-primary to-primary/70 transition-all duration-500 ease-out" style={{ width: `${occupancyRate}%` }} />
              </div>
            </div>
          </div>
        );
      })()}

      {/* Calendar + Day panel layout */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6">
        {/* Calendar */}
        <div className="rounded-2xl border border-border/40 bg-card shadow-sm overflow-hidden">
          {visitsCalendar}
        </div>

        {/* Day detail panel */}
        <div className="rounded-2xl border border-border/40 bg-card shadow-sm p-5">
          {dayPanel}
        </div>
      </div>
    </div>
  );

  // ─── Detail sheet & create dialog (inline JSX) ───
  const detailStatus = detailVisit ? getStatusInfo(detailVisit.status_visita) : null;
  const detailResponsavel = detailVisit ? profiles.find(p => p.user_id === detailVisit.responsavel_user_id) : null;



  const isDetailEntrega = detailVisit && (detailVisit.visit_type || "visita") === "atendimento";

  const detailSheet = (
    <Sheet open={!!detailVisit} onOpenChange={() => setDetailVisit(null)}>
      <SheetContent className="w-full sm:max-w-lg p-0 overflow-y-auto">
        {detailVisit && detailStatus && (
          <>
            <div className={cn(
              "px-6 pt-6 pb-4 border-b border-border/40",
              isDetailEntrega
                ? "bg-gradient-to-br from-violet-500/10 via-violet-500/5 to-transparent"
                : "bg-gradient-to-br from-primary/10 via-primary/5 to-transparent"
            )}>
              <SheetHeader>
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "p-2.5 rounded-xl ring-1",
                    isDetailEntrega
                      ? "bg-violet-500/15 ring-violet-500/20"
                      : "bg-primary/15 ring-primary/20"
                  )}>
                    {isDetailEntrega
                      ? <Package className="h-5 w-5 text-violet-600" />
                      : <MapPin className="h-5 w-5 text-primary" />
                    }
                  </div>
                  <div className="min-w-0 flex-1">
                    <SheetTitle className="text-lg font-bold truncate">{detailVisit.lead_name}</SheetTitle>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {isDetailEntrega && <span className="text-violet-600 font-semibold">Atendimento · </span>}
                      {format(parseISO(detailVisit.data_visita + "T12:00:00"), "dd 'de' MMMM, yyyy", { locale: ptBR })}
                      {detailVisit.horario_visita && ` às ${detailVisit.horario_visita}`}
                    </p>
                  </div>
                  {!isDetailEntrega && detailVisit.interest_level && (
                    <Badge variant="outline" className={cn("text-[10px] shrink-0 border font-semibold",
                      detailVisit.interest_level === "alto" && "bg-orange-500/15 text-orange-700 border-orange-300",
                      detailVisit.interest_level === "medio" && "bg-amber-500/15 text-amber-700 border-amber-300",
                      detailVisit.interest_level === "baixo" && "bg-muted text-muted-foreground border-border",
                    )}>
                      {detailVisit.interest_level === "alto" ? "🔥 Alto" : detailVisit.interest_level === "medio" ? "🤔 Médio" : "❄️ Baixo"}
                    </Badge>
                  )}
                </div>
              </SheetHeader>
            </div>
            <div className="p-6 space-y-5">
              {detailVisit.lead_phone && (
                <Button
                  className="w-full gap-2"
                  onClick={() => {
                    const cleanPhone = detailVisit.lead_phone.replace(/\D/g, '');
                    const phoneWithCountry = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;
                    navigate(`/atendimento?phone=${phoneWithCountry}`);
                  }}
                >
                  <MessageSquare className="h-4 w-4" />
                  Abrir Conversa
                </Button>
              )}

              {/* Items description for atendimento */}
              {isDetailEntrega && (detailVisit.items_description || detailVisit.event_title) && (
                <div className="rounded-xl border border-violet-300/40 bg-violet-50/50 dark:bg-violet-950/20 p-4 space-y-3">
                  <p className="text-[11px] uppercase tracking-wider font-semibold text-violet-600">📋 Detalhes do Atendimento</p>
                  {detailVisit.event_title && (
                    <div><p className="text-xs text-muted-foreground">Festa vinculada</p><p className="font-medium text-sm">{detailVisit.event_title}</p></div>
                  )}
                  {detailVisit.items_description && (
                    <div><p className="text-xs text-muted-foreground">Itens</p><p className="font-medium text-sm leading-relaxed">{detailVisit.items_description}</p></div>
                  )}
                </div>
              )}

              <div className="rounded-xl border border-border/40 bg-card p-4 space-y-3">
                <p className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">Informações do Lead</p>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><p className="text-xs text-muted-foreground">Telefone</p><p className="font-medium">{detailVisit.lead_phone || "—"}</p></div>
                  {!isDetailEntrega && <div><p className="text-xs text-muted-foreground">Convidados</p><p className="font-medium">{detailVisit.lead_guests || "—"}</p></div>}
                  {!isDetailEntrega && <div><p className="text-xs text-muted-foreground">Mês pretendido</p><p className="font-medium">{detailVisit.lead_month || "—"}</p></div>}
                  <div><p className="text-xs text-muted-foreground">Responsável</p><p className="font-medium">{detailResponsavel?.full_name || "—"}</p></div>
                  {detailVisit.unit && (
                    <div><p className="text-xs text-muted-foreground">Unidade</p><p className="font-medium">{detailVisit.unit}</p></div>
                  )}
                </div>
              </div>
              <div className="rounded-xl border border-border/40 bg-card p-4">
                <p className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground mb-3">Status</p>
                <Badge variant="outline" className={cn("text-sm border px-3 py-1", detailStatus.color)}>{detailStatus.label}</Badge>
                {detailVisit.observacoes && <p className="text-sm text-muted-foreground mt-3 leading-relaxed">{detailVisit.observacoes}</p>}
              </div>
              <div className="rounded-xl border border-border/40 bg-card p-4 space-y-2">
                <p className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground mb-3">Ações</p>
                <div className="grid grid-cols-2 gap-2">
                  {detailVisit.lead_phone && (
                    <Button variant="outline" size="sm" className="text-xs gap-1.5" onClick={() => {
                      const cleanPhone = detailVisit.lead_phone.replace(/\D/g, '');
                      const phoneWithCountry = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;
                      navigate(`/atendimento?phone=${phoneWithCountry}`);
                    }}>
                      <MessageSquare className="h-3.5 w-3.5" /> WhatsApp
                    </Button>
                  )}
                  {detailVisit.lead_phone && (
                    <Button variant="outline" size="sm" className="text-xs gap-1.5" asChild>
                      <a href={`tel:${detailVisit.lead_phone}`}><Phone className="h-3.5 w-3.5" /> Ligar</a>
                    </Button>
                  )}
                  <Button variant="outline" size="sm" className="text-xs gap-1.5" onClick={() => updateVisitStatus(detailVisit.id, "realizada")}><Check className="h-3.5 w-3.5" /> Realizada</Button>
                  <Button variant="outline" size="sm" className="text-xs gap-1.5" onClick={() => updateVisitStatus(detailVisit.id, "confirmada")}><Check className="h-3.5 w-3.5 text-green-600" /> Confirmar</Button>
                  <Button variant="outline" size="sm" className="text-xs gap-1.5" onClick={() => updateVisitStatus(detailVisit.id, "remarcada")}><RefreshCw className="h-3.5 w-3.5" /> Remarcar</Button>
                  <Button variant="outline" size="sm" className="text-xs gap-1.5 text-destructive hover:text-destructive" onClick={() => updateVisitStatus(detailVisit.id, "cancelada")}><X className="h-3.5 w-3.5" /> Cancelar</Button>
                  {!isDetailEntrega && detailVisit.lead_phone && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="col-span-2 text-xs gap-1.5 border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                      onClick={() => setConfirmationOpen(true)}
                    >
                      <MessageSquare className="h-3.5 w-3.5" /> Enviar confirmação de visita
                    </Button>
                  )}
                  {!isDetailEntrega && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="col-span-2 text-xs gap-1.5 border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                      onClick={() => handleClosedAtVisit(detailVisit)}
                    >
                      <PartyPopper className="h-3.5 w-3.5" /> Fechou na Visita 🎉
                    </Button>
                  )}
                </div>
                <div className="pt-2 border-t border-border/30 mt-3">
                  <Label className="text-xs text-muted-foreground">Alterar status manualmente</Label>
                  <Select value={detailVisit.status_visita} onValueChange={(v) => updateVisitStatus(detailVisit.id, v)}>
                    <SelectTrigger className="h-9 mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>{VISIT_STATUSES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="pt-3 border-t border-border/30 mt-3">
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" size="sm" className="w-full text-xs gap-1.5 text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30">
                        <Trash2 className="h-3.5 w-3.5" /> Excluir {isDetailEntrega ? "Agendamento" : "Visita"}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Excluir {isDetailEntrega ? "agendamento" : "visita"}?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Essa ação não pode ser desfeita. O registro de <strong>{detailVisit.lead_name}</strong> será removido permanentemente.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={() => deleteVisit(detailVisit.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                          Excluir
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>

              {/* Qualification Section - only for visits, not atendimento */}
              {!isDetailEntrega && (
                <VisitQualification
                  visitId={detailVisit.id}
                  initialData={{
                    package_interest: detailVisit.package_interest || null,
                    guest_count: detailVisit.guest_count || null,
                    party_date_interest: detailVisit.party_date_interest || null,
                    payment_preference: detailVisit.payment_preference || null,
                    interest_level: detailVisit.interest_level || null,
                    restrictions: Array.isArray(detailVisit.restrictions)
                      ? (detailVisit.restrictions as any[]).map((r: any) => typeof r === 'string' ? r : r.type)
                      : [],
                    restriction_notes: Array.isArray(detailVisit.restrictions)
                      ? ((detailVisit.restrictions as any[]).find((r: any) => r.type === 'outro')?.notes || '')
                      : '',
                    client_questions: detailVisit.client_questions || null,
                    seller_notes: detailVisit.seller_notes || null,
                    lead_channel: (detailVisit as any).lead_channel || null,
                  }}
                  onSaved={fetchVisits}
                />
              )}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );

  const confirmationDialog = (
    <SendVisitConfirmationDialog
      open={confirmationOpen}
      onOpenChange={setConfirmationOpen}
      visit={detailVisit ? {
        id: detailVisit.id,
        lead_id: detailVisit.lead_id,
        lead_name: detailVisit.lead_name,
        lead_phone: detailVisit.lead_phone,
        data_visita: detailVisit.data_visita,
        horario_visita: detailVisit.horario_visita,
        company_id: detailVisit.company_id,
      } : null}
      onSent={fetchVisits}
    />
  );

  const createDialog = (
    <VisitFormDialog
      open={createOpen}
      onOpenChange={setCreateOpen}
      visitType={createType}
      currentUserId={user!.id}
      onCreated={fetchVisits}
    />
  );

  const headerContent = (
    <>
      <div className="p-2.5 rounded-xl bg-gradient-to-br from-primary to-primary/80 shadow-lg shadow-primary/20">
        <MapPin className="h-5 w-5 text-primary-foreground" />
      </div>
      <h1 className="font-display font-bold text-foreground text-lg tracking-tight">Agenda de Visitas</h1>
    </>
  );

  // Mobile
  if (isMobile) {
    return (
      <div className="h-dvh flex flex-col overflow-hidden bg-background">
        <Helmet><title>Visitas</title></Helmet>
        <header className="bg-card border-b border-border shrink-0 z-10 px-3 py-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <MobileMenu
                isOpen={isMobileMenuOpen}
                onOpenChange={setIsMobileMenuOpen}
                trigger={<Button variant="ghost" size="icon" className="h-9 w-9"><Menu className="w-5 h-5" /></Button>}
                currentPage={"atendimento"}
                userName={user.email || ""}
                userEmail={user.email || ""}
                canManageUsers={canManageUsers}
                isAdmin={isAdmin}
                onLogout={handleLogout}
              />
              <div className="flex items-center gap-2 min-w-0 flex-1">
                {headerContent}
              </div>
            </div>
            <Button variant="outline" size="icon" className="h-9 w-9 shrink-0 border-blue-300 text-blue-600 hover:bg-blue-50" onClick={() => setReportOpen(true)} title="Gerar Relatório">
              <FileText className="h-4 w-4" />
            </Button>
          </div>
        </header>
        <div className="flex-1 overflow-y-auto">
          <div className="p-4 md:p-6 max-w-7xl mx-auto">
            {mainContent}
          </div>
        </div>
        {detailSheet}
        {createDialog}
        {confirmationDialog}
      </div>
    );
  }

  // Desktop
  return (
    <SidebarProvider>
      <Helmet><title>Visitas</title></Helmet>
      <div className="h-dvh flex w-full overflow-hidden">
        <AdminSidebar
          canManageUsers={canManageUsers}
          isAdmin={isAdmin}
          currentUserName={user.email || ""}
          onRefresh={fetchVisits}
          onLogout={handleLogout}
        />
        <SidebarInset className="flex-1 flex flex-col overflow-hidden min-w-0 bg-background">
          <div className="flex-1 overflow-y-auto overflow-x-hidden p-3 md:p-6 lg:p-8">
            <div className="max-w-7xl mx-auto space-y-6">
              <div className="relative rounded-2xl border border-border/30 bg-gradient-to-r from-card via-card to-primary/[0.03] shadow-[0_4px_24px_rgba(0,0,0,0.04)] overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_80%_-20%,hsl(var(--primary)/0.06),transparent)]" />
                <div className="relative flex items-center justify-between gap-4 p-5 md:p-6">
                  <div className="flex items-center gap-4">
                    <SidebarTrigger className="text-muted-foreground hover:text-foreground shrink-0" />
                    <div className="p-3 rounded-2xl bg-gradient-to-br from-primary to-primary/80 shadow-lg shadow-primary/20">
                      <MapPin className="h-7 w-7 text-primary-foreground" />
                    </div>
                    <div>
                      <h1 className="text-2xl lg:text-3xl font-extrabold tracking-tight text-foreground">Agenda de Visitas</h1>
                      <p className="text-sm text-muted-foreground/70 mt-0.5">Gerencie visitas e acompanhamentos</p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-9 w-9 shrink-0 border-blue-300 text-blue-600 hover:bg-blue-50"
                    onClick={() => setReportOpen(true)}
                    title="Gerar Relatório"
                  >
                    <FileText className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              {mainContent}
            </div>
          </div>
        </SidebarInset>
      </div>
      {detailSheet}
      {createDialog}
      {confirmationDialog}
      <ReportDialog
        open={reportOpen}
        onOpenChange={setReportOpen}
        title="Relatório de Visitas"
        reportTypes={[
          { value: 'geral', label: 'Relatório Geral', desc: 'Todas as visitas com resumo, tabela e gráficos de canal' },
        ]}
        unitOptions={units.filter(u => u.slug !== 'trabalhe-conosco').map(u => ({ value: u.name, label: u.name }))}
        onGenerate={(p) => {
          const filtered = p.unit === 'all' ? visits : visits.filter(v => v.unit === p.unit);
          const mapped = filtered.map(v => ({ ...v, como_conheceu: (v as any).lead_channel || null }));
          const reportParams = { type: p.type, companyName: currentCompany?.name || '', periodLabel: p.periodLabel, from: p.from, to: p.to, visits: mapped };
          if (p.format === 'xlsx') generateVisitasXLSX(reportParams);
          else generateVisitasPDF(reportParams);
        }}
      />
    </SidebarProvider>
  );
}
