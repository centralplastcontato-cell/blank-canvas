import { useState, useEffect, useMemo } from "react";
import { Helmet } from "react-helmet-async";
import { useNavigate } from "react-router-dom";
import { format, startOfWeek, endOfWeek, addDays, isSameDay, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { getCurrentCompanyId } from "@/lib/supabase-helpers";
import { useCompany } from "@/contexts/CompanyContext";
import { User } from "@supabase/supabase-js";

import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { MobileMenu } from "@/components/admin/MobileMenu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Menu, CalendarIcon, Clock, MapPin, ChevronLeft, ChevronRight, List, CalendarDays, LayoutGrid, Phone, MessageSquare, Check, RefreshCw, X, Plus, User as UserIcon, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { useUserRole } from "@/hooks/useUserRole";

// Status config
const VISIT_STATUSES = [
  { value: "agendada", label: "Agendada", color: "bg-blue-500/15 text-blue-700 border-blue-300", dot: "bg-blue-500" },
  { value: "confirmada", label: "Confirmada", color: "bg-green-500/15 text-green-700 border-green-300", dot: "bg-green-500" },
  { value: "realizada", label: "Realizada", color: "bg-emerald-700/15 text-emerald-800 border-emerald-400", dot: "bg-emerald-700" },
  { value: "nao_compareceu", label: "Não compareceu", color: "bg-red-500/15 text-red-700 border-red-300", dot: "bg-red-500" },
  { value: "remarcada", label: "Remarcada", color: "bg-amber-500/15 text-amber-700 border-amber-300", dot: "bg-amber-500" },
  { value: "cancelada", label: "Cancelada", color: "bg-muted text-muted-foreground border-border", dot: "bg-muted-foreground" },
];

const TIME_OPTIONS = Array.from({ length: 28 }, (_, i) => {
  const h = String(Math.floor((i + 16) / 2)).padStart(2, "0");
  const m = (i + 16) % 2 === 0 ? "00" : "30";
  return `${h}:${m}`;
});

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
  lead_name?: string;
  lead_phone?: string;
  lead_guests?: string | null;
  lead_month?: string | null;
}

type ViewMode = "day" | "week" | "list";

export default function Visitas() {
  const navigate = useNavigate();
  const { currentCompany } = useCompany();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>("day");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterResponsavel, setFilterResponsavel] = useState("all");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [detailVisit, setDetailVisit] = useState<Visit | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [profiles, setProfiles] = useState<{ user_id: string; full_name: string }[]>([]);

  // Create form state
  const [newLeadSearch, setNewLeadSearch] = useState("");
  const [newLeadId, setNewLeadId] = useState("");
  const [newLeadName, setNewLeadName] = useState("");
  const [newDate, setNewDate] = useState<Date | undefined>(undefined);
  const [newTime, setNewTime] = useState("");
  const [newNotes, setNewNotes] = useState("");
  const [newResponsavel, setNewResponsavel] = useState("");
  const [saving, setSaving] = useState(false);
  const [leadResults, setLeadResults] = useState<{ id: string; name: string; whatsapp: string }[]>([]);

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

  // Load profiles for responsavel filter
  useEffect(() => {
    if (!currentCompany?.id) return;
    supabase.from("profiles").select("user_id, full_name")
      .then(({ data }) => { if (data) setProfiles(data); });
  }, [currentCompany?.id]);

  // Load visits
  const fetchVisits = async () => {
    const companyId = getCurrentCompanyId();
    if (!companyId) return;

    let startDate: string, endDate: string;
    if (viewMode === "week") {
      const ws = startOfWeek(selectedDate, { weekStartsOn: 1 });
      const we = endOfWeek(selectedDate, { weekStartsOn: 1 });
      startDate = format(ws, "yyyy-MM-dd");
      endDate = format(we, "yyyy-MM-dd");
    } else if (viewMode === "day") {
      startDate = format(selectedDate, "yyyy-MM-dd");
      endDate = startDate;
    } else {
      // list: current month
      startDate = format(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1), "yyyy-MM-dd");
      endDate = format(new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0), "yyyy-MM-dd");
    }

    const { data, error } = await (supabase as any)
      .from("lead_visits")
      .select("id, lead_id, company_id, data_visita, horario_visita, status_visita, observacoes, responsavel_user_id, created_by, created_at")
      .eq("company_id", companyId)
      .gte("data_visita", startDate)
      .lte("data_visita", endDate)
      .order("data_visita", { ascending: true })
      .order("horario_visita", { ascending: true });

    if (error) { console.error(error); return; }

    // Fetch lead names
    if (data && data.length > 0) {
      const leadIds = [...new Set(data.map((v: any) => v.lead_id))];
      const { data: leads } = await supabase
        .from("campaign_leads")
        .select("id, name, whatsapp, month, guests")
        .in("id", leadIds as string[]);

      const leadMap = new Map((leads || []).map((l: any) => [l.id, l]));
      setVisits(data.map((v: any) => ({
        ...v,
        lead_name: leadMap.get(v.lead_id)?.name || "Lead desconhecido",
        lead_phone: leadMap.get(v.lead_id)?.whatsapp || "",
        lead_guests: leadMap.get(v.lead_id)?.guests || null,
        lead_month: leadMap.get(v.lead_id)?.month || null,
      })));
    } else {
      setVisits([]);
    }
  };

  useEffect(() => {
    if (currentCompany?.id && user) fetchVisits();
  }, [currentCompany?.id, user, selectedDate, viewMode]);

  // Filtered visits
  const filteredVisits = useMemo(() => {
    return visits.filter(v => {
      if (filterStatus !== "all" && v.status_visita !== filterStatus) return false;
      if (filterResponsavel !== "all" && v.responsavel_user_id !== filterResponsavel) return false;
      return true;
    });
  }, [visits, filterStatus, filterResponsavel]);

  // Search leads for create dialog
  const searchLeads = async (query: string) => {
    if (query.length < 2) { setLeadResults([]); return; }
    const companyId = getCurrentCompanyId();
    const { data } = await supabase.from("campaign_leads")
      .select("id, name, whatsapp")
      .eq("company_id", companyId!)
      .or(`name.ilike.%${query}%,whatsapp.ilike.%${query}%`)
      .limit(10);
    setLeadResults(data || []);
  };

  useEffect(() => {
    const t = setTimeout(() => searchLeads(newLeadSearch), 300);
    return () => clearTimeout(t);
  }, [newLeadSearch]);

  // Create visit
  const handleCreate = async () => {
    if (!newLeadId || !newDate) {
      toast({ title: "Selecione um lead e uma data", variant: "destructive" });
      return;
    }
    setSaving(true);
    const payload = {
      lead_id: newLeadId,
      company_id: getCurrentCompanyId(),
      data_visita: format(newDate, "yyyy-MM-dd"),
      horario_visita: newTime || null,
      status_visita: "agendada",
      observacoes: newNotes || null,
      responsavel_user_id: newResponsavel || null,
      created_by: user!.id,
    };

    const { error } = await (supabase as any).from("lead_visits").insert(payload);
    if (error) {
      toast({ title: "Erro ao criar visita", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Visita criada!" });
      setCreateOpen(false);
      resetCreateForm();
      fetchVisits();
    }
    setSaving(false);
  };

  const resetCreateForm = () => {
    setNewLeadSearch(""); setNewLeadId(""); setNewLeadName("");
    setNewDate(undefined); setNewTime(""); setNewNotes(""); setNewResponsavel("");
    setLeadResults([]);
  };

  // Update visit status
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

  const navigateDate = (dir: number) => {
    if (viewMode === "day") setSelectedDate(d => addDays(d, dir));
    else if (viewMode === "week") setSelectedDate(d => addDays(d, dir * 7));
    else setSelectedDate(d => new Date(d.getFullYear(), d.getMonth() + dir, 1));
  };

  const handleLogout = async () => { await supabase.auth.signOut(); navigate("/auth"); };

  if (isLoading || !user) {
    return <div className="min-h-screen bg-background flex items-center justify-center"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
  }

  const isMobile = typeof window !== "undefined" && window.innerWidth < 768;

  // Shared visit card
  const VisitCard = ({ visit, compact }: { visit: Visit; compact?: boolean }) => {
    const status = getStatusInfo(visit.status_visita);
    return (
      <div
        onClick={() => setDetailVisit(visit)}
        className={cn(
          "rounded-xl border border-border/50 bg-card p-3 cursor-pointer transition-all hover:shadow-md hover:border-primary/30",
          compact && "p-2"
        )}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-sm truncate">{visit.lead_name}</p>
            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
              {visit.horario_visita && (
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" /> {visit.horario_visita}
                </span>
              )}
              {!compact && (
                <span className="flex items-center gap-1">
                  <CalendarIcon className="h-3 w-3" />
                  {format(parseISO(visit.data_visita + "T12:00:00"), "dd/MM", { locale: ptBR })}
                </span>
              )}
            </div>
          </div>
          <Badge variant="outline" className={cn("text-[10px] shrink-0 border", status.color)}>
            {status.label}
          </Badge>
        </div>
      </div>
    );
  };

  // Day view
  const DayView = () => {
    const dayVisits = filteredVisits.filter(v => v.data_visita === format(selectedDate, "yyyy-MM-dd"));
    const withTime = dayVisits.filter(v => v.horario_visita).sort((a, b) => (a.horario_visita || "").localeCompare(b.horario_visita || ""));
    const withoutTime = dayVisits.filter(v => !v.horario_visita);

    return (
      <div className="space-y-2">
        {dayVisits.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <MapPin className="h-8 w-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm">Nenhuma visita neste dia</p>
          </div>
        )}
        {withTime.map(v => (
          <div key={v.id} className="flex items-start gap-3">
            <div className="text-xs font-mono font-medium text-muted-foreground w-12 pt-3 text-right shrink-0">
              {v.horario_visita}
            </div>
            <div className="flex-1"><VisitCard visit={v} /></div>
          </div>
        ))}
        {withoutTime.length > 0 && (
          <>
            {withTime.length > 0 && <div className="border-t border-dashed border-border/40 my-3" />}
            <p className="text-[11px] text-muted-foreground uppercase tracking-wider px-1 mb-1">Sem horário</p>
            {withoutTime.map(v => <VisitCard key={v.id} visit={v} />)}
          </>
        )}
      </div>
    );
  };

  // Week view
  const WeekView = () => {
    const ws = startOfWeek(selectedDate, { weekStartsOn: 1 });
    const days = Array.from({ length: 6 }, (_, i) => addDays(ws, i)); // Mon-Sat

    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {days.map(day => {
          const dayStr = format(day, "yyyy-MM-dd");
          const dayVisits = filteredVisits.filter(v => v.data_visita === dayStr);
          const isToday = isSameDay(day, new Date());

          return (
            <div key={dayStr} className={cn(
              "rounded-xl border border-border/50 bg-card/50 p-2.5 min-h-[120px]",
              isToday && "ring-2 ring-primary/30"
            )}>
              <p className={cn(
                "text-xs font-semibold mb-2 text-center",
                isToday ? "text-primary" : "text-muted-foreground"
              )}>
                {format(day, "EEE dd", { locale: ptBR })}
              </p>
              <div className="space-y-1.5">
                {dayVisits.map(v => <VisitCard key={v.id} visit={v} compact />)}
                {dayVisits.length === 0 && (
                  <p className="text-[10px] text-muted-foreground/50 text-center py-3">—</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // List view
  const ListView = () => (
    <div className="rounded-xl border border-border/50 bg-card overflow-hidden">
      <div className="hidden md:grid grid-cols-[130px_1fr_100px_100px_120px] gap-2 px-4 py-2.5 bg-muted/30 border-b border-border/40 text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">
        <span>Data</span><span>Lead</span><span>Hora</span><span>Status</span><span>Responsável</span>
      </div>
      {filteredVisits.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <MapPin className="h-8 w-8 mx-auto mb-2 opacity-40" />
          <p className="text-sm">Nenhuma visita neste período</p>
        </div>
      )}
      {filteredVisits.map(v => {
        const status = getStatusInfo(v.status_visita);
        const responsavel = profiles.find(p => p.user_id === v.responsavel_user_id);
        return (
          <div
            key={v.id}
            onClick={() => setDetailVisit(v)}
            className="grid grid-cols-1 md:grid-cols-[130px_1fr_100px_100px_120px] gap-1 md:gap-2 px-4 py-3 border-b border-border/30 hover:bg-muted/20 cursor-pointer transition-colors"
          >
            <span className="text-sm font-medium">{format(parseISO(v.data_visita + "T12:00:00"), "dd/MM/yyyy")}</span>
            <span className="text-sm font-semibold truncate">{v.lead_name}</span>
            <span className="text-sm text-muted-foreground">{v.horario_visita || "—"}</span>
            <Badge variant="outline" className={cn("text-[10px] w-fit border", status.color)}>{status.label}</Badge>
            <span className="text-xs text-muted-foreground truncate">{responsavel?.full_name || "—"}</span>
          </div>
        );
      })}
    </div>
  );

  const dateLabel = viewMode === "day"
    ? format(selectedDate, "dd 'de' MMMM, yyyy", { locale: ptBR })
    : viewMode === "week"
    ? `${format(startOfWeek(selectedDate, { weekStartsOn: 1 }), "dd/MM")} — ${format(endOfWeek(selectedDate, { weekStartsOn: 1 }), "dd/MM/yyyy")}`
    : format(selectedDate, "MMMM yyyy", { locale: ptBR });

  const headerContent = (
    <>
      <MapPin className="h-5 w-5 text-primary" />
      <h1 className="font-display font-bold text-foreground text-lg tracking-tight">Agenda de Visitas</h1>
    </>
  );

  const toolbar = (
    <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 mb-4">
      {/* Date nav */}
      <div className="flex items-center gap-2">
        <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => navigateDate(-1)}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="text-sm font-medium min-w-[180px]">
              <CalendarIcon className="h-4 w-4 mr-2" />
              {dateLabel}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(d) => d && setSelectedDate(d)}
              locale={ptBR}
              className="p-3 pointer-events-auto"
            />
          </PopoverContent>
        </Popover>
        <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => navigateDate(1)}>
          <ChevronRight className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="sm" className="text-xs" onClick={() => setSelectedDate(new Date())}>Hoje</Button>
      </div>

      {/* View + Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center border border-border rounded-lg overflow-hidden">
          {([
            { mode: "day" as ViewMode, icon: CalendarDays, label: "Dia" },
            { mode: "week" as ViewMode, icon: LayoutGrid, label: "Semana" },
            { mode: "list" as ViewMode, icon: List, label: "Lista" },
          ]).map(({ mode, icon: Icon, label }) => (
            <Button
              key={mode}
              variant={viewMode === mode ? "secondary" : "ghost"}
              size="sm"
              className="h-8 px-3 rounded-none text-xs gap-1"
              onClick={() => setViewMode(mode)}
            >
              <Icon className="h-3.5 w-3.5" />{label}
            </Button>
          ))}
        </div>

        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="h-8 w-[130px] text-xs">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos status</SelectItem>
            {VISIT_STATUSES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={filterResponsavel} onValueChange={setFilterResponsavel}>
          <SelectTrigger className="h-8 w-[140px] text-xs">
            <SelectValue placeholder="Responsável" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {profiles.map(p => <SelectItem key={p.user_id} value={p.user_id}>{p.full_name}</SelectItem>)}
          </SelectContent>
        </Select>

        <Button size="sm" className="h-8 gap-1 text-xs" onClick={() => { resetCreateForm(); setCreateOpen(true); }}>
          <Plus className="h-3.5 w-3.5" /> Nova Visita
        </Button>
      </div>
    </div>
  );

  // Unconfirmed visits alert
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = format(tomorrow, "yyyy-MM-dd");
  const todayStr = format(new Date(), "yyyy-MM-dd");
  const unconfirmedSoon = visits.filter(
    v => (v.data_visita === tomorrowStr || v.data_visita === todayStr) && v.status_visita === "agendada"
  );

  const mainContent = (
    <div className="p-4 md:p-6">
      {/* Unconfirmed alerts */}
      {unconfirmedSoon.length > 0 && (
        <div className="mb-4 rounded-xl border border-amber-300/60 bg-amber-50/50 dark:bg-amber-950/20 p-3 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
              ⚠ {unconfirmedSoon.length} visita{unconfirmedSoon.length > 1 ? "s" : ""} sem confirmação
            </p>
            <p className="text-xs text-amber-700/80 dark:text-amber-400/80 mt-0.5">
              {unconfirmedSoon.map(v => v.lead_name).join(", ")} — {unconfirmedSoon.some(v => v.data_visita === todayStr) ? "hoje" : "amanhã"}
            </p>
          </div>
        </div>
      )}
      {toolbar}
      {viewMode === "day" && <DayView />}
      {viewMode === "week" && <WeekView />}
      {viewMode === "list" && <ListView />}
    </div>
  );

  // Detail Sheet
  const DetailSheet = () => {
    if (!detailVisit) return null;
    const status = getStatusInfo(detailVisit.status_visita);
    const responsavel = profiles.find(p => p.user_id === detailVisit.responsavel_user_id);

    return (
      <Sheet open={!!detailVisit} onOpenChange={() => setDetailVisit(null)}>
        <SheetContent className="w-full sm:max-w-md p-0 overflow-y-auto">
          {/* Header */}
          <div className="px-6 pt-6 pb-4 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border-b border-border/40">
            <SheetHeader>
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-primary/15 ring-1 ring-primary/20">
                  <MapPin className="h-5 w-5 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <SheetTitle className="text-lg font-bold truncate">{detailVisit.lead_name}</SheetTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {format(parseISO(detailVisit.data_visita + "T12:00:00"), "dd 'de' MMMM, yyyy", { locale: ptBR })}
                    {detailVisit.horario_visita && ` às ${detailVisit.horario_visita}`}
                  </p>
                </div>
              </div>
            </SheetHeader>
          </div>

          <div className="p-6 space-y-5">
            {/* Info card */}
            <div className="rounded-xl border border-border/40 bg-card p-4 space-y-3">
              <p className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">Informações do Lead</p>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Telefone</p>
                  <p className="font-medium">{detailVisit.lead_phone || "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Convidados</p>
                  <p className="font-medium">{detailVisit.lead_guests || "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Mês pretendido</p>
                  <p className="font-medium">{detailVisit.lead_month || "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Responsável</p>
                  <p className="font-medium">{responsavel?.full_name || "—"}</p>
                </div>
              </div>
            </div>

            {/* Status */}
            <div className="rounded-xl border border-border/40 bg-card p-4">
              <p className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground mb-3">Status</p>
              <Badge variant="outline" className={cn("text-sm border px-3 py-1", status.color)}>{status.label}</Badge>
              {detailVisit.observacoes && (
                <p className="text-sm text-muted-foreground mt-3 leading-relaxed">{detailVisit.observacoes}</p>
              )}
            </div>

            {/* Actions */}
            <div className="rounded-xl border border-border/40 bg-card p-4 space-y-2">
              <p className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground mb-3">Ações</p>
              <div className="grid grid-cols-2 gap-2">
                {detailVisit.lead_phone && (
                  <Button variant="outline" size="sm" className="text-xs gap-1.5" asChild>
                    <a href={`https://wa.me/${detailVisit.lead_phone.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer">
                      <MessageSquare className="h-3.5 w-3.5" /> WhatsApp
                    </a>
                  </Button>
                )}
                {detailVisit.lead_phone && (
                  <Button variant="outline" size="sm" className="text-xs gap-1.5" asChild>
                    <a href={`tel:${detailVisit.lead_phone}`}>
                      <Phone className="h-3.5 w-3.5" /> Ligar
                    </a>
                  </Button>
                )}
                <Button variant="outline" size="sm" className="text-xs gap-1.5"
                  onClick={() => updateVisitStatus(detailVisit.id, "realizada")}>
                  <Check className="h-3.5 w-3.5" /> Realizada
                </Button>
                <Button variant="outline" size="sm" className="text-xs gap-1.5"
                  onClick={() => updateVisitStatus(detailVisit.id, "confirmada")}>
                  <Check className="h-3.5 w-3.5 text-green-600" /> Confirmar
                </Button>
                <Button variant="outline" size="sm" className="text-xs gap-1.5"
                  onClick={() => updateVisitStatus(detailVisit.id, "remarcada")}>
                  <RefreshCw className="h-3.5 w-3.5" /> Remarcar
                </Button>
                <Button variant="outline" size="sm" className="text-xs gap-1.5 text-destructive hover:text-destructive"
                  onClick={() => updateVisitStatus(detailVisit.id, "cancelada")}>
                  <X className="h-3.5 w-3.5" /> Cancelar
                </Button>
              </div>

              {/* Update status select */}
              <div className="pt-2 border-t border-border/30 mt-3">
                <Label className="text-xs text-muted-foreground">Alterar status manualmente</Label>
                <Select value={detailVisit.status_visita} onValueChange={(v) => updateVisitStatus(detailVisit.id, v)}>
                  <SelectTrigger className="h-9 mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {VISIT_STATUSES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    );
  };

  // Create Dialog
  const CreateSectionHeader = ({ icon: Icon, label }: { icon: React.ElementType; label: string }) => (
    <div className="flex items-center gap-2.5 text-[11px] uppercase tracking-[0.18em] font-semibold text-muted-foreground mb-4 pb-2.5 border-b border-border/40">
      <div className="p-1.5 rounded-md bg-primary/8 ring-1 ring-primary/15">
        <Icon className="h-3.5 w-3.5 text-primary" />
      </div>
      {label}
    </div>
  );

  const CreateDialog = () => (
    <Dialog open={createOpen} onOpenChange={setCreateOpen}>
      <DialogContent className="max-w-[520px] max-h-[90vh] p-0 gap-0 overflow-hidden rounded-2xl [&>button]:top-5 [&>button]:right-5">
        {/* Header */}
        <DialogHeader className="px-7 pt-7 pb-4 border-b border-border/40 bg-muted/30">
          <DialogTitle className="text-lg font-bold tracking-tight">Nova Visita</DialogTitle>
          <p className="text-[13px] text-muted-foreground mt-1">Agende uma nova visita para um lead</p>
        </DialogHeader>

        {/* Body */}
        <div className="overflow-y-auto px-7 py-6 space-y-5" style={{ maxHeight: "calc(90vh - 180px)" }}>
          {/* Section 1 – Lead */}
          <div className="rounded-xl border border-border/40 bg-card p-5 shadow-sm">
            <CreateSectionHeader icon={UserIcon} label="Lead" />
            <div className="space-y-2.5">
              <Label className="text-sm font-medium text-foreground/70">Selecionar lead *</Label>
              {newLeadId ? (
                <div className="flex items-center gap-2 p-2.5 rounded-lg border border-primary/30 bg-primary/5">
                  <UserIcon className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium flex-1">{newLeadName}</span>
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => { setNewLeadId(""); setNewLeadName(""); }}>
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ) : (
                <div className="relative">
                  <input
                    type="text"
                    value={newLeadSearch}
                    onChange={(e) => setNewLeadSearch(e.target.value)}
                    placeholder="Buscar lead por nome ou telefone..."
                    className="w-full h-10 px-3 rounded-lg border border-border/60 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                  {leadResults.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 rounded-lg border border-border bg-card shadow-lg max-h-48 overflow-y-auto">
                      {leadResults.map(l => (
                        <button
                          key={l.id}
                          className="w-full text-left px-3 py-2.5 text-sm hover:bg-muted/50 transition-colors first:rounded-t-lg last:rounded-b-lg"
                          onClick={() => { setNewLeadId(l.id); setNewLeadName(l.name); setLeadResults([]); setNewLeadSearch(""); }}
                        >
                          <span className="font-medium">{l.name}</span>
                          <span className="text-muted-foreground ml-2 text-xs">{l.whatsapp}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Section 2 – Data e Horário */}
          <div className="rounded-xl border border-border/40 bg-card p-5 shadow-sm">
            <CreateSectionHeader icon={CalendarIcon} label="Data e Horário" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-y-5">
              <div className="space-y-2.5 md:pr-6">
                <Label className="text-sm font-medium text-foreground/70">Data da visita *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !newDate && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {newDate ? format(newDate, "dd/MM/yyyy") : "Selecionar data"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={newDate} onSelect={setNewDate} locale={ptBR} className="p-3 pointer-events-auto" />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2.5 md:pl-6 md:border-l md:border-border/50">
                <Label className="text-sm font-medium text-foreground/70">Horário</Label>
                <Select value={newTime || "none"} onValueChange={(v) => setNewTime(v === "none" ? "" : v)}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sem horário</SelectItem>
                    {TIME_OPTIONS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2.5 md:pr-6">
                <Label className="text-sm font-medium text-foreground/70">Responsável</Label>
                <Select value={newResponsavel || "none"} onValueChange={(v) => setNewResponsavel(v === "none" ? "" : v)}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sem responsável</SelectItem>
                    {profiles.map(p => <SelectItem key={p.user_id} value={p.user_id}>{p.full_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Section 3 – Observações */}
          <div className="rounded-xl border border-border/40 bg-card p-5 shadow-sm">
            <CreateSectionHeader icon={MapPin} label="Observações" />
            <div className="space-y-2.5">
              <Label className="text-sm font-medium text-foreground/70">Notas sobre a visita</Label>
              <Textarea value={newNotes} onChange={(e) => setNewNotes(e.target.value)} rows={3} placeholder="Informações sobre a visita..." />
            </div>
          </div>
        </div>

        {/* Fixed footer */}
        <div className="flex justify-end gap-3 px-7 py-4 border-t border-border/40 bg-muted/20">
          <Button variant="ghost" onClick={() => setCreateOpen(false)}>Cancelar</Button>
          <Button onClick={handleCreate} disabled={saving || !newLeadId || !newDate} className="px-8 rounded-lg shadow-sm">
            {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Criar Visita
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );

  // Mobile
  if (isMobile) {
    return (
      <div className="h-dvh flex flex-col overflow-hidden bg-background">
        <Helmet><title>Visitas</title></Helmet>
        <header className="bg-card border-b border-border shrink-0 z-10 px-3 py-3">
          <div className="flex items-center gap-2">
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
            {headerContent}
          </div>
        </header>
        <div className="flex-1 overflow-y-auto">
          {mainContent}
        </div>
        <DetailSheet />
        <CreateDialog />
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
          <header className="bg-card/80 backdrop-blur-sm border-b border-border/60 shrink-0 z-10 shadow-subtle">
            <div className="px-6 py-3 flex items-center gap-3">
              <SidebarTrigger className="text-muted-foreground hover:text-foreground" />
              {headerContent}
            </div>
          </header>
          <div className="flex-1 overflow-y-auto">
            {mainContent}
          </div>
        </SidebarInset>
      </div>
      <DetailSheet />
      <CreateDialog />
    </SidebarProvider>
  );
}
