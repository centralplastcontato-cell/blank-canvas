import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User, Session } from "@supabase/supabase-js";
import { useUserRole } from "@/hooks/useUserRole";
import { useUnitPermissions } from "@/hooks/useUnitPermissions";
import { usePermissions } from "@/hooks/usePermissions";
import { useLeadNotifications } from "@/hooks/useLeadNotifications";
import { Lead, LeadStatus, UserWithRole, Profile, AppRole } from "@/types/crm";
import { LeadsTable } from "@/components/admin/LeadsTable";
import { LeadsFilters } from "@/components/admin/LeadsFilters";
import { UnitKanbanTabs } from "@/components/admin/UnitKanbanTabs";
import { LeadDetailSheet } from "@/components/admin/LeadDetailSheet";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { TransferLeadDialog } from "@/components/admin/TransferLeadDialog";
import { exportLeadsToCSV } from "@/components/admin/exportLeads";
import { MetricsCards, LeadMetrics } from "@/components/admin/MetricsCards";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { LogOut, RefreshCw, LayoutList, Columns, Menu, Users as UsersIcon, MessageSquare } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import logoCastelo from "@/assets/logo-castelo.png";
import { useIsMobile } from "@/hooks/use-mobile";

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

export default function Admin() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
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
  const [isTransferOpen, setIsTransferOpen] = useState(false);
  const [transferLead, setTransferLead] = useState<Lead | null>(null);
  const [currentUserProfile, setCurrentUserProfile] = useState<Profile | null>(null);
  const [viewMode, setViewMode] = useState<"list" | "kanban">("list");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const { role, isLoading: isLoadingRole, isAdmin, canEdit, canManageUsers } = useUserRole(user?.id);
  const { allowedUnits, canViewAll, isLoading: isLoadingUnitPerms } = useUnitPermissions(user?.id);
  const { hasPermission } = usePermissions(user?.id);
  const canEditName = isAdmin || hasPermission('leads.edit.name');
  const canEditDescription = isAdmin || hasPermission('leads.edit.description');
  
  const canExportLeads = isAdmin || hasPermission('leads.export');
  const canDeleteLeads = isAdmin || hasPermission('leads.delete');
  const canAssignLeads = isAdmin || hasPermission('leads.assign');
  const canEditLeads = isAdmin || canEdit || hasPermission('leads.edit');
  const canViewContact = isAdmin || hasPermission('leads.contact.view');
  
  // Sound notification for new leads
  useLeadNotifications();
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

  // Fetch server-side metrics (independent of pagination)
  useEffect(() => {
    const fetchMetrics = async () => {
      if (!role || isLoadingUnitPerms) return;

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayISO = today.toISOString();

      const buildQuery = (statusFilter?: string, dateFilter?: string) => {
        let q = supabase.from("campaign_leads").select("id", { count: "exact", head: true });
        if (!canViewAll && allowedUnits.length > 0 && !allowedUnits.includes('all')) {
          const unitsFilter = [...allowedUnits, "As duas"];
          q = q.in("unit", unitsFilter);
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
  }, [role, canViewAll, allowedUnits, isLoadingUnitPerms, refreshKey]);


  useEffect(() => {
    if (!role) return;

    const channel = supabase
      .channel('campaign_leads_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'campaign_leads' },
        (payload) => {
          console.log('Lead realtime event:', payload.eventType);
          // Trigger a refresh to update both table and kanban
          setRefreshKey((prev) => prev + 1);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [role]);

  // Handle lead ID from URL parameters (deep linking from WhatsApp)
  useEffect(() => {
    const leadId = searchParams.get('lead');
    if (leadId && leads.length > 0 && !isLoadingLeads) {
      const lead = leads.find(l => l.id === leadId);
      if (lead) {
        setSelectedLead(lead);
        setIsDetailOpen(true);
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
            }
            // Clear the URL parameter
            searchParams.delete('lead');
            setSearchParams(searchParams, { replace: true });
          });
      }
    }
  }, [leads, isLoadingLeads, searchParams, setSearchParams]);

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

  const handleTransferClick = (lead: Lead) => {
    setTransferLead(lead);
    setIsTransferOpen(true);
  };

  const handleStatusChange = (leadId: string, newStatus: LeadStatus) => {
    setLeads((prev) =>
      prev.map((lead) =>
        lead.id === leadId ? { ...lead, status: newStatus } : lead
      )
    );
  };

  const handleExport = () => {
    exportLeadsToCSV({ leads, responsaveis, canViewContact });
    toast({
      title: "Exportação concluída",
      description: `${leads.length} leads exportados para CSV.`,
    });
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

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  // Mobile layout with Sheet
  if (isMobile) {
    return (
      <div className="min-h-screen bg-background">
        {/* Mobile Header */}
        <header className="bg-card border-b border-border sticky top-0 z-10">
          <div className="px-3 py-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
                  <SheetTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-9 w-9">
                      <Menu className="w-5 h-5" />
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="left" className="w-72 p-0">
                    <SheetHeader className="p-4 border-b border-border">
                      <div className="flex items-center gap-3">
                        <img src={logoCastelo} alt="Castelo da Diversão" className="h-10 w-auto" />
                        <div>
                          <SheetTitle className="text-left text-base">Castelo da Diversão</SheetTitle>
                          <p className="text-xs text-muted-foreground">
                            {currentUserProfile?.full_name || user.email}
                          </p>
                        </div>
                      </div>
                    </SheetHeader>
                    
                    <nav className="flex flex-col p-2">
                      <Button variant="secondary" className="justify-start h-11 px-3" onClick={() => setIsMobileMenuOpen(false)}>
                        <LayoutList className="w-5 h-5 mr-3" />
                        Gestão de Leads
                      </Button>
                      
                      <Button variant="ghost" className="justify-start h-11 px-3" onClick={() => { navigate("/whatsapp"); setIsMobileMenuOpen(false); }}>
                        <MessageSquare className="w-5 h-5 mr-3" />
                        WhatsApp
                      </Button>
                      
                      {canManageUsers && (
                        <Button variant="ghost" className="justify-start h-11 px-3" onClick={() => { navigate("/users"); setIsMobileMenuOpen(false); }}>
                          <UsersIcon className="w-5 h-5 mr-3" />
                          Gerenciar Usuários
                        </Button>
                      )}
                      
                      <Separator className="my-2" />
                      
                      <Button variant="ghost" className="justify-start h-11 px-3" onClick={() => { handleRefresh(); setIsMobileMenuOpen(false); }}>
                        <RefreshCw className="w-5 h-5 mr-3" />
                        Atualizar Dados
                      </Button>
                      
                      <Button variant="ghost" className="justify-start h-11 px-3 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => { handleLogout(); setIsMobileMenuOpen(false); }}>
                        <LogOut className="w-5 h-5 mr-3" />
                        Sair da Conta
                      </Button>
                    </nav>
                  </SheetContent>
                </Sheet>

                <div className="flex items-center gap-2 min-w-0">
                  <img src={logoCastelo} alt="Castelo da Diversão" className="h-8 w-auto shrink-0" />
                  <h1 className="font-display font-bold text-foreground text-sm truncate">Gestão de Leads</h1>
                </div>
              </div>

              <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0" onClick={handleRefresh}>
                <RefreshCw className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </header>

        <main className="px-3 py-4">
          <MetricsCards metrics={leadMetrics} isLoading={isLoadingLeads} />
          <LeadsFilters filters={filters} onFiltersChange={setFilters} responsaveis={responsaveis} onExport={canExportLeads ? handleExport : undefined} />

          <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as "list" | "kanban")} className="mb-4">
            <TabsList>
              <TabsTrigger value="list" className="flex items-center gap-2">
                <LayoutList className="w-4 h-4" />
                Lista
              </TabsTrigger>
              <TabsTrigger value="kanban" className="flex items-center gap-2">
                <Columns className="w-4 h-4" />
                CRM
              </TabsTrigger>
            </TabsList>

            <TabsContent value="list" className="mt-4">
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
                canViewContact={canViewContact}
              />
            </TabsContent>

            <TabsContent value="kanban" className="mt-4">
              <UnitKanbanTabs
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
                  // Also update contact_name in linked conversations
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
                onTransfer={canEditLeads ? handleTransferClick : undefined}
                allowedUnits={allowedUnits}
                canViewAll={canViewAll}
                canViewContact={canViewContact}
              />
            </TabsContent>
          </Tabs>
        </main>

        <LeadDetailSheet lead={selectedLead} isOpen={isDetailOpen} onClose={() => setIsDetailOpen(false)} onUpdate={handleRefresh} responsaveis={responsaveis} currentUserId={user.id} currentUserName={currentUserProfile?.full_name || user.email || ""} canEdit={canEditLeads} canViewContact={canViewContact} />
        
        <TransferLeadDialog
          lead={transferLead}
          isOpen={isTransferOpen}
          onClose={() => setIsTransferOpen(false)}
          onSuccess={handleRefresh}
          responsaveis={responsaveis}
          currentUserId={user.id}
          currentUserName={currentUserProfile?.full_name || user.email || ""}
        />
      </div>
    );
  }

  // Desktop layout with Sidebar
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AdminSidebar 
          canManageUsers={canManageUsers}
          
          currentUserName={currentUserProfile?.full_name || user.email || ""} 
          onRefresh={handleRefresh} 
          onLogout={handleLogout} 
        />
        
        <SidebarInset className="flex-1 flex flex-col h-screen overflow-hidden">
          {/* Desktop Header */}
          <header className="bg-card border-b border-border sticky top-0 z-10 shrink-0">
            <div className="px-4 py-2 flex items-center gap-4">
              <SidebarTrigger />
              <div>
                <h1 className="font-display font-bold text-foreground text-lg leading-tight">Gestão de Leads</h1>
                <p className="text-xs text-muted-foreground">{currentUserProfile?.full_name || user.email}</p>
              </div>
            </div>
          </header>

          <main className="flex-1 overflow-auto p-4 space-y-3">
            <MetricsCards metrics={leadMetrics} isLoading={isLoadingLeads} />
            <LeadsFilters filters={filters} onFiltersChange={setFilters} responsaveis={responsaveis} onExport={canExportLeads ? handleExport : undefined} />

            <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as "list" | "kanban")} className="mb-4">
              <TabsList>
                <TabsTrigger value="list" className="flex items-center gap-2">
                  <LayoutList className="w-4 h-4" />
                  Lista
                </TabsTrigger>
              <TabsTrigger value="kanban" className="flex items-center gap-2">
                <Columns className="w-4 h-4" />
                CRM
              </TabsTrigger>
              </TabsList>

              <TabsContent value="list" className="mt-4">
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
                  canViewContact={canViewContact}
                />
              </TabsContent>

              <TabsContent value="kanban" className="mt-4">
                <UnitKanbanTabs
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
                    // Also update contact_name in linked conversations
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
                  onTransfer={canEditLeads ? handleTransferClick : undefined}
                  allowedUnits={allowedUnits}
                  canViewAll={canViewAll}
                  canViewContact={canViewContact}
                />
              </TabsContent>
            </Tabs>
          </main>

          <LeadDetailSheet lead={selectedLead} isOpen={isDetailOpen} onClose={() => setIsDetailOpen(false)} onUpdate={handleRefresh} responsaveis={responsaveis} currentUserId={user.id} currentUserName={currentUserProfile?.full_name || user.email || ""} canEdit={canEditLeads} canViewContact={canViewContact} />
          
          <TransferLeadDialog
            lead={transferLead}
            isOpen={isTransferOpen}
            onClose={() => setIsTransferOpen(false)}
            onSuccess={handleRefresh}
            responsaveis={responsaveis}
            currentUserId={user.id}
            currentUserName={currentUserProfile?.full_name || user.email || ""}
          />
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
