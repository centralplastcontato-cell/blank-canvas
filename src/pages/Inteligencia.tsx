import { useEffect, useState } from "react";
import { getCompanyLogoOverride } from "@/lib/companyAssetOverrides";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useCompanyModules } from "@/hooks/useCompanyModules";
import { useQueryClient } from "@tanstack/react-query";
import { useUnitPermissions } from "@/hooks/useUnitPermissions";
import { usePermissions } from "@/hooks/usePermissions";
import { useCompanyUnits } from "@/hooks/useCompanyUnits";
import { useCompany } from "@/contexts/CompanyContext";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Brain, ShieldAlert, Menu, FileText } from "lucide-react";
import { ReportDialog } from "@/components/reports/ReportDialog";
import { generateComercialPDF, generateComercialXLSX } from "@/lib/generateComercialPDF";
import { Skeleton } from "@/components/ui/skeleton";
import { AccessDeniedRedirect } from "@/components/AccessDeniedRedirect";
import { RelatoriosComerciais } from "@/components/inteligencia/RelatoriosComerciais";
import { AtencaoTab } from "@/components/inteligencia/AtencaoTab";
import { MotivosTab } from "@/components/inteligencia/MotivosTab";
import { SidebarProvider } from "@/components/ui/sidebar";
import { PullToRefresh } from "@/components/ui/pull-to-refresh";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { MobileMenu } from "@/components/admin/MobileMenu";
import { NotificationBell } from "@/components/admin/NotificationBell";


export default function Inteligencia() {
  const navigate = useNavigate();
  const modules = useCompanyModules();
  const [activeTab, setActiveTab] = useState("atencao");
  // Puxar para atualizar recarrega os dados das abas
  const queryClient = useQueryClient();
  const refetch = () => queryClient.invalidateQueries();
  const { currentCompany } = useCompany();

  const [isAdmin, setIsAdmin] = useState(false);
  const [canManageUsers, setCanManageUsers] = useState(false);
  const [hasView, setHasView] = useState(false);
  const [hasExport, setHasExport] = useState(false);
  const [permLoading, setPermLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<{ id: string; name: string; email: string; avatar?: string | null } | null>(null);
  const [selectedUnit, setSelectedUnit] = useState<string>("all");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);

  const { units } = useCompanyUnits(currentCompany?.id);
  const { canViewAll, allowedUnits } = useUnitPermissions(currentUser?.id, currentCompany?.id);
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
    return <AccessDeniedRedirect message="Você não tem permissão para acessar o módulo Inteligência." />;
  }

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
                    <img src={getCompanyLogoOverride(currentCompany?.slug, currentCompany?.logo_url) || '/placeholder.svg'} alt={currentCompany?.name || 'Logo'} className="h-8 w-auto shrink-0" />
                    <h1 className="font-display font-bold text-foreground text-sm truncate">Inteligência Comercial</h1>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {hasExport && (
                    <Button variant="outline" size="icon" className="h-9 w-9 shrink-0 border-blue-300 text-blue-600 hover:bg-blue-50" onClick={() => setReportOpen(true)} title="Gerar Relatório Comercial">
                      <FileText className="h-4 w-4" />
                    </Button>
                  )}
                  <NotificationBell />
                </div>
              </div>
            </div>
          </header>

          <PullToRefresh onRefresh={async () => { await refetch(); }} className="flex-1 p-3 md:p-5 overflow-x-hidden overflow-y-auto">
            <div className="mx-auto space-y-4 max-w-7xl">
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
                {hasExport && (
                  <Button variant="outline" size="icon" className="shrink-0 h-10 w-10 border-blue-300 text-blue-600 hover:bg-blue-50" onClick={() => setReportOpen(true)} title="Gerar Relatório Comercial">
                    <FileText className="h-5 w-5" />
                  </Button>
                )}
              </div>
                  </div>
                </div>
              </div>

            {/* Escondidos (out/2026), até a nova Inteligência: busca do topo, banner do
                levantamento mensal, abas Resumo do Dia, Prioridades, Follow-ups, Funil e
                Leads do Dia, e o bloco Prioridades de Venda — mostravam números errados
                ou nem carregavam. O Radar (Neg. Paradas) saiu também: travava com muitos
                leads e a aba "Precisam de atenção" faz o trabalho dele. */}

            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <div className="overflow-x-auto -mx-2 px-2 pb-2 scrollbar-none flex justify-center">
                <div className="flex md:inline-flex gap-1 md:gap-2 p-1 md:p-1.5 rounded-2xl bg-muted/50 border border-border/40 shadow-sm md:w-max">
                  {[
                    { value: "atencao", label: "Precisam de atenção", mobileLabel: "Atenção" },
                    ...(modules.inteligencia_ia ? [{ value: "motivos", label: "Por que não fechou", mobileLabel: "Motivos" }] : []),
                    { value: "relatorios", label: "Relatórios", mobileLabel: "Relatórios" },
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

              <TabsContent value="atencao" className="animate-fade-up">
                <AtencaoTab selectedUnit={selectedUnit !== "all" ? selectedUnit : undefined} />
              </TabsContent>

              {modules.inteligencia_ia && (
                <TabsContent value="motivos" className="animate-fade-up">
                  <MotivosTab selectedUnit={selectedUnit !== "all" ? selectedUnit : undefined} isAdmin={isAdmin} />
                </TabsContent>
              )}

              <TabsContent value="relatorios" className="animate-fade-up">
                <RelatoriosComerciais selectedUnit={selectedUnit !== "all" ? selectedUnit : undefined} canViewRevenue={canViewRevenue} />
              </TabsContent>

            </Tabs>
          </div>
        </PullToRefresh>
        </div>
      </div>
      <ReportDialog
        open={reportOpen}
        onOpenChange={setReportOpen}
        title="Relatório Comercial"
        reportTypes={[
          { value: 'funil', label: 'Funil + Leads', desc: 'Funil de vendas atual + leads novos no período' },
          { value: 'visitas', label: 'Visitas', desc: 'Relatório de visitas agendadas, realizadas e no-show' },
          { value: 'vendas', label: 'Vendas / Faturamento', desc: 'Festas fechadas, faturamento e ticket médio' },
          { value: 'auto_perdido', label: 'Auto-Perdidos', desc: 'Leads movidos para perdido automaticamente pelo sistema' },
          { value: 'completo', label: 'Relatório Completo', desc: 'Funil + Visitas + Vendas em um só documento' },
        ]}
        unitOptions={unitOptions}
        onGenerate={async (p) => {
          if (!currentCompany?.id) return;
          const loadAll = async (table: string, select: string, companyId: string, extraFilter?: (q: any) => any) => {
            const all: any[] = [];
            const batchSize = 1000;
            let from = 0;
            while (true) {
              let q = (supabase as any).from(table).select(select).eq('company_id', companyId);
              if (extraFilter) q = extraFilter(q);
              q = q.range(from, from + batchSize - 1);
              const { data } = await q as { data: any[] | null };
              if (!data || data.length === 0) break;
              all.push(...data);
              if (data.length < batchSize) break;
              from += batchSize;
            }
            return all;
          };
          const needsLeads = ['funil', 'vendas', 'completo', 'auto_perdido'].includes(p.type);
          const needsVisits = ['visitas', 'completo'].includes(p.type);
          const needsEvents = ['funil', 'vendas', 'completo'].includes(p.type);
          const needsAutoHistory = p.type === 'auto_perdido';
          const [leads, events, visits, autoHistory] = await Promise.all([
            needsLeads ? loadAll('campaign_leads', 'id, name, whatsapp, status, unit, created_at, month, guests', currentCompany.id) : Promise.resolve([]),
            needsEvents ? loadAll('company_events', 'id, lead_id, data_fechamento_venda, status, unit, total_value, event_date, title, package_name, guest_count', currentCompany.id) : Promise.resolve([]),
            needsVisits ? loadAll('lead_visits', 'id, lead_id, status_visita, data_visita, horario_visita, company_id, interest_level, como_conheceu, observacoes, visit_type', currentCompany.id) : Promise.resolve([]),
            needsAutoHistory ? loadAll('lead_history', 'id, lead_id, action, old_value, new_value, created_at', currentCompany.id, (q: any) => q.eq('action', 'Lead movido para perdido automaticamente')) : Promise.resolve([]),
          ]);
          const filtered = p.unit === 'all' ? leads : leads.filter((l: any) => l.unit === p.unit || l.unit === 'As duas');
          const filteredEvents = p.unit === 'all' ? events : events.filter((e: any) => e.unit === p.unit || e.unit === 'As duas');
          const reportParams = { type: p.type, companyName: currentCompany?.name || '', periodLabel: p.periodLabel, from: p.from, to: p.to, leads: filtered, events: filteredEvents, visits, autoLostHistory: autoHistory };
          if (p.format === 'xlsx') generateComercialXLSX(reportParams);
          else generateComercialPDF(reportParams);
        }}
      />
    </SidebarProvider>
  );
}
