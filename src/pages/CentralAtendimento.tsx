import { useState, useEffect, useCallback } from "react";
import { Helmet } from "react-helmet-async";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { isHubDomain } from "@/hooks/useDomainDetection";
import { User, Session } from "@supabase/supabase-js";
import { useUserRole } from "@/hooks/useUserRole";
import { useUnitPermissions } from "@/hooks/useUnitPermissions";
import { usePermissions } from "@/hooks/usePermissions";
import { useLeadNotifications } from "@/hooks/useLeadNotifications";
import { useChatNotificationToggle } from "@/hooks/useChatNotificationToggle";
import { useUnreadCountRealtime, useLeadsRealtime } from "@/hooks/useRealtimeOptimized";
import { Lead, LeadStatus, UserWithRole, Profile, AppRole } from "@/types/crm";
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
import { QuestionsAlertBanner } from "@/components/admin/QuestionsAlertBanner";
import { WhatsAppChat } from "@/components/whatsapp/WhatsAppChat";

import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AnimatedBadge } from "@/components/ui/animated-badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { PullToRefresh } from "@/components/ui/pull-to-refresh";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent } from "@/components/ui/collapsible";
import { LayoutList, Columns, Menu, Bell, BellOff, MessageSquare, BarChart3, Filter, ChevronDown, Building2, Brain } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import logoCastelo from "@/assets/logo-castelo.png";

export interface LeadFilters {
  campaign: string;
  unit: string;
  status: string;
  responsavel: string;
  month: string;
  startDate: Date | undefined;
  endDate: Date | undefined;
  search: string;
  hasScheduledVisit: boolean;
}

export default function CentralAtendimento() {
  const navigate = useNavigate();

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
    startDate: undefined,
    endDate: undefined,
    search: "",
    hasScheduledVisit: false,
  });
  const [refreshKey, setRefreshKey] = useState(0);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [isLoadingLeads, setIsLoadingLeads] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 50;
  const [leadMetrics, setLeadMetrics] = useState<LeadMetrics>({ total: 0, today: 0, novo: 0, em_contato: 0, fechado: 0, perdido: 0 });
  const [responsaveis, setResponsaveis] = useState<UserWithRole[]>([]);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [currentUserProfile, setCurrentUserProfile] = useState<Profile | null>(null);
  const [viewMode, setViewMode] = useState<"list" | "kanban">("list");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"chat" | "leads">("chat");
  const [unreadCount, setUnreadCount] = useState(0);
  const [newLeadsCount, setNewLeadsCount] = useState(0);
  const [showMetrics, setShowMetrics] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [initialPhone, setInitialPhone] = useState<string | null>(null);
  const [initialDraft, setInitialDraft] = useState<string | null>(null);
  const [chatInstances, setChatInstances] = useState<{ id: string; unit: string | null; status: string | null }[]>([]);
  const [selectedChatUnit, setSelectedChatUnit] = useState<string | null>(null);

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

  const { role, isLoading: isLoadingRole, isAdmin, canEdit, canManageUsers } = useUserRole(user?.id);
  const { allowedUnits, canViewAll, isLoading: isLoadingUnitPerms } = useUnitPermissions(user?.id);
  const { hasPermission } = usePermissions(user?.id);
  const canEditName = isAdmin || hasPermission('leads.edit.name');
  const canEditDescription = isAdmin || hasPermission('leads.edit.description');
  
  const canExportLeads = isAdmin || hasPermission('leads.export');
  const canDeleteLeads = isAdmin || hasPermission('leads.delete');
  const canAssignLeads = isAdmin || hasPermission('leads.assign');
  const canEditLeads = isAdmin || canEdit || hasPermission('leads.edit');
  
  // Sound notification for new leads
  useLeadNotifications();
  
  // Chat notifications toggle
  const { notificationsEnabled, toggleNotifications } = useChatNotificationToggle();

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

  // Fetch leads
  useEffect(() => {
    const fetchLeads = async () => {
      if (!role || isLoadingUnitPerms) return;

      setIsLoadingLeads(true);

      const from = (currentPage - 1) * pageSize;
      const to = from + pageSize - 1;

      let query = supabase
        .from("campaign_leads")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false })
        .range(from, to);

      // Apply unit permission filter (before user-selected filters)
      if (!canViewAll && allowedUnits.length > 0 && !allowedUnits.includes('all')) {
        const unitsFilter = [...allowedUnits, "As duas"];
        query = query.in("unit", unitsFilter);
      } else if (!canViewAll && allowedUnits.length === 0) {
        // No unit permission granted - return empty
        setLeads([]);
        setTotalCount(0);
        setIsLoadingLeads(false);
        return;
      }

      // Apply user-selected filters
      if (filters.unit && filters.unit !== "all") {
        query = query.eq("unit", filters.unit);
      }

      if (filters.campaign && filters.campaign !== "all") {
        query = query.eq("campaign_id", filters.campaign);
      }

      if (filters.status && filters.status !== "all") {
        query = query.eq("status", filters.status as LeadStatus);
      }

      if (filters.responsavel && filters.responsavel !== "all") {
        if (filters.responsavel === "unassigned") {
          query = query.is("responsavel_id", null);
        } else {
          query = query.eq("responsavel_id", filters.responsavel);
        }
      }

      if (filters.month && filters.month !== "all") {
        query = query.eq("month", filters.month);
      }

      if (filters.startDate) {
        query = query.gte("created_at", filters.startDate.toISOString());
      }

      if (filters.endDate) {
        const endOfDay = new Date(filters.endDate);
        endOfDay.setHours(23, 59, 59, 999);
        query = query.lte("created_at", endOfDay.toISOString());
      }

      if (filters.search) {
        query = query.or(
          `name.ilike.%${filters.search}%,whatsapp.ilike.%${filters.search}%`
        );
      }

      const { data, count, error } = await query;

      if (error) {
        console.error("Erro ao buscar leads:", error);
      } else {
        const leadsData = (data || []) as Lead[];
        
        // Fetch has_scheduled_visit from wapi_conversations and has_follow_up from lead_history
        if (leadsData.length > 0) {
          const leadIds = leadsData.map(l => l.id);
          
          // Parallel fetch for visit, follow-up 1 and follow-up 2 data
          const [convResult, historyResult, historyResult2, returnResult] = await Promise.all([
            supabase
              .from("wapi_conversations")
              .select("lead_id, has_scheduled_visit")
              .in("lead_id", leadIds)
              .eq("has_scheduled_visit", true),
            supabase
              .from("lead_history")
              .select("lead_id")
              .in("lead_id", leadIds)
              .eq("action", "Follow-up automático enviado"),
            supabase
              .from("lead_history")
              .select("lead_id")
              .in("lead_id", leadIds)
              .eq("action", "Follow-up #2 automático enviado"),
            supabase
              .from("lead_history")
              .select("lead_id")
              .in("lead_id", leadIds)
              .eq("action", "Lead retornou pela Landing Page")
          ]);
          
          const scheduledVisitLeadIds = new Set((convResult.data || []).map(c => c.lead_id));
          const followUpLeadIds = new Set((historyResult.data || []).map(h => h.lead_id));
          const followUp2LeadIds = new Set((historyResult2.data || []).map(h => h.lead_id));
          const returnLeadIds = new Set((returnResult.data || []).map(h => h.lead_id));
          
          let leadsWithExtraInfo = leadsData.map(lead => ({
            ...lead,
            has_scheduled_visit: scheduledVisitLeadIds.has(lead.id),
            has_follow_up: followUpLeadIds.has(lead.id),
            has_follow_up_2: followUp2LeadIds.has(lead.id),
            has_return: returnLeadIds.has(lead.id)
          }));
          
          // Apply scheduled visit filter if enabled
          if (filters.hasScheduledVisit) {
            leadsWithExtraInfo = leadsWithExtraInfo.filter(lead => lead.has_scheduled_visit);
          }
          
          setLeads(leadsWithExtraInfo);
          setTotalCount(filters.hasScheduledVisit ? leadsWithExtraInfo.length : (count || 0));
        } else {
          setLeads(leadsData);
          setTotalCount(count || 0);
        }
      }

      setIsLoadingLeads(false);
    };

    fetchLeads();
  }, [filters, refreshKey, role, canViewAll, allowedUnits, isLoadingUnitPerms, currentPage]);

  // Fetch server-side metrics (respects active filters including unit)
  useEffect(() => {
    const fetchMetrics = async () => {
      if (!role || isLoadingUnitPerms) return;

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayISO = today.toISOString();

      const buildQuery = (statusFilter?: string, dateFilter?: string) => {
        let q = supabase.from("campaign_leads").select("id", { count: "exact", head: true });
        // Apply unit permission filter
        if (!canViewAll && allowedUnits.length > 0 && !allowedUnits.includes('all')) {
          const unitsFilter = [...allowedUnits, "As duas"];
          q = q.in("unit", unitsFilter);
        }
        // Apply user-selected unit filter
        if (filters.unit && filters.unit !== "all") {
          q = q.eq("unit", filters.unit);
        }
        // Apply other active filters
        if (filters.campaign && filters.campaign !== "all") {
          q = q.eq("campaign_id", filters.campaign);
        }
        if (filters.responsavel && filters.responsavel !== "all") {
          if (filters.responsavel === "unassigned") {
            q = q.is("responsavel_id", null);
          } else {
            q = q.eq("responsavel_id", filters.responsavel);
          }
        }
        if (filters.month && filters.month !== "all") {
          q = q.eq("month", filters.month);
        }
        if (filters.startDate) {
          q = q.gte("created_at", filters.startDate.toISOString());
        }
        if (filters.endDate) {
          const endOfDay = new Date(filters.endDate);
          endOfDay.setHours(23, 59, 59, 999);
          q = q.lte("created_at", endOfDay.toISOString());
        }
        if (filters.search) {
          q = q.or(`name.ilike.%${filters.search}%,whatsapp.ilike.%${filters.search}%`);
        }
        if (statusFilter) q = q.eq("status", statusFilter as LeadStatus);
        if (dateFilter) q = q.gte("created_at", dateFilter);
        return q;
      };

      const [totalRes, todayRes, novoRes, contatoRes, fechadoRes, perdidoRes] = await Promise.all([
        buildQuery(),
        buildQuery(undefined, todayISO),
        buildQuery("novo"),
        buildQuery("em_contato"),
        buildQuery("fechado"),
        buildQuery("perdido"),
      ]);

      setLeadMetrics({
        total: totalRes.count || 0,
        today: todayRes.count || 0,
        novo: novoRes.count || 0,
        em_contato: contatoRes.count || 0,
        fechado: fechadoRes.count || 0,
        perdido: perdidoRes.count || 0,
      });
    };

    fetchMetrics();
  }, [role, canViewAll, allowedUnits, isLoadingUnitPerms, refreshKey, filters]);

  useEffect(() => {
    const leadId = searchParams.get('lead');
    if (leadId && leads.length > 0 && !isLoadingLeads) {
      const lead = leads.find(l => l.id === leadId);
      if (lead) {
        setSelectedLead(lead);
        setIsDetailOpen(true);
        setActiveTab("leads");
        // Clear the URL parameter after opening
        searchParams.delete('lead');
        setSearchParams(searchParams, { replace: true });
      } else {
        // Lead not in current view - fetch it directly
        supabase
          .from('campaign_leads')
          .select('*')
          .eq('id', leadId)
          .single()
          .then(({ data }) => {
            if (data) {
              setSelectedLead(data as Lead);
              setIsDetailOpen(true);
              setActiveTab("leads");
            }
            // Clear the URL parameter
            searchParams.delete('lead');
            setSearchParams(searchParams, { replace: true });
          });
      }
    }
  }, [leads, isLoadingLeads, searchParams, setSearchParams]);

  // Optimized: Fetch unread count with debounced realtime
  const fetchUnreadCount = useCallback(async () => {
    const { data } = await supabase
      .from("wapi_conversations")
      .select("unread_count"); // Only fetch unread_count column
    
    if (data) {
      const total = data.reduce((sum, conv) => sum + (conv.unread_count || 0), 0);
      setUnreadCount(total);
    }
  }, []);

  useEffect(() => {
    fetchUnreadCount();
  }, [fetchUnreadCount]);

  // Use optimized realtime hook with debounce (1s)
  useUnreadCountRealtime(fetchUnreadCount, { debounceMs: 1000 });

  // Optimized: Fetch new leads count
  const fetchNewLeadsCount = useCallback(async () => {
    const { count } = await supabase
      .from("campaign_leads")
      .select("id", { count: "exact", head: true }) // Only count, don't fetch data
      .eq("status", "novo");
    
    setNewLeadsCount(count || 0);
  }, []);

  useEffect(() => {
    fetchNewLeadsCount();
  }, [fetchNewLeadsCount]);

  // Use optimized realtime hook for leads with debounced callbacks
  const handleLeadInsert = useCallback((payload: unknown) => {
    const newLead = payload as Lead;
    console.log('Novo lead recebido em tempo real:', newLead);
    fetchNewLeadsCount();
    setLeads((prev) => {
      if (prev.some(l => l.id === newLead.id)) return prev;
      return [newLead, ...prev];
    });
    setTotalCount((prev) => prev + 1);
  }, [fetchNewLeadsCount]);

  const handleLeadUpdate = useCallback((payload: unknown) => {
    const updatedLead = payload as Lead;
    fetchNewLeadsCount();
    setLeads((prev) =>
      prev.map((lead) => lead.id === updatedLead.id ? updatedLead : lead)
    );
  }, [fetchNewLeadsCount]);

  const handleLeadDelete = useCallback((payload: unknown) => {
    const deletedLead = payload as { id: string };
    fetchNewLeadsCount();
    setLeads((prev) => prev.filter((lead) => lead.id !== deletedLead.id));
    setTotalCount((prev) => Math.max(0, prev - 1));
  }, [fetchNewLeadsCount]);

  useLeadsRealtime(handleLeadInsert, handleLeadUpdate, handleLeadDelete, { debounceMs: 300 });

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast({
      title: "Logout realizado",
      description: "Você saiu da sua conta.",
    });
    navigate("/auth");
  };

  const handleRefresh = () => {
    setRefreshKey((prev) => prev + 1);
  };

  const handleLeadClick = (lead: Lead) => {
    setSelectedLead(lead);
    setIsDetailOpen(true);
  };

  const handleStatusChange = (leadId: string, newStatus: LeadStatus) => {
    setLeads((prev) =>
      prev.map((lead) =>
        lead.id === leadId ? { ...lead, status: newStatus } : lead
      )
    );
  };

  const handleExport = () => {
    exportLeadsToCSV({ leads, responsaveis });
    toast({
      title: "Exportação concluída",
      description: `${leads.length} leads exportados para CSV.`,
    });
  };

  const handleDeleteLead = async (leadId: string) => {
    try {
      // First delete related history records
      await supabase.from("lead_history").delete().eq("lead_id", leadId);
      
      // Then delete the lead
      const { error } = await supabase.from("campaign_leads").delete().eq("id", leadId);
      if (error) throw error;
      
      // Update local state
      setLeads((prev) => prev.filter((l) => l.id !== leadId));
      
      toast({
        title: "Lead excluído",
        description: "O lead foi removido permanentemente.",
      });
    } catch (error) {
      console.error("Error deleting lead:", error);
      toast({
        title: "Erro ao excluir lead",
        description: "Não foi possível excluir o lead. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  if (isLoading || isLoadingRole || isLoadingUnitPerms) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user || !role) {
    return null;
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
                  <img src={logoCastelo} alt="Castelo da Diversão" className="h-8 w-auto shrink-0" />
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

        {/* Client Alert Banner - Mobile */}
        <ClientAlertBanner 
          userId={user.id} 
          onOpenConversation={(conversationId, phone) => {
            setInitialPhone(phone);
            setActiveTab("chat");
          }}
        />

        {/* Visit Alert Banner - Mobile */}
        <VisitAlertBanner 
          userId={user.id} 
          onOpenConversation={(conversationId, phone) => {
            setInitialPhone(phone);
            setActiveTab("chat");
          }}
        />

        {/* Questions Alert Banner - Mobile */}
        <QuestionsAlertBanner 
          userId={user.id} 
          onOpenConversation={(conversationId, phone) => {
            setInitialPhone(phone);
            setActiveTab("chat");
          }}
        />

        <main className="flex-1 flex flex-col overflow-hidden min-h-0">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "chat" | "leads")} className="flex-1 flex flex-col overflow-hidden min-h-0">
            <TabsList className="mx-3 mt-3 grid grid-cols-2">
              <TabsTrigger value="chat" className="flex items-center gap-1.5 text-xs relative">
                <MessageSquare className="w-4 h-4" />
                Chat
                {unreadCount > 0 && (
                  <AnimatedBadge 
                    value={unreadCount > 99 ? "99+" : unreadCount}
                    variant="destructive" 
                    className="absolute -top-1.5 -right-1.5 h-5 min-w-5 px-1 text-[10px] flex items-center justify-center rounded-full"
                  />
                )}
              </TabsTrigger>
              <TabsTrigger value="leads" className="flex items-center gap-1.5 text-xs relative">
                <LayoutList className="w-4 h-4" />
                Leads
                {newLeadsCount > 0 && (
                  <AnimatedBadge 
                    value={newLeadsCount > 99 ? "99+" : newLeadsCount}
                    className="absolute -top-1.5 -right-1.5 h-5 min-w-5 px-1 text-[10px] flex items-center justify-center rounded-full bg-primary text-primary-foreground"
                  />
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="chat" className="flex-1 overflow-hidden min-h-0 mt-0 p-0">
              {!isLoadingUnitPerms && (
                <WhatsAppChat 
                  userId={user.id} 
                  allowedUnits={canViewAll ? ['all'] : allowedUnits} 
                  initialPhone={initialPhone}
                  initialDraft={initialDraft}
                  onPhoneHandled={handlePhoneHandled}
                />
              )}
            </TabsContent>

            <TabsContent value="leads" className="flex-1 min-h-0 mt-0 data-[state=active]:flex data-[state=active]:flex-col overflow-hidden">
              <PullToRefresh 
                onRefresh={handleRefresh} 
                className="flex-1 min-h-0 px-3 py-4"
              >
                {/* Compact toolbar: View mode + Metrics + Filters */}
                <div className="flex items-center gap-2 mb-3 flex-wrap">
                  {/* View mode toggle */}
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

                  {/* Metrics toggle */}
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
                    <ChevronDown className={`w-3 h-3 transition-transform ${showMetrics ? 'rotate-180' : ''}`} />
                  </Button>

                  {/* Filters toggle */}
                  <Button
                    variant={showFilters ? "default" : "outline"}
                    size="sm"
                    onClick={() => setShowFilters(!showFilters)}
                    className="gap-1 h-7 text-xs px-2"
                  >
                    <Filter className="w-3.5 h-3.5" />
                    Filtros
                    {activeFiltersCount > 0 && (
                      <Badge variant="destructive" className="h-4 px-1 text-[9px]">
                        {activeFiltersCount}
                      </Badge>
                    )}
                    <ChevronDown className={`w-3 h-3 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
                  </Button>
                </div>

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
                    onStatusChange={handleStatusChange}
                    onRefresh={handleRefresh}
                    canEdit={canEditLeads}
                    isAdmin={isAdmin}
                    currentUserId={user.id}
                    currentUserName={currentUserProfile?.full_name || user.email || ""}
                    currentPage={currentPage}
                    pageSize={pageSize}
                    onPageChange={setCurrentPage}
                  />
                ) : (
                  <LeadsKanban
                    leads={leads}
                    responsaveis={responsaveis}
                    onLeadClick={handleLeadClick}
                    onStatusChange={async (leadId, newStatus) => {
                      try {
                        const lead = leads.find((l) => l.id === leadId);
                        if (!lead) return;
                        await supabase.from("lead_history").insert({ lead_id: leadId, user_id: user.id, user_name: currentUserProfile?.full_name || user.email, action: "Alteração de status", old_value: lead.status, new_value: newStatus });
                        const { error } = await supabase.from("campaign_leads").update({ status: newStatus }).eq("id", leadId);
                        if (error) throw error;
                        handleStatusChange(leadId, newStatus);
                      } catch (error) {
                        console.error("Error updating status:", error);
                        toast({ title: "Erro ao atualizar status", description: "Tente novamente.", variant: "destructive" });
                      }
                    }}
                    onNameUpdate={async (leadId, newName) => {
                      const lead = leads.find((l) => l.id === leadId);
                      if (!lead) return;
                      await supabase.from("lead_history").insert({ lead_id: leadId, user_id: user.id, user_name: currentUserProfile?.full_name || user.email, action: "Alteração de nome", old_value: lead.name, new_value: newName });
                      const { error } = await supabase.from("campaign_leads").update({ name: newName }).eq("id", leadId);
                      if (error) throw error;
                      await supabase.from("wapi_conversations").update({ contact_name: newName }).eq("lead_id", leadId);
                      setLeads((prev) => prev.map((l) => l.id === leadId ? { ...l, name: newName } : l));
                      toast({ title: "Nome atualizado", description: `O nome foi alterado para "${newName}".` });
                    }}
                    onDescriptionUpdate={async (leadId, newDescription) => {
                      const lead = leads.find((l) => l.id === leadId);
                      if (!lead) return;
                      await supabase.from("lead_history").insert({ lead_id: leadId, user_id: user.id, user_name: currentUserProfile?.full_name || user.email, action: "Alteração de observações", old_value: lead.observacoes || "", new_value: newDescription });
                      const { error } = await supabase.from("campaign_leads").update({ observacoes: newDescription }).eq("id", leadId);
                      if (error) throw error;
                      setLeads((prev) => prev.map((l) => l.id === leadId ? { ...l, observacoes: newDescription } : l));
                      toast({ title: "Observação atualizada", description: "A observação foi salva com sucesso." });
                    }}
                    canEdit={canEditLeads}
                    canEditName={canEditName}
                    canEditDescription={canEditDescription}
                    canDelete={canDeleteLeads}
                    onDelete={canDeleteLeads ? handleDeleteLead : undefined}
                  />
                )}
              </PullToRefresh>
            </TabsContent>

          </Tabs>
        </main>

        <LeadDetailSheet lead={selectedLead} isOpen={isDetailOpen} onClose={() => setIsDetailOpen(false)} onUpdate={handleRefresh} responsaveis={responsaveis} currentUserId={user.id} currentUserName={currentUserProfile?.full_name || user.email || ""} canEdit={canEditLeads} canDelete={canDeleteLeads} onDelete={canDeleteLeads ? handleDeleteLead : undefined} />
      </div>
    );
  }

  // Desktop layout with Sidebar
  return (
    <SidebarProvider>
      <Helmet><title>Atendimento</title></Helmet>
      <div className="h-dvh flex w-full overflow-hidden">
        <AdminSidebar 
          canManageUsers={canManageUsers}
          
          isAdmin={isAdmin}
          currentUserName={currentUserProfile?.full_name || user.email || ""} 
          onRefresh={handleRefresh} 
          onLogout={handleLogout} 
        />
        
        <SidebarInset className="flex-1 flex flex-col overflow-hidden min-w-0 bg-gradient-to-br from-background to-muted/30">
          {/* Desktop Header - Premium Glass Effect */}
          <header className="bg-card/80 backdrop-blur-sm border-b border-border/60 shrink-0 z-10 shadow-subtle">
            <div className="px-4 py-2.5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <SidebarTrigger className="text-muted-foreground hover:text-foreground" />
                <h1 className="font-display font-bold text-foreground">Central de Atendimento</h1>
                
                {/* Quick Tab Buttons - Premium Style */}
                <div className="flex items-center gap-1.5 ml-3 bg-border rounded-lg p-1">
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
                        variant="destructive" 
                        className="ml-1.5 h-5 min-w-5 px-1.5 text-[10px]"
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
                  <div className="flex items-center gap-1 ml-2 bg-border rounded-lg p-1">
                    {chatInstances.map((inst) => (
                      <Button
                        key={inst.id}
                        variant={selectedChatUnit === inst.unit ? "default" : "ghost"}
                        size="sm"
                        onClick={() => setSelectedChatUnit(inst.unit)}
                        className={`h-7 px-3 rounded-md transition-all text-xs ${
                          selectedChatUnit === inst.unit ? "shadow-sm" : "hover:bg-background/80"
                        }`}
                      >
                        <Building2 className="w-3.5 h-3.5 mr-1" />
                        {inst.unit}
                      </Button>
                    ))}
                  </div>
                )}

                {/* Lista/CRM toggle in header when on leads tab */}
                {activeTab === "leads" && (
                  <div className="flex items-center gap-1 ml-2 bg-border rounded-lg p-1">
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
                  className="h-8 px-3 rounded-lg transition-all duration-200 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:text-emerald-300 dark:hover:bg-emerald-900/20"
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
                  className={`h-8 px-3 rounded-lg transition-all duration-200 ${
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
              
              {/* User Info Desktop - Premium Style */}
              <div className="flex items-center gap-3">
                <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => navigate("/inteligencia")}>
                  <Brain className="w-5 h-5 text-[hsl(155,75%,38%)]" style={{ filter: 'drop-shadow(0 0 4px hsl(155 75% 38% / 0.5))' }} />
                </Button>
                <NotificationBell />
                <div className="flex items-center gap-2 bg-border rounded-full pl-3 pr-1 py-1">
                  <span className="text-sm text-muted-foreground hidden lg:block">{currentUserProfile?.full_name || user.email}</span>
                  <Avatar 
                    className="h-8 w-8 border-2 border-primary/20 cursor-pointer hover:border-primary/40 transition-all hover:scale-105" 
                    onClick={() => navigate("/configuracoes")}
                  >
                    <AvatarImage src={currentUserProfile?.avatar_url || undefined} />
                    <AvatarFallback className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground text-sm font-medium">
                      {getInitials(currentUserProfile?.full_name || user.email || "U")}
                    </AvatarFallback>
                  </Avatar>
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

          {/* Client Alert Banner - Desktop */}
          <ClientAlertBanner 
            userId={user.id} 
            onOpenConversation={(conversationId, phone) => {
              setInitialPhone(phone);
              setActiveTab("chat");
            }}
          />

          {/* Visit Alert Banner - Desktop */}
          <VisitAlertBanner 
            userId={user.id} 
            onOpenConversation={(conversationId, phone) => {
              setInitialPhone(phone);
              setActiveTab("chat");
            }}
          />

          {/* Questions Alert Banner - Desktop */}
          <QuestionsAlertBanner 
            userId={user.id} 
            onOpenConversation={(conversationId, phone) => {
              setInitialPhone(phone);
              setActiveTab("chat");
            }}
          />

          <main className="flex-1 overflow-hidden min-h-0 p-4">
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "chat" | "leads")} className="h-full relative">
              {/* TabsList removed - buttons are now in the header */}

              <TabsContent value="chat" className="absolute inset-0 mt-0 overflow-hidden data-[state=inactive]:hidden">
                <div className="h-full">
                  {!isLoadingUnitPerms && (
                    <WhatsAppChat 
                      userId={user.id} 
                      allowedUnits={canViewAll ? ['all'] : allowedUnits}
                      initialPhone={initialPhone}
                      initialDraft={initialDraft}
                      onPhoneHandled={handlePhoneHandled}
                      externalSelectedUnit={selectedChatUnit}
                      onInstancesLoaded={(instances) => {
                        setChatInstances(instances);
                        if (!selectedChatUnit && instances.length > 0) {
                          setSelectedChatUnit(instances[0].unit);
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
                    onStatusChange={handleStatusChange}
                    onRefresh={handleRefresh}
                    canEdit={canEditLeads}
                    isAdmin={isAdmin}
                    currentUserId={user.id}
                    currentUserName={currentUserProfile?.full_name || user.email || ""}
                    currentPage={currentPage}
                    pageSize={pageSize}
                    onPageChange={setCurrentPage}
                  />
                ) : (
                  <LeadsKanban
                    leads={leads}
                    responsaveis={responsaveis}
                    onLeadClick={handleLeadClick}
                    onStatusChange={async (leadId, newStatus) => {
                      try {
                        const lead = leads.find((l) => l.id === leadId);
                        if (!lead) return;
                        await supabase.from("lead_history").insert({ lead_id: leadId, user_id: user.id, user_name: currentUserProfile?.full_name || user.email, action: "Alteração de status", old_value: lead.status, new_value: newStatus });
                        const { error } = await supabase.from("campaign_leads").update({ status: newStatus }).eq("id", leadId);
                        if (error) throw error;
                        handleStatusChange(leadId, newStatus);
                      } catch (error) {
                        console.error("Error updating status:", error);
                        toast({ title: "Erro ao atualizar status", description: "Tente novamente.", variant: "destructive" });
                      }
                    }}
                    onNameUpdate={async (leadId, newName) => {
                      const lead = leads.find((l) => l.id === leadId);
                      if (!lead) return;
                      await supabase.from("lead_history").insert({ lead_id: leadId, user_id: user.id, user_name: currentUserProfile?.full_name || user.email, action: "Alteração de nome", old_value: lead.name, new_value: newName });
                      const { error } = await supabase.from("campaign_leads").update({ name: newName }).eq("id", leadId);
                      if (error) throw error;
                      await supabase.from("wapi_conversations").update({ contact_name: newName }).eq("lead_id", leadId);
                      setLeads((prev) => prev.map((l) => l.id === leadId ? { ...l, name: newName } : l));
                      toast({ title: "Nome atualizado", description: `O nome foi alterado para "${newName}".` });
                    }}
                    onDescriptionUpdate={async (leadId, newDescription) => {
                      const lead = leads.find((l) => l.id === leadId);
                      if (!lead) return;
                      await supabase.from("lead_history").insert({ lead_id: leadId, user_id: user.id, user_name: currentUserProfile?.full_name || user.email, action: "Alteração de observações", old_value: lead.observacoes || "", new_value: newDescription });
                      const { error } = await supabase.from("campaign_leads").update({ observacoes: newDescription }).eq("id", leadId);
                      if (error) throw error;
                      setLeads((prev) => prev.map((l) => l.id === leadId ? { ...l, observacoes: newDescription } : l));
                      toast({ title: "Observação atualizada", description: "A observação foi salva com sucesso." });
                    }}
                    canEdit={canEditLeads}
                    canEditName={canEditName}
                    canEditDescription={canEditDescription}
                    canDelete={canDeleteLeads}
                    onDelete={canDeleteLeads ? handleDeleteLead : undefined}
                  />
                )}
                </div>
              </TabsContent>

            </Tabs>
          </main>

          <LeadDetailSheet lead={selectedLead} isOpen={isDetailOpen} onClose={() => setIsDetailOpen(false)} onUpdate={handleRefresh} responsaveis={responsaveis} currentUserId={user.id} currentUserName={currentUserProfile?.full_name || user.email || ""} canEdit={canEditLeads} canDelete={canDeleteLeads} onDelete={canDeleteLeads ? handleDeleteLead : undefined} />
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
