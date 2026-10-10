import { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { format, isSameDay, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { DayPicker } from "react-day-picker";
import { supabase } from "@/integrations/supabase/client";
import { getCurrentCompanyId } from "@/lib/supabase-helpers";
import { useCompany } from "@/contexts/CompanyContext";

import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

// Horários oferecidos ao remarcar (08:00–21:30, meia em meia hora)
const RESCHED_TIME_OPTIONS = Array.from({ length: 28 }, (_, i) => {
  const h = String(Math.floor((i + 16) / 2)).padStart(2, "0");
  const m = (i + 16) % 2 === 0 ? "00" : "30";
  return `${h}:${m}`;
});
import { Loader2, Clock, MapPin, ChevronLeft, ChevronRight, Phone, MessageSquare, Check, RefreshCw, X, Plus, User as UserIcon, AlertTriangle, Trash2, PartyPopper, Package, Sparkles, TrendingUp, SlidersHorizontal, CalendarCheck, CalendarClock, UserX } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { VisitQualification } from "@/components/visitas/VisitQualification";
import { useCompanyUnits } from "@/hooks/useCompanyUnits";
import { VisitFormDialog } from "@/components/visitas/VisitFormDialog";
import { SendVisitConfirmationDialog } from "@/components/visitas/SendVisitConfirmationDialog";
import { logActivity } from "@/lib/activityLog";
import { PendingVisitOutcomesCard } from "./PendingVisitOutcomesCard";
import { useUnitPermissions } from "@/hooks/useUnitPermissions";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { visitSummary } from "@/lib/visitKpis";

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

// Visita marcada pela IA (ela grava "Visita agendada pela IA" nas observações)
const isAiVisit = (v: { observacoes: string | null }) => /agendada pela IA/i.test(v.observacoes || "");

function AiVisitTag() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-violet-600 text-white px-2 py-0.5 text-[10px] font-bold shrink-0" title="Visita agendada pela IA">
      <Sparkles className="w-3 h-3" /> IA
    </span>
  );
}

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
  package_interest?: string | null;
  guest_count?: number | null;
  party_date_interest?: string | null;
  payment_preference?: string | null;
  interest_level?: string | null;
  restrictions?: any;
  client_questions?: string | null;
  seller_notes?: string | null;
  visit_type?: string;
  event_id?: string | null;
  items_description?: string | null;
  event_title?: string | null;
}

interface AgendaVisitasTabProps {
  userId: string;
}

const VISIT_COLUMNS = "id, lead_id, company_id, data_visita, horario_visita, status_visita, observacoes, responsavel_user_id, created_by, created_at, unit, package_interest, guest_count, party_date_interest, payment_preference, interest_level, restrictions, client_questions, seller_notes, lead_channel, visit_type, event_id, items_description";

/** Junta nome/telefone do lead e o título da festa (atendimento) às visitas */
async function enrichVisits(data: Visit[]): Promise<Visit[]> {
  if (data.length === 0) return [];
  const leadIds = [...new Set(data.map((v) => v.lead_id))];
  const { data: leads } = await supabase
    .from("campaign_leads")
    .select("id, name, whatsapp, month, guests")
    .in("id", leadIds);
  const leadMap = new Map((leads || []).map((l) => [l.id, l]));

  const eventIds = [...new Set(data.map((v) => v.event_id).filter((id): id is string => !!id))];
  const eventMap = new Map<string, string>();
  if (eventIds.length > 0) {
    const { data: events } = await supabase.from("company_events").select("id, title").in("id", eventIds);
    for (const e of events || []) eventMap.set(e.id, e.title);
  }

  return data.map((v) => {
    const lead = leadMap.get(v.lead_id);
    return {
      ...v,
      lead_name: lead?.name || "Lead desconhecido",
      lead_phone: lead?.whatsapp || "",
      lead_guests: lead?.guests || null,
      lead_month: lead?.month || null,
      event_title: v.event_id ? eventMap.get(v.event_id) || null : null,
    };
  });
}

export function AgendaVisitasTab({ userId }: AgendaVisitasTabProps) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  // Só a primeira carga mostra a tela de "carregando" (depois a aba fica na tela
  // e a visita aberta não fecha sozinha)
  const hasLoaded = useRef(false);
  // Muda a cada recarga das visitas (a lista "sem resultado" confere de novo)
  const [visitsVersion, setVisitsVersion] = useState(0);
  const { currentCompany } = useCompany();
  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [calendarMonth, setCalendarMonth] = useState<Date>(new Date());
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterResponsavel, setFilterResponsavel] = useState("all");
  const [filterUnit, setFilterUnit] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [detailVisit, setDetailVisit] = useState<Visit | null>(null);
  // Remarcação com nova data/horário (aberta para a visita deste id)
  const [reschedForId, setReschedForId] = useState<string | null>(null);
  const [reschedDate, setReschedDate] = useState("");
  const [reschedTime, setReschedTime] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [createType, setCreateType] = useState<"visita" | "atendimento">("visita");
  const [confirmationOpen, setConfirmationOpen] = useState(false);
  const [profiles, setProfiles] = useState<{ user_id: string; full_name: string }[]>([]);

  const { units } = useCompanyUnits(currentCompany?.id);

  // Responsáveis: só quem faz parte desta empresa (antes vinham pessoas de outras empresas)
  useEffect(() => {
    if (!currentCompany?.id) return;
    let cancelled = false;
    (async () => {
      const { data: members } = await supabase.from("user_companies").select("user_id").eq("company_id", currentCompany.id);
      const ids = (members || []).map((m) => m.user_id);
      if (ids.length === 0) { if (!cancelled) setProfiles([]); return; }
      const { data } = await supabase.from("profiles").select("user_id, full_name").in("user_id", ids);
      if (!cancelled && data) setProfiles(data);
    })();
    return () => { cancelled = true; };
  }, [currentCompany?.id]);

  // Unidades que a pessoa pode ver (mesma regra da aba Festas). Visita sem unidade
  // continua aparecendo, para não sumir nada que ninguém sabe de quem é.
  const { canViewAll, allowedUnits, isLoading: unitPermLoading } = useUnitPermissions(userId, currentCompany?.id);
  const permittedUnits = useMemo(
    () => allowedUnits.filter((u) => u !== "As duas" && u !== "all" && !u.toLowerCase().includes("vendas")).map((u) => u.toLowerCase().trim()),
    [allowedUnits],
  );
  const restrictUnits = !canViewAll && !unitPermLoading && permittedUnits.length > 0;
  const canSeeUnit = (unit: string | null | undefined) =>
    !restrictUnits || !unit || permittedUnits.includes(unit.toLowerCase().trim());

  const fetchSeq = useRef(0);
  const fetchVisits = async () => {
    const companyId = getCurrentCompanyId();
    if (!companyId) return;
    // Só a busca mais recente vale (trocar de mês rápido não deixa resposta antiga por cima)
    const seq = ++fetchSeq.current;

    setLoading(true);
    const startDate = format(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), 1), "yyyy-MM-dd");
    const endDate = format(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 0), "yyyy-MM-dd");

    const { data, error } = await (supabase as any)
      .from("lead_visits")
      .select(VISIT_COLUMNS)
      .eq("company_id", companyId)
      .gte("data_visita", startDate)
      .lte("data_visita", endDate)
      .order("data_visita", { ascending: true })
      .order("horario_visita", { ascending: true });

    if (seq !== fetchSeq.current) return;
    if (error) { console.error(error); setLoading(false); return; }

    const mappedVisits = await enrichVisits((data || []) as Visit[]);
    if (seq !== fetchSeq.current) return;
    setVisits(mappedVisits);
    setDetailVisit((current) => current ? mappedVisits.find((visit: Visit) => visit.id === current.id) || current : current);
    hasLoaded.current = true;
    setVisitsVersion((v) => v + 1);
    setLoading(false);
  };

  useEffect(() => {
    const companyId = currentCompany?.id || getCurrentCompanyId();
    if (companyId && userId) fetchVisits();
  }, [currentCompany?.id, userId, calendarMonth]);

  // Visitas de hoje e amanhã ainda sem confirmação. Busca à parte: no último dia do mês
  // as de amanhã estão no mês seguinte. Remarcada também precisa confirmar a data nova.
  const [unconfirmedSoon, setUnconfirmedSoon] = useState<{ id: string; lead_name: string; data_visita: string; unit: string | null }[]>([]);
  useEffect(() => {
    if (!currentCompany?.id) return;
    let cancelled = false;
    (async () => {
      const today = format(new Date(), "yyyy-MM-dd");
      const tomorrowDate = new Date();
      tomorrowDate.setDate(tomorrowDate.getDate() + 1);
      const tomorrow = format(tomorrowDate, "yyyy-MM-dd");
      const { data } = await supabase
        .from("lead_visits")
        .select("id, lead_id, data_visita, unit")
        .eq("company_id", currentCompany.id)
        .in("status_visita", ["agendada", "remarcada"])
        .neq("visit_type", "atendimento")
        .gte("data_visita", today)
        .lte("data_visita", tomorrow);
      const rows = data || [];
      const leadIds = [...new Set(rows.map((r) => r.lead_id))];
      const names = new Map<string, string>();
      if (leadIds.length > 0) {
        const { data: leads } = await supabase.from("campaign_leads").select("id, name").in("id", leadIds);
        for (const l of leads || []) names.set(l.id, l.name);
      }
      if (!cancelled) setUnconfirmedSoon(rows.map((r) => ({ id: r.id, data_visita: r.data_visita, unit: r.unit, lead_name: names.get(r.lead_id) || "Cliente" })));
    })();
    return () => { cancelled = true; };
  }, [currentCompany?.id, visitsVersion]);

  // No celular as visitas do dia ficam embaixo do calendário: ao tocar numa data, rola até elas
  const dayPanelRef = useRef<HTMLDivElement>(null);
  const handleDayClick = (date: Date) => {
    setSelectedDate(date);
    if (window.matchMedia("(max-width: 767px)").matches) {
      setTimeout(() => dayPanelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
    }
  };

  // Abre uma visita de qualquer mês (com a remarcação aberta quando pedida)
  const openVisitById = async (visitId: string, reschedule: boolean) => {
    const { data } = await supabase.from("lead_visits").select(VISIT_COLUMNS).eq("id", visitId).maybeSingle();
    if (!data) {
      toast({ title: "Visita não encontrada", variant: "destructive" });
      return;
    }
    const [visit] = await enrichVisits([data as unknown as Visit]);
    setDetailVisit(visit);
    if (reschedule) {
      setReschedDate(visit.data_visita);
      setReschedTime(visit.horario_visita || "");
      setReschedForId(visit.id);
    }
  };

  // Link "?visita=<id>" (ex.: botão "Remarcou" do aviso da Central): abre a visita para remarcar
  useEffect(() => {
    const visitId = searchParams.get("visita");
    if (!visitId || !currentCompany?.id) return;
    openVisitById(visitId, true);
    const next = new URLSearchParams(searchParams);
    next.delete("visita");
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams, currentCompany?.id]);

  const filteredVisits = useMemo(() => {
    return visits.filter(v => {
      if (!canSeeUnit(v.unit)) return false;
      if (filterStatus !== "all" && v.status_visita !== filterStatus) return false;
      if (filterResponsavel !== "all" && v.responsavel_user_id !== filterResponsavel) return false;
      if (filterUnit !== "all" && v.unit !== filterUnit) return false;
      if (filterType !== "all" && (v.visit_type || "visita") !== filterType) return false;
      return true;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- canSeeUnit depende só destes
  }, [visits, filterStatus, filterResponsavel, filterUnit, filterType, restrictUnits, permittedUnits]);

  const selectedDayVisits = useMemo(() => {
    const dateStr = format(selectedDate, "yyyy-MM-dd");
    return filteredVisits
      .filter(v => v.data_visita === dateStr)
      .sort((a, b) => (a.horario_visita || "99:99").localeCompare(b.horario_visita || "99:99"));
  }, [filteredVisits, selectedDate]);

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

  // Remarcar de verdade: grava nova data/horário e marca como "remarcada"
  const rescheduleVisit = async (visitId: string) => {
    if (!reschedDate) {
      toast({ title: "Escolha a nova data", variant: "destructive" });
      return;
    }
    const { error } = await (supabase as any)
      .from("lead_visits")
      .update({ data_visita: reschedDate, horario_visita: reschedTime || null, status_visita: "remarcada" })
      .eq("id", visitId);
    if (error) {
      toast({ title: "Erro ao remarcar", description: error.message, variant: "destructive" });
      return;
    }
    toast({
      title: "Remarcada!",
      description: `Nova data: ${reschedDate.split("-").reverse().join("/")}${reschedTime ? ` às ${reschedTime}` : ""}`,
    });
    setReschedForId(null);
    fetchVisits();
    if (detailVisit?.id === visitId) {
      setDetailVisit(prev => prev ? { ...prev, data_visita: reschedDate, horario_visita: reschedTime || null, status_visita: "remarcada" } : null);
    }
  };

  const handleClosedAtVisit = async (visit: Visit) => {
    // Acrescenta a anotação sem apagar o que já estava nas observações do lead
    const { data: lead } = await supabase.from("campaign_leads").select("observacoes").eq("id", visit.lead_id).maybeSingle();
    const note = `Fechou na visita em ${format(parseISO(visit.data_visita + "T12:00:00"), "dd/MM/yyyy")}`;
    const previous = (lead?.observacoes || "").trim();
    const { error: leadError } = await supabase
      .from("campaign_leads")
      .update({ status: "fechado" as any, observacoes: previous ? `${previous}\n${note}` : note })
      .eq("id", visit.lead_id);

    if (leadError) {
      toast({ title: "Erro ao atualizar lead", description: leadError.message, variant: "destructive" });
      return;
    }

    if (visit.status_visita !== "realizada") {
      const { error: visitError } = await (supabase as any).from("lead_visits").update({ status_visita: "realizada" }).eq("id", visit.id);
      if (visitError) {
        toast({ title: "Lead marcado como Fechado, mas a visita não foi atualizada", description: visitError.message, variant: "destructive" });
      }
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

  if (loading && !hasLoaded.current) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const todayStr = format(new Date(), "yyyy-MM-dd");
  const visibleUnconfirmed = unconfirmedSoon.filter((v) => canSeeUnit(v.unit));

  const selectedDayLabel = format(selectedDate, "dd 'de' MMMM", { locale: ptBR });
  const isToday = isSameDay(selectedDate, new Date());

  const detailStatus = detailVisit ? getStatusInfo(detailVisit.status_visita) : null;
  const detailResponsavel = detailVisit ? profiles.find(p => p.user_id === detailVisit.responsavel_user_id) : null;
  const isDetailEntrega = detailVisit && (detailVisit.visit_type || "visita") === "atendimento";

  // Números do mês (src/lib/visitKpis.ts)
  const kpi = visitSummary(filteredVisits);
  const activeFilterCount = [filterStatus, filterUnit, filterResponsavel].filter((f) => f !== "all").length;
  const unitOptions = units.filter((u) => canSeeUnit(u.name));

  return (
    <div className="space-y-6">
      {currentCompany?.id && (
        <PendingVisitOutcomesCard
          companyId={currentCompany.id}
          onOpenVisit={openVisitById}
          onChanged={fetchVisits}
          reloadKey={visitsVersion}
          canSeeUnit={canSeeUnit}
        />
      )}

      {/* Celular: botão + flutuante (igual ao da aba Festas) para Nova visita ou Atendimento */}
      <div className="md:hidden fixed right-4 bottom-[5.5rem] z-30">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label="Marcar visita ou atendimento"
              className="h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 flex items-center justify-center active:scale-95 transition-transform"
            >
              <Plus className="h-7 w-7" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" align="end" sideOffset={10} className="w-52 rounded-2xl p-1.5">
            <DropdownMenuItem className="rounded-xl gap-2.5 py-2.5 text-sm font-medium" onClick={() => { setCreateType("visita"); setCreateOpen(true); }}>
              <MapPin className="h-4 w-4 text-primary" /> Nova visita
            </DropdownMenuItem>
            <DropdownMenuItem className="rounded-xl gap-2.5 py-2.5 text-sm font-medium" onClick={() => { setCreateType("atendimento"); setCreateOpen(true); }}>
              <Package className="h-4 w-4 text-violet-600" /> Atendimento
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Alert */}
      {visibleUnconfirmed.length > 0 && (
        <div className="rounded-2xl border border-amber-300/50 bg-gradient-to-r from-amber-50/80 to-amber-50/30 dark:from-amber-950/30 dark:to-transparent p-4 flex items-start gap-3">
          <div className="p-2 rounded-xl bg-amber-100 dark:bg-amber-900/40 shrink-0">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
          </div>
          <div>
            <p className="text-sm font-bold text-amber-800 dark:text-amber-300">
              {visibleUnconfirmed.length} visita{visibleUnconfirmed.length > 1 ? "s" : ""} sem confirmação
            </p>
            <p className="text-xs text-amber-700/80 dark:text-amber-400/80 mt-0.5">
              {visibleUnconfirmed.slice(0, 3).map(v => v.lead_name).join(", ")}
              {visibleUnconfirmed.length > 3 ? ` e mais ${visibleUnconfirmed.length - 3}` : ""} — {(() => {
                const hasToday = visibleUnconfirmed.some(v => v.data_visita === todayStr);
                const hasTomorrow = visibleUnconfirmed.some(v => v.data_visita !== todayStr);
                return hasToday && hasTomorrow ? "hoje e amanhã" : hasToday ? "hoje" : "amanhã";
              })()}
            </p>
          </div>
        </div>
      )}

      {/* Topo igual ao da aba Festas: tipo como sub-abas discretas, os outros filtros num
          botão "Filtros" e, no celular, criar pelo botão + flutuante */}
      <div className="flex items-center gap-2">
        <Tabs value={filterType} onValueChange={setFilterType} className="flex-1 min-w-0 sm:flex-none sm:w-[360px]">
          <TabsList className="grid w-full grid-cols-3 gap-1 p-1 rounded-full bg-muted h-auto">
            <TabsTrigger value="all" className="flex-1 min-w-0 h-9 px-2 text-xs font-semibold rounded-full text-muted-foreground transition-colors data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:shadow-sm">Todas</TabsTrigger>
            <TabsTrigger value="visita" className="flex-1 min-w-0 h-9 px-2 text-xs font-semibold rounded-full text-muted-foreground transition-colors data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:shadow-sm">Visitas</TabsTrigger>
            <TabsTrigger value="atendimento" className="flex-1 min-w-0 h-9 px-2 text-xs font-semibold rounded-full text-muted-foreground transition-colors data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:shadow-sm">Atendimentos</TabsTrigger>
          </TabsList>
        </Tabs>
        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              className={cn(
                "relative h-11 shrink-0 rounded-2xl border bg-card shadow-sm px-3 flex items-center gap-1.5 text-sm font-medium transition-colors",
                activeFilterCount > 0 ? "border-primary/40 text-primary" : "border-border/40 text-muted-foreground hover:text-foreground",
              )}
              aria-label="Filtros"
            >
              <SlidersHorizontal className="h-4 w-4" />
              <span className="hidden sm:inline">Filtros</span>
              {activeFilterCount > 0 && (
                <span className="h-5 min-w-5 px-1 rounded-full bg-primary text-primary-foreground text-[11px] font-bold flex items-center justify-center">{activeFilterCount}</span>
              )}
            </button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-72 rounded-2xl p-4 space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Situação</Label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="h-10 w-full text-sm rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {VISIT_STATUSES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {unitOptions.length > 1 && (
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Unidade</Label>
                <Select value={filterUnit} onValueChange={setFilterUnit}>
                  <SelectTrigger className="h-10 w-full text-sm rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as unidades</SelectItem>
                    {unitOptions.map(u => <SelectItem key={u.id} value={u.name}>{u.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Responsável</Label>
              <Select value={filterResponsavel} onValueChange={setFilterResponsavel}>
                <SelectTrigger className="h-10 w-full text-sm rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {profiles.map(p => <SelectItem key={p.user_id} value={p.user_id}>{p.full_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {activeFilterCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="w-full rounded-full"
                onClick={() => { setFilterStatus("all"); setFilterUnit("all"); setFilterResponsavel("all"); }}
              >
                Limpar filtros
              </Button>
            )}
          </PopoverContent>
        </Popover>
        <div className="hidden md:flex items-center gap-2 ml-auto shrink-0">
          <Button size="sm" className="h-10 px-5 rounded-full gap-2 font-semibold shadow-sm" onClick={() => { setCreateType("visita"); setCreateOpen(true); }}>
            <Plus className="h-4 w-4" /> Nova Visita
          </Button>
          <Button size="sm" variant="outline" className="h-10 px-5 rounded-full gap-2 font-semibold shadow-sm border-violet-300 text-violet-700 hover:bg-violet-50 dark:hover:bg-violet-950/30" onClick={() => { setCreateType("atendimento"); setCreateOpen(true); }}>
            <Package className="h-4 w-4" /> Atendimento
          </Button>
        </div>
      </div>

      {/* Números do mês: mesmo visual da aba Festas */}
      <div className="space-y-3 animate-fade-up">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 md:gap-3">
          {[
            { label: "Visitas no mês", value: kpi.visitas, hint: kpi.atendimentos > 0 ? `+${kpi.atendimentos} atendimento${kpi.atendimentos > 1 ? "s" : ""}` : undefined, icon: MapPin, tone: "bg-primary/10 text-primary" },
            { label: "A acontecer", value: kpi.aAcontecer, hint: "marcadas daqui pra frente", icon: CalendarClock, tone: "bg-sky-500/15 text-sky-600" },
            { label: "Vieram", value: kpi.vieram, hint: "visita realizada", icon: CalendarCheck, tone: "bg-emerald-500/15 text-emerald-600" },
            { label: "Não vieram", value: kpi.naoVieram, hint: kpi.canceladas > 0 ? `+${kpi.canceladas} cancelada${kpi.canceladas > 1 ? "s" : ""}` : undefined, icon: UserX, tone: "bg-red-500/10 text-red-600" },
          ].map((c) => (
            <div key={c.label} className="rounded-2xl border border-border/50 bg-card p-3 shadow-sm flex items-center gap-3 min-w-0">
              <div className={cn("h-10 w-10 rounded-full flex items-center justify-center shrink-0", c.tone)}>
                <c.icon className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xl md:text-2xl font-extrabold tracking-tight leading-none">{c.value}</p>
                <p className="text-xs font-medium text-muted-foreground mt-1 truncate">{c.label}</p>
                {c.hint && <p className="text-[11px] text-muted-foreground/70 truncate">{c.hint}</p>}
              </div>
            </div>
          ))}
        </div>

        {/* Comparecimento: de quem já tem resultado, quantos vieram */}
        <div className="rounded-2xl border border-border/50 bg-card shadow-sm p-3 md:p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <TrendingUp className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-muted-foreground">Comparecimento do mês</p>
              <p className="flex items-baseline gap-2 flex-wrap">
                <span className="text-xl font-extrabold tracking-tight">{kpi.comparecimento === null ? "–" : `${kpi.comparecimento}%`}</span>
                <span className="text-xs text-muted-foreground">
                  {kpi.comResultado > 0 ? `vieram ${kpi.vieram} de ${kpi.comResultado} com resultado` : "nenhuma visita com resultado ainda"}
                </span>
              </p>
            </div>
          </div>
          <div className="mt-3 h-2 rounded-full bg-muted overflow-hidden">
            <div className="h-full rounded-full bg-emerald-500 transition-all duration-500 ease-out" style={{ width: `${kpi.comparecimento ?? 0}%` }} />
          </div>
          {kpi.semResultado > 0 && (
            <p className="mt-2 text-[11px] font-medium text-amber-700 dark:text-amber-400">
              {kpi.semResultado} visita{kpi.semResultado > 1 ? "s" : ""} do mês sem resultado — marque em "Visitas sem resultado"
            </p>
          )}
        </div>
      </div>

      {/* Calendar + Day panel layout */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6">
        {/* Calendar (trocando de mês fica na tela, um pouco apagado, até carregar) */}
        <div className={cn("relative rounded-2xl border border-border/40 bg-card shadow-sm overflow-hidden transition-opacity", loading && "opacity-60")}>
          {loading && <Loader2 className="absolute right-3 bottom-3 z-10 h-4 w-4 animate-spin text-muted-foreground" />}
          <DayPicker
            mode="single"
            selected={selectedDate}
            onSelect={(date) => date && handleDayClick(date)}
            month={calendarMonth}
            onMonthChange={setCalendarMonth}
            locale={ptBR}
            showOutsideDays
            // Sempre 6 semanas: mesma altura em todos os meses
            fixedWeeks
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
              head_cell: "text-muted-foreground/70 flex-1 font-semibold text-[11px] lg:text-xs text-center uppercase tracking-wider pb-2",
              row: "flex w-full",
              cell: "flex-1 text-center text-sm p-0.5 lg:p-[3px] relative focus-within:relative focus-within:z-20",
              day: cn(
                buttonVariants({ variant: "ghost" }),
                "h-14 lg:h-[5rem] w-full p-0 font-normal aria-selected:opacity-100 relative rounded-2xl",
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
                              "h-[6px] w-[6px] lg:h-[7px] lg:w-[7px] rounded-full",
                              (v.visit_type || "visita") === "atendimento"
                                ? "bg-violet-500"
                                : (VISIT_STATUS_DOT[v.status_visita] || "bg-muted-foreground/40")
                            )}
                          />
                        ))}
                        {count > 3 && (
                          <span className="text-[9px] lg:text-[10px] font-bold text-muted-foreground leading-none ml-0.5">
                            +{count - 3}
                          </span>
                        )}
                      </div>
                    )}
                    {count >= 2 && (
                      <span className="absolute -top-0.5 -right-0.5 lg:top-0 lg:right-0 h-[18px] w-[18px] lg:h-5 lg:w-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center leading-none shadow-sm">
                        {count}
                      </span>
                    )}
                  </div>
                );
              },
            }}
          />
        </div>

        {/* Day detail panel */}
        <div ref={dayPanelRef} className="scroll-mt-3 rounded-2xl border border-border/40 bg-card shadow-sm p-5">
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
              <p className="text-xs text-muted-foreground/60 mt-1">Para marcar, use o botão + (ou "Nova Visita")</p>
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
                          <p className="font-bold text-[15px] truncate">
                            <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground/70 mr-1.5">Cliente:</span>
                            {visit.lead_name}
                          </p>
                          {isAiVisit(visit) && <AiVisitTag />}
                        </div>
                        <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                          {visit.horario_visita && (
                            <span className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
                              <Clock className="h-3.5 w-3.5 text-primary/60" /> {visit.horario_visita}
                            </span>
                          )}
                          {responsavel && (
                            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                              <UserIcon className="h-3 w-3" />
                              <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground/70">Resp.:</span>
                              {responsavel.full_name?.split(" ")[0]}
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
      </div>

      {/* Detail Sheet */}
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
                      <SheetTitle className="text-lg font-bold truncate flex items-center gap-2">{detailVisit.lead_name}{isAiVisit(detailVisit) && <AiVisitTag />}</SheetTitle>
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
                      const cleanPhone = detailVisit.lead_phone!.replace(/\D/g, '');
                      const phoneWithCountry = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;
                      navigate(`/atendimento?phone=${phoneWithCountry}`);
                    }}
                  >
                    <MessageSquare className="h-4 w-4" />
                    Abrir Conversa
                  </Button>
                )}

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
                        const cleanPhone = detailVisit.lead_phone!.replace(/\D/g, '');
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
                    <Button
                      variant="outline"
                      size="sm"
                      className={cn("text-xs gap-1.5", reschedForId === detailVisit.id && "border-primary text-primary")}
                      onClick={() => {
                        if (reschedForId === detailVisit.id) { setReschedForId(null); return; }
                        setReschedDate(detailVisit.data_visita);
                        setReschedTime(detailVisit.horario_visita || "");
                        setReschedForId(detailVisit.id);
                      }}
                    ><RefreshCw className="h-3.5 w-3.5" /> Remarcar</Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" size="sm" className="text-xs gap-1.5 text-destructive hover:text-destructive"><X className="h-3.5 w-3.5" /> Cancelar</Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Cancelar {isDetailEntrega ? "este atendimento" : "esta visita"}?</AlertDialogTitle>
                          <AlertDialogDescription>
                            {detailVisit.lead_name} vai ficar como cancelada. Dá para voltar o status depois, se precisar.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Voltar</AlertDialogCancel>
                          <AlertDialogAction onClick={() => updateVisitStatus(detailVisit.id, "cancelada")} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            Sim, cancelar
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
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
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            size="sm"
                            className="col-span-2 text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                          >
                            <PartyPopper className="h-3.5 w-3.5" /> Fechou na Visita 🎉
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Fechou a festa na visita?</AlertDialogTitle>
                            <AlertDialogDescription>
                              {detailVisit.lead_name || "O lead"} vai ficar como Fechado e a visita como realizada. Depois, cadastre a festa em Festas → Nova Festa.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleClosedAtVisit(detailVisit)} className="bg-emerald-600 text-white hover:bg-emerald-700">
                              Sim, fechou
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>
                  {reschedForId === detailVisit.id && (
                    <div className="mt-2 rounded-lg border border-dashed border-primary/40 bg-primary/5 p-3 space-y-2">
                      <Label className="text-xs font-medium">Nova data e horário</Label>
                      <div className="grid grid-cols-2 gap-2">
                        <Input type="date" value={reschedDate} onChange={(e) => setReschedDate(e.target.value)} className="h-9 text-base sm:text-sm" />
                        <Select value={reschedTime || "none"} onValueChange={(v) => setReschedTime(v === "none" ? "" : v)}>
                          <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Horário" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Sem horário</SelectItem>
                            {RESCHED_TIME_OPTIONS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" className="flex-1 text-xs" onClick={() => rescheduleVisit(detailVisit.id)}>Salvar nova data</Button>
                        <Button size="sm" variant="ghost" className="text-xs" onClick={() => setReschedForId(null)}>Cancelar</Button>
                      </div>
                    </div>
                  )}
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

      {/* Create Dialog */}
      <VisitFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        visitType={createType}
        currentUserId={userId}
        onCreated={fetchVisits}
      />

      {/* Send Visit Confirmation Dialog */}
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
    </div>
  );
}
