import { LoadingScreen } from "@/components/ui/loading-screen";
import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { cn } from "@/lib/utils";
import { getCompanyLogoOverride } from "@/lib/companyAssetOverrides";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { useCompanyModules } from "@/hooks/useCompanyModules";
import { useCompanyUnits } from "@/hooks/useCompanyUnits";
import { useUnitPermissions } from "@/hooks/useUnitPermissions";
import { usePermissions } from "@/hooks/usePermissions";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { MobileMenu } from "@/components/admin/MobileMenu";

import { PullToRefresh } from "@/components/ui/pull-to-refresh";
import { Button } from "@/components/ui/button";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AgendaCalendar } from "@/components/agenda/AgendaCalendar";
import { AgendaListView } from "@/components/agenda/AgendaListView";
import { EventFormDialog, EventFormData } from "@/components/agenda/EventFormDialog";
import { EventDetailSheet } from "@/components/agenda/EventDetailSheet";
import { MonthSummaryCards } from "@/components/agenda/MonthSummaryCards";
import { PeriodFilterPopover } from "@/components/agenda/PeriodFilterPopover";
import { PreReservationFormDialog, type PreReservation } from "@/components/agenda/PreReservationFormDialog";
import { PreReservationDetailSheet } from "@/components/agenda/PreReservationDetailSheet";
import { CalendarDays, Plus, Loader2, ShieldAlert, Menu, Clock, AlertTriangle, List, ListChecks, MapPin, Users, DollarSign, Search, X, Phone, Pencil, Handshake, ArrowUpDown, CalendarClock, FileText } from "lucide-react";
import { ReportDialog } from "@/components/reports/ReportDialog";
import { generateAgendaPDF, generateAgendaXLSX, generateFichaFestasPDF, generateFichaFestasXLSX } from "@/lib/generateAgendaPDF";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format, startOfMonth, endOfMonth, differenceInDays } from "date-fns";
import { AgendaTarefasTab } from "@/components/agenda/AgendaTarefasTab";
import { AgendaTudoTab } from "@/components/agenda/AgendaTudoTab";
import { AgendaVisitasTab } from "@/components/agenda/AgendaVisitasTab";
import { GuiaAgendaDialog } from "@/components/guias/GuiaAgendaDialog";
import { ptBR } from "date-fns/locale";
import { toast } from "@/hooks/use-toast";


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
  data_fechamento_venda?: string | null;
  vendedor_responsavel_id?: string | null;
  payment_method?: string | null;
  payment_details?: any;
  child_name?: string | null;
  child_age?: string | null;
  child_birthdate?: string | null;
  parent_names?: string | null;
  gifts?: string | null;
  extra_guest_value?: number | null;
  extra_guest_value_antecipado?: number | null;
  extra_guest_value_no_dia?: number | null;
  is_permuta?: boolean;
  internal_notes?: string;
  birthday_children?: any;
  event_optionals?: any;
}

const normalizeTimeValue = (value?: string | null) => {
  if (!value) return "";
  return value.slice(0, 5);
};

const getSortableDateValue = (value?: string | null) => {
  if (!value) return Number.NEGATIVE_INFINITY;
  const normalizedValue = value.includes("T") ? value : `${value}T12:00:00`;
  const parsedValue = new Date(normalizedValue).getTime();
  return Number.isNaN(parsedValue) ? Number.NEGATIVE_INFINITY : parsedValue;
};

const compareClosedEvents = (
  a: CompanyEvent,
  b: CompanyEvent,
  sortBy: "event_date" | "fechamento",
) => {
  if (sortBy === "fechamento") {
    const closingDifference = getSortableDateValue(b.data_fechamento_venda) - getSortableDateValue(a.data_fechamento_venda);
    if (closingDifference !== 0) return closingDifference;

    const eventDifference = getSortableDateValue(a.event_date) - getSortableDateValue(b.event_date);
    if (eventDifference !== 0) return eventDifference;
  } else {
    const eventDifference = getSortableDateValue(a.event_date) - getSortableDateValue(b.event_date);
    if (eventDifference !== 0) return eventDifference;

    const closingDifference = getSortableDateValue(b.data_fechamento_venda) - getSortableDateValue(a.data_fechamento_venda);
    if (closingDifference !== 0) return closingDifference;
  }

  const titleDifference = a.title.localeCompare(b.title, "pt-BR", { sensitivity: "base" });
  if (titleDifference !== 0) return titleDifference;

  return a.id.localeCompare(b.id);
};

const mapEventToFormData = (ev: CompanyEvent): EventFormData => ({
  id: ev.id,
  title: ev.title,
  event_date: ev.event_date,
  start_time: normalizeTimeValue(ev.start_time),
  end_time: normalizeTimeValue(ev.end_time),
  event_type: ev.event_type || "aniversario",
  guest_count: ev.guest_count,
  unit: ev.unit || "",
  status: ev.status,
  package_name: ev.package_name || "",
  total_value: (() => {
    const optionals = Array.isArray(ev.event_optionals) ? ev.event_optionals : [];
    const optionalsTotal = optionals.reduce((sum: number, o: any) => sum + (o.value || 0), 0);
    const pd = (ev.payment_details || {}) as any;
    const discountVal = pd.discount_value || 0;
    const discountType = pd.discount_type;
    const discountBase = pd.discount_base || 'total';
    const rawTotal = ev.total_value != null ? Math.max(0, ev.total_value - optionalsTotal) : null;
    if (rawTotal == null || !discountType || !discountVal) return rawTotal;
    // Reverse the discount to recover the original package value
    if (discountBase === 'pacote') {
      // grandTotal was (package - discount) + optionals, so rawTotal = package - discount
      return discountType === 'percentage' ? Math.round(rawTotal / (1 - discountVal / 100) * 100) / 100 : rawTotal + discountVal;
    }
    // discountBase === 'total': grandTotal was (package + optionals) - discount, so rawTotal = package + optionals - discount - optionals = package - discount
    return discountType === 'percentage' ? Math.round(rawTotal / (1 - discountVal / 100) * 100) / 100 : rawTotal + discountVal;
  })(),
  notes: ev.notes || "",
  lead_id: ev.lead_id || null,
  data_fechamento_venda: ev.data_fechamento_venda || null,
  vendedor_responsavel_id: ev.vendedor_responsavel_id || null,
  payment_method: ev.payment_method || null,
  payment_details: ev.payment_details || null,
  child_name: ev.child_name || null,
  child_age: ev.child_age || null,
  child_birthdate: ev.child_birthdate || null,
  parent_names: ev.parent_names || null,
  gifts: ev.gifts || null,
  extra_guest_value: ev.extra_guest_value ?? null,
  extra_guest_value_antecipado: (ev as any).extra_guest_value_antecipado ?? null,
  extra_guest_value_no_dia: (ev as any).extra_guest_value_no_dia ?? null,
  is_permuta: ev.is_permuta || false,
  internal_notes: ev.internal_notes || "",
  birthday_children: Array.isArray(ev.birthday_children) ? ev.birthday_children : [],
  event_optionals: Array.isArray(ev.event_optionals) ? ev.event_optionals : [],
});

export default function Agenda() {
  const navigate = useNavigate();
  const { currentCompany } = useCompany();
  const modules = useCompanyModules();
  const { units } = useCompanyUnits(currentCompany?.id);
  const physicalUnits = units.filter(u => u.slug !== "trabalhe-conosco");
  const isSalesChannelOnly = physicalUnits.length > 0 && physicalUnits.every(u => u.name.toLowerCase().includes("vendas"));

  const [isAdmin, setIsAdmin] = useState(false);
  const [permLoading, setPermLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<{ id: string; name: string; email: string; avatar?: string | null } | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const [centralTab, setCentralTab] = useState<"festas" | "visitas" | "tarefas" | "tudo">(() => {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get("tab");
    if (tab === "visitas" || tab === "tarefas" || tab === "tudo") return tab;
    return "festas";
  });

  const [events, setEvents] = useState<CompanyEvent[]>([]);
  const [checklistProgress, setChecklistProgress] = useState<Record<string, { total: number; completed: number }>>({});
  const [paymentStatus, setPaymentStatus] = useState<Record<string, { total: number; paid: number; pending: number; late: number; paidAmount: number; outstandingAmount: number; details: { amount: number; due_date: string; status: string }[] }>>({});
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState(startOfMonth(new Date()));
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedUnit, setSelectedUnit] = useState("all");
  const [periodRange, setPeriodRange] = useState<{ from: Date; to: Date } | null>(null);
  const [periodEvents, setPeriodEvents] = useState<CompanyEvent[]>([]);
  const [periodLoading, setPeriodLoading] = useState(false);
  const [closedInPeriod, setClosedInPeriod] = useState(0);
  const [closedRevenue, setClosedRevenue] = useState(0);
  const [closedEvents, setClosedEvents] = useState<(CompanyEvent & { lead_name?: string; lead_phone?: string })[]>([]);
  const [contentMode, setContentMode] = useState<"agendadas" | "fechadas" | "pre-reservas">("agendadas");
  const [allPreReservations, setAllPreReservations] = useState<PreReservation[]>([]);
  const [closedSortBy, setClosedSortBy] = useState<"event_date" | "fechamento">("fechamento");
  const [agendaCardFees, setAgendaCardFees] = useState<any[]>([]);

  const { canViewAll, allowedUnits, unitAccess, isLoading: permUnitLoading } = useUnitPermissions(currentUser?.id, currentCompany?.id);
  const { hasPermission: userHasPermission } = usePermissions(currentUser?.id);
  const showRevenue = isAdmin || userHasPermission("agenda.faturamento");
  const permissionUnits = useMemo(
    () => allowedUnits.filter(u => u !== "As duas" && u !== "all"),
    [allowedUnits],
  );
  // Unidades físicas (não-canais de venda) que o usuário pode acessar.
  // Vendedores de canais (ex.: "Vendas 4") precisam ver o calendário completo
  // do buffet para saber a disponibilidade de datas — não devem ser restritos.
  const physicalAllowedUnits = useMemo(
    () => permissionUnits.filter(u => !u.toLowerCase().includes("vendas")),
    [permissionUnits],
  );
  const isSalesChannelPermissionOnly = permissionUnits.length > 0 && physicalAllowedUnits.length === 0;
  // Só restringe eventos por unidade quando o usuário tem acesso a alguma
  // unidade física. Sem unidade física → mostra calendário completo do buffet.
  const shouldRestrictEventUnits = physicalAllowedUnits.length > 0;

  // Fetch card fees for net value calculation
  useEffect(() => {
    if (!currentCompany?.id) return;
    supabase
      .from("company_card_fees" as any)
      .select("*")
      .eq("company_id", currentCompany.id)
      .eq("is_active", true)
      .then(({ data }: any) => setAgendaCardFees((data || []) as any[]));
  }, [currentCompany?.id]);

  // Helper: compute net value (after card fees) from event's payment_details
  const getNetValue = useCallback((ev: CompanyEvent): number => {
    const gross = ev.total_value || 0;
    if (gross <= 0 || agendaCardFees.length === 0 || !ev.payment_details) return gross;
    const pd = ev.payment_details as any;
    const operator = agendaCardFees[0];

    const parseNum = (v: unknown): number => {
      if (typeof v === "number") return v;
      if (typeof v !== "string") return 0;
      const cleaned = v.trim().replace(/R\$\s?/g, "").replace(/\s/g, "");
      const normalized = cleaned.includes(",") ? cleaned.replace(/\./g, "").replace(",", ".") : cleaned;
      return Number(normalized) || 0;
    };

    let totalFee = 0;

    // Entrada card fee
    if (pd.entrada_forma === "cartao" || pd.entrada_forma === "cartao_credito") {
      const brut = parseNum(pd.entrada_valor);
      if (brut > 0) {
        const parcelas = Math.max(1, Number(pd.entrada_parcelas) || 1);
        const taxa = Number(operator[`taxa_credito_${Math.min(parcelas, 12)}x`] || 0);
        if (taxa > 0) totalFee += brut * taxa / 100;
      }
    } else if (pd.entrada_forma === "cartao_debito") {
      const brut = parseNum(pd.entrada_valor);
      if (brut > 0) totalFee += brut * Number(operator.taxa_debito || 0) / 100;
    }

    // Saldo card fee
    if (pd.saldo_forma === "cartao" || pd.saldo_forma === "cartao_credito") {
      const brut = parseNum(pd.saldo_valor);
      if (brut > 0) {
        const parcelas = Math.max(1, Number(pd.parcelas) || 1);
        const taxa = Number(operator[`taxa_credito_${Math.min(parcelas, 12)}x`] || 0);
        if (taxa > 0) totalFee += brut * taxa / 100;
      }
    } else if (pd.saldo_forma === "cartao_debito") {
      const brut = parseNum(pd.saldo_valor);
      if (brut > 0) totalFee += brut * Number(operator.taxa_debito || 0) / 100;
    }

    return Math.round((gross - totalFee) * 100) / 100;
  }, [agendaCardFees]);

  const [formOpen, setFormOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<EventFormData | null>(null);
  const [detailEvent, setDetailEvent] = useState<CompanyEvent | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"calendar" | "list">("calendar");
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Pre-reservation state
  const [preReservations, setPreReservations] = useState<PreReservation[]>([]);
  const [preResFormOpen, setPreResFormOpen] = useState(false);
  const [editingPreRes, setEditingPreRes] = useState<PreReservation | null>(null);
  const [detailPreRes, setDetailPreRes] = useState<PreReservation | null>(null);
  const [detailPreResOpen, setDetailPreResOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);

  // Search state
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<(CompanyEvent & { lead_name?: string; lead_phone?: string })[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [searchStatusFilter, setSearchStatusFilter] = useState<"all" | "confirmado" | "pendente" | "cancelado">("all");
  const [paymentFilter, setPaymentFilter] = useState<"all" | "pending" | "late">("all");

  const searchEvents = useCallback(async (term: string) => {
    if (!currentCompany?.id || term.trim().length < 2) {
      setSearchResults([]);
      setSearchLoading(false);
      return;
    }
    setSearchLoading(true);
    console.log('[Agenda:Search]', { term });

    const cleanTerm = `%${term.trim()}%`;

    // Search leads by name/phone
    const leadsPromise = supabase
      .from("campaign_leads")
      .select("id, name, whatsapp")
      .eq("company_id", currentCompany.id)
      .or(`name.ilike.${cleanTerm},whatsapp.ilike.${cleanTerm}`)
      .limit(50);

    // Also search events directly by title, child_name, parent_names
    const eventsDirectPromise = supabase
      .from("company_events")
      .select("*")
      .eq("company_id", currentCompany.id)
      .or(`title.ilike.${cleanTerm},child_name.ilike.${cleanTerm},parent_names.ilike.${cleanTerm}`)
      .order("event_date", { ascending: false })
      .limit(30);

    const [{ data: leads }, { data: directEvts }] = await Promise.all([leadsPromise, eventsDirectPromise]);

    // Fetch events by lead_id if leads found
    let leadEvts: any[] = [];
    const leadMap = new Map<string, { id: string; name: string; whatsapp: string }>();
    if (leads?.length) {
      leads.forEach(l => leadMap.set(l.id, l));
      const leadIds = leads.map(l => l.id);
      const { data } = await supabase
        .from("company_events")
        .select("*")
        .eq("company_id", currentCompany.id)
        .in("lead_id", leadIds)
        .order("event_date", { ascending: false })
        .limit(30);
      leadEvts = data || [];
    }

    // Merge and deduplicate
    const allEvts = [...(directEvts || []), ...leadEvts];
    const seen = new Set<string>();
    const unique: any[] = [];
    for (const ev of allEvts) {
      if (!seen.has(ev.id)) {
        seen.add(ev.id);
        unique.push(ev);
      }
    }

    // Enrich with lead info (fetch missing leads if needed)
    const missingLeadIds = unique
      .filter(ev => ev.lead_id && !leadMap.has(ev.lead_id))
      .map(ev => ev.lead_id);

    if (missingLeadIds.length > 0) {
      const { data: extraLeads } = await supabase
        .from("campaign_leads")
        .select("id, name, whatsapp")
        .in("id", [...new Set(missingLeadIds)]);
      extraLeads?.forEach(l => leadMap.set(l.id, l));
    }

    const results = unique.map(ev => {
      const lead = ev.lead_id ? leadMap.get(ev.lead_id) : undefined;
      return { ...ev, lead_name: lead?.name, lead_phone: lead?.whatsapp } as CompanyEvent & { lead_name?: string; lead_phone?: string };
    });

    // Sort by event_date descending
    results.sort((a, b) => (b.event_date || '').localeCompare(a.event_date || ''));

    setSearchResults(results);
    setSearchLoading(false);
  }, [currentCompany?.id]);

  const handleSearchChange = useCallback((value: string) => {
    setSearchTerm(value);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    if (value.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    setSearchLoading(true);
    searchTimerRef.current = setTimeout(() => searchEvents(value), 400);
  }, [searchEvents]);

  const clearSearch = useCallback(() => {
    setSearchTerm("");
    setSearchResults([]);
    setSearchStatusFilter("all");
  }, []);

  const filteredSearchResults = useMemo(() => {
    if (searchStatusFilter === "all") return searchResults;
    return searchResults.filter(ev => ev.status === searchStatusFilter);
  }, [searchResults, searchStatusFilter]);

  const sortedClosedEvents = useMemo(
    () => [...closedEvents].sort((a, b) => compareClosedEvents(a, b, closedSortBy)),
    [closedEvents, closedSortBy],
  );

  const mergeUpdatedEventIntoState = useCallback((updatedEvent: CompanyEvent) => {
    const replaceEvent = (list: CompanyEvent[]) => list.map((event) => (event.id === updatedEvent.id ? updatedEvent : event));

    setEvents((prev) => replaceEvent(prev));
    setClosedEvents((prev) => replaceEvent(prev));
    setPeriodEvents((prev) => replaceEvent(prev));
    setSearchResults((prev) => prev.map((event) => (event.id === updatedEvent.id ? { ...event, ...updatedEvent } : event)));
    setDetailEvent((prev) => (prev?.id === updatedEvent.id ? { ...prev, ...updatedEvent } : prev));
    setEditingEvent((prev) => (prev?.id === updatedEvent.id ? mapEventToFormData({ ...updatedEvent }) : prev));
  }, []);

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
  const fetchClosedInPeriod = useCallback(async (start: string, end: string, unit?: string): Promise<{ count: number; revenue: number; events: (CompanyEvent & { lead_name?: string; lead_phone?: string })[] }> => {
    if (!currentCompany?.id) return { count: 0, revenue: 0, events: [] };
    let query = supabase
      .from("company_events")
      .select("*")
      .eq("company_id", currentCompany.id)
      .gte("data_fechamento_venda", start)
      .lte("data_fechamento_venda", end)
      .order("data_fechamento_venda", { ascending: false })
      .order("event_date", { ascending: true })
      .order("title", { ascending: true });
    
    // Apply unit filter (fetch broad, then case-insensitive filter client-side)
    const { data } = await query;
    let evts = (data || []) as CompanyEvent[];
    if (unit && unit !== "all") {
      const sel = unit.toLowerCase().trim();
      evts = evts.filter(e => e.unit && e.unit.toLowerCase().trim() === sel);
    } else if (!canViewAll && shouldRestrictEventUnits) {
      const permitted = allowedUnits.filter(u => u !== "As duas").map(u => u.toLowerCase().trim());
      evts = evts.filter(e => e.unit && permitted.includes(e.unit.toLowerCase().trim()));
    }

    // Enrich with lead name/phone
    const leadIds = [...new Set(evts.map(e => e.lead_id).filter(Boolean))] as string[];
    let leadMap = new Map<string, { name: string; whatsapp: string }>();
    if (leadIds.length > 0) {
      const { data: leads } = await supabase
        .from("campaign_leads")
        .select("id, name, whatsapp")
        .in("id", leadIds);
      (leads || []).forEach((l: any) => leadMap.set(l.id, l));
    }
    const enriched = evts.map(ev => {
      const lead = ev.lead_id ? leadMap.get(ev.lead_id) : undefined;
      return { ...ev, lead_name: lead?.name, lead_phone: lead?.whatsapp };
    });

    const count = enriched.length;
    const revenue = enriched.filter(e => !e.is_permuta).reduce((sum, e) => sum + getNetValue(e), 0);
    return { count, revenue, events: enriched };
  }, [currentCompany?.id, canViewAll, allowedUnits, shouldRestrictEventUnits, getNetValue]);

  const initialLoadDone = useRef(false);
  const fetchEvents = useCallback(async () => {
    if (!currentCompany?.id || permUnitLoading) return;
    if (!initialLoadDone.current) setLoading(true);
    const start = format(startOfMonth(month), "yyyy-MM-dd");
    const end = format(endOfMonth(month), "yyyy-MM-dd");
    const [eventsRes, checklistRes, closedResult, preResRes, allPreResRes, paymentsRes] = await Promise.all([
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
      fetchClosedInPeriod(start, end, selectedUnit),
      (supabase as any)
        .from("pre_reservations")
        .select("*")
        .eq("company_id", currentCompany.id)
        .gte("event_date", start)
        .lte("event_date", end)
        .in("status", ["ativa", "convertida"]),
      (supabase as any)
        .from("pre_reservations")
        .select("*")
        .eq("company_id", currentCompany.id)
        .order("event_date", { ascending: true }),
      supabase
        .from("event_payments")
        .select("id, event_id, status, due_date, amount, gross_amount")
        .eq("company_id", currentCompany.id),
    ]);

    if (!eventsRes.error && eventsRes.data) setEvents(eventsRes.data as CompanyEvent[]);
    if (!preResRes.error && preResRes.data) setPreReservations(preResRes.data as PreReservation[]);
    if (!allPreResRes.error && allPreResRes.data) setAllPreReservations(allPreResRes.data as PreReservation[]);
    setClosedInPeriod(closedResult?.count || 0);
    setClosedRevenue(closedResult?.revenue || 0);
    setClosedEvents(closedResult?.events || []);

    // Fetch partial entries (entradas parciais) for all parcelas in scope
    const paymentIds = (paymentsRes.data || []).map((p: any) => p.id);
    let entriesByPayment: Record<string, number> = {};
    if (paymentIds.length > 0) {
      const { data: entriesData } = await (supabase as any)
        .from("event_payment_entries")
        .select("payment_id, amount, gross_amount")
        .in("payment_id", paymentIds);
      (entriesData || []).forEach((e: any) => {
        // Use gross_amount when available (what client actually paid), fallback to net amount
        const grossValue = Number(e.gross_amount ?? e.amount ?? 0);
        entriesByPayment[e.payment_id] = (entriesByPayment[e.payment_id] || 0) + grossValue;
      });
    }

    // Build checklist progress map
    const progressMap: Record<string, { total: number; completed: number }> = {};
    (checklistRes.data || []).forEach((item: any) => {
      if (!progressMap[item.event_id]) progressMap[item.event_id] = { total: 0, completed: 0 };
      progressMap[item.event_id].total++;
      if (item.is_completed) progressMap[item.event_id].completed++;
    });
    setChecklistProgress(progressMap);

    // Build payment status map
    const today = format(new Date(), "yyyy-MM-dd");
    const pmMap: Record<string, { total: number; paid: number; pending: number; late: number; paidAmount: number; outstandingAmount: number; details: { amount: number; due_date: string; status: string }[] }> = {};
    (paymentsRes.data || []).forEach((p: any) => {
      if (!pmMap[p.event_id]) pmMap[p.event_id] = { total: 0, paid: 0, pending: 0, late: 0, paidAmount: 0, outstandingAmount: 0, details: [] };
      pmMap[p.event_id].total++;
      const isLate = p.status !== "paid" && p.due_date && p.due_date < today;
      // For comparing against event total_value (which is the gross/contracted value),
      // we must accumulate the GROSS amount the client actually paid, not the net
      // amount after card fees. Otherwise card fees create a fake "uncovered balance".
      const grossAmount = Number(p.gross_amount ?? p.amount ?? 0);
      if (p.status === "paid") {
        pmMap[p.event_id].paid++;
        pmMap[p.event_id].paidAmount += grossAmount;
      } else if (isLate) {
        pmMap[p.event_id].late++;
        pmMap[p.event_id].paidAmount += entriesByPayment[p.id] || 0;
      } else {
        pmMap[p.event_id].pending++;
        pmMap[p.event_id].paidAmount += entriesByPayment[p.id] || 0;
      }
      if (p.status !== "paid") {
        pmMap[p.event_id].details.push({ amount: p.amount || 0, due_date: p.due_date || "", status: isLate ? "late" : "pending" });
      }
    });

    // Compare against event total_value to detect uncovered balance (parcelas faltando)
    const eventsList = (eventsRes.data || []) as CompanyEvent[];
    eventsList.forEach((ev: any) => {
      const totalValue = Number(ev.total_value || 0);
      if (totalValue <= 0) return;
      if (!pmMap[ev.id]) pmMap[ev.id] = { total: 0, paid: 0, pending: 0, late: 0, paidAmount: 0, outstandingAmount: 0, details: [] };
      const entry = pmMap[ev.id];
      const outstanding = Math.round((totalValue - entry.paidAmount) * 100) / 100;
      entry.outstandingAmount = outstanding > 0 ? outstanding : 0;
      // If there is uncovered balance not represented by any parcela, surface it
      if (entry.outstandingAmount > 0.01) {
        const sumOfPendingDetails = entry.details.reduce((s, d) => s + Number(d.amount || 0), 0);
        const uncovered = Math.round((entry.outstandingAmount - sumOfPendingDetails) * 100) / 100;
        if (uncovered > 0.01) {
          const eventPassed = ev.event_date && ev.event_date < today;
          if (eventPassed) {
            entry.late++;
          } else {
            entry.pending++;
          }
          entry.total++;
          entry.details.push({
            amount: uncovered,
            due_date: ev.event_date || "",
            status: eventPassed ? "late" : "pending",
          });
        }
      }
    });
    setPaymentStatus(pmMap);

    setLoading(false);
    initialLoadDone.current = true;
  }, [currentCompany?.id, month, selectedUnit, permUnitLoading, canViewAll, allowedUnits, fetchClosedInPeriod]);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  // Re-fetch closed count when unit changes (for period mode)
  useEffect(() => {
    if (!periodRange || !currentCompany?.id) return;
    const start = format(periodRange.from, "yyyy-MM-dd");
    const end = format(periodRange.to, "yyyy-MM-dd");
    fetchClosedInPeriod(start, end, selectedUnit).then(result => {
      setClosedInPeriod(result?.count || 0);
      setClosedRevenue(result?.revenue || 0);
      setClosedEvents(result?.events || []);
    });
  }, [selectedUnit]);

  // Fetch events for custom period
  const fetchPeriodEvents = async (range: { from: Date; to: Date }) => {
    if (!currentCompany?.id) return;
    setPeriodLoading(true);
    const start = format(range.from, "yyyy-MM-dd");
    const end = format(range.to, "yyyy-MM-dd");
    const [eventsRes, closedResult] = await Promise.all([
      supabase
        .from("company_events")
        .select("*")
        .eq("company_id", currentCompany.id)
        .gte("event_date", start)
        .lte("event_date", end)
        .order("event_date"),
      fetchClosedInPeriod(start, end, selectedUnit),
    ]);
    if (!eventsRes.error && eventsRes.data) setPeriodEvents(eventsRes.data as CompanyEvent[]);
    setClosedInPeriod(closedResult?.count || 0);
    setClosedRevenue(closedResult?.revenue || 0);
    setClosedEvents(closedResult?.events || []);
    setPeriodLoading(false);
  };

  const handlePeriodConfirm = (range: { from: Date; to: Date }) => {
    setPeriodRange(range);
    fetchPeriodEvents(range);
  };

  const handlePeriodClear = () => {
    setPeriodRange(null);
    setPeriodEvents([]);
  };

  // Auto-select unit based on permissions (and force "all" for sales-channel-only companies)
  useEffect(() => {
    if (permUnitLoading) return;
    if (isSalesChannelOnly || isSalesChannelPermissionOnly) {
      setSelectedUnit("all");
      return;
    }
    if (!canViewAll) {
      const permitted = allowedUnits.filter(u => u !== "As duas");
      if (permitted.length === 1) {
        setSelectedUnit(permitted[0]);
      }
    }
  }, [canViewAll, allowedUnits, permUnitLoading, isSalesChannelOnly, isSalesChannelPermissionOnly]);

  // Filtered events (respects unit permissions) — case-insensitive match
  const filteredEvents = useMemo(() => {
    let filtered = events;
    if (!canViewAll && shouldRestrictEventUnits) {
      const permitted = allowedUnits.filter(u => u !== "As duas").map(u => u.toLowerCase().trim());
      filtered = filtered.filter(e => e.unit && permitted.includes(e.unit.toLowerCase().trim()));
    }
    if (selectedUnit !== "all") {
      const sel = selectedUnit.toLowerCase().trim();
      filtered = filtered.filter(e => e.unit && e.unit.toLowerCase().trim() === sel);
    }
    if (paymentFilter !== "all") {
      filtered = filtered.filter(e => {
        const ps = paymentStatus[e.id];
        if (!ps) return false;
        if (paymentFilter === "late") return ps.late > 0;
        if (paymentFilter === "pending") return ps.pending > 0 || ps.late > 0;
        return false;
      });
    }
    return filtered;
  }, [events, selectedUnit, canViewAll, allowedUnits, shouldRestrictEventUnits, paymentFilter, paymentStatus]);

  // Filtered period events (same unit logic, case-insensitive)
  const periodFilteredEvents = useMemo(() => {
    let filtered = periodEvents;
    if (!canViewAll && shouldRestrictEventUnits) {
      const permitted = allowedUnits.filter(u => u !== "As duas").map(u => u.toLowerCase().trim());
      filtered = filtered.filter(e => e.unit && permitted.includes(e.unit.toLowerCase().trim()));
    }
    if (selectedUnit !== "all") {
      const sel = selectedUnit.toLowerCase().trim();
      filtered = filtered.filter(e => e.unit && e.unit.toLowerCase().trim() === sel);
    }
    return filtered;
  }, [periodEvents, selectedUnit, canViewAll, allowedUnits, shouldRestrictEventUnits]);

  // Events for selected day
  const dayEvents = useMemo(() => {
    if (!selectedDate) return [];
    const dateStr = format(selectedDate, "yyyy-MM-dd");
    return filteredEvents.filter(e => e.event_date === dateStr);
  }, [filteredEvents, selectedDate]);

  // Pre-reservations for selected day
  const dayPreReservations = useMemo(() => {
    if (!selectedDate) return [];
    const dateStr = format(selectedDate, "yyyy-MM-dd");
    return preReservations.filter(pr => pr.event_date === dateStr && pr.status === "ativa");
  }, [preReservations, selectedDate]);

  // Filtered pre-reservations (respects unit + permissions, case-insensitive)
  const filteredPreReservations = useMemo(() => {
    let filtered = preReservations;
    if (!canViewAll && shouldRestrictEventUnits) {
      const permitted = allowedUnits.filter(u => u !== "As duas").map(u => u.toLowerCase().trim());
      filtered = filtered.filter(pr => pr.unit && permitted.includes(pr.unit.toLowerCase().trim()));
    }
    if (selectedUnit !== "all") {
      const sel = selectedUnit.toLowerCase().trim();
      filtered = filtered.filter(pr => pr.unit && pr.unit.toLowerCase().trim() === sel);
    }
    return filtered;
  }, [preReservations, selectedUnit, canViewAll, allowedUnits, shouldRestrictEventUnits]);

  // Detect conflicts (same unit + overlapping time)
  // When end_time is missing, assume event lasts ~3 hours from start to avoid false conflicts
  const inferEndTime = (startTime: string, endTime: string | null | undefined): string => {
    if (endTime) return endTime;
    const [h, m] = startTime.split(":").map(Number);
    const endH = Math.min(h + 3, 23);
    return `${String(endH).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  };

  const getConflicts = (event: CompanyEvent) => {
    if (!event.start_time || !event.unit) return [];
    const eventEnd = inferEndTime(event.start_time, event.end_time);
    return events.filter(e => {
      if (e.id === event.id || e.event_date !== event.event_date || e.unit !== event.unit || e.status === "cancelado" || !e.start_time) return false;
      const eEnd = inferEndTime(e.start_time!, e.end_time);
      return e.start_time! < eventEnd && eEnd > event.start_time;
    });
  };


  const handleSubmit = async (data: EventFormData): Promise<string | void> => {
    if (!currentCompany?.id || !currentUser?.id) return;
    const payload: any = {
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
      data_fechamento_venda: data.data_fechamento_venda || null,
      vendedor_responsavel_id: data.vendedor_responsavel_id || null,
      payment_method: data.payment_method || null,
      child_name: data.birthday_children?.[0]?.name || data.child_name || null,
      child_age: data.birthday_children?.[0]?.age || data.child_age || null,
      child_birthdate: data.birthday_children?.[0]?.birthdate || data.child_birthdate || null,
      birthday_children: (data.birthday_children || []).filter((c: any) => c.name || c.age || c.birthdate),
      parent_names: data.parent_names || null,
      gifts: data.gifts || null,
      extra_guest_value: data.extra_guest_value,
      extra_guest_value_antecipado: data.extra_guest_value_antecipado,
      extra_guest_value_no_dia: data.extra_guest_value_no_dia,
      is_permuta: data.is_permuta || false,
      internal_notes: data.internal_notes || null,
      event_optionals: (data.event_optionals || []).filter((o: any) => o.name || (o.value != null && o.value > 0)),
    } as any;
    if (data.payment_details) {
      payload.payment_details = data.payment_details;
      // Etapa 3: persistir blocos extras de pagamento na coluna dedicada
      payload.payment_blocks = Array.isArray((data.payment_details as any).payment_blocks)
        ? (data.payment_details as any).payment_blocks
        : null;
    }
    console.log('[Evento:DadosComerciais]', { data_fechamento_venda: payload.data_fechamento_venda, vendedor_responsavel_id: payload.vendedor_responsavel_id });
    console.log('[Evento:DadosAniversariante]', { child_name: payload.child_name, child_age: payload.child_age, parent_names: payload.parent_names, gifts: payload.gifts, extra_guest_value: payload.extra_guest_value });

    if (data.id) {
      const { error, data: updatedEvent } = await supabase
        .from("company_events")
        .update(payload)
        .eq("id", data.id)
        .select("*")
        .single();
      console.log('[Evento:UpdateResult]', { error, updatedEvent, eventId: data.id });
      if (error) { toast({ title: "Erro ao atualizar", description: error.message, variant: "destructive" }); return; }
      if (updatedEvent) {
        mergeUpdatedEventIntoState(updatedEvent as CompanyEvent);
      }
      await syncPaymentDetails(data.id, currentCompany.id, data.payment_details);
      toast({ title: "Festa atualizada!" });
      fetchEvents();
      return data.id;
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
      await syncPaymentDetails(newEvent.id, currentCompany.id, data.payment_details);
      fetchEvents();
      return newEvent.id;
    }
  };

  const syncPaymentDetails = async (eventId: string, companyId: string, pd: any) => {
    if (!pd) return;
    try {
      // Check if there are already manually-managed payments (paid ones should not be wiped)
      const { data: existing } = await supabase
        .from("event_payments")
        .select("id, status, amount, gross_amount, type, payment_method")
        .eq("event_id", eventId);
      const paidPayments = (existing || []).filter((p: any) => p.status === "paid");
      const hasPaidPayments = paidPayments.length > 0;

      // Calculate total gross already paid (use gross_amount if available, fallback to amount)
      const paidGrossTotal = paidPayments.reduce((sum: number, p: any) => {
        return sum + (Number(p.gross_amount) || Number(p.amount) || 0);
      }, 0);

      if (hasPaidPayments) {
        // Only delete pending payments, keep paid ones intact
        const pendingIds = (existing || []).filter((p: any) => p.status !== "paid").map((p: any) => p.id);
        if (pendingIds.length > 0) {
          await supabase.from("event_payments").delete().in("id", pendingIds);
        }
      } else {
        // Delete all existing payments to re-sync
        await supabase.from("event_payments").delete().eq("event_id", eventId);
      }

      // Helpers — resolve operator (snapshot first, then global default).
      // Do not depend only on React state here: this sync can run right after opening
      // the agenda, before agendaCardFees has finished loading.
      let effectiveCardFees = agendaCardFees;
      if (effectiveCardFees.length === 0) {
        const { data: freshFees } = await supabase
          .from("company_card_fees" as any)
          .select("*")
          .eq("company_id", companyId)
          .eq("is_active", true);
        effectiveCardFees = (freshFees || []) as any[];
        if (effectiveCardFees.length > 0) setAgendaCardFees(effectiveCardFees);
      }
      const getCardOperator = (): any | null => {
        const opId = pd.card_operator_id;
        if (opId) {
          const found = effectiveCardFees.find((f: any) => f.id === opId);
          if (found) return found;
        }
        return effectiveCardFees[0] || null;
      };
      const getCardFeeRate = (forma: string, parcelas: number): number => {
        const op: any = getCardOperator();
        if (!op) return 0;
        if (forma === "cartao_debito") return Number(op.taxa_debito || 0);
        if (forma === "cartao" || forma === "cartao_credito") {
          const p = Math.min(Math.max(1, parcelas), 12);
          return Number(op[`taxa_credito_${p}x`] || 0);
        }
        return 0;
      };

      const applyFee = (amount: number, rate: number): number => {
        if (rate <= 0) return amount;
        return Math.round((amount * (1 - rate / 100)) * 100) / 100;
      };

      // Calculate total gross value of new rows before subtracting paid amounts
      let totalNewGross = 0;
      if (pd.entrada_valor && pd.entrada_valor > 0) totalNewGross += pd.entrada_valor;
      if (pd.parcelas_details && pd.parcelas_details.length > 0) {
        totalNewGross += pd.parcelas_details.reduce((s: number, p: any) => s + (Number(p.valor) || 0), 0);
      } else if (pd.saldo_valor && pd.saldo_valor > 0) {
        totalNewGross += pd.saldo_valor;
      }

      // If everything is already paid, skip creating new rows
      const remainingGross = totalNewGross - paidGrossTotal;
      if (hasPaidPayments && remainingGross <= 0) {
        // All paid, nothing to create
        return;
      }

      const rows: any[] = [];

      // Entrada
      if (pd.entrada_valor && pd.entrada_valor > 0) {
        // Check if entrada was already paid (by type match)
        const entradaAlreadyPaid = paidPayments.some((p: any) => p.type === "entrada");
        if (!entradaAlreadyPaid) {
          const feeRate = getCardFeeRate(pd.entrada_forma || "", Number(pd.entrada_parcelas) || 1);
          const entradaRow: any = {
            event_id: eventId,
            company_id: companyId,
            type: "entrada",
            amount: applyFee(pd.entrada_valor, feeRate),
            due_date: pd.entrada_data || new Date().toISOString().split("T")[0],
            payment_method: pd.entrada_forma || null,
            status: "pending",
          };
          if (feeRate > 0) {
            entradaRow.gross_amount = pd.entrada_valor;
            entradaRow.card_fee_percent = feeRate;
          }
          rows.push(entradaRow);
        }
      }

      // Parcelas — for non-antecipado card, split into N monthly net rows; otherwise consolidate
      const saldoForma = pd.saldo_forma || "";
      const saldoIsCard = saldoForma === "cartao" || saldoForma === "cartao_credito" || saldoForma === "cartao_debito";
      const saldoIsDebit = saldoForma === "cartao_debito";
      const saldoParcelas = saldoIsDebit ? 1 : Math.max(1, Number(pd.parcelas) || 1);
      const saldoFeeRate = getCardFeeRate(saldoForma, saldoParcelas);

      // Guard: only block when there is a non-opcional saldo parcela already paid.
      // Opcionais (notes contains "[extra:" or starts with "Opcional") must NOT block saldo creation.
      const isOpcionalParcel = (p: any) => {
        const n = String(p?.notes || "");
        return n.startsWith("[extra:") || n.toLowerCase().includes("opcional");
      };
      const parcelaAlreadyPaid = paidPayments.some(
        (p: any) => p.type === "parcela" && !isOpcionalParcel(p),
      );

      if (!parcelaAlreadyPaid) {
        // Compute total saldo gross (sum of parcelas_details if present, else saldo_valor)
        let totalSaldoGross = 0;
        if (pd.parcelas_details && pd.parcelas_details.length > 0) {
          totalSaldoGross = pd.parcelas_details.reduce((s: number, p: any) => s + (Number(p.valor) || 0), 0);
        } else if (pd.saldo_valor && pd.saldo_valor > 0) {
          totalSaldoGross = pd.saldo_valor;
        }

        const operator: any = getCardOperator();
        const isNonAntecipado = saldoIsCard && !saldoIsDebit && operator && operator.antecipado === false && saldoParcelas > 1 && saldoFeeRate > 0;

        if (saldoIsCard && saldoFeeRate > 0 && isNonAntecipado && totalSaldoGross > 0) {
          // CASE A: card non-antecipado → split into N monthly net rows
          const { splitNonAntecipadoInstallments } = await import("@/lib/cardFees");
          const saleDate = pd.saldo_data || new Date().toISOString().split("T")[0];
          const prazoDias = Number(operator.prazo_recebimento_dias) || 30;
          const slices = splitNonAntecipadoInstallments(totalSaldoGross, saldoFeeRate, saldoParcelas, saleDate, prazoDias);
          if (slices && slices.length > 0) {
            const grossPerSlice = Math.round((totalSaldoGross / saldoParcelas) * 100) / 100;
            for (const slice of slices) {
              rows.push({
                event_id: eventId,
                company_id: companyId,
                type: "parcela",
                amount: slice.amount,
                gross_amount: grossPerSlice,
                card_fee_percent: saldoFeeRate,
                card_installments: saldoParcelas,
                card_operator_id: operator.id,
                due_date: slice.due_date,
                payment_method: saldoForma,
                status: "pending",
                notes: `Parcela ${slice.index}/${slice.total} — Cartão ${saldoParcelas}x ${operator.operator_name || ""} (sem antecipação)`,
              });
            }
          }
        } else if (saldoIsCard && saldoFeeRate > 0 && totalSaldoGross > 0) {
          // CASE B: card antecipado / debit → consolidate into single net row
          rows.push({
            event_id: eventId,
            company_id: companyId,
            type: "parcela",
            amount: applyFee(totalSaldoGross, saldoFeeRate),
            gross_amount: totalSaldoGross,
            card_fee_percent: saldoFeeRate,
            card_installments: saldoParcelas,
            card_operator_id: operator?.id || null,
            due_date: pd.saldo_data || new Date().toISOString().split("T")[0],
            payment_method: saldoForma,
            status: "pending",
          });
        } else {
          // CASE C: non-card → keep individual parcelas
          if (pd.parcelas_details && pd.parcelas_details.length > 0) {
            pd.parcelas_details.forEach((p: any) => {
              if (p.valor && p.valor > 0) {
                rows.push({
                  event_id: eventId,
                  company_id: companyId,
                  type: "parcela",
                  amount: p.valor,
                  due_date: p.vencimento || pd.saldo_data || new Date().toISOString().split("T")[0],
                  payment_method: saldoForma || null,
                  status: "pending",
                });
              }
            });
          } else if (pd.saldo_valor && pd.saldo_valor > 0) {
            rows.push({
              event_id: eventId,
              company_id: companyId,
              type: "parcela",
              amount: pd.saldo_valor,
              due_date: pd.saldo_data || new Date().toISOString().split("T")[0],
              payment_method: saldoForma || null,
              status: "pending",
            });
          }
        }
      }

      // Etapa 3: gerar parcelas dos blocos extras (múltiplas formas de pagamento)
      // Cada bloco tem prefixo de notes "[bloco:<id>]" para preservar parcelas já pagas via selective sync.
      const blocks: any[] = Array.isArray(pd.payment_blocks) ? pd.payment_blocks : [];
      if (blocks.length > 0) {
        const today = new Date().toISOString().split("T")[0];
        for (const b of blocks) {
          const blockId = String(b.id || crypto.randomUUID());
          const blockTag = `[bloco:${blockId}]`;
          const bForma = String(b.forma || "");
          const bValor = Number(b.valor) || 0;
          if (bValor <= 0) continue;
          // Data informada pelo usuário (data da venda no cartão, ou 1º vencimento de boleto/PIX). Fallback: hoje.
          const bStartDate = (typeof b.start_date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(b.start_date)) ? b.start_date : today;
          // Selective sync: se este bloco já tem alguma parcela paga, não regenera
          const blockHasPaid = paidPayments.some((p: any) => String(p.notes || "").startsWith(blockTag));
          if (blockHasPaid) continue;

          const bIsCard = bForma === "cartao" || bForma === "cartao_credito" || bForma === "cartao_debito";
          const bIsDebit = bForma === "cartao_debito";
          const bParcelas = bIsDebit ? 1 : Math.max(1, Number(b.parcelas) || 1);
          const bFeeRate = getCardFeeRate(bForma, bParcelas);
          // Operadora específica do bloco (se informada) — senão usa a padrão do evento
          const blockOperator: any = (() => {
            if (b.card_operator_id) {
              const f = effectiveCardFees.find((x: any) => x.id === b.card_operator_id);
              if (f) return f;
            }
            return getCardOperator();
          })();
          const blockFeeRate = bIsCard && blockOperator
            ? (bIsDebit ? Number(blockOperator.taxa_debito || 0)
              : Number(blockOperator[`taxa_credito_${Math.min(12, Math.max(1, bParcelas))}x`] || 0))
            : bFeeRate;

          const isNonAntecipado = bIsCard && !bIsDebit && blockOperator && blockOperator.antecipado === false && bParcelas > 1 && blockFeeRate > 0;

          if (bIsCard && blockFeeRate > 0 && isNonAntecipado) {
            // CASE A: cartão não-antecipado → N parcelas mensais líquidas
            const { splitNonAntecipadoInstallments } = await import("@/lib/cardFees");
            const prazoDias = Number(blockOperator.prazo_recebimento_dias) || 30;
            const slices = splitNonAntecipadoInstallments(bValor, blockFeeRate, bParcelas, bStartDate, prazoDias);
            if (slices) {
              const grossPerSlice = Math.round((bValor / bParcelas) * 100) / 100;
              for (const slice of slices) {
                rows.push({
                  event_id: eventId, company_id: companyId, type: "parcela",
                  amount: slice.amount, gross_amount: grossPerSlice,
                  card_fee_percent: blockFeeRate, card_installments: bParcelas,
                  card_operator_id: blockOperator.id,
                  due_date: slice.due_date, payment_method: bForma, status: "pending",
                  notes: `${blockTag} Parcela ${slice.index}/${slice.total} — Cartão ${bParcelas}x ${blockOperator.operator_name || ""} (sem antecipação)`,
                });
              }
            }
          } else if (bIsCard && blockFeeRate > 0) {
            // CASE B: cartão antecipado / débito → consolida em 1 linha líquida
            rows.push({
              event_id: eventId, company_id: companyId, type: "parcela",
              amount: applyFee(bValor, blockFeeRate), gross_amount: bValor,
              card_fee_percent: blockFeeRate, card_installments: bParcelas,
              card_operator_id: blockOperator?.id || null,
              due_date: bStartDate, payment_method: bForma, status: "pending",
              notes: `${blockTag} Cartão ${bParcelas}x${blockOperator?.operator_name ? ` — ${blockOperator.operator_name}` : ""}`,
            });
          } else {
            // CASE C: PIX / boleto / dinheiro → N parcelas mensais simples
            const perParcela = Math.round((bValor / bParcelas) * 100) / 100;
            for (let i = 0; i < bParcelas; i++) {
              const d = new Date(bStartDate + "T12:00:00");
              d.setMonth(d.getMonth() + i);
              const due = d.toISOString().split("T")[0];
              rows.push({
                event_id: eventId, company_id: companyId, type: "parcela",
                amount: perParcela, due_date: due,
                payment_method: bForma || null, status: "pending",
                notes: `${blockTag} Parcela ${i + 1}/${bParcelas}${bForma ? ` — ${bForma}` : ""}`,
              });
            }
          }
        }
      }

      if (rows.length > 0) {
        await supabase.from("event_payments").insert(rows);
      }
    } catch (err) {
      console.error("[syncPaymentDetails] error:", err);
    }
  };

  const confirmDelete = async () => {
    if (!deleteConfirmId) return;
    setDeleting(true);
    try {
      // Delete dependent records first to avoid foreign key violations
      // 1) Delete contract audit logs for contracts linked to this event
      const { data: contracts } = await (supabase as any).from("generated_contracts").select("id").eq("event_id", deleteConfirmId);
      const contractIds = (contracts || []).map((c: any) => c.id);
      if (contractIds.length > 0) {
        await (supabase as any).from("contract_audit_logs").delete().in("contract_id", contractIds);
      }
      // 2) Delete generated contracts and client data requests
      const { error: gcErr } = await (supabase as any).from("generated_contracts").delete().eq("event_id", deleteConfirmId);
      if (gcErr) console.error("[delete cascade] generated_contracts:", gcErr.message);
      await (supabase as any).from("client_data_requests").delete().eq("event_id", deleteConfirmId);
      // 3) Delete financial records
      await (supabase as any).from("event_financial_timeline").delete().eq("event_id", deleteConfirmId);
      await (supabase as any).from("event_payments").delete().eq("event_id", deleteConfirmId);
      await (supabase as any).from("event_extras").delete().eq("event_id", deleteConfirmId);
      await (supabase as any).from("event_discounts").delete().eq("event_id", deleteConfirmId);
      // 4) Delete other dependent records
      await (supabase as any).from("freelancer_evaluations").delete().eq("event_id", deleteConfirmId);
      await (supabase as any).from("event_checklist_items").delete().eq("event_id", deleteConfirmId);
      await (supabase as any).from("event_staff_entries").delete().eq("event_id", deleteConfirmId);
      await (supabase as any).from("event_info_entries").delete().eq("event_id", deleteConfirmId);
      await (supabase as any).from("attendance_entries").delete().eq("event_id", deleteConfirmId);
      // 5) Delete pre-reservations linked to this event
      await (supabase as any).from("pre_reservations").delete().eq("event_id", deleteConfirmId);
      // 6) Delete cardapio responses
      await (supabase as any).from("cardapio_responses").delete().eq("event_id", deleteConfirmId);

      const { error } = await supabase.from("company_events").delete().eq("id", deleteConfirmId);
      if (error) { toast({ title: "Erro ao excluir", description: error.message, variant: "destructive" }); }
      else { toast({ title: "Festa excluída" }); }
    } catch (err) {
      console.error("[delete event] unexpected error:", err);
      toast({ title: "Erro ao excluir", description: "Erro inesperado ao excluir festa", variant: "destructive" });
    }
    setDeleting(false);
    setDeleteConfirmId(null);
    setDetailOpen(false);
    fetchEvents();
  };

  const handleEdit = (ev: CompanyEvent) => {
    setEditingEvent(mapEventToFormData(ev));
    setDetailOpen(false);
    setFormOpen(true);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  if (permLoading) {
    return <LoadingScreen message="Carregando agenda..." />;
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
                    <img src={getCompanyLogoOverride(currentCompany?.slug, currentCompany?.logo_url) || '/placeholder.svg'} alt={currentCompany?.name || 'Logo'} className="h-8 w-auto shrink-0" />
                    <h1 className="font-display font-bold text-foreground text-sm truncate">Central de Agenda</h1>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {centralTab === "festas" && (
                    <Button variant="outline" size="icon" className="h-9 w-9 border-blue-300 text-blue-600 hover:bg-blue-50" onClick={() => setReportOpen(true)} title="Gerar Relatório">
                      <FileText className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
              {/* Central Tab Bar - mobile inside header */}
              <div className="pt-2 flex justify-center">
                <div className="overflow-x-auto scrollbar-none">
                  <div className="inline-flex gap-1 p-1 rounded-2xl bg-muted/50 border border-border/40 shadow-sm">
                    {[
                      { value: "festas", label: "Festas", icon: CalendarDays },
                      { value: "visitas", label: "Visitas", icon: MapPin },
                      { value: "tarefas", label: "Tarefas", icon: ListChecks },
                      { value: "tudo", label: "Geral", icon: List },
                    ].map((tab) => (
                      <button
                        key={tab.value}
                        onClick={() => setCentralTab(tab.value as any)}
                        className={cn(
                          "inline-flex items-center gap-2 px-5 py-2 text-sm font-semibold rounded-xl transition-all duration-200 shrink-0 whitespace-nowrap",
                          centralTab === tab.value
                            ? "bg-primary text-primary-foreground shadow-lg shadow-primary/30 scale-[1.02]"
                            : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                        )}
                      >
                        <tab.icon className="h-4 w-4" />
                        {tab.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              {/* Mobile content mode toggle - inside header */}
              {centralTab === "festas" && (
              <div className="pt-2">
                <Tabs value={contentMode} onValueChange={(v) => setContentMode(v as "agendadas" | "fechadas" | "pre-reservas")}>
                  <TabsList className="inline-flex gap-1 p-1 rounded-2xl bg-muted/50 border border-border/40 shadow-sm h-auto w-full">
                    <TabsTrigger value="agendadas" className="flex-1 gap-1.5 text-xs font-semibold rounded-xl px-3 py-2 transition-all duration-200 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg data-[state=active]:shadow-primary/30 data-[state=active]:scale-[1.02] data-[state=inactive]:bg-muted data-[state=inactive]:text-muted-foreground data-[state=inactive]:hover:bg-muted/80">
                      <CalendarDays className="h-3.5 w-3.5" />
                      Agendadas
                    </TabsTrigger>
                    <TabsTrigger value="fechadas" className="flex-1 gap-1.5 text-xs font-semibold rounded-xl px-3 py-2 transition-all duration-200 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg data-[state=active]:shadow-primary/30 data-[state=active]:scale-[1.02] data-[state=inactive]:bg-muted data-[state=inactive]:text-muted-foreground data-[state=inactive]:hover:bg-muted/80">
                      <Handshake className="h-3.5 w-3.5" />
                      Fechadas
                      {closedInPeriod > 0 && (
                        <Badge variant="secondary" className="ml-0.5 text-[10px] px-1.5 py-0">{closedInPeriod}</Badge>
                      )}
                    </TabsTrigger>
                    <TabsTrigger value="pre-reservas" className="flex-1 gap-1.5 text-xs font-semibold rounded-xl px-3 py-2 transition-all duration-200 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg data-[state=active]:shadow-primary/30 data-[state=active]:scale-[1.02] data-[state=inactive]:bg-muted data-[state=inactive]:text-muted-foreground data-[state=inactive]:hover:bg-muted/80">
                      <CalendarClock className="h-3.5 w-3.5" />
                      Pré-reservas
                      {allPreReservations.filter(pr => pr.status === "ativa").length > 0 && (
                        <Badge variant="secondary" className="ml-0.5 text-[10px] px-1.5 py-0">{allPreReservations.filter(pr => pr.status === "ativa").length}</Badge>
                      )}
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
                <div className="flex items-center gap-2 pt-2">
                  <Button size="sm" className="h-10 px-5 rounded-xl gap-2 font-semibold shadow-sm" onClick={() => { setEditingEvent(null); setFormOpen(true); }}>
                    <Plus className="h-4 w-4" /> Nova Festa
                  </Button>
                  <Button size="sm" variant="outline" className="h-10 px-5 rounded-xl gap-2 font-semibold shadow-sm border-pink-300 text-pink-600 hover:bg-pink-50" onClick={() => { setEditingPreRes(null); setPreResFormOpen(true); }}>
                    <CalendarClock className="h-4 w-4" /> Pré-reserva
                  </Button>
                </div>
              </div>
              )}
            </div>
          </header>

          {/* Central Tab Bar - desktop only (mobile version is in header) */}
          <div className="hidden md:flex md:justify-center px-3 pt-3 md:px-6 lg:px-8 md:pt-6 shrink-0">
            <div className="overflow-x-auto scrollbar-none">
              <div className="inline-flex gap-1 md:gap-2 p-1 md:p-1.5 rounded-2xl bg-muted/50 border border-border/40 shadow-sm">
                {[
                  { value: "festas", label: "Festas", icon: CalendarDays },
                  { value: "visitas", label: "Visitas", icon: MapPin },
                  { value: "tarefas", label: "Tarefas", icon: ListChecks },
                  { value: "tudo", label: "Geral", icon: List },
                ].map((tab) => (
                  <button
                    key={tab.value}
                    onClick={() => setCentralTab(tab.value as any)}
                    className={cn(
                      "inline-flex items-center gap-2 px-6 py-3 text-base font-semibold rounded-xl transition-all duration-200 shrink-0 whitespace-nowrap",
                      centralTab === tab.value
                        ? "bg-primary text-primary-foreground shadow-lg shadow-primary/30 scale-[1.02]"
                        : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                    )}
                  >
                    <tab.icon className="h-4 w-4" />
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Tab: Tarefas */}
          {centralTab === "tarefas" && (
            <div className="flex-1 p-3 md:p-6 lg:p-8 overflow-y-auto">
              <div className="max-w-7xl mx-auto space-y-6">
                <div className="hidden md:block">
                  <div className="relative rounded-2xl border border-border/30 bg-gradient-to-r from-card via-card to-primary/[0.03] shadow-[0_4px_24px_rgba(0,0,0,0.04)] overflow-hidden">
                    <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_80%_-20%,hsl(var(--primary)/0.06),transparent)]" />
                    <div className="relative flex items-center justify-between gap-4 p-5 md:p-6">
                      <div className="flex items-center gap-4">
                        <div className="p-3 rounded-2xl bg-gradient-to-br from-primary to-primary/80 shadow-lg shadow-primary/20">
                          <CalendarDays className="h-7 w-7 text-primary-foreground" />
                        </div>
                        <div>
                          <h1 className="text-2xl lg:text-3xl font-extrabold tracking-tight text-foreground">Central de Agenda</h1>
                          <p className="text-sm text-muted-foreground/70 mt-0.5">Tarefas · Gestão de atividades internas</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <AgendaTarefasTab userId={currentUser?.id || ""} />
              </div>
            </div>
          )}

          {/* Tab: Tudo */}
          {centralTab === "tudo" && (
            <div className="flex-1 p-3 md:p-6 lg:p-8 overflow-y-auto">
              <div className="max-w-7xl mx-auto space-y-6">
                <div className="hidden md:block">
                  <div className="relative rounded-2xl border border-border/30 bg-gradient-to-r from-card via-card to-primary/[0.03] shadow-[0_4px_24px_rgba(0,0,0,0.04)] overflow-hidden">
                    <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_80%_-20%,hsl(var(--primary)/0.06),transparent)]" />
                    <div className="relative flex items-center justify-between gap-4 p-5 md:p-6">
                      <div className="flex items-center gap-4">
                        <div className="p-3 rounded-2xl bg-gradient-to-br from-primary to-primary/80 shadow-lg shadow-primary/20">
                          <CalendarDays className="h-7 w-7 text-primary-foreground" />
                        </div>
                        <div>
                          <h1 className="text-2xl lg:text-3xl font-extrabold tracking-tight text-foreground">Central de Agenda</h1>
                          <p className="text-sm text-muted-foreground/70 mt-0.5">Geral · Visão consolidada de eventos, visitas e tarefas</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <AgendaTudoTab userId={currentUser?.id} />
              </div>
            </div>
          )}

          {/* Tab: Visitas */}
          {centralTab === "visitas" && (
            <div className="flex-1 p-3 md:p-6 lg:p-8 overflow-y-auto">
              <div className="max-w-7xl mx-auto space-y-6">
                <div className="hidden md:block">
                  <div className="relative rounded-2xl border border-border/30 bg-gradient-to-r from-card via-card to-primary/[0.03] shadow-[0_4px_24px_rgba(0,0,0,0.04)] overflow-hidden">
                    <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_80%_-20%,hsl(var(--primary)/0.06),transparent)]" />
                    <div className="relative flex items-center justify-between gap-4 p-5 md:p-6">
                      <div className="flex items-center gap-4">
                        <div className="p-3 rounded-2xl bg-gradient-to-br from-primary to-primary/80 shadow-lg shadow-primary/20">
                          <CalendarDays className="h-7 w-7 text-primary-foreground" />
                        </div>
                        <div>
                          <h1 className="text-2xl lg:text-3xl font-extrabold tracking-tight text-foreground">Central de Agenda</h1>
                          <p className="text-sm text-muted-foreground/70 mt-0.5">Visitas · Agendamentos comerciais</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <AgendaVisitasTab userId={currentUser?.id || ""} />
              </div>
            </div>
          )}

          {/* Tab: Festas (original content) */}
          {centralTab === "festas" && (<>

          {/* Mobile unit filter — hidden when units are sales channels only */}
          {!isSalesChannelOnly && (() => {
            const visibleUnits = canViewAll ? physicalUnits : physicalUnits.filter(u => unitAccess[u.name]);
            if (visibleUnits.length <= 1) return null;
            return (
              <div className="md:hidden px-3 pt-3">
                <Select value={selectedUnit} onValueChange={setSelectedUnit}>
                  <SelectTrigger className="w-full"><MapPin className="h-4 w-4 mr-2 text-muted-foreground" /><SelectValue placeholder="Todas as unidades" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as unidades</SelectItem>
                    {visibleUnits.map(u => <SelectItem key={u.name} value={u.name}>{u.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            );
          })()}

          {/* Search bar - mobile */}
          <div className="md:hidden px-3 pt-2">
            <div className="relative group">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-primary/20 via-primary/10 to-transparent rounded-2xl opacity-0 group-focus-within:opacity-100 transition-opacity duration-300 blur-sm" />
              <div className="relative flex items-center bg-card border border-border/40 rounded-2xl shadow-sm group-focus-within:shadow-md group-focus-within:border-primary/30 transition-all duration-300">
                <Search className="ml-3 h-4 w-4 text-muted-foreground/60 group-focus-within:text-primary transition-colors duration-300 shrink-0" />
                <input
                  value={searchTerm}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  placeholder="Buscar por nome ou telefone do lead..."
                  className="flex-1 bg-transparent border-none outline-none text-sm text-foreground placeholder:text-muted-foreground/50 px-3 py-2.5 tracking-wide min-w-0"
                />
                {searchTerm && (
                  <button onClick={clearSearch} className="mr-3 p-1 rounded-full hover:bg-muted/60 transition-colors" aria-label="Limpar busca">
                    <X className="h-4 w-4 text-muted-foreground hover:text-foreground transition-colors" />
                  </button>
                )}
              </div>
            </div>
          </div>

          <PullToRefresh onRefresh={async () => { await fetchEvents(); }} className="flex-1 p-3 md:p-6 lg:p-8 overflow-x-hidden overflow-y-auto">
            <div className="max-w-7xl mx-auto space-y-6">
              {/* Desktop header */}
              <div className="hidden md:block">
                <div className="relative rounded-2xl border border-border/30 bg-gradient-to-r from-card via-card to-primary/[0.03] shadow-[0_4px_24px_rgba(0,0,0,0.04)] overflow-hidden">
                  <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_80%_-20%,hsl(var(--primary)/0.06),transparent)]" />
                  <div className="relative flex items-center justify-between gap-4 p-5 md:p-6">
                    <div className="flex items-center gap-4">
                      <div className="p-3 rounded-2xl bg-gradient-to-br from-primary to-primary/80 shadow-lg shadow-primary/20">
                        <CalendarDays className="h-7 w-7 text-primary-foreground" />
                      </div>
                      <div>
                        <h1 className="text-2xl lg:text-3xl font-extrabold tracking-tight text-foreground">Central de Agenda</h1>
                        <p className="text-sm text-muted-foreground/70 mt-0.5">Festas · Calendário mensal de eventos</p>
                      </div>
                    </div>
                    <GuiaAgendaDialog />
                  </div>
                </div>
              </div>

              {/* Desktop action bar */}
              <div className="hidden md:flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2.5">
                  <Tabs value={contentMode} onValueChange={(v) => setContentMode(v as "agendadas" | "fechadas" | "pre-reservas")}>
                    <TabsList className="inline-flex gap-1.5 p-1.5 rounded-2xl bg-muted/50 border border-border/40 shadow-sm h-auto">
                      <TabsTrigger value="agendadas" className="px-6 py-3 gap-2 text-base font-semibold rounded-xl transition-all duration-200 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg data-[state=active]:shadow-primary/30 data-[state=active]:scale-[1.02] data-[state=inactive]:bg-muted data-[state=inactive]:text-muted-foreground data-[state=inactive]:hover:bg-muted/80">
                        <CalendarDays className="h-4 w-4" />
                        Agendadas
                      </TabsTrigger>
                      <TabsTrigger value="fechadas" className="px-6 py-3 gap-2 text-base font-semibold rounded-xl transition-all duration-200 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg data-[state=active]:shadow-primary/30 data-[state=active]:scale-[1.02] data-[state=inactive]:bg-muted data-[state=inactive]:text-muted-foreground data-[state=inactive]:hover:bg-muted/80">
                        <Handshake className="h-4 w-4" />
                        Fechadas
                        {closedInPeriod > 0 && (
                          <Badge variant="secondary" className="ml-0.5 text-[10px] px-1.5 py-0">{closedInPeriod}</Badge>
                        )}
                      </TabsTrigger>
                      <TabsTrigger value="pre-reservas" className="px-6 py-3 gap-2 text-base font-semibold rounded-xl transition-all duration-200 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg data-[state=active]:shadow-primary/30 data-[state=active]:scale-[1.02] data-[state=inactive]:bg-muted data-[state=inactive]:text-muted-foreground data-[state=inactive]:hover:bg-muted/80">
                        <CalendarClock className="h-4 w-4" />
                        Pré-reservas
                        {allPreReservations.filter(pr => pr.status === "ativa").length > 0 && (
                          <Badge variant="secondary" className="ml-0.5 text-[10px] px-1.5 py-0">{allPreReservations.filter(pr => pr.status === "ativa").length}</Badge>
                        )}
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>
                  <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as "calendar" | "list")}>
                    <TabsList className="inline-flex gap-1.5 p-1.5 rounded-2xl bg-muted/50 border border-border/40 shadow-sm h-auto">
                      <TabsTrigger value="calendar" className="px-4 py-3 rounded-xl transition-all duration-200 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg data-[state=active]:shadow-primary/30 data-[state=active]:scale-[1.02] data-[state=inactive]:bg-muted data-[state=inactive]:text-muted-foreground data-[state=inactive]:hover:bg-muted/80"><CalendarDays className="h-4 w-4" /></TabsTrigger>
                      <TabsTrigger value="list" className="px-4 py-3 rounded-xl transition-all duration-200 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg data-[state=active]:shadow-primary/30 data-[state=active]:scale-[1.02] data-[state=inactive]:bg-muted data-[state=inactive]:text-muted-foreground data-[state=inactive]:hover:bg-muted/80"><List className="h-4 w-4" /></TabsTrigger>
                    </TabsList>
                  </Tabs>
                  {/* Desktop unit filter */}
                  {!isSalesChannelOnly && (() => {
                    const visibleUnits = canViewAll ? physicalUnits : physicalUnits.filter(u => unitAccess[u.name]);
                    if (visibleUnits.length <= 1) return null;
                    return (
                      <Select value={selectedUnit} onValueChange={setSelectedUnit}>
                        <SelectTrigger className="w-[180px] h-10 bg-background/80 backdrop-blur-sm border-border/50 shadow-sm"><SelectValue placeholder="Todas" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todas as unidades</SelectItem>
                          {visibleUnits.map(u => <SelectItem key={u.name} value={u.name}>{u.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    );
                  })()}
                  {showRevenue && (
                    <Select value={paymentFilter} onValueChange={(v) => setPaymentFilter(v as any)}>
                      <SelectTrigger className={cn("w-[180px] h-10 bg-background/80 backdrop-blur-sm border-border/50 shadow-sm", paymentFilter !== "all" && "border-amber-400 text-amber-700")}>
                        <DollarSign className="h-3.5 w-3.5 mr-1 shrink-0" />
                        <SelectValue placeholder="Financeiro" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todas as festas</SelectItem>
                        <SelectItem value="pending">💰 Com pendências</SelectItem>
                        <SelectItem value="late">⚠️ Em atraso</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                </div>
                <div className="flex items-center gap-2.5">
                  <Button variant="outline" size="icon" className="h-10 w-10 border-blue-300 text-blue-600 hover:bg-blue-50" onClick={() => setReportOpen(true)} title="Gerar Relatório">
                    <FileText className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" className="h-10 px-4 border-pink-300 text-pink-600 hover:bg-pink-50" onClick={() => { setEditingPreRes(null); setPreResFormOpen(true); }}>
                    <CalendarClock className="h-4 w-4 mr-2" /> Pré-reserva
                  </Button>
                  <Button onClick={() => { setEditingEvent(null); setFormOpen(true); }} className="h-10 px-5 shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/30 transition-all duration-200">
                    <Plus className="h-4 w-4 mr-2" /> Nova Festa
                  </Button>
                </div>
              </div>

              {/* Desktop search bar */}
              <div className="hidden md:block">
                <div className="relative group">
                  <div className="absolute -inset-0.5 bg-gradient-to-r from-primary/20 via-primary/10 to-transparent rounded-2xl opacity-0 group-focus-within:opacity-100 transition-opacity duration-300 blur-sm" />
                  <div className="relative flex items-center bg-card border border-border/40 rounded-2xl shadow-sm group-focus-within:shadow-md group-focus-within:border-primary/30 transition-all duration-300">
                    <Search className="ml-4 h-4.5 w-4.5 text-muted-foreground/60 group-focus-within:text-primary transition-colors duration-300" />
                    <input
                      value={searchTerm}
                      onChange={(e) => handleSearchChange(e.target.value)}
                      placeholder="Buscar festa por nome ou telefone do lead..."
                      className="flex-1 bg-transparent border-none outline-none text-sm text-foreground placeholder:text-muted-foreground/50 px-3 py-3 tracking-wide"
                    />
                    {searchTerm && (
                      <button onClick={clearSearch} className="mr-3 p-1 rounded-full hover:bg-muted/60 transition-colors" aria-label="Limpar busca">
                        <X className="h-4 w-4 text-muted-foreground hover:text-foreground transition-colors" />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Search results overlay */}
              {searchTerm.trim().length >= 2 && (
                <Card className="bg-card border-border/30 shadow-lg rounded-2xl">
                  <CardContent className="p-4">
                    {searchLoading ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                        <span className="ml-2 text-sm text-muted-foreground">Buscando...</span>
                      </div>
                    ) : searchResults.length === 0 ? (
                      <div className="text-center py-8">
                        <Search className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
                        <p className="text-sm text-muted-foreground">Nenhuma festa encontrada para "{searchTerm}"</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {/* Status filter tabs */}
                        <div className="flex items-center gap-1.5 mb-3 flex-wrap">
                          {([
                            { value: "all", label: "Todos", count: searchResults.length },
                            { value: "confirmado", label: "Confirmado", count: searchResults.filter(e => e.status === "confirmado").length },
                            { value: "pendente", label: "Pendente", count: searchResults.filter(e => e.status === "pendente").length },
                            { value: "cancelado", label: "Cancelado", count: searchResults.filter(e => e.status === "cancelado").length },
                          ] as const).map((f) => (
                            f.count > 0 || f.value === "all" ? (
                              <button
                                key={f.value}
                                onClick={() => setSearchStatusFilter(f.value)}
                                className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-all duration-200 ${
                                  searchStatusFilter === f.value
                                    ? "bg-primary text-primary-foreground shadow-sm"
                                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                                }`}
                              >
                                {f.label} ({f.count})
                              </button>
                            ) : null
                          ))}
                        </div>
                        <p className="text-xs text-muted-foreground mb-2">
                          {filteredSearchResults.length} festa{filteredSearchResults.length !== 1 ? "s" : ""} encontrada{filteredSearchResults.length !== 1 ? "s" : ""}
                        </p>
                        {filteredSearchResults.length === 0 ? (
                          <p className="text-xs text-muted-foreground/60 text-center py-4">Nenhuma festa com este status.</p>
                        ) : filteredSearchResults.map((ev) => {
                          const statusColors = ev.status === "confirmado"
                            ? "border-l-emerald-500 bg-emerald-500/[0.03]"
                            : ev.status === "cancelado"
                              ? "border-l-red-500 bg-red-500/[0.03]"
                              : "border-l-amber-500 bg-amber-500/[0.03]";
                          return (
                            <button
                              key={ev.id}
                              onClick={() => {
                                setDetailEvent(ev);
                                setDetailOpen(true);
                                clearSearch();
                              }}
                              className={`w-full text-left p-4 rounded-xl border border-border/30 border-l-[3px] ${statusColors} hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer`}
                            >
                              <div className="flex items-center justify-between gap-2 mb-1">
                                <span className="font-semibold text-sm truncate">{ev.title}</span>
                                <div className="flex items-center gap-1.5 shrink-0">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 rounded-lg hover:bg-primary/10"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleEdit(ev as CompanyEvent);
                                      clearSearch();
                                    }}
                                  >
                                    <Pencil className="h-3.5 w-3.5 text-primary" />
                                  </Button>
                                  <Badge
                                    variant={ev.status === "confirmado" ? "default" : ev.status === "cancelado" ? "destructive" : "secondary"}
                                    className="text-[10px] uppercase tracking-wider px-2 py-0.5"
                                  >
                                    {ev.status}
                                  </Badge>
                                </div>
                              </div>
                              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground mt-1">
                                <span className="flex items-center gap-1">
                                  <CalendarDays className="h-3 w-3" />
                                  {format(new Date(ev.event_date + "T12:00:00"), "dd/MM/yyyy")}
                                </span>
                                {ev.start_time && (
                                  <span className="flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    {ev.start_time.slice(0, 5)}
                                  </span>
                                )}
                                {ev.unit && (
                                  <span className="flex items-center gap-1">
                                    <MapPin className="h-3 w-3" />
                                    {ev.unit}
                                  </span>
                                )}
                              </div>
                              {(ev.lead_name || ev.lead_phone) && (
                                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs mt-1.5 text-primary/80">
                                  {ev.lead_name && (
                                    <span className="flex items-center gap-1 font-medium">
                                      <Users className="h-3 w-3" />
                                      {ev.lead_name}
                                    </span>
                                  )}
                                  {ev.lead_phone && (
                                    <span className="flex items-center gap-1">
                                      <Phone className="h-3 w-3" />
                                      {ev.lead_phone}
                                    </span>
                                  )}
                                </div>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Period filter + Summary */}
              <div className="space-y-4">
                <PeriodFilterPopover
                  onConfirm={handlePeriodConfirm}
                  activePeriod={periodRange}
                  onClear={handlePeriodClear}
                />
                <MonthSummaryCards
                  events={periodRange ? periodFilteredEvents : filteredEvents}
                  month={month}
                  periodLabel={periodRange ? `${format(periodRange.from, "dd/MM/yyyy")} – ${format(periodRange.to, "dd/MM/yyyy")}` : undefined}
                  totalDaysOverride={periodRange ? differenceInDays(periodRange.to, periodRange.from) + 1 : undefined}
                  showRevenue={showRevenue}
                  closedInPeriod={closedInPeriod}
                  closedRevenue={closedRevenue}
                />
              </div>

              {/* Main content: either Agendadas or Fechadas */}
              {contentMode === "fechadas" ? (
                /* Closed parties list */
                <Card className="bg-card border-border/30 shadow-[0_4px_24px_rgba(0,0,0,0.04)] rounded-2xl">
                  <CardContent className="p-4 md:p-6">
                    <div className="flex items-center justify-between gap-2 mb-4">
                      <div className="flex items-center gap-2">
                        <Handshake className="h-5 w-5 text-violet-600" />
                        <h2 className="font-bold text-lg tracking-tight">Festas Fechadas ({closedEvents.length})</h2>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs rounded-full px-3 gap-1.5"
                        onClick={() => setClosedSortBy(prev => prev === "event_date" ? "fechamento" : "event_date")}
                      >
                        <ArrowUpDown className="h-3 w-3" />
                        {closedSortBy === "event_date" ? "Data festa" : "Data fechamento"}
                      </Button>
                    </div>
                    {closedEvents.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-12">Nenhuma festa fechada neste período.</p>
                    ) : (
                      <div className="space-y-3">
                        {sortedClosedEvents.map((ev) => (
                            <button
                              key={ev.id}
                              onClick={() => {
                                setDetailEvent(ev);
                                setDetailOpen(true);
                              }}
                              className="w-full text-left p-4 rounded-xl border border-border/30 border-l-[3px] border-l-violet-500 bg-violet-500/[0.02] hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer"
                            >
                              <div className="flex items-center justify-between gap-2 mb-1.5">
                                <span className="font-semibold text-sm truncate">{ev.title}</span>
                                <Badge
                                  variant={ev.status === "confirmado" ? "default" : ev.status === "cancelado" ? "destructive" : "secondary"}
                                  className="text-[10px] uppercase tracking-wider px-2 py-0.5 shrink-0"
                                >
                                  {ev.status}
                                </Badge>
                              </div>
                              <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <CalendarDays className="h-3 w-3" />
                                  {format(new Date(ev.event_date + "T12:00:00"), "dd/MM/yyyy")}
                                </span>
                                {ev.start_time && (
                                  <span className="flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    {ev.start_time.slice(0, 5)}
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
                              </div>
                              {(ev.lead_name || ev.lead_phone) && (
                                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs mt-1.5 text-primary/80">
                                  {ev.lead_name && (
                                    <span className="flex items-center gap-1 font-medium">
                                      <Users className="h-3 w-3" />
                                      {ev.lead_name}
                                    </span>
                                  )}
                                  {ev.lead_phone && (
                                    <span className="flex items-center gap-1">
                                      <Phone className="h-3 w-3" />
                                      {ev.lead_phone}
                                    </span>
                                  )}
                                </div>
                              )}
                              <div className="flex items-center justify-between mt-2">
                                {ev.total_value != null && ev.total_value > 0 && (
                                  <p className="text-sm font-bold text-foreground">
                                    {getNetValue(ev).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                                  </p>
                                )}
                                {(ev as any).data_fechamento_venda && (
                                  <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                                    <Handshake className="h-3 w-3" />
                                    Fechado em {format(new Date((ev as any).data_fechamento_venda + "T12:00:00"), "dd/MM/yyyy")}
                                  </span>
                                )}
                              </div>
                            </button>
                          ))}
                        <div className="pt-3 border-t border-border/30">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground font-medium">Total faturado:</span>
                            <span className="font-bold text-foreground">
                              {closedEvents.filter(e => !e.is_permuta).reduce((sum, e) => sum + getNetValue(e), 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ) : contentMode === "pre-reservas" ? (
                /* Pre-reservations list */
                <Card className="bg-card border-border/30 shadow-[0_4px_24px_rgba(0,0,0,0.04)] rounded-2xl">
                  <CardContent className="p-4 md:p-6">
                    <div className="flex items-center justify-between gap-2 mb-4">
                      <div className="flex items-center gap-2">
                        <CalendarClock className="h-5 w-5 text-pink-500" />
                        <h2 className="font-bold text-lg tracking-tight">Pré-reservas ({allPreReservations.length})</h2>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs rounded-full px-3 gap-1.5 border-pink-300 text-pink-600 hover:bg-pink-50"
                        onClick={() => { setEditingPreRes(null); setPreResFormOpen(true); }}
                      >
                        <Plus className="h-3 w-3" />
                        Nova pré-reserva
                      </Button>
                    </div>


                    {allPreReservations.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-12">Nenhuma pré-reserva encontrada.</p>
                    ) : (
                      <div className="space-y-3">
                        {/* Ativas */}
                        {allPreReservations.filter(pr => pr.status === "ativa").length > 0 && (
                          <div>
                            <h3 className="text-xs font-bold text-muted-foreground/70 uppercase tracking-widest mb-2">Ativas ({allPreReservations.filter(pr => pr.status === "ativa").length})</h3>
                            <div className="space-y-2">
                              {allPreReservations.filter(pr => pr.status === "ativa").map((pr) => {
                                const expiresAt = new Date(pr.reservation_expires_at);
                                const daysLeft = Math.max(0, Math.ceil((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
                                return (
                                  <button
                                    key={pr.id}
                                    onClick={() => { setDetailPreRes(pr); setDetailPreResOpen(true); }}
                                    className="w-full text-left p-4 rounded-xl border border-border/30 border-l-[3px] border-l-pink-400 bg-pink-500/[0.02] hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer"
                                  >
                                    <div className="flex items-center justify-between gap-2 mb-1.5">
                                      <span className="font-semibold text-sm truncate">{pr.customer_name}</span>
                                      <Badge className="text-[10px] uppercase tracking-wider px-2 py-0.5 bg-pink-100 text-pink-700 border-pink-200 shrink-0">
                                        Ativa · {daysLeft}d restantes
                                      </Badge>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                                      <span className="flex items-center gap-1">
                                        <CalendarDays className="h-3 w-3" />
                                        {format(new Date(pr.event_date + "T12:00:00"), "dd/MM/yyyy")}
                                      </span>
                                      {pr.unit && (
                                        <span className="flex items-center gap-1">
                                          <MapPin className="h-3 w-3" />
                                          {pr.unit}
                                        </span>
                                      )}
                                      {pr.customer_phone && (
                                        <span className="flex items-center gap-1">
                                          <Phone className="h-3 w-3" />
                                          {pr.customer_phone}
                                        </span>
                                      )}
                                    </div>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* Convertidas */}
                        {allPreReservations.filter(pr => pr.status === "convertida").length > 0 && (
                          <div>
                            <h3 className="text-xs font-bold text-muted-foreground/70 uppercase tracking-widest mb-2 mt-4">Convertidas ({allPreReservations.filter(pr => pr.status === "convertida").length})</h3>
                            <div className="space-y-2">
                              {allPreReservations.filter(pr => pr.status === "convertida").map((pr) => (
                                <button
                                  key={pr.id}
                                  onClick={() => { setDetailPreRes(pr); setDetailPreResOpen(true); }}
                                  className="w-full text-left p-4 rounded-xl border border-border/30 border-l-[3px] border-l-emerald-500 bg-emerald-500/[0.02] hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer"
                                >
                                  <div className="flex items-center justify-between gap-2 mb-1.5">
                                    <span className="font-semibold text-sm truncate">{pr.customer_name}</span>
                                    <Badge className="text-[10px] uppercase tracking-wider px-2 py-0.5 bg-emerald-100 text-emerald-700 border-emerald-200 shrink-0">Convertida</Badge>
                                  </div>
                                  <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                                    <span className="flex items-center gap-1">
                                      <CalendarDays className="h-3 w-3" />
                                      {format(new Date(pr.event_date + "T12:00:00"), "dd/MM/yyyy")}
                                    </span>
                                    {pr.unit && (
                                      <span className="flex items-center gap-1">
                                        <MapPin className="h-3 w-3" />
                                        {pr.unit}
                                      </span>
                                    )}
                                  </div>
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Expiradas */}
                        {allPreReservations.filter(pr => pr.status === "expirada").length > 0 && (
                          <div>
                            <h3 className="text-xs font-bold text-muted-foreground/70 uppercase tracking-widest mb-2 mt-4">Expiradas ({allPreReservations.filter(pr => pr.status === "expirada").length})</h3>
                            <div className="space-y-2">
                              {allPreReservations.filter(pr => pr.status === "expirada").map((pr) => (
                                <button
                                  key={pr.id}
                                  onClick={() => { setDetailPreRes(pr); setDetailPreResOpen(true); }}
                                  className="w-full text-left p-4 rounded-xl border border-border/30 border-l-[3px] border-l-amber-400 bg-amber-500/[0.02] hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer opacity-70"
                                >
                                  <div className="flex items-center justify-between gap-2 mb-1.5">
                                    <span className="font-semibold text-sm truncate">{pr.customer_name}</span>
                                    <Badge variant="secondary" className="text-[10px] uppercase tracking-wider px-2 py-0.5 shrink-0">Expirada</Badge>
                                  </div>
                                  <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                                    <span className="flex items-center gap-1">
                                      <CalendarDays className="h-3 w-3" />
                                      {format(new Date(pr.event_date + "T12:00:00"), "dd/MM/yyyy")}
                                    </span>
                                    {pr.unit && (
                                      <span className="flex items-center gap-1">
                                        <MapPin className="h-3 w-3" />
                                        {pr.unit}
                                      </span>
                                    )}
                                  </div>
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Canceladas */}
                        {allPreReservations.filter(pr => pr.status === "cancelada").length > 0 && (
                          <div>
                            <h3 className="text-xs font-bold text-muted-foreground/70 uppercase tracking-widest mb-2 mt-4">Canceladas ({allPreReservations.filter(pr => pr.status === "cancelada").length})</h3>
                            <div className="space-y-2">
                              {allPreReservations.filter(pr => pr.status === "cancelada").map((pr) => (
                                <button
                                  key={pr.id}
                                  onClick={() => { setDetailPreRes(pr); setDetailPreResOpen(true); }}
                                  className="w-full text-left p-4 rounded-xl border border-border/30 border-l-[3px] border-l-destructive bg-destructive/[0.02] hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer opacity-60"
                                >
                                  <div className="flex items-center justify-between gap-2 mb-1.5">
                                    <span className="font-semibold text-sm truncate">{pr.customer_name}</span>
                                    <Badge variant="destructive" className="text-[10px] uppercase tracking-wider px-2 py-0.5 shrink-0">Cancelada</Badge>
                                  </div>
                                  <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                                    <span className="flex items-center gap-1">
                                      <CalendarDays className="h-3 w-3" />
                                      {format(new Date(pr.event_date + "T12:00:00"), "dd/MM/yyyy")}
                                    </span>
                                    {pr.unit && (
                                      <span className="flex items-center gap-1">
                                        <MapPin className="h-3 w-3" />
                                        {pr.unit}
                                      </span>
                                    )}
                                    {pr.cancellation_reason && (
                                      <span className="text-destructive/70 italic">
                                        {pr.cancellation_reason}
                                      </span>
                                    )}
                                  </div>
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ) : (
              /* Calendar + Day detail or List view */
              viewMode === "calendar" ? (
              <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-5 min-h-[520px]">
                <Card className="relative bg-card border-border/20 shadow-[0_8px_40px_rgba(0,0,0,0.06)] rounded-2xl overflow-hidden">
                  <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_50%_0%,hsl(var(--primary)/0.03),transparent)] pointer-events-none" />
                  <CardContent className="relative p-2 md:p-4 lg:p-5">
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
                        preReservations={filteredPreReservations}
                        paymentStatus={paymentStatus}
                      />
                    )}
                  </CardContent>
                </Card>

                <Card className="relative bg-gradient-to-b from-card to-muted/10 border-border/20 shadow-[0_8px_40px_rgba(0,0,0,0.06)] rounded-2xl overflow-hidden">
                  <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_100%,hsl(var(--primary)/0.02),transparent)] pointer-events-none" />
                  <CardContent className="relative p-5 md:p-6">
                    <h3 className="font-bold text-sm tracking-tight text-foreground mb-0.5">
                      {selectedDate
                        ? format(selectedDate, "dd 'de' MMMM", { locale: ptBR })
                        : "Selecione um dia"}
                    </h3>
                    {selectedDate && (
                      <div className="h-[2px] w-10 rounded-full bg-gradient-to-r from-primary/40 to-transparent mt-2 mb-3" />
                    )}
                    {!selectedDate && (
                      <p className="text-xs text-muted-foreground/50 mt-3">Clique em um dia no calendário para ver os eventos.</p>
                    )}
                    {selectedDate && dayEvents.length === 0 && (
                      <p className="text-xs text-muted-foreground/50 mt-1">Nenhuma festa neste dia.</p>
                    )}
                    {/* Day financial summary */}
                    {showRevenue && selectedDate && dayEvents.length > 0 && (() => {
                      let dayLate = 0, dayPending = 0, dayPaid = 0, dayTotal = 0;
                      dayEvents.forEach(ev => {
                        const ps = paymentStatus[ev.id];
                        if (ps) { dayLate += ps.late; dayPending += ps.pending; dayPaid += ps.paid; dayTotal += ps.total; }
                      });
                      if (dayTotal === 0) return null;
                      return (
                        <div className="flex items-center gap-3 flex-wrap text-[11px] font-medium mb-1">
                          {dayLate > 0 && (
                            <span className="flex items-center gap-1 text-red-600">
                              <DollarSign className="h-3 w-3" />
                              {dayLate} em atraso
                            </span>
                          )}
                          {dayPending > 0 && (
                            <span className="flex items-center gap-1 text-amber-600">
                              <DollarSign className="h-3 w-3" />
                              {dayPending} pendente{dayPending > 1 ? "s" : ""}
                            </span>
                          )}
                          {dayLate === 0 && dayPending === 0 && dayPaid === dayTotal && (
                            <span className="flex items-center gap-1 text-emerald-600">
                              <DollarSign className="h-3 w-3" />
                              Tudo pago
                            </span>
                          )}
                        </div>
                      );
                    })()}
                    <div className="space-y-2.5 mt-3">
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
                              <div className="flex items-center gap-1.5 shrink-0">
                                {(!(ev as any).data_fechamento_venda || !(ev as any).vendedor_responsavel_id) && (
                                  <TooltipProvider delayDuration={200}>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <span className="text-amber-500" aria-label="Dados comerciais incompletos">
                                          <AlertTriangle className="h-3.5 w-3.5" />
                                        </span>
                                      </TooltipTrigger>
                                      <TooltipContent side="top" className="text-xs max-w-[200px]">
                                        <p className="font-semibold mb-0.5">Dados comerciais incompletos</p>
                                        {!(ev as any).data_fechamento_venda && <p>• Data de fechamento não definida</p>}
                                        {!(ev as any).vendedor_responsavel_id && <p>• Vendedor não definido</p>}
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                )}
                                <Badge
                                  variant={ev.status === "confirmado" ? "default" : ev.status === "cancelado" ? "destructive" : "secondary"}
                                  className="text-[10px] font-medium uppercase tracking-wider px-2 py-0.5"
                                >
                                  {ev.status}
                                </Badge>
                              </div>
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
                              {showRevenue && ev.total_value != null && ev.total_value > 0 && (
                                <span className="flex items-center gap-1 font-medium text-foreground/80">
                                  <DollarSign className="h-3 w-3" />
                                  R$ {ev.total_value.toLocaleString("pt-BR")}
                                </span>
                              )}
                              {ev.is_permuta && (
                                <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-amber-500/40 text-amber-600 bg-amber-500/10">
                                  Permuta
                                </Badge>
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
                            {/* Payment status indicator */}
                            {showRevenue && paymentStatus[ev.id] && paymentStatus[ev.id].total > 0 && (() => {
                              const ps = paymentStatus[ev.id];
                              const tooltipLines = ps.details
                                .sort((a, b) => a.due_date.localeCompare(b.due_date))
                                .slice(0, 5)
                                .map(d => {
                                  const dateStr = d.due_date ? new Date(d.due_date + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }) : "—";
                                  const amountStr = d.amount > 0 ? `R$ ${d.amount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : "";
                                  const label = d.status === "late" ? "⚠️" : "⏳";
                                  return `${label} ${dateStr}${amountStr ? ` · ${amountStr}` : ""}`;
                                });
                              if (ps.details.length > 5) tooltipLines.push(`... +${ps.details.length - 5} parcela(s)`);

                              const tooltipContent = tooltipLines.length > 0 ? tooltipLines.join("\n") : "";

                              const badge = (() => {
                                if (ps.late > 0) return (
                                  <div className="flex items-center gap-1 text-xs text-red-600 font-medium mt-1 cursor-default">
                                    <DollarSign className="h-3 w-3" />
                                    {ps.late} parcela{ps.late > 1 ? "s" : ""} em atraso
                                  </div>
                                );
                                if (ps.pending > 0) return (
                                  <div className="flex items-center gap-1 text-xs text-amber-600 font-medium mt-1 cursor-default">
                                    <DollarSign className="h-3 w-3" />
                                    {ps.pending} parcela{ps.pending > 1 ? "s" : ""} pendente{ps.pending > 1 ? "s" : ""}
                                  </div>
                                );
                                if (ps.paid === ps.total) return (
                                  <div className="flex items-center gap-1 text-xs text-emerald-600 mt-1">
                                    <DollarSign className="h-3 w-3" />
                                    Pago
                                  </div>
                                );
                                return null;
                              })();

                              if (!badge) return null;

                              if (!tooltipContent) return badge;

                              return (
                                <Tooltip>
                                  <TooltipTrigger asChild>{badge}</TooltipTrigger>
                                  <TooltipContent side="bottom" className="whitespace-pre-line text-xs max-w-[220px]">
                                    {tooltipContent}
                                  </TooltipContent>
                                </Tooltip>
                              );
                            })()}
                          </button>
                        );
                      })}
                    </div>
                    {/* Pre-reservations for this day */}
                    {dayPreReservations.length > 0 && (
                      <div className="space-y-2 mt-4 pt-3 border-t border-pink-200/50">
                        <p className="text-[11px] font-bold text-pink-500 uppercase tracking-widest">Pré-reservas</p>
                        {dayPreReservations.map((pr) => (
                          <button
                            key={pr.id}
                            onClick={() => { setDetailPreRes(pr); setDetailPreResOpen(true); }}
                            className="w-full text-left p-3 rounded-xl border border-pink-200/50 border-l-[3px] border-l-pink-400 bg-pink-50/30 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer"
                          >
                            <div className="flex items-center justify-between gap-2 mb-1">
                              <span className="font-semibold text-[13px] truncate">{pr.customer_name}</span>
                              <Badge className="bg-pink-100 text-pink-700 border-pink-200 border text-[10px]">Pré-reserva</Badge>
                            </div>
                            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                              {pr.unit && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{pr.unit}</span>}
                              <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{pr.reservation_days}d</span>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                    {selectedDate && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full mt-3"
                        onClick={() => {
                          setEditingEvent({ ...({} as EventFormData), event_date: format(selectedDate, "yyyy-MM-dd"), title: "", start_time: "", end_time: "", event_type: "aniversario", guest_count: null, unit: "", status: "pendente", package_name: "", total_value: null, notes: "" });
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
                        month={month}
                        onMonthChange={setMonth}
                      />
                    )}
                  </CardContent>
                </Card>
              )
              )}
            </div>
          </PullToRefresh>

          </>)}
        </div>
      </div>

      <EventFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        onSubmit={handleSubmit}
        initialData={editingEvent}
        units={physicalUnits}
        userId={currentUser?.id}
      />

      <EventDetailSheet
        open={detailOpen}
        onOpenChange={setDetailOpen}
        event={detailEvent}
        onEdit={(ev) => handleEdit(ev as CompanyEvent)}
        onDelete={(id) => setDeleteConfirmId(id)}
        conflicts={detailEvent ? getConflicts(detailEvent) : []}
        userId={currentUser?.id}
        onEventPatch={(eventId, updates) => setDetailEvent((prev) => (prev?.id === eventId ? { ...prev, ...updates } : prev))}
      />

      <AlertDialog open={!!deleteConfirmId} onOpenChange={(open) => { if (!open) setDeleteConfirmId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir festa?</AlertDialogTitle>
            <AlertDialogDescription>
              Essa ação é irreversível. Todos os dados vinculados (checklist, equipe, avaliações) serão excluídos permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <PreReservationFormDialog
        open={preResFormOpen}
        onOpenChange={setPreResFormOpen}
        companyId={currentCompany?.id || ""}
        userId={currentUser?.id || ""}
        units={physicalUnits}
        onSuccess={fetchEvents}
        initialData={editingPreRes}
        initialDate={selectedDate ? format(selectedDate, "yyyy-MM-dd") : undefined}
      />

      <PreReservationDetailSheet
        open={detailPreResOpen}
        onOpenChange={setDetailPreResOpen}
        preReservation={detailPreRes}
        onEdit={(pr) => { setEditingPreRes(pr); setPreResFormOpen(true); }}
        onConvert={(pr) => {
          setEditingEvent({
            ...({} as EventFormData),
            title: pr.customer_name,
            event_date: pr.event_date,
            unit: pr.unit || "",
            lead_id: pr.lead_id || null,
            start_time: "", end_time: "", event_type: "aniversario", guest_count: null, status: "pendente", package_name: "", total_value: null, notes: pr.notes || "",
          });
          setFormOpen(true);
          setDetailPreResOpen(false);
          // Mark as converted after event is created (handled via fetchEvents refresh)
          if (pr.id) {
            (supabase as any).from("pre_reservations").update({ status: "convertida" }).eq("id", pr.id);
            if (pr.lead_id) {
              (supabase as any).from("lead_history").insert({
                lead_id: pr.lead_id, company_id: pr.company_id,
                action: "pre_reserva_convertida", details: "Pré-reserva convertida em festa oficial",
                performed_by: currentUser?.id,
              });
            }
          }
        }}
        onRefresh={fetchEvents}
        userId={currentUser?.id}
      />

      <ReportDialog
        open={reportOpen}
        onOpenChange={setReportOpen}
        title="Relatório de Agenda"
        reportTypes={[
          { value: 'festas_periodo', label: 'Festas do Período', desc: 'Eventos que serão realizados no período selecionado' },
          { value: 'vendas_fechadas', label: 'Vendas Fechadas', desc: 'Festas que foram fechadas (vendidas) no período' },
          { value: 'ficha_festas', label: 'Ficha de Festas', desc: 'Data, horário, aniversariante e tema de cada festa' },
        ]}
        unitOptions={(() => {
          const vu = canViewAll ? physicalUnits : physicalUnits.filter(u => unitAccess[u.name]);
          return vu.map(u => ({ value: u.name, label: u.name }));
        })()}
        onGenerate={async (p) => {
          if (!currentCompany?.id) return;

          if (p.type === 'vendas_fechadas') {
            const closedResult = await fetchClosedInPeriod(p.from, p.to, p.unit);
            const reportParams = {
              type: p.type,
              companyName: currentCompany?.name || '',
              periodLabel: p.periodLabel,
              from: p.from,
              to: p.to,
              events: closedResult?.events || [],
            };

            if (p.format === 'xlsx') generateAgendaXLSX(reportParams);
            else generateAgendaPDF(reportParams);
            return;
          }

          let query = supabase
            .from("company_events")
            .select("*")
            .eq("company_id", currentCompany.id);

          query = query
            .gte("event_date", p.from)
            .lte("event_date", p.to);

          const { data, error } = await query.order("event_date");
          if (error || !data) {
            toast({ title: "Erro ao buscar eventos", description: error?.message, variant: "destructive" });
            return;
          }
          const filtered = p.unit === 'all' ? data : data.filter((e: any) => e.unit === p.unit);
          const reportParams = { type: p.type, companyName: currentCompany?.name || '', periodLabel: p.periodLabel, from: p.from, to: p.to, events: filtered };

          if (p.type === 'ficha_festas') {
            if (p.format === 'xlsx') generateFichaFestasXLSX(reportParams);
            else generateFichaFestasPDF(reportParams);
          } else {
            if (p.format === 'xlsx') generateAgendaXLSX(reportParams);
            else generateAgendaPDF(reportParams);
          }
        }}
      />
    </SidebarProvider>
  );
}
