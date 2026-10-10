import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { showLogoutToast } from "@/lib/logoutToast";
import { LoadingScreen } from "@/components/ui/loading-screen";
import { Helmet } from "react-helmet-async";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { isHubDomain } from "@/hooks/useDomainDetection";
import { getCompanyLogoOverride } from "@/lib/companyAssetOverrides";
import { User, Session } from "@supabase/supabase-js";
import { useUserRole } from "@/hooks/useUserRole";
import { useUnitPermissions } from "@/hooks/useUnitPermissions";
import { useLeadPermissions } from "@/hooks/useLeadPermissions";
import { useLeadNotifications } from "@/hooks/useLeadNotifications";
import { useChatNotificationToggle } from "@/hooks/useChatNotificationToggle";
import { useUnreadCountRealtime, useLeadsRealtime } from "@/hooks/useRealtimeOptimized";
import { Lead, LeadStatus, UserWithRole, Profile, AppRole, LeadFilters, LEAD_STATUS_LABELS } from "@/types/crm";
import { applyLeadFilters, filterDay, leadScopeIsEmpty, leadSelect } from "@/lib/leadQuery";
import { KANBAN_STATUSES } from "@/lib/leadKanban";
import { cn } from "@/lib/utils";
import { mergeLeadUpdate, summarizeLegacyReturns, withReturnInfo } from "@/lib/leadReturns";
import { LeadsTable } from "@/components/admin/LeadsTable";
import { LeadsFilters } from "@/components/admin/LeadsFilters";
import { LeadsKanban } from "@/components/admin/LeadsKanban";
import { LeadDetailSheet } from "@/components/admin/LeadDetailSheet";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { MobileMenu } from "@/components/admin/MobileMenu";
import { exportLeadsToCSV } from "@/components/admin/exportLeads";
import { MetricsCards, LeadMetrics } from "@/components/admin/MetricsCards";
import { NotificationBell } from "@/components/admin/NotificationBell";
import { TransferAlertBanner } from "@/components/admin/TransferAlertBanner";
import { ClientAlertBanner } from "@/components/admin/ClientAlertBanner";
import { VisitAlertBanner } from "@/components/admin/VisitAlertBanner";
import { VisitOutcomeBanner } from "@/components/admin/VisitOutcomeBanner";
import { QuestionsAlertBanner } from "@/components/admin/QuestionsAlertBanner";
import { AiHandoffAlertBanner } from "@/components/admin/AiHandoffAlertBanner";
import { OnboardingBanner } from "@/components/admin/OnboardingBanner";
import { WhatsAppChat } from "@/components/whatsapp/WhatsAppChat";
import { OutboundQueueSheet } from "@/components/whatsapp/OutboundQueueSheet";

import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AnimatedBadge } from "@/components/ui/animated-badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { PullToRefresh } from "@/components/ui/pull-to-refresh";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent } from "@/components/ui/collapsible";
import { LayoutList, Columns, Menu, Bell, BellOff, MessageSquare, BarChart3, Filter, ChevronDown, ChevronUp, Building2, Brain } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useCompany } from "@/contexts/CompanyContext";
import { useCompanyModules } from "@/hooks/useCompanyModules";
import { EventFormDialog, EventFormData } from "@/components/agenda/EventFormDialog";
import { saveEvent } from "@/lib/eventSave";
import { deleteLeads } from "@/lib/leadDelete";
import { AWAITING_READ_OR_FILTER } from "@/lib/conversationUnread";
import { visitUnitAccess } from "@/lib/unitAccess";
import { useCompanyUnits } from "@/hooks/useCompanyUnits";

// Quadro (CRM): quantos leads cada coluna mostra (os mais recentes); o número no topo
// é o total real. "Fechado" busca mais porque quem já teve a festa vai para "Realizada".
const KANBAN_COLUMN_LIMIT = 50;
const KANBAN_FECHADO_LIMIT = 500;
const REALIZADA_LIMIT = 200;
// Exportar: todos os leads do filtro, de 1000 em 1000 (limite do banco por consulta)
const EXPORT_PAGE = 1000;
const EXPORT_MAX = 20000;
const FOLLOW_UP_ACTIONS = [
  "Follow-up automático enviado",
  "Follow-up #2 automático enviado",
  "Follow-up #3 automático enviado",
  "Follow-up #4 automático enviado",
];

export default function CentralAtendimento() {
  const navigate = useNavigate();
  const { currentCompany } = useCompany();
  const modules = useCompanyModules();

  // Guard: redirect to Hub dashboard if on Hub domain
  useEffect(() => {
    if (isHubDomain()) {
      navigate("/hub", { replace: true });
    }
  }, [navigate]);
  const [searchParams, setSearchParams] = useSearchParams();
  const [user, setUser] = useState<User | null>(null);
  const [_session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState<LeadFilters>({
    campaign: "all",
    unit: "all",
    status: "all",
    responsavel: "all",
    month: "all",
    startDate: (() => { const d = new Date(); d.setHours(0,0,0,0); return d; })(),
    endDate: (() => { const d = new Date(); d.setHours(0,0,0,0); return d; })(),
    search: "",
    hasScheduledVisit: false,
  });
  const [refreshKey, setRefreshKey] = useState(0);
  const [leads, setLeads] = useState<Lead[]>([]);
  // Leads "realizados" (fechados cuja festa ja aconteceu) — carregados de forma
  // independente da paginacao, para a coluna "Realizada" mostrar o historico completo.
  const [realizadaLeads, setRealizadaLeads] = useState<Lead[]>([]);
  const [isLoadingLeads, setIsLoadingLeads] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  // Quadro (CRM): total real de cada coluna e da coluna "Realizada"
  const [kanbanTotals, setKanbanTotals] = useState<Record<string, number>>({});
  const [realizadaTotal, setRealizadaTotal] = useState(0);
  const kanbanColumnTotals = useMemo(() => ({ ...kanbanTotals, realizada: realizadaTotal }), [kanbanTotals, realizadaTotal]);
  // Muda quando algo altera os números do topo (situação, exclusão, lead novo)
  const [metricsVersion, setMetricsVersion] = useState(0);
  const pageSize = 20;
  const [leadMetrics, setLeadMetrics] = useState<LeadMetrics>({ total: 0, today: 0, returned_today: 0, novo: 0, em_contato: 0, fechado: 0, perdido: 0 });
  const [responsaveis, setResponsaveis] = useState<UserWithRole[]>([]);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [currentUserProfile, setCurrentUserProfile] = useState<Profile | null>(null);
  const [viewMode, setViewMode] = useState<"list" | "kanban">("list");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [festaFormOpen, setFestaFormOpen] = useState(false);
  const [festaInitialData, setFestaInitialData] = useState<EventFormData | null>(null);

  const { units } = useCompanyUnits(currentCompany?.id);
  const [activeTab, setActiveTab] = useState<"chat" | "leads">("chat");
  // Celular: com uma conversa aberta, o topo do app e as abas somem (mais espaço para as mensagens)
  const [phoneConversationOpen, setPhoneConversationOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [unreadPerInstance, setUnreadPerInstance] = useState<Record<string, number>>({});
  const [newLeadsCount, setNewLeadsCount] = useState(0);
  const [showMetrics, setShowMetrics] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  
  const [initialPhone, setInitialPhone] = useState<string | null>(null);
  const [initialDraft, setInitialDraft] = useState<string | null>(null);
  const [chatInstances, setChatInstances] = useState<{ id: string; unit: string | null; status: string | null }[]>([]);
  const [selectedChatUnit, setSelectedChatUnit] = useState<string | null>(() => {
    if (!currentCompany?.id) return null;
    try {
      return localStorage.getItem(`chat_selected_unit_${currentCompany.id}`);
    } catch { return null; }
  });

  const handleSetSelectedChatUnit = useCallback((unit: string | null) => {
    setSelectedChatUnit(unit);
    if (currentCompany?.id) {
      try {
        if (unit) {
          localStorage.setItem(`chat_selected_unit_${currentCompany.id}`, unit);
        } else {
          localStorage.removeItem(`chat_selected_unit_${currentCompany.id}`);
        }
      } catch {}
    }
  }, [currentCompany?.id]);

  // Handle URL params for phone/leadId navigation
  useEffect(() => {
    const phoneParam = searchParams.get("phone");
    const draftParam = searchParams.get("draft");
    const leadIdParam = searchParams.get("leadId");

    if (phoneParam) {
      setInitialPhone(phoneParam);
      setInitialDraft(draftParam ? decodeURIComponent(draftParam) : null);
      setActiveTab("chat");
    } else if (leadIdParam) {
      // Lookup lead's whatsapp by ID and navigate to that conversation
      supabase
        .from("campaign_leads")
        .select("whatsapp")
        .eq("id", leadIdParam)
        .single()
        .then(({ data }) => {
          if (data?.whatsapp) {
            setInitialPhone(data.whatsapp);
            setActiveTab("chat");
          }
        });
    }
  }, [searchParams]);

  const handlePhoneHandled = () => {
    if (searchParams.has("phone") || searchParams.has("draft") || searchParams.has("leadId")) {
      searchParams.delete("phone");
      searchParams.delete("draft");
      searchParams.delete("leadId");
      setSearchParams(searchParams, { replace: true });
    }
    setInitialPhone(null);
    setInitialDraft(null);
  };

  const { role, isLoading: isLoadingRole, isAdmin, canManageUsers } = useUserRole(user?.id);
  const { allowedUnits, canViewAll, isLoading: isLoadingUnitPerms } = useUnitPermissions(user?.id, currentCompany?.id);
  // Permissões de lead (regras em src/lib/leadPermissions.ts): nada fica liberado
  // enquanto carregam, e o papel "Visualização" não edita
  const { canEditName, canEditDescription, canExportLeads, canDeleteLeads, canEditLeads, canViewContact } = useLeadPermissions(user?.id);
  
  // Sound notification for new leads (filtrado pela empresa atual)
  // Unidade de lead que a pessoa pode ver (mesma regra da lista: quem é restrito não vê
  // lead sem unidade). Vale para o som, o número de novos, o lead que chega na hora e o link.
  const leadUnitVisible = useCallback((unit: string | null | undefined) => {
    if (canViewAll || allowedUnits.includes('all')) return true;
    if (!unit) return false;
    return unit === "As duas" || allowedUnits.includes(unit);
  }, [canViewAll, allowedUnits]);

  useLeadNotifications(currentCompany?.id, (lead) => leadUnitVisible(lead.unit));
  // Visitas: mesma regra da aba Visitas (visita sem unidade continua aparecendo)
  const canSeeVisitUnit = useMemo(
    () => visitUnitAccess(canViewAll, allowedUnits, isLoadingUnitPerms),
    [canViewAll, allowedUnits, isLoadingUnitPerms],
  );
  
  // Chat notifications toggle
  const { notificationsEnabled, toggleNotifications } = useChatNotificationToggle();

  const chatUnitOptions = useMemo(() => {
    const instanceUnits = chatInstances
      .map((instance) => instance.unit)
      .filter((unit): unit is string => Boolean(unit));

    if (instanceUnits.length > 0) {
      return Array.from(new Set(instanceUnits));
    }

    if (!canViewAll) {
      return allowedUnits.filter((unit) => unit !== "all" && unit !== "As duas");
    }

    return Array.from(
      new Set(
        units
          .filter((unit) => unit.slug !== "trabalhe-conosco")
          .map((unit) => unit.name)
          .filter(Boolean)
      )
    );
  }, [allowedUnits, canViewAll, chatInstances, units]);

  useEffect(() => {
    if (chatUnitOptions.length === 0) {
      handleSetSelectedChatUnit(null);
      return;
    }

    setSelectedChatUnit((current) => {
      // Keep current if still valid
      if (current && chatUnitOptions.includes(current)) return current;
      // Try persisted value
      if (currentCompany?.id) {
        try {
          const persisted = localStorage.getItem(`chat_selected_unit_${currentCompany.id}`);
          if (persisted && chatUnitOptions.includes(persisted)) return persisted;
        } catch {}
      }
      return chatUnitOptions[0];
    });
  }, [chatUnitOptions, currentCompany?.id, handleSetSelectedChatUnit]);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setIsLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!isLoading && !user) {
      navigate("/auth");
    }
  }, [isLoading, user, navigate]);

  // Fetch current user profile
  useEffect(() => {
    if (user) {
      supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .single()
        .then(({ data }) => {
          if (data) {
            setCurrentUserProfile(data as Profile);
          }
        });
    }
  }, [user]);

  // Fetch responsaveis (users who can be assigned)
  useEffect(() => {
    const fetchResponsaveis = async () => {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("*")
        .eq("is_active", true);

      const { data: roles } = await supabase.from("user_roles").select("*");

      if (profiles) {
        const usersWithRoles: UserWithRole[] = profiles.map((profile) => {
          const userRole = roles?.find((r) => r.user_id === profile.user_id);
          return {
            ...profile,
            role: userRole?.role as AppRole | undefined,
          };
        });
        setResponsaveis(usersWithRoles);
      }
    };

    if (role) {
      fetchResponsaveis();
    }
  }, [role]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filters]);

  // Informações extras dos leads mostrados: visita marcada, follow-ups, retornos antigos
  // e data da festa. Em blocos de 100 (o quadro do CRM pode ter centenas de leads).
  const enrichLeads = useCallback(async (leadsData: Lead[]): Promise<Lead[]> => {
    const ids = leadsData.map((l) => l.id);
    const scheduled = new Set<string>();
    const followUps: Record<string, Set<string>> = {};
    const returnRows: { lead_id: string; created_at: string }[] = [];
    const partyDateByLead = new Map<string, string>();
    for (let i = 0; i < ids.length; i += 100) {
      const chunk = ids.slice(i, i + 100);
      const [convResult, historyResult, eventsResult] = await Promise.all([
        supabase.from("wapi_conversations").select("lead_id").in("lead_id", chunk).eq("has_scheduled_visit", true),
        supabase
          .from("lead_history")
          .select("lead_id, action, created_at")
          .in("lead_id", chunk)
          .in("action", [...FOLLOW_UP_ACTIONS, "Lead retornou pela Landing Page"])
          .limit(5000),
        supabase
          .from("company_events")
          .select("lead_id, event_date")
          .in("lead_id", chunk)
          .neq("status", "cancelado")
          .not("event_date", "is", null),
      ]);
      (convResult.data || []).forEach((c) => c.lead_id && scheduled.add(c.lead_id));
      (historyResult.data || []).forEach((h) => {
        if (h.action === "Lead retornou pela Landing Page") returnRows.push({ lead_id: h.lead_id, created_at: h.created_at });
        else (followUps[h.action] ||= new Set()).add(h.lead_id);
      });
      // Data da festa mais recente (separa "Fechado" de "Realizada")
      (eventsResult.data || []).forEach((e) => {
        if (!e.lead_id || !e.event_date) return;
        const current = partyDateByLead.get(e.lead_id);
        if (!current || e.event_date > current) partyDateByLead.set(e.lead_id, e.event_date);
      });
    }
    const legacyReturns = summarizeLegacyReturns(returnRows);
    const has = (action: string, id: string) => !!followUps[action]?.has(id);
    return leadsData.map((lead) => ({
      ...withReturnInfo(lead, legacyReturns),
      has_scheduled_visit: scheduled.has(lead.id),
      has_follow_up: has(FOLLOW_UP_ACTIONS[0], lead.id),
      has_follow_up_2: has(FOLLOW_UP_ACTIONS[1], lead.id),
      has_follow_up_3: has(FOLLOW_UP_ACTIONS[2], lead.id),
      has_follow_up_4: has(FOLLOW_UP_ACTIONS[3], lead.id),
      party_date: partyDateByLead.get(lead.id) || null,
    }));
  }, []);

  // Fetch leads. Lista: 20 por página. Quadro (CRM): os mais recentes de CADA coluna,
  // com o total real de cada uma (antes eram só 20 leads espalhados nas 11 colunas).
  // Filtros em src/lib/leadQuery.ts; só a busca mais recente vale.
  const leadsFetchSeq = useRef(0);
  useEffect(() => {
    const fetchLeads = async () => {
      if (!role || isLoadingUnitPerms || !currentCompany?.id) return;
      const seq = ++leadsFetchSeq.current;
      const stale = () => seq !== leadsFetchSeq.current;
      setIsLoadingLeads(true);

      const scope = { canViewAll, allowedUnits, filters };
      if (leadScopeIsEmpty(scope)) {
        setLeads([]);
        setTotalCount(0);
        setKanbanTotals({});
        setIsLoadingLeads(false);
        return;
      }
      const base = () =>
        supabase
          .from("campaign_leads")
          .select(leadSelect("*", filters), { count: "exact" })
          .eq("company_id", currentCompany.id);

      let rows: Lead[] = [];
      let total = 0;
      const totals: Record<string, number> = {};

      if (viewMode === "kanban") {
        const statuses = filters.status && filters.status !== "all"
          ? KANBAN_STATUSES.filter((st) => st === filters.status)
          : KANBAN_STATUSES;
        const results = await Promise.all(
          statuses.map((st) =>
            applyLeadFilters(base(), scope, { ignoreStatus: true })
              .eq("status", st)
              // Entrada mais recente (chegada ou retorno) primeiro
              .order("last_entry_at", { ascending: false })
              .limit(st === "fechado" ? KANBAN_FECHADO_LIMIT : KANBAN_COLUMN_LIMIT),
          ),
        );
        if (stale()) return;
        results.forEach((r, i) => {
          if (r.error) console.error("Erro ao buscar leads do quadro:", r.error);
          totals[statuses[i]] = r.count || 0;
          rows.push(...((r.data || []) as unknown as Lead[]));
        });
        total = Object.values(totals).reduce((a, b) => a + b, 0);
      } else {
        const from = (currentPage - 1) * pageSize;
        const { data, count, error } = await applyLeadFilters(base(), scope)
          // Entrada mais recente (chegada ou retorno): quem voltou sobe sem perder a data de chegada
          .order("last_entry_at", { ascending: false })
          .range(from, from + pageSize - 1);
        if (stale()) return;
        if (error) {
          console.error("Erro ao buscar leads:", error);
          toast({ title: "Não consegui carregar os leads", description: "Tente de novo em instantes.", variant: "destructive" });
          setIsLoadingLeads(false);
          return;
        }
        rows = (data || []) as unknown as Lead[];
        total = count || 0;
      }

      const enriched = rows.length > 0 ? await enrichLeads(rows) : rows;
      if (stale()) return;
      // Coluna "Fechado" conta só quem ainda não teve a festa (os outros estão em "Realizada")
      if (totals.fechado !== undefined) {
        const todayStr = filterDay(new Date());
        const done = enriched.filter((l) => l.status === "fechado" && !!l.party_date && l.party_date < todayStr).length;
        totals.fechado = Math.max(0, totals.fechado - done);
      }
      setLeads(enriched);
      setTotalCount(total);
      setKanbanTotals(totals);
      setIsLoadingLeads(false);
    };

    fetchLeads();
  }, [filters, refreshKey, role, canViewAll, allowedUnits, isLoadingUnitPerms, currentPage, viewMode, currentCompany?.id, enrichLeads]);

  // Coluna "Realizada" (CRM): leads fechados cuja festa mais recente já passou
  // (festa cancelada não conta). Mostra o histórico todo (sem o período da tela, como
  // antes: são leads antigos), com os outros filtros.
  const realizadaFetchSeq = useRef(0);
  useEffect(() => {
    const fetchRealizadas = async () => {
      const seq = ++realizadaFetchSeq.current;
      const scope = { canViewAll, allowedUnits, filters };
      if (viewMode !== "kanban" || !role || isLoadingUnitPerms || !currentCompany?.id || leadScopeIsEmpty(scope)
        || (filters.status && filters.status !== "all" && filters.status !== "fechado")) {
        setRealizadaLeads([]);
        setRealizadaTotal(0);
        return;
      }
      const todayStr = filterDay(new Date());
      const { data, count, error } = await applyLeadFilters(
        supabase
          .from("campaign_leads")
          .select(leadSelect("*, passada:company_events!inner(event_date, status), festas:company_events(event_date, status)", filters), { count: "exact" })
          .eq("company_id", currentCompany.id)
          .eq("status", "fechado")
          .lt("passada.event_date", todayStr)
          .neq("passada.status", "cancelado"),
        scope,
        { ignoreStatus: true, ignorePeriod: true },
      )
        .order("last_entry_at", { ascending: false })
        .limit(REALIZADA_LIMIT);
      if (seq !== realizadaFetchSeq.current) return;
      if (error) {
        console.error("Erro ao buscar realizadas:", error);
        setRealizadaLeads([]);
        setRealizadaTotal(0);
        return;
      }
      type Row = Lead & { festas?: { event_date: string | null; status: string | null }[] };
      const withDate = ((data || []) as unknown as Row[])
        .map(({ festas, ...lead }) => {
          const dates = (festas || []).filter((f) => f.status !== "cancelado" && f.event_date).map((f) => f.event_date as string);
          const party = dates.sort().pop() || null;
          return { ...(lead as Lead), party_date: party };
        })
        // Cliente com outra festa marcada para frente fica em "Fechado"
        .filter((lead) => !!lead.party_date && lead.party_date < todayStr)
        // Festas mais recentes primeiro
        .sort((a, b) => (b.party_date || "").localeCompare(a.party_date || ""));
      setRealizadaLeads(withDate);
      // O total do banco inclui quem tem outra festa para frente; desconta os que vieram
      // (exato quando vieram todos)
      const fetched = (data || []).length;
      setRealizadaTotal(Math.max(withDate.length, (count || 0) - (fetched - withDate.length)));
    };

    fetchRealizadas();
  }, [viewMode, refreshKey, role, canViewAll, allowedUnits, isLoadingUnitPerms, currentCompany?.id, filters]);

  // Números do topo: os mesmos filtros da lista (src/lib/leadQuery.ts), inclusive busca e
  // "Visitas agendadas". Total/hoje/retornaram seguem a situação escolhida; os cartões de
  // cada situação contam a sua. Recalcula quando muda situação, lead entra ou sai.
  const metricsFetchSeq = useRef(0);
  useEffect(() => {
    const fetchMetrics = async () => {
      if (!role || isLoadingUnitPerms || !currentCompany?.id) return;
      const seq = ++metricsFetchSeq.current;
      const scope = { canViewAll, allowedUnits, filters };
      if (leadScopeIsEmpty(scope)) {
        setLeadMetrics({ total: 0, today: 0, returned_today: 0, novo: 0, em_contato: 0, fechado: 0, perdido: 0 });
        return;
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayISO = today.toISOString();

      // since: conta só quem chegou (created_at) ou voltou (last_return_at) a partir da data
      const buildQuery = (statusFilter?: LeadStatus, since?: { column: "created_at" | "last_return_at"; iso: string }) => {
        let q = applyLeadFilters(
          supabase
            .from("campaign_leads")
            .select(leadSelect("id", filters), { count: "exact", head: true })
            .eq("company_id", currentCompany.id),
          scope,
          { ignoreStatus: !!statusFilter },
        );
        if (statusFilter) q = q.eq("status", statusFilter);
        if (since) q = q.gte(since.column, since.iso);
        return q;
      };

      // "Fechados" usa company_events.data_fechamento_venda (mesma fonte da Central de Agenda)
      // para que o número bata com a aba "Fechadas" da Agenda. Respeita os mesmos filtros
      // de unidade, responsável (vendedor_responsavel_id) e período.
      const buildFechadosQuery = () => {
        let q = supabase
          .from("company_events")
          .select("id", { count: "exact", head: true })
          .eq("company_id", currentCompany.id)
          .not("data_fechamento_venda", "is", null);

        // Permissões de unidade
        if (!canViewAll && !allowedUnits.includes('all')) {
          q = q.in("unit", [...allowedUnits, "As duas"]);
        }
        if (filters.unit && filters.unit !== "all") {
          q = q.eq("unit", filters.unit);
        }
        if (filters.responsavel && filters.responsavel !== "all") {
          if (filters.responsavel === "unassigned") {
            q = q.is("vendedor_responsavel_id", null);
          } else {
            q = q.eq("vendedor_responsavel_id", filters.responsavel);
          }
        }
        // Período: usa data_fechamento_venda (não created_at), no dia local
        if (filters.startDate) q = q.gte("data_fechamento_venda", filterDay(filters.startDate));
        if (filters.endDate) q = q.lte("data_fechamento_venda", filterDay(filters.endDate));
        return q;
      };

      const [totalRes, todayRes, returnedTodayRes, novoRes, contatoRes, fechadoRes, perdidoRes] = await Promise.all([
        buildQuery(),
        buildQuery(undefined, { column: "created_at", iso: todayISO }),
        buildQuery(undefined, { column: "last_return_at", iso: todayISO }),
        buildQuery("novo"),
        buildQuery("em_contato"),
        buildFechadosQuery(),
        buildQuery("perdido"),
      ]);
      if (seq !== metricsFetchSeq.current) return;

      setLeadMetrics({
        total: totalRes.count || 0,
        today: todayRes.count || 0,
        returned_today: returnedTodayRes.count || 0,
        novo: novoRes.count || 0,
        em_contato: contatoRes.count || 0,
        fechado: fechadoRes.count || 0,
        perdido: perdidoRes.count || 0,
      });
    };

    fetchMetrics();
  }, [role, canViewAll, allowedUnits, isLoadingUnitPerms, refreshKey, filters, currentCompany?.id, metricsVersion]);

  // Link "?lead=<id>": abre a ficha do lead (mesmo se a lista do dia estiver vazia),
  // só da empresa atual e de unidade que a pessoa acessa
  useEffect(() => {
    const leadId = searchParams.get('lead');
    if (!leadId || isLoadingLeads || isLoadingUnitPerms || !currentCompany?.id) return;
    const clearParam = () => {
      searchParams.delete('lead');
      setSearchParams(searchParams, { replace: true });
    };
    const open = (lead: Lead) => {
      if (!leadUnitVisible(lead.unit)) {
        toast({ title: "Lead de outra unidade", description: "Você não tem acesso à unidade deste lead.", variant: "destructive" });
        return;
      }
      setSelectedLead(lead);
      setIsDetailOpen(true);
      setActiveTab("leads");
    };
    const inList = leads.find(l => l.id === leadId);
    if (inList) {
      open(inList);
      clearParam();
      return;
    }
    supabase
      .from('campaign_leads')
      .select('*')
      .eq('id', leadId)
      .eq('company_id', currentCompany.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) open(data as Lead);
        clearParam();
      });
  }, [leads, isLoadingLeads, isLoadingUnitPerms, currentCompany?.id, leadUnitVisible, searchParams, setSearchParams]);

  // Optimized: Fetch unread count with debounced realtime
  const fetchUnreadCount = useCallback(async () => {
    if (!currentCompany?.id || isLoadingUnitPerms) return;
    // Só os números (instâncias) das unidades da pessoa, como no chat
    let instanceIds: string[] | null = null;
    if (!canViewAll && !allowedUnits.includes('all')) {
      if (allowedUnits.length === 0) {
        setUnreadCount(0);
        setUnreadPerInstance({});
        return;
      }
      const { data: insts } = await supabase
        .from("wapi_instances")
        .select("id")
        .eq("company_id", currentCompany.id)
        .in("unit", allowedUnits);
      instanceIds = (insts || []).map((i) => i.id);
      if (instanceIds.length === 0) {
        setUnreadCount(0);
        setUnreadPerInstance({});
        return;
      }
    }
    // Só conversas esperando a equipe (o cliente mandou a última mensagem)
    let query = supabase
      .from("wapi_conversations")
      .select("unread_count, instance_id")
      .eq("company_id", currentCompany.id)
      .gt("unread_count", 0)
      .or(AWAITING_READ_OR_FILTER);
    if (instanceIds) query = query.in("instance_id", instanceIds);
    const { data } = await query;
    
    if (data) {
      const total = data.reduce((sum, conv) => sum + (conv.unread_count || 0), 0);
      setUnreadCount(total);
      
      const perInst: Record<string, number> = {};
      data.forEach((conv: any) => {
        if (conv.instance_id && (conv.unread_count || 0) > 0) {
          perInst[conv.instance_id] = (perInst[conv.instance_id] || 0) + (conv.unread_count || 0);
        }
      });
      setUnreadPerInstance(perInst);
    }
  }, [currentCompany?.id, isLoadingUnitPerms, canViewAll, allowedUnits]);

  useEffect(() => {
    fetchUnreadCount();
  }, [fetchUnreadCount]);

  // Use optimized realtime hook with debounce (1s) — filtrado pela empresa atual
  useUnreadCountRealtime(fetchUnreadCount, { debounceMs: 1000 }, currentCompany?.id);

  // Optimized: Fetch new leads count
  const fetchNewLeadsCount = useCallback(async () => {
    if (!currentCompany?.id || isLoadingUnitPerms) return;
    // Só da empresa atual e das unidades da pessoa (antes contava tudo que ela via no banco)
    let query = supabase
      .from("campaign_leads")
      .select("id", { count: "exact", head: true }) // Only count, don't fetch data
      .eq("company_id", currentCompany.id)
      .eq("status", "novo");
    if (!canViewAll && !allowedUnits.includes('all')) {
      if (allowedUnits.length === 0) { setNewLeadsCount(0); return; }
      query = query.in("unit", [...allowedUnits, "As duas"]);
    }
    const { count } = await query;
    setNewLeadsCount(count || 0);
  }, [currentCompany?.id, isLoadingUnitPerms, canViewAll, allowedUnits]);

  useEffect(() => {
    fetchNewLeadsCount();
  }, [fetchNewLeadsCount]);

  // Lead novo, alterado ou apagado por outra pessoa ou pelo robô: refaz os números do
  // topo, no máximo uma vez a cada 10s (não consulta a cada mensagem)
  const metricsTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const refreshMetricsSoon = useCallback(() => {
    if (metricsTimerRef.current) return;
    metricsTimerRef.current = setTimeout(() => {
      metricsTimerRef.current = undefined;
      setMetricsVersion((v) => v + 1);
    }, 10000);
  }, []);
  useEffect(() => () => clearTimeout(metricsTimerRef.current), []);

  // Use optimized realtime hook for leads with debounced callbacks
  const handleLeadInsert = useCallback((payload: unknown) => {
    const newLead = payload as Lead;
    fetchNewLeadsCount();
    refreshMetricsSoon();
    // Lead de outra unidade não entra na lista de quem não acessa essa unidade
    if (!leadUnitVisible(newLead.unit)) return;
    setLeads((prev) => {
      if (prev.some(l => l.id === newLead.id)) return prev;
      return [newLead, ...prev];
    });
    setTotalCount((prev) => prev + 1);
  }, [fetchNewLeadsCount, leadUnitVisible, refreshMetricsSoon]);

  const handleLeadUpdate = useCallback((payload: unknown) => {
    const updatedLead = payload as Lead;
    fetchNewLeadsCount();
    refreshMetricsSoon();
    setLeads((prev) => mergeLeadUpdate(prev, updatedLead));
  }, [fetchNewLeadsCount, refreshMetricsSoon]);

  const handleLeadDelete = useCallback((payload: unknown) => {
    const deletedLead = payload as { id: string };
    fetchNewLeadsCount();
    refreshMetricsSoon();
    setLeads((prev) => prev.filter((lead) => lead.id !== deletedLead.id));
    setTotalCount((prev) => Math.max(0, prev - 1));
  }, [fetchNewLeadsCount, refreshMetricsSoon]);

  useLeadsRealtime(handleLeadInsert, handleLeadUpdate, handleLeadDelete, { debounceMs: 300 }, currentCompany?.id);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    showLogoutToast();
    navigate("/auth");
  };

  const handleRefresh = () => {
    setRefreshKey((prev) => prev + 1);
  };

  const handleLeadClick = (lead: Lead) => {
    setSelectedLead(lead);
    setIsDetailOpen(true);
  };

  // Procura o lead tanto na página atual quanto na lista de "realizados" (que é
  // carregada à parte), para que arrastar/editar funcione mesmo em leads antigos.
  const findLead = (leadId: string): Lead | undefined =>
    leads.find((l) => l.id === leadId) || realizadaLeads.find((l) => l.id === leadId);

  // Mudar a situação do lead: a mesma regra na lista, no quadro (CRM) e nos cartões
  // do celular. "Perdido" desliga o robô da conversa (como já fazia no quadro e no
  // chat) e "Fechado" abre o cadastro da festa. Soltar na mesma coluna não faz nada.
  const changeLeadStatus = async (leadId: string, newStatus: LeadStatus) => {
    const lead = findLead(leadId);
    if (!lead || !user || lead.status === newStatus) return;
    const { error } = await supabase.from("campaign_leads").update({ status: newStatus }).eq("id", leadId);
    if (error) {
      console.error("Error updating status:", error);
      toast({ title: "Erro ao atualizar status", description: "Tente novamente.", variant: "destructive" });
      return;
    }
    await supabase.from("lead_history").insert({
      lead_id: leadId,
      company_id: currentCompany?.id,
      user_id: user.id,
      user_name: currentUserProfile?.full_name || user.email,
      action: "Alteração de status",
      old_value: LEAD_STATUS_LABELS[lead.status],
      new_value: LEAD_STATUS_LABELS[newStatus],
    });
    if (newStatus === "perdido") {
      await supabase.from("wapi_conversations").update({ bot_enabled: false, bot_step: 'human_takeover' }).eq("lead_id", leadId);
    }
    handleStatusChange(leadId, newStatus);
    // Números do topo das colunas do quadro (quem estava em "Realizada" sai de lá)
    const wasRealizada = realizadaLeads.some((l) => l.id === leadId);
    if (wasRealizada) setRealizadaTotal((t) => Math.max(0, t - 1));
    setKanbanTotals((prev) => {
      if (prev[newStatus] === undefined) return prev;
      const next = { ...prev, [newStatus]: prev[newStatus] + 1 };
      if (!wasRealizada && prev[lead.status] !== undefined) next[lead.status] = Math.max(0, prev[lead.status] - 1);
      return next;
    });
    setMetricsVersion((v) => v + 1);
    if (newStatus === "fechado") handleLeadClosed({ ...lead, status: "fechado" });
  };

  const updateLeadName = async (leadId: string, newName: string) => {
    const lead = findLead(leadId);
    if (!lead || !user) return;
    await supabase.from("lead_history").insert({ lead_id: leadId, company_id: currentCompany?.id, user_id: user.id, user_name: currentUserProfile?.full_name || user.email, action: "Alteração de nome", old_value: lead.name, new_value: newName });
    const { error } = await supabase.from("campaign_leads").update({ name: newName }).eq("id", leadId);
    if (error) throw error;
    await supabase.from("wapi_conversations").update({ contact_name: newName }).eq("lead_id", leadId);
    setLeads((prev) => prev.map((l) => l.id === leadId ? { ...l, name: newName } : l));
    toast({ title: "Nome atualizado", description: `O nome foi alterado para "${newName}".` });
  };

  const updateLeadDescription = async (leadId: string, newDescription: string) => {
    const lead = findLead(leadId);
    if (!lead || !user) return;
    await supabase.from("lead_history").insert({ lead_id: leadId, company_id: currentCompany?.id, user_id: user.id, user_name: currentUserProfile?.full_name || user.email, action: "Alteração de observações", old_value: lead.observacoes || "", new_value: newDescription });
    const { error } = await supabase.from("campaign_leads").update({ observacoes: newDescription }).eq("id", leadId);
    if (error) throw error;
    setLeads((prev) => prev.map((l) => l.id === leadId ? { ...l, observacoes: newDescription } : l));
    toast({ title: "Observação atualizada", description: "A observação foi salva com sucesso." });
  };

  const handleStatusChange = (leadId: string, newStatus: LeadStatus) => {
    setLeads((prev) =>
      prev.map((lead) =>
        lead.id === leadId ? { ...lead, status: newStatus } : lead
      )
    );
    // Se saiu de "fechado", tira da coluna Realizada na hora.
    setRealizadaLeads((prev) =>
      newStatus === "fechado" ? prev : prev.filter((l) => l.id !== leadId)
    );
  };

  const handleLeadClosed = async (lead: Lead) => {
    const { data: existingEvents } = await supabase
      .from("company_events")
      .select("id")
      .eq("lead_id", lead.id)
      .limit(1);

    if (existingEvents && existingEvents.length > 0) {
      toast({
        title: "Festa já vinculada",
        description: "Este lead já possui uma festa vinculada.",
        variant: "destructive",
      });
      return;
    }

    console.log('[Lead:Fechado->NovaFesta:mobile]', { leadId: lead.id, leadName: lead.name });

    // Close the detail sheet first so the modal is visible on mobile
    setIsDetailOpen(false);

    const initialData: EventFormData = {
      title: lead.name,
      event_date: "",
      start_time: "",
      end_time: "",
      event_type: "aniversario",
      guest_count: null,
      unit: "",
      status: "pendente",
      package_name: "",
      total_value: null,
      notes: "",
      lead_id: lead.id,
      lead_name: lead.name,
    };

    // Small delay to let the sheet close animation finish before opening the dialog
    setTimeout(() => {
      setFestaInitialData(initialData);
      setFestaFormOpen(true);
    }, 300);
  };

  // Mesma regra da Agenda: todos os campos e as parcelas (src/lib/eventSave.ts)
  const handleFestaSubmit = async (data: EventFormData): Promise<string | void> => {
    if (!currentCompany?.id || !user?.id) return;
    const id = await saveEvent(data, { companyId: currentCompany.id, userId: user.id });
    return id || undefined;
  };

  // Exporta TODOS os leads do filtro (antes saíam só os 20 da página)
  const exportingRef = useRef(false);
  const handleExport = async () => {
    if (!currentCompany?.id || exportingRef.current) return;
    const scope = { canViewAll, allowedUnits, filters };
    if (leadScopeIsEmpty(scope)) {
      toast({ title: "Nada para exportar", description: "Nenhum lead com esses filtros." });
      return;
    }
    exportingRef.current = true;
    const preparing = toast({ title: "Preparando a planilha...", description: "Buscando os leads do filtro." });
    try {
      const all: Lead[] = [];
      for (let from = 0; from < EXPORT_MAX; from += EXPORT_PAGE) {
        const { data, error } = await applyLeadFilters(
          supabase.from("campaign_leads").select(leadSelect("*", filters)).eq("company_id", currentCompany.id),
          scope,
        )
          .order("last_entry_at", { ascending: false })
          .order("id")
          .range(from, from + EXPORT_PAGE - 1);
        if (error) throw error;
        all.push(...((data || []) as unknown as Lead[]));
        if (!data || data.length < EXPORT_PAGE) break;
      }
      preparing.dismiss();
      if (all.length === 0) {
        toast({ title: "Nada para exportar", description: "Nenhum lead com esses filtros." });
        return;
      }
      exportLeadsToCSV({ leads: all, responsaveis, canViewContact });
      toast({
        title: "Exportação concluída",
        description: all.length >= EXPORT_MAX
          ? `Os ${all.length} leads mais recentes foram exportados (limite da planilha). Use os filtros para pegar os outros.`
          : `${all.length} leads exportados para CSV.`,
      });
    } catch (error) {
      console.error("Erro ao exportar leads:", error);
      preparing.dismiss();
      toast({ title: "Não consegui exportar", description: "Tente de novo em instantes.", variant: "destructive" });
    } finally {
      exportingRef.current = false;
    }
  };

  const handleDeleteLead = async (leadId: string) => {
    // O histórico sai junto (cascata) e confere se o banco apagou de verdade
    const result = await deleteLeads([leadId]);
    if (!result.ok) {
      toast({ title: "Lead não foi excluído", description: result.message, variant: "destructive" });
      return;
    }
    setLeads((prev) => prev.filter((l) => l.id !== leadId));
    setRealizadaLeads((prev) => prev.filter((l) => l.id !== leadId));
    setTotalCount((c) => Math.max(0, c - 1));
    setMetricsVersion((v) => v + 1);
    toast({
      title: "Lead excluído",
      description: "O lead foi removido permanentemente.",
    });
  };

  const { isLoading: isCompanyLoading } = useCompany();

  if (isLoading || isLoadingRole || isLoadingUnitPerms || isCompanyLoading) {
    return <LoadingScreen message="Carregando atendimento..." />;
  }

  if (!user) {
    return null;
  }

  // If role hasn't loaded yet (e.g. race condition), show loading instead of blank screen
  if (!role) {
    return <LoadingScreen message="Carregando..." />;
  }

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const activeFiltersCount = [
    filters.campaign !== "all",
    filters.unit !== "all",
    filters.status !== "all",
    filters.responsavel !== "all",
    filters.month !== "all",
    !!filters.startDate,
    !!filters.endDate,
    !!filters.search,
    filters.hasScheduledVisit,
  ].filter(Boolean).length;

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  // Mobile layout with Sheet
  if (isMobile) {
    return (
      <div className="h-dvh flex flex-col overflow-hidden bg-background">
        <Helmet><title>Atendimento</title></Helmet>
        {/* Topo do app e avisos: somem com uma conversa aberta (voltam ao sair dela) */}
        <div className={phoneConversationOpen && activeTab === "chat" ? "hidden" : "contents"}>
        {/* Mobile Header */}
        <header className="bg-card border-b border-border shrink-0 z-10">
          <div className="px-3 py-3">
              <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <MobileMenu
                  isOpen={isMobileMenuOpen}
                  onOpenChange={setIsMobileMenuOpen}
                  trigger={
                    <Button variant="ghost" size="icon" className="h-9 w-9">
                      <Menu className="w-5 h-5" />
                    </Button>
                  }
                  currentPage="atendimento"
                  userName={currentUserProfile?.full_name || ""}
                  userEmail={user.email || ""}
                  userAvatar={currentUserProfile?.avatar_url}
                  canManageUsers={canManageUsers}
                  isAdmin={isAdmin}
                  onRefresh={handleRefresh}
                  onLogout={handleLogout}
                />

                <div className="flex items-center gap-2 min-w-0">
                  <img src={getCompanyLogoOverride(currentCompany?.slug, currentCompany?.logo_url) || '/placeholder.svg'} alt={currentCompany?.name || 'Logo'} className="h-8 w-auto shrink-0" />
                  <h1 className="font-display font-bold text-foreground text-sm truncate">Central de Atendimento</h1>
                </div>
              </div>
              
              {/* Mobile notification controls */}
              <div className="flex items-center gap-1 shrink-0">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleNotifications}
                  className={`h-9 w-9 transition-all duration-200 ${
                    notificationsEnabled 
                      ? "bg-amber-100 text-amber-700 hover:bg-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:hover:bg-amber-900/50" 
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                  title={notificationsEnabled ? "Desativar notificações" : "Ativar notificações"}
                >
                  {notificationsEnabled ? (
                    <Bell className="w-5 h-5" />
                  ) : (
                    <BellOff className="w-5 h-5" />
                  )}
                </Button>
                <OutboundQueueSheet />
                <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0" onClick={() => navigate("/inteligencia")}>
                  <Brain className="w-5 h-5 text-[hsl(155,75%,38%)]" style={{ filter: 'drop-shadow(0 0 4px hsl(155 75% 38% / 0.5))' }} />
                </Button>
                <NotificationBell />
              </div>
            </div>
          </div>
        </header>

        {/* Transfer Alert Banner - Mobile */}
        <TransferAlertBanner 
          userId={user.id} 
          onViewLead={(leadId) => {
            const lead = leads.find(l => l.id === leadId);
            if (lead) {
              setSelectedLead(lead);
              setIsDetailOpen(true);
              setActiveTab("leads");
            } else {
              // Fetch the lead if not in current list
              supabase.from('campaign_leads').select('*').eq('id', leadId).single().then(({ data }) => {
                if (data) {
                  setSelectedLead(data as Lead);
                  setIsDetailOpen(true);
                  setActiveTab("leads");
                }
              });
            }
          }}
        />

        {/* Bia (IA) passou cliente para a equipe - Mobile */}
        <AiHandoffAlertBanner
          userId={user.id}
          onOpenConversation={(conversationId, phone) => {
            setInitialPhone(phone);
            setActiveTab("chat");
          }}
        />

        {/* Client Alert Banner - Mobile */}
        <ClientAlertBanner 
          canViewContact={canViewContact}
          userId={user.id} 
          onOpenConversation={(conversationId, phone) => {
            setInitialPhone(phone);
            setActiveTab("chat");
          }}
        />

        {/* Visit Alert Banner - Mobile */}
        <VisitAlertBanner 
          canViewContact={canViewContact}
          userId={user.id} 
          onOpenConversation={(conversationId, phone) => {
            setInitialPhone(phone);
            setActiveTab("chat");
          }}
        />

        {/* A visita aconteceu? - Mobile */}
        <VisitOutcomeBanner canSeeUnit={canSeeVisitUnit} />

        {/* Questions Alert Banner - Mobile */}
        <QuestionsAlertBanner 
          canViewContact={canViewContact}
          userId={user.id} 
          onOpenConversation={(conversationId, phone) => {
            setInitialPhone(phone);
            setActiveTab("chat");
          }}
        />

        {/* Onboarding Banner - Mobile */}
        {modules.onboarding_checklist && (isAdmin || role === 'gestor') && (
          <OnboardingBanner />
        )}
        </div>

        <main className="flex-1 flex flex-col overflow-hidden min-h-0">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "chat" | "leads")} className="flex-1 flex flex-col overflow-hidden min-h-0">
            {/* Always-visible row: Chat/Leads tabs + unit selector */}
            <div className={cn("mx-3 mt-1.5 grid grid-cols-[auto,minmax(0,1fr)] items-center gap-2 min-w-0", phoneConversationOpen && activeTab === "chat" && "hidden")}>
              <TabsList className="w-auto flex-shrink-0">
                {/* O número fica ao lado do nome (antes ficava por cima e cobria "Chat"/"Leads") */}
                <TabsTrigger value="chat" className="flex items-center gap-1 text-xs px-2.5">
                  <MessageSquare className="w-4 h-4" />
                  Chat
                  {unreadCount > 0 && (
                    <AnimatedBadge 
                      value={unreadCount > 99 ? "99+" : unreadCount}
                      className="h-5 min-w-5 px-1 text-[10px] flex items-center justify-center rounded-full bg-primary text-primary-foreground"
                    />
                  )}
                </TabsTrigger>
                <TabsTrigger value="leads" className="flex items-center gap-1 text-xs px-2.5">
                  <LayoutList className="w-4 h-4" />
                  Leads
                  {newLeadsCount > 0 && (
                    <AnimatedBadge 
                      value={newLeadsCount > 99 ? "99+" : newLeadsCount}
                      className="h-5 min-w-5 px-1 text-[10px] flex items-center justify-center rounded-full bg-primary text-primary-foreground"
                    />
                  )}
                </TabsTrigger>
              </TabsList>

              {/* Unit selector - always visible next to tabs (chat tab) */}
              {chatUnitOptions.length > 1 && activeTab === "chat" && (
                <div className="flex-1 min-w-0">
                  <Select value={selectedChatUnit ?? undefined} onValueChange={handleSetSelectedChatUnit}>
                    <SelectTrigger className="h-9 w-full text-xs">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <Building2 className="w-3.5 h-3.5 shrink-0" />
                        <SelectValue placeholder="Selecionar unidade" />
                      </div>
                    </SelectTrigger>
                    <SelectContent>
                      {chatUnitOptions.map((unit) => {
                        const inst = chatInstances.find(i => i.unit === unit);
                        const instUnread = inst ? (unreadPerInstance[inst.id] || 0) : 0;
                        return (
                          <SelectItem key={unit} value={unit}>
                            <span className="flex items-center gap-2">
                              {unit}
                              {instUnread > 0 && selectedChatUnit !== unit && (
                                <span className="h-4 min-w-4 px-1 text-[9px] font-bold rounded-full bg-destructive text-destructive-foreground flex items-center justify-center">
                                  {instUnread > 99 ? "99+" : instUnread}
                                </span>
                              )}
                            </span>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Leads toolbar toggle */}
              {activeTab === "leads" && (
                <div className="flex items-center gap-2">
                  <Button
                    variant={showMetrics ? "default" : "outline"}
                    size="sm"
                    onClick={() => setShowMetrics(!showMetrics)}
                    className="gap-1 h-7 text-xs px-2"
                  >
                    <BarChart3 className="w-3.5 h-3.5" />
                    <Badge variant="secondary" className="h-4 px-1 text-[9px] bg-primary/10 text-primary border-0">
                      {leadMetrics.total}
                    </Badge>
                  </Button>
                  <Button
                    variant={showFilters ? "default" : "outline"}
                    size="sm"
                    onClick={() => setShowFilters(!showFilters)}
                    className="gap-1 h-7 text-xs px-2"
                  >
                    <Filter className="w-3.5 h-3.5" />
                    {activeFiltersCount > 0 && (
                      <Badge variant="destructive" className="h-4 px-1 text-[9px]">
                        {activeFiltersCount}
                      </Badge>
                    )}
                  </Button>
                </div>
              )}
            </div>

            {/* Collapsible leads controls */}
            {activeTab === "leads" && (
              <Collapsible open={showFilters} onOpenChange={setShowFilters}>
                <CollapsibleContent className="overflow-hidden data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down">
                  <div className="mx-3 mt-2 flex items-center gap-2 flex-wrap">
                    <div className="flex items-center gap-1 bg-border rounded-lg p-0.5">
                      <Button
                        variant={viewMode === "list" ? "default" : "ghost"}
                        size="sm"
                        onClick={() => setViewMode("list")}
                        className={`h-7 px-2.5 rounded-md text-xs ${viewMode === "list" ? "shadow-sm" : ""}`}
                      >
                        <LayoutList className="w-3.5 h-3.5 mr-1" />
                        Lista
                      </Button>
                      <Button
                        variant={viewMode === "kanban" ? "default" : "ghost"}
                        size="sm"
                        onClick={() => setViewMode("kanban")}
                        className={`h-7 px-2.5 rounded-md text-xs ${viewMode === "kanban" ? "shadow-sm" : ""}`}
                      >
                        <Columns className="w-3.5 h-3.5 mr-1" />
                        CRM
                      </Button>
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            )}

            {/* forceMount: o chat fica carregado ao ir para Leads e voltar (antes recarregava tudo) */}
            <TabsContent value="chat" forceMount className="flex-1 overflow-hidden min-h-0 mt-0 p-0 data-[state=inactive]:hidden">
              {!isLoadingUnitPerms && (
                <WhatsAppChat 
                  userId={user.id} 
                  allowedUnits={canViewAll ? ['all'] : allowedUnits} 
                  initialPhone={initialPhone}
                  initialDraft={initialDraft}
                  onPhoneHandled={handlePhoneHandled}
                  externalSelectedUnit={selectedChatUnit}
                  onLeadClosedMobile={handleLeadClosed}
                  onUnreadCountChange={fetchUnreadCount}
                  isVisible={activeTab === "chat"}
                  onConversationOpenChange={setPhoneConversationOpen}
                  onActiveUnitChange={handleSetSelectedChatUnit}
                  onInstancesLoaded={(instances) => {
                    setChatInstances(instances);
                    if (!selectedChatUnit && instances.length > 0) {
                      handleSetSelectedChatUnit(instances[0].unit);
                    }
                  }}
                />
              )}
            </TabsContent>

            <TabsContent value="leads" className="flex-1 min-h-0 mt-0 data-[state=active]:flex data-[state=active]:flex-col overflow-hidden">
              <PullToRefresh 
                onRefresh={handleRefresh} 
                className="flex-1 min-h-0 px-3 py-4"
              >
                {/* Collapsible Metrics */}
                <Collapsible open={showMetrics}>
                  <CollapsibleContent>
                    <MetricsCards metrics={leadMetrics} isLoading={isLoadingLeads} />
                  </CollapsibleContent>
                </Collapsible>

                {/* Collapsible Filters */}
                <Collapsible open={showFilters}>
                  <CollapsibleContent>
                    <LeadsFilters filters={filters} onFiltersChange={setFilters} responsaveis={responsaveis} onExport={canExportLeads ? handleExport : undefined} />
                  </CollapsibleContent>
                </Collapsible>

                {viewMode === "list" ? (
                  <LeadsTable
                    leads={leads}
                    isLoading={isLoadingLeads}
                    totalCount={totalCount}
                    responsaveis={responsaveis}
                    onLeadClick={handleLeadClick}
                    onStatusChange={changeLeadStatus}
                    onRefresh={handleRefresh}
                    canEdit={canEditLeads}
                    isAdmin={isAdmin}
                    currentPage={currentPage}
                    pageSize={pageSize}
                    onPageChange={setCurrentPage}
                    canViewContact={canViewContact}
                  />
                ) : (
                  <LeadsKanban
                    leads={leads}
                    realizadaLeads={realizadaLeads}
                    responsaveis={responsaveis}
                    onLeadClick={handleLeadClick}
                    onStatusChange={changeLeadStatus}
                    onNameUpdate={updateLeadName}
                    onDescriptionUpdate={updateLeadDescription}
                    columnTotals={kanbanColumnTotals}
                    canEdit={canEditLeads}
                    canEditName={canEditName}
                    canEditDescription={canEditDescription}
                    canDelete={canDeleteLeads}
                    onDelete={canDeleteLeads ? handleDeleteLead : undefined}
                    canViewContact={canViewContact}
                  />
                )}
              </PullToRefresh>
            </TabsContent>

          </Tabs>
        </main>

        <LeadDetailSheet lead={selectedLead} isOpen={isDetailOpen} onClose={() => setIsDetailOpen(false)} onUpdate={handleRefresh} responsaveis={responsaveis} currentUserId={user.id} currentUserName={currentUserProfile?.full_name || user.email || ""} canEdit={canEditLeads} canDelete={canDeleteLeads} onDelete={canDeleteLeads ? handleDeleteLead : undefined} canViewContact={canViewContact} onLeadClosed={handleLeadClosed} />

        <EventFormDialog
          open={festaFormOpen}
          onOpenChange={setFestaFormOpen}
          onSubmit={handleFestaSubmit}
          initialData={festaInitialData}
          units={units.filter(u => u.slug !== "trabalhe-conosco").map(u => ({ name: u.name }))}
        />
      </div>
    );
  }

  // Desktop layout with Sidebar
  return (
    <SidebarProvider defaultOpen={false}>
      <Helmet><title>Atendimento</title></Helmet>
      <div className="h-dvh flex w-full overflow-hidden">
        <AdminSidebar 
          canManageUsers={canManageUsers}
          
          isAdmin={isAdmin}
          currentUserName={currentUserProfile?.full_name || user.email || ""} 
          onRefresh={handleRefresh} 
          onLogout={handleLogout} 
        />
        
        <SidebarInset className="flex-1 flex flex-col overflow-hidden min-w-0 bg-background">
          {/* Desktop Header */}
          <header className="shrink-0 z-10 px-4 md:px-6 pt-4 md:pt-6">
            <div className="relative overflow-hidden rounded-2xl border border-border/30 bg-gradient-to-r from-card via-card to-primary/[0.03] shadow-[0_4px_24px_rgba(0,0,0,0.04)]">
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_80%_-20%,hsl(var(--primary)/0.06),transparent)]" />
              <div className="relative px-6 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <SidebarTrigger className="text-muted-foreground hover:text-foreground" />
                  <h1 className="font-display font-bold text-foreground text-lg tracking-tight shrink-0">Central de Atendimento</h1>
                  
                  {/* Quick Tab Buttons - Premium Style */}
                  <div className="flex items-center gap-1.5 ml-3 bg-border rounded-lg p-1 shrink-0">
                    <Button
                      variant={activeTab === "chat" ? "default" : "ghost"}
                      size="sm"
                      onClick={() => setActiveTab("chat")}
                      className={`relative h-8 px-4 rounded-md transition-all ${
                        activeTab === "chat" 
                          ? "shadow-sm" 
                          : "hover:bg-background/80"
                      }`}
                    >
                      <MessageSquare className="w-4 h-4 mr-1.5" />
                      Chat
                      {unreadCount > 0 && (
                        <AnimatedBadge 
                          className="ml-1.5 h-5 min-w-5 px-1.5 text-[10px] bg-primary text-primary-foreground"
                          value={unreadCount > 99 ? "99+" : unreadCount}
                        />
                      )}
                    </Button>
                    <Button
                      variant={activeTab === "leads" ? "default" : "ghost"}
                      size="sm"
                      onClick={() => setActiveTab("leads")}
                      className={`relative h-8 px-4 rounded-md transition-all ${
                        activeTab === "leads" 
                          ? "shadow-sm" 
                          : "hover:bg-background/80"
                      }`}
                    >
                      <LayoutList className="w-4 h-4 mr-1.5" />
                      Leads
                      {newLeadsCount > 0 && (
                        <AnimatedBadge 
                          className="ml-1.5 h-5 min-w-5 px-1.5 text-[10px] bg-primary text-primary-foreground"
                          value={newLeadsCount > 99 ? "99+" : newLeadsCount}
                        />
                      )}
                    </Button>
                  </div>

                  {/* Unit selector in header when on chat tab */}
                  {activeTab === "chat" && chatInstances.length > 1 && (
                    <div className="flex items-center gap-1 ml-2 bg-border rounded-lg p-1 min-w-0 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                      {chatInstances.map((inst) => (
                        <Button
                          key={inst.id}
                          variant={selectedChatUnit === inst.unit ? "default" : "ghost"}
                          size="sm"
                          onClick={() => handleSetSelectedChatUnit(inst.unit)}
                          className={`h-7 px-3 rounded-md transition-all text-xs shrink-0 whitespace-nowrap ${
                            selectedChatUnit === inst.unit ? "shadow-sm" : "hover:bg-background/80"
                          }`}
                        >
                          <Building2 className="w-3.5 h-3.5 mr-1" />
                          {inst.unit}
                          {(unreadPerInstance[inst.id] || 0) > 0 && selectedChatUnit !== inst.unit && (
                            <span className="ml-1 h-4 min-w-4 px-1 text-[9px] font-bold rounded-full bg-destructive text-destructive-foreground flex items-center justify-center">
                              {(unreadPerInstance[inst.id] || 0) > 99 ? "99+" : unreadPerInstance[inst.id]}
                            </span>
                          )}
                        </Button>
                      ))}
                    </div>
                  )}

                  {/* Lista/CRM toggle in header when on leads tab */}
                  {activeTab === "leads" && (
                    <div className="flex items-center gap-1 ml-2 bg-border rounded-lg p-1 shrink-0">
                      <Button
                        variant={viewMode === "list" ? "default" : "ghost"}
                        size="sm"
                        onClick={() => setViewMode("list")}
                        className={`h-7 px-3 rounded-md transition-all text-xs ${
                          viewMode === "list" ? "shadow-sm" : "hover:bg-background/80"
                        }`}
                      >
                        <LayoutList className="w-3.5 h-3.5 mr-1" />
                        Lista
                      </Button>
                      <Button
                        variant={viewMode === "kanban" ? "default" : "ghost"}
                        size="sm"
                        onClick={() => setViewMode("kanban")}
                        className={`h-7 px-3 rounded-md transition-all text-xs ${
                          viewMode === "kanban" ? "shadow-sm" : "hover:bg-background/80"
                        }`}
                      >
                        <Columns className="w-3.5 h-3.5 mr-1" />
                        CRM
                      </Button>
                    </div>
                  )}
                  
                  {/* Inteligência Shortcut */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate("/inteligencia")}
                    className="h-8 px-3 rounded-lg transition-all duration-200 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:text-emerald-300 dark:hover:bg-emerald-900/20 shrink-0"
                    title="Inteligência"
                  >
                    <Brain className="w-4 h-4 mr-1.5 text-[hsl(155,75%,38%)]" />
                    <span className="hidden lg:inline text-sm">Inteligência</span>
                  </Button>

                  {/* Sound Toggle - Separate */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={toggleNotifications}
                    className={`h-8 px-3 rounded-lg transition-all duration-200 shrink-0 ${
                      notificationsEnabled 
                        ? "bg-gradient-to-r from-amber-100 to-amber-50 text-amber-700 hover:from-amber-200 hover:to-amber-100 dark:from-amber-900/30 dark:to-amber-800/20 dark:text-amber-400" 
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                    }`}
                    title={notificationsEnabled ? "Notificações ativadas" : "Notificações desativadas"}
                  >
                    {notificationsEnabled ? (
                      <Bell className="w-4 h-4 mr-1.5" />
                    ) : (
                      <BellOff className="w-4 h-4 mr-1.5" />
                    )}
                    <span className="hidden lg:inline text-sm">
                      {notificationsEnabled ? "Som" : "Mudo"}
                    </span>
                  </Button>
                </div>
                
                {/* User Info Desktop */}
                <div className="flex items-center gap-3 shrink-0">
                  <OutboundQueueSheet />
                  <NotificationBell />
                  <div 
                    className="flex items-center gap-2 bg-muted/60 rounded-full pl-3 pr-1 py-1 cursor-pointer hover:bg-muted/80 transition-all"
                    onClick={() => navigate("/perfil")}
                  >
                    <span className="text-sm text-muted-foreground hidden lg:block">{currentUserProfile?.full_name || user.email}</span>
                    <Avatar className="h-8 w-8 border-2 border-primary/20">
                      <AvatarImage src={currentUserProfile?.avatar_url || undefined} />
                      <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
                        {getInitials(currentUserProfile?.full_name || user.email || "U")}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                </div>
              </div>
            </div>
          </header>

          {/* Transfer Alert Banner - Desktop */}
          <TransferAlertBanner 
            userId={user.id} 
            onViewLead={(leadId) => {
              const lead = leads.find(l => l.id === leadId);
              if (lead) {
                setSelectedLead(lead);
                setIsDetailOpen(true);
                setActiveTab("leads");
              } else {
                // Fetch the lead if not in current list
                supabase.from('campaign_leads').select('*').eq('id', leadId).single().then(({ data }) => {
                  if (data) {
                    setSelectedLead(data as Lead);
                    setIsDetailOpen(true);
                    setActiveTab("leads");
                  }
                });
              }
            }}
          />

          {/* Bia (IA) passou cliente para a equipe - Desktop */}
          <AiHandoffAlertBanner
            userId={user.id}
            onOpenConversation={(conversationId, phone) => {
              setInitialPhone(phone);
              setActiveTab("chat");
            }}
          />

          {/* Client Alert Banner - Desktop */}
          <ClientAlertBanner 
          canViewContact={canViewContact}
            userId={user.id} 
            onOpenConversation={(conversationId, phone) => {
              setInitialPhone(phone);
              setActiveTab("chat");
            }}
          />

          {/* Visit Alert Banner - Desktop */}
          <VisitAlertBanner 
          canViewContact={canViewContact}
            userId={user.id} 
            onOpenConversation={(conversationId, phone) => {
              setInitialPhone(phone);
              setActiveTab("chat");
            }}
          />

          {/* A visita aconteceu? - Desktop */}
          <VisitOutcomeBanner canSeeUnit={canSeeVisitUnit} />

          {/* Questions Alert Banner - Desktop */}
          <QuestionsAlertBanner 
          canViewContact={canViewContact}
            userId={user.id} 
            onOpenConversation={(conversationId, phone) => {
              setInitialPhone(phone);
              setActiveTab("chat");
            }}
          />

          {/* Onboarding Banner - Desktop */}
          {modules.onboarding_checklist && (isAdmin || role === 'gestor') && (
            <OnboardingBanner />
          )}

          <main className="flex-1 overflow-hidden min-h-0 p-5">
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "chat" | "leads")} className="h-full relative">
              {/* TabsList removed - buttons are now in the header */}

              {/* forceMount: o chat fica carregado ao ir para Leads e voltar (antes recarregava tudo) */}
              <TabsContent value="chat" forceMount className="absolute inset-0 mt-0 overflow-hidden data-[state=inactive]:hidden">
                <div className="h-full">
                  {!isLoadingUnitPerms && (
                    <WhatsAppChat 
                      userId={user.id} 
                      allowedUnits={canViewAll ? ['all'] : allowedUnits}
                      initialPhone={initialPhone}
                      initialDraft={initialDraft}
                      onPhoneHandled={handlePhoneHandled}
                      externalSelectedUnit={selectedChatUnit}
                      onLeadClosedMobile={handleLeadClosed}
                      onUnreadCountChange={fetchUnreadCount}
                      isVisible={activeTab === "chat"}
                      onActiveUnitChange={handleSetSelectedChatUnit}
                      onInstancesLoaded={(instances) => {
                        setChatInstances(instances);
                        if (!selectedChatUnit && instances.length > 0) {
                          handleSetSelectedChatUnit(instances[0].unit);
                        }
                      }}
                    />
                  )}
                </div>
              </TabsContent>

              <TabsContent value="leads" className="absolute inset-0 mt-0 overflow-hidden flex flex-col data-[state=inactive]:hidden">
                {/* Collapsible toolbar for Metrics and Filters */}
                <div className="shrink-0 flex items-center gap-2 mb-3 flex-wrap">
                  {/* Metrics toggle button */}
                  <Button
                    variant={showMetrics ? "default" : "outline"}
                    size="sm"
                    onClick={() => setShowMetrics(!showMetrics)}
                    className="gap-1.5 h-8"
                  >
                    <BarChart3 className="w-4 h-4" />
                    Métricas
                    <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px] bg-primary/10 text-primary border-0">
                      {leadMetrics.total}
                    </Badge>
                    <Badge variant="secondary" className="h-5 px-1.5 text-[10px] bg-amber-500/10 text-amber-600 border-0">
                      +{leadMetrics.novo}
                    </Badge>
                    <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showMetrics ? 'rotate-180' : ''}`} />
                  </Button>

                  {/* Filters toggle button */}
                  <Button
                    variant={showFilters ? "default" : "outline"}
                    size="sm"
                    onClick={() => setShowFilters(!showFilters)}
                    className="gap-1.5 h-8"
                  >
                    <Filter className="w-4 h-4" />
                    Filtros
                    {activeFiltersCount > 0 && (
                      <Badge variant="destructive" className="ml-1 h-5 px-1.5 text-[10px]">
                        {activeFiltersCount}
                      </Badge>
                    )}
                    <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
                  </Button>
                </div>

                {/* Collapsible Metrics */}
                <Collapsible open={showMetrics} className="shrink-0">
                  <CollapsibleContent>
                    <MetricsCards metrics={leadMetrics} isLoading={isLoadingLeads} />
                  </CollapsibleContent>
                </Collapsible>

                {/* Collapsible Filters */}
                <Collapsible open={showFilters} className="shrink-0">
                  <CollapsibleContent>
                    <LeadsFilters filters={filters} onFiltersChange={setFilters} responsaveis={responsaveis} onExport={canExportLeads ? handleExport : undefined} />
                  </CollapsibleContent>
                </Collapsible>

                {/* Leads content - fills remaining space */}
                <div className="flex-1 min-h-0 flex flex-col">
                {viewMode === "list" ? (
                  <LeadsTable
                    leads={leads}
                    isLoading={isLoadingLeads}
                    totalCount={totalCount}
                    responsaveis={responsaveis}
                    onLeadClick={handleLeadClick}
                    onStatusChange={changeLeadStatus}
                    onRefresh={handleRefresh}
                    canEdit={canEditLeads}
                    isAdmin={isAdmin}
                    currentPage={currentPage}
                    pageSize={pageSize}
                    onPageChange={setCurrentPage}
                    canViewContact={canViewContact}
                  />
                ) : (
                  <LeadsKanban
                    leads={leads}
                    realizadaLeads={realizadaLeads}
                    responsaveis={responsaveis}
                    onLeadClick={handleLeadClick}
                    onStatusChange={changeLeadStatus}
                    onNameUpdate={updateLeadName}
                    onDescriptionUpdate={updateLeadDescription}
                    columnTotals={kanbanColumnTotals}
                    canEdit={canEditLeads}
                    canEditName={canEditName}
                    canEditDescription={canEditDescription}
                    canDelete={canDeleteLeads}
                    onDelete={canDeleteLeads ? handleDeleteLead : undefined}
                    canViewContact={canViewContact}
                  />
                )}
                </div>
              </TabsContent>

            </Tabs>
          </main>

          <LeadDetailSheet lead={selectedLead} isOpen={isDetailOpen} onClose={() => setIsDetailOpen(false)} onUpdate={handleRefresh} responsaveis={responsaveis} currentUserId={user.id} currentUserName={currentUserProfile?.full_name || user.email || ""} canEdit={canEditLeads} canDelete={canDeleteLeads} onDelete={canDeleteLeads ? handleDeleteLead : undefined} canViewContact={canViewContact} onLeadClosed={handleLeadClosed} />

          <EventFormDialog
            open={festaFormOpen}
            onOpenChange={setFestaFormOpen}
            onSubmit={handleFestaSubmit}
            initialData={festaInitialData}
            units={units.filter(u => u.slug !== "trabalhe-conosco").map(u => ({ name: u.name }))}
          />
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
