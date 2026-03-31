import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useCompanyModules } from "@/hooks/useCompanyModules";
import { useLeadIntelligence } from "@/hooks/useLeadIntelligence";
import { useLeadStageDurations } from "@/hooks/useLeadStageDurations";
import { useUnitPermissions } from "@/hooks/useUnitPermissions";
import { usePermissions } from "@/hooks/usePermissions";
import { useCompanyUnits } from "@/hooks/useCompanyUnits";
import { useCompany } from "@/contexts/CompanyContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Brain, ShieldAlert, HelpCircle, Flame, AlertTriangle, Snowflake, Target, Thermometer, BarChart3, TrendingUp, Search, Menu, FileText } from "lucide-react";
import { ReportDialog } from "@/components/reports/ReportDialog";
import { generateComercialPDF, generateComercialXLSX } from "@/lib/generateComercialPDF";
import { Skeleton } from "@/components/ui/skeleton";
import { PrioridadesTab } from "@/components/inteligencia/PrioridadesTab";
import { FollowUpsTab } from "@/components/inteligencia/FollowUpsTab";
import { FunilTab } from "@/components/inteligencia/FunilTab";
import { RelatoriosComerciais } from "@/components/inteligencia/RelatoriosComerciais";
import { LeadsDoDiaTab } from "@/components/inteligencia/LeadsDoDiaTab";
import { ResumoDiarioTab } from "@/components/inteligencia/ResumoDiarioTab";
import { NegociacoesParadasTab } from "@/components/inteligencia/NegociacoesParadasTab";
import { AlertsPanel } from "@/components/inteligencia/AlertsPanel";
import { SalesPriorities } from "@/components/inteligencia/SalesPriorities";
import { SidebarProvider } from "@/components/ui/sidebar";
import { PullToRefresh } from "@/components/ui/pull-to-refresh";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { MobileMenu } from "@/components/admin/MobileMenu";
import { NotificationBell } from "@/components/admin/NotificationBell";
import { MonthlyReviewBanner } from "@/components/admin/MonthlyReviewBanner";


export default function Inteligencia() {
  const navigate = useNavigate();
  const modules = useCompanyModules();
  const [activeTab, setActiveTab] = useState("relatorios");
  const { data, isLoading, refetch } = useLeadIntelligence(true);
  const { data: stageDurations, isLoading: isDurationsLoading } = useLeadStageDurations(activeTab === "funil");
  const { currentCompany } = useCompany();

  const [isAdmin, setIsAdmin] = useState(false);
  const [canManageUsers, setCanManageUsers] = useState(false);
  const [hasView, setHasView] = useState(false);
  const [hasExport, setHasExport] = useState(false);
  const [permLoading, setPermLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<{ id: string; name: string; email: string; avatar?: string | null } | null>(null);
  const [selectedUnit, setSelectedUnit] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);

  const { units } = useCompanyUnits(currentCompany?.id);
  const { canViewAll, allowedUnits, isLoading: isLoadingUnitPerms } = useUnitPermissions(currentUser?.id, currentCompany?.id);
  const { hasPermission: userHasPermission } = usePermissions(currentUser?.id);
  const canViewRevenue = isAdmin || userHasPermission("agenda.faturamento");

  useEffect(() => {
    async function check() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/auth"); return; }

      // Parallel fetch: profile, admin check, permissions, role
      const [profileResult, adminResult, permsResult, roleResult] = await Promise.all([
        supabase.from("profiles").select("full_name, avatar_url").eq("user_id", user.id).single(),
        supabase.rpc("is_admin", { _user_id: user.id }),
        supabase.from("user_permissions").select("permission, granted").eq("user_id", user.id).in("permission", ["ic.view", "ic.export"]),
        supabase.from("user_companies").select("role").eq("user_id", user.id).limit(1).single(),
      ]);

      setCurrentUser({ 
        id: user.id, 
        name: profileResult.data?.full_name || "Usuário", 
        email: user.email || "", 
        avatar: profileResult.data?.avatar_url 
      });

      const userIsAdmin = adminResult.data === true;
      const userRole = roleResult.data?.role;
      setIsAdmin(userIsAdmin);
      setCanManageUsers(userIsAdmin || userRole === 'admin' || userRole === 'gestor' || userRole === 'owner');

      if (userIsAdmin) {
        setHasView(true);
        setHasExport(true);
        setPermLoading(false);
        return;
      }

      const permMap = new Map(permsResult.data?.map(p => [p.permission, p.granted]) || []);
      setHasView(permMap.get("ic.view") === true);
      setHasExport(permMap.get("ic.export") === true);
      setPermLoading(false);
    }
    check();
  }, [navigate]);

  if (permLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="space-y-4 w-full max-w-2xl px-4 animate-pulse">
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-16 rounded-xl" />
            ))}
          </div>
          <Skeleton className="h-32 rounded-xl" />
          <Skeleton className="h-48 rounded-xl" />
        </div>
      </div>
    );
  }

  if (!modules.inteligencia && !isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-3">
          <ShieldAlert className="h-12 w-12 text-muted-foreground mx-auto" />
          <p className="text-muted-foreground">Módulo Inteligência não está habilitado.</p>
        </div>
      </div>
    );
  }

  if (!hasView) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-3">
          <ShieldAlert className="h-12 w-12 text-muted-foreground mx-auto" />
          <p className="text-muted-foreground">Você não tem permissão para acessar este módulo.</p>
        </div>
      </div>
    );
  }

  // Skeleton component for loading state
  const LoadingSkeleton = () => (
    <div className="space-y-4 animate-pulse">
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-16 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-32 rounded-xl" />
      <Skeleton className="h-48 rounded-xl" />
    </div>
  );

  // Filter data by unit permissions, selected unit, and search query
  const filteredData = (data || []).filter(d => {
    // Unit filter
    let unitMatch = true;
    if (isAdmin || canViewAll) {
      if (selectedUnit !== "all") {
        unitMatch = d.lead_unit === selectedUnit || d.lead_unit === "As duas";
      }
    } else {
      unitMatch = allowedUnits.includes(d.lead_unit || "") || d.lead_unit === "As duas";
      if (selectedUnit !== "all") {
        unitMatch = d.lead_unit === selectedUnit || d.lead_unit === "As duas";
      }
    }

    // Search filter
    if (!unitMatch) return false;
    if (!searchQuery.trim()) return true;
    
    const q = searchQuery.trim().toLowerCase();
    const nameMatch = (d.lead_name || "").toLowerCase().includes(q);
    const phoneMatch = (d.lead_whatsapp || "").replace(/\D/g, "").includes(q.replace(/\D/g, ""));
    return nameMatch || phoneMatch;
  });

  // Build unit options for selector
  const physicalUnits = units.filter(u => u.slug !== 'trabalhe-conosco');
  const unitOptions = isAdmin || canViewAll
    ? physicalUnits.map(u => ({ value: u.name, label: u.name }))
    : physicalUnits.filter(u => allowedUnits.includes(u.name)).map(u => ({ value: u.name, label: u.name }));

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  return (
    <SidebarProvider defaultOpen={false}>
      <div className="min-h-screen flex w-full bg-background">
        <AdminSidebar
          canManageUsers={canManageUsers}
          isAdmin={isAdmin}
          currentUserName={currentUser?.name || ""}
          onRefresh={() => window.location.reload()}
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
                    trigger={
                      <Button variant="ghost" size="icon" className="h-9 w-9">
                        <Menu className="w-5 h-5" />
                      </Button>
                    }
                    currentPage="inteligencia"
                    userName={currentUser?.name || ""}
                    userEmail={currentUser?.email || ""}
                    userAvatar={currentUser?.avatar}
                    canManageUsers={canManageUsers}
                    isAdmin={isAdmin}
                    onRefresh={() => refetch()}
                    onLogout={handleLogout}
                  />
                  <div className="flex items-center gap-2 min-w-0">
                    <img src={currentCompany?.logo_url || '/placeholder.svg'} alt={currentCompany?.name || 'Logo'} className="h-8 w-auto shrink-0" />
                    <h1 className="font-display font-bold text-foreground text-sm truncate">Inteligência Comercial</h1>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0" onClick={() => navigate("/admin")}>
                    <Brain className="w-5 h-5 text-[hsl(155,75%,38%)]" style={{ filter: 'drop-shadow(0 0 4px hsl(155 75% 38% / 0.5))' }} />
                  </Button>
                  <NotificationBell />
                </div>
              </div>
            </div>
          </header>

          <PullToRefresh onRefresh={async () => { await refetch(); }} className="flex-1 p-3 md:p-5 overflow-x-hidden overflow-y-auto">
            <div className={`mx-auto space-y-4 ${activeTab === "follow-ups" ? "" : "max-w-7xl"}`}>
              {/* Desktop header */}
              <div className="hidden md:block">
                <div className="relative rounded-2xl border border-border/30 bg-gradient-to-r from-card via-card to-primary/[0.03] shadow-[0_4px_24px_rgba(0,0,0,0.04)] overflow-hidden">
                  <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_80%_-20%,hsl(var(--primary)/0.06),transparent)]" />
                  <div className="relative flex items-center justify-between gap-4 p-5 md:p-6">
                    <div className="flex items-center gap-4">
                      <div className="p-3 rounded-2xl bg-gradient-to-br from-primary to-primary/80 shadow-lg shadow-primary/20">
                        <Brain className="h-7 w-7 text-primary-foreground" />
                      </div>
                      <div>
                        <h1 className="text-2xl lg:text-3xl font-extrabold tracking-tight text-foreground">Inteligência Comercial</h1>
                        <p className="text-sm text-muted-foreground/70 mt-0.5">Análise de desempenho do funil e resultados de vendas</p>
                      </div>
                    </div>
              <div className="flex items-center gap-2">
                {unitOptions.length > 1 && (
                  <Select value={selectedUnit} onValueChange={setSelectedUnit}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Todas as unidades" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas as unidades</SelectItem>
                      {unitOptions.map(u => (
                        <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                <Button variant="outline" size="icon" className="shrink-0 h-10 w-10" onClick={() => setReportOpen(true)} title="Gerar Relatório Comercial">
                  <FileText className="h-5 w-5" />
                </Button>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="icon" className="shrink-0 h-10 w-10 border-red-500 text-red-500 hover:bg-red-500/10 hover:text-red-600">
                      <HelpCircle className="h-6 w-6" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle className="flex items-center gap-2">
                        <Brain className="h-5 w-5 text-primary" />
                        Guia de Inteligência
                      </DialogTitle>
                    </DialogHeader>
                    <Tabs defaultValue="relatorios-guide" className="w-full">
                      <TabsList className="overflow-x-auto -mx-2 px-2 pb-2 scrollbar-none h-auto flex flex-wrap gap-1 p-1 rounded-xl bg-muted/50 border border-border/40 w-full">
                          {[
                            { value: "relatorios-guide", label: "Relatórios" },
                            { value: "resumo-guide", label: "Resumo" },
                            { value: "prioridades-guide", label: "Prioridades" },
                            { value: "negociacoes-guide", label: "Neg. Paradas" },
                            { value: "followups-guide", label: "Follow-ups" },
                            { value: "funil-guide", label: "Funil" },
                            { value: "leads-guide", label: "Leads do Dia" },
                            { value: "geral-guide", label: "Geral" },
                          ].map(t => (
                            <TabsTrigger key={t.value} value={t.value} className="text-xs px-3 py-1.5 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                              {t.label}
                            </TabsTrigger>
                          ))}
                      </TabsList>

                      <div className="text-sm mt-3">
                        <TabsContent value="relatorios-guide" className="space-y-3 mt-0">
                          <h3 className="font-semibold flex items-center gap-2">
                            <BarChart3 className="h-4 w-4 text-primary" />
                            Relatórios Comerciais
                          </h3>
                          <p className="text-muted-foreground">
                            Dashboard principal com KPIs do seu buffet: leads recebidos, fechados, taxa de conversão, visitas realizadas, comparecimento, faturamento vendido e ticket médio. Filtre por período (hoje, 7 dias, 30 dias, mês atual ou personalizado) e por unidade.
                          </p>
                          <p className="text-muted-foreground">
                            Inclui o <strong>Funil de Conversão por Etapa</strong> (Novo → Visita → Orçamento → Negociando → Fechado/Perdido), gráfico de comparecimento em visitas e vendas por período.
                          </p>
                          <p className="text-muted-foreground">
                            Abaixo dos relatórios, a seção <strong>Prioridades de Venda</strong> lista automaticamente os leads com maior chance de fechamento, ordenados por recência de interação, estágio no funil e score.
                          </p>
                        </TabsContent>

                        <TabsContent value="resumo-guide" className="space-y-3 mt-0">
                          <h3 className="font-semibold flex items-center gap-2">
                            <Brain className="h-4 w-4 text-primary" />
                            Resumo do Dia
                          </h3>
                          <p className="text-muted-foreground">
                            Painel diário com métricas de leads (novos, atendidos, fechados, perdidos), timeline de eventos importantes e insights gerados pela IA. Selecione períodos de até 31 dias para análise comparativa.
                          </p>
                          <p className="text-muted-foreground">
                            Administradores podem personalizar o <strong>Contexto da IA</strong> com dados do buffet (ticket médio, número de unidades, diferenciais) para insights mais precisos.
                          </p>
                        </TabsContent>

                        <TabsContent value="prioridades-guide" className="space-y-3 mt-0">
                          <h3 className="font-semibold flex items-center gap-2">
                            <Target className="h-4 w-4 text-primary" />
                            Prioridades
                          </h3>
                          <p className="text-muted-foreground">
                            Classifica seus leads em três níveis de urgência baseado no score e temperatura:
                          </p>
                          <div className="space-y-2 pl-1">
                            <div className="flex items-start gap-2">
                              <Flame className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                              <div><strong>Atender Agora</strong> — Score bom e temperatura acima de frio. Precisam de atenção imediata.</div>
                            </div>
                            <div className="flex items-start gap-2">
                              <AlertTriangle className="h-4 w-4 text-orange-500 shrink-0 mt-0.5" />
                              <div><strong>Em Risco</strong> — Pararam de responder (abandono detectado). Follow-up urgente.</div>
                            </div>
                            <div className="flex items-start gap-2">
                              <Snowflake className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
                              <div><strong>Frios</strong> — Score abaixo de 20. Podem ser reaquecidos com reativação.</div>
                            </div>
                          </div>
                        </TabsContent>

                        <TabsContent value="negociacoes-guide" className="space-y-3 mt-0">
                          <h3 className="font-semibold flex items-center gap-2">
                            <ShieldAlert className="h-4 w-4 text-primary" />
                            Negociações Paradas
                          </h3>
                          <p className="text-muted-foreground">
                            Radar que identifica leads em estágios críticos (Visita, Orçamento, Negociação) onde a interação humana parou ou o robô está inativo. Inclui score de prioridade (0-100), mês da festa e navegação direta para a conversa.
                          </p>
                          <p className="text-muted-foreground">
                            Filtre por estágio ou mês da festa. Leads com indicador de reativação (🤖) já receberam mensagem automática da Fase 4.
                          </p>
                        </TabsContent>

                        <TabsContent value="followups-guide" className="space-y-3 mt-0">
                          <h3 className="font-semibold flex items-center gap-2">
                            <Search className="h-4 w-4 text-primary" />
                            Follow-ups
                          </h3>
                          <p className="text-muted-foreground">
                            Painel Kanban com 4 colunas (1º ao 4º Follow-up) que organiza os leads automaticamente com base na última ação de follow-up registrada. Os intervalos respeitam os delays configurados nas automações do WhatsApp de cada unidade.
                          </p>
                          <p className="text-muted-foreground">
                            Cada card permite enviar mensagem diretamente pelo WhatsApp com um clique.
                          </p>
                        </TabsContent>

                        <TabsContent value="funil-guide" className="space-y-3 mt-0">
                          <h3 className="font-semibold flex items-center gap-2">
                            <BarChart3 className="h-4 w-4 text-primary" />
                            Funil de Conversão
                          </h3>
                          <p className="text-muted-foreground">
                            Distribuição dos leads por etapa do CRM (Novo → Visita → Orçamento → Negociando → Fechado/Perdido). O percentual indica a representação de cada etapa no total. O ícone de relógio mostra o tempo médio em cada etapa.
                          </p>
                        </TabsContent>

                        <TabsContent value="leads-guide" className="space-y-3 mt-0">
                          <h3 className="font-semibold flex items-center gap-2">
                            <TrendingUp className="h-4 w-4 text-primary" />
                            Leads do Dia
                          </h3>
                          <p className="text-muted-foreground">
                            Lista todos os leads criados no dia atual com score, temperatura e status. Permite busca rápida por nome ou telefone e exportação para análise externa (com permissão).
                          </p>
                        </TabsContent>

                        <TabsContent value="geral-guide" className="space-y-3 mt-0">
                          <div className="space-y-4">
                            <div className="space-y-1.5">
                              <h3 className="font-semibold flex items-center gap-2">
                                <TrendingUp className="h-4 w-4 text-primary" />
                                Score (0–100)
                              </h3>
                              <p className="text-muted-foreground">
                                Pontuação automática que mede engajamento do lead: interações no WhatsApp, avanço de status e tempo sem resposta.
                              </p>
                            </div>

                            <div className="space-y-2">
                              <h3 className="font-semibold flex items-center gap-2">
                                <Thermometer className="h-4 w-4 text-primary" />
                                Temperatura
                              </h3>
                              <div className="space-y-1.5 pl-1 text-muted-foreground">
                                <div>❄️ <strong>Frio</strong> — Baixo engajamento ou sem interação recente.</div>
                                <div>🌤️ <strong>Morno</strong> — Respondeu mas não avançou para visita/orçamento.</div>
                                <div>🔥 <strong>Quente</strong> — Pediu visita, orçamento ou demonstrou forte interesse.</div>
                                <div>🎯 <strong>Pronto</strong> — Score máximo, orçamento enviado ou visita agendada.</div>
                              </div>
                            </div>

                            <div className="space-y-1.5">
                              <h3 className="font-semibold flex items-center gap-2">
                                <Brain className="h-4 w-4 text-primary" />
                                Resumo IA por Lead
                              </h3>
                              <p className="text-muted-foreground">
                                Em cada card de lead, o botão "Resumo IA" gera um resumo da conversa, sugere próxima ação e cria mensagem pronta para enviar.
                              </p>
                            </div>

                            <div className="space-y-1.5">
                              <h3 className="font-semibold flex items-center gap-2">
                                <AlertTriangle className="h-4 w-4 text-primary" />
                                Alertas Inteligentes
                              </h3>
                              <p className="text-muted-foreground">
                                Alertas automáticos sobre negociações paradas, orçamentos sem resposta, queda de conversão, queda de leads e meses com baixa ocupação. Cada alerta possui ações diretas para resolver o problema com um clique.
                              </p>
                            </div>
                          </div>
                        </TabsContent>
                      </div>
                    </Tabs>
                  </DialogContent>
                </Dialog>
              </div>
                  </div>
                </div>
              </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome ou telefone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 max-w-sm"
              />
            </div>

            {/* Alertas Inteligentes */}
            <MonthlyReviewBanner isAdmin={isAdmin} unitSlug={selectedUnit !== "all" ? (units.find(u => u.name === selectedUnit)?.slug || selectedUnit) : undefined} canViewRevenue={canViewRevenue} />
            <AlertsPanel onTabChange={setActiveTab} />

            {/* SalesPriorities moved inside Relatórios tab */}

            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <div className="overflow-x-auto -mx-2 px-2 pb-2 scrollbar-none flex justify-center">
                <div className="flex md:inline-flex gap-1 md:gap-2 p-1 md:p-1.5 rounded-2xl bg-muted/50 border border-border/40 shadow-sm md:w-max">
                  {[
                    { value: "relatorios", label: "Relatórios", mobileLabel: "Relat." },
                    { value: "resumo", label: "Resumo do Dia", mobileLabel: "Resumo" },
                    { value: "prioridades", label: "Prioridades", mobileLabel: "Prior." },
                    { value: "negociacoes", label: "Neg. Paradas", mobileLabel: "Radar" },
                    { value: "follow-ups", label: "Follow-ups", mobileLabel: "Follow" },
                    { value: "funil", label: "Funil", mobileLabel: "Funil" },
                    { value: "leads-dia", label: "Leads do Dia", mobileLabel: "Leads" },
                  ].map(t => (
                    <button
                      key={t.value}
                      onClick={() => setActiveTab(t.value)}
                      className={`flex-1 md:flex-none inline-flex items-center justify-center gap-1 md:gap-2.5 px-1.5 py-1.5 md:px-6 md:py-3 rounded-lg md:rounded-xl text-[11px] md:text-base font-semibold transition-all duration-200 whitespace-nowrap ${
                        activeTab === t.value
                          ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/30 scale-[1.02]'
                          : 'bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground'
                      }`}
                    >
                      <span className="md:hidden">{t.mobileLabel}</span>
                      <span className="hidden md:inline">{t.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <TabsContent value="resumo" className="animate-fade-up">
                {permLoading ? <LoadingSkeleton /> : <ResumoDiarioTab />}
              </TabsContent>

              <TabsContent value="prioridades" className="animate-fade-up">
                {isLoading || !data || isLoadingUnitPerms || permLoading ? (
                  <LoadingSkeleton />
                ) : (
                  <PrioridadesTab data={filteredData} />
                )}
              </TabsContent>

              <TabsContent value="follow-ups" className="animate-fade-up">
                {isLoading || !data || isLoadingUnitPerms || permLoading ? (
                  <LoadingSkeleton />
                ) : (
                  <FollowUpsTab intelligenceData={filteredData} selectedUnit={selectedUnit} />
                )}
              </TabsContent>

              <TabsContent value="funil" className="animate-fade-up">
                {isLoading || !data || isLoadingUnitPerms || isDurationsLoading || permLoading ? (
                  <LoadingSkeleton />
                ) : (
                  <FunilTab data={filteredData} stageDurations={stageDurations} selectedUnit={selectedUnit} />
                )}
              </TabsContent>

              <TabsContent value="negociacoes" className="animate-fade-up">
                <NegociacoesParadasTab selectedUnit={selectedUnit !== "all" ? selectedUnit : undefined} />
              </TabsContent>

              <TabsContent value="relatorios" className="animate-fade-up">
                <RelatoriosComerciais selectedUnit={selectedUnit !== "all" ? selectedUnit : undefined} canViewRevenue={canViewRevenue} />
                <SalesPriorities selectedUnit={selectedUnit} />
              </TabsContent>

              <TabsContent value="leads-dia" className="animate-fade-up">
                {isLoading || !data || isLoadingUnitPerms || permLoading ? (
                  <LoadingSkeleton />
                ) : (
                  <LeadsDoDiaTab data={filteredData} canExport={hasExport} />
                )}
              </TabsContent>
            </Tabs>
          </div>
        </PullToRefresh>
        </div>
      </div>
    </SidebarProvider>
  );
}
