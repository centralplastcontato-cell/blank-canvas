import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useCompanyModules } from "@/hooks/useCompanyModules";
import { useLeadIntelligence } from "@/hooks/useLeadIntelligence";
import { useLeadStageDurations } from "@/hooks/useLeadStageDurations";
import { useUnitPermissions } from "@/hooks/useUnitPermissions";
import { useCompanyUnits } from "@/hooks/useCompanyUnits";
import { useCompany } from "@/contexts/CompanyContext";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Brain, ShieldAlert, HelpCircle, Flame, AlertTriangle, Snowflake, Target, Thermometer, BarChart3, TrendingUp, Search, Menu } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { PrioridadesTab } from "@/components/inteligencia/PrioridadesTab";
import { FunilTab } from "@/components/inteligencia/FunilTab";
import { LeadsDoDiaTab } from "@/components/inteligencia/LeadsDoDiaTab";
import { ResumoDiarioTab } from "@/components/inteligencia/ResumoDiarioTab";
import { SidebarProvider } from "@/components/ui/sidebar";
import { PullToRefresh } from "@/components/ui/pull-to-refresh";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { MobileMenu } from "@/components/admin/MobileMenu";
import { NotificationBell } from "@/components/admin/NotificationBell";
import logoCastelo from "@/assets/logo-castelo.png";

export default function Inteligencia() {
  const navigate = useNavigate();
  const modules = useCompanyModules();
  const [activeTab, setActiveTab] = useState("resumo");
  const needsIntelligence = activeTab !== "resumo";
  const { data, isLoading, refetch } = useLeadIntelligence(needsIntelligence);
  const { data: stageDurations, isLoading: isDurationsLoading } = useLeadStageDurations(needsIntelligence);
  const { currentCompany } = useCompany();

  const [isAdmin, setIsAdmin] = useState(false);
  const [hasView, setHasView] = useState(false);
  const [hasExport, setHasExport] = useState(false);
  const [permLoading, setPermLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<{ id: string; name: string; email: string; avatar?: string | null } | null>(null);
  const [selectedUnit, setSelectedUnit] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const { units } = useCompanyUnits(currentCompany?.id);
  const { canViewAll, allowedUnits, isLoading: isLoadingUnitPerms } = useUnitPermissions(currentUser?.id, currentCompany?.id);

  useEffect(() => {
    async function check() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/auth"); return; }

      // Parallel fetch: profile, admin check, permissions
      const [profileResult, adminResult, permsResult] = await Promise.all([
        supabase.from("profiles").select("full_name, avatar_url").eq("user_id", user.id).single(),
        supabase.rpc("is_admin", { _user_id: user.id }),
        supabase.from("user_permissions").select("permission, granted").eq("user_id", user.id).in("permission", ["ic.view", "ic.export"]),
      ]);

      setCurrentUser({ 
        id: user.id, 
        name: profileResult.data?.full_name || "Usuário", 
        email: user.email || "", 
        avatar: profileResult.data?.avatar_url 
      });

      const userIsAdmin = adminResult.data === true;
      setIsAdmin(userIsAdmin);

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

  if (!permLoading && !modules.inteligencia && !isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-3">
          <ShieldAlert className="h-12 w-12 text-muted-foreground mx-auto" />
          <p className="text-muted-foreground">Módulo Inteligência não está habilitado.</p>
        </div>
      </div>
    );
  }

  if (!permLoading && !hasView) {
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
          canManageUsers={isAdmin}
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
                    canManageUsers={isAdmin}
                    isAdmin={isAdmin}
                    onRefresh={() => refetch()}
                    onLogout={handleLogout}
                  />
                  <div className="flex items-center gap-2 min-w-0">
                    <img src={logoCastelo} alt="Logo" className="h-8 w-auto shrink-0" />
                    <h1 className="font-display font-bold text-foreground text-sm truncate">Inteligência</h1>
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
            <div className="max-w-7xl mx-auto space-y-4">
              {/* Desktop header */}
              <div className="hidden md:flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-primary/10">
                    <Brain className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold tracking-tight">Inteligência</h1>
                  <p className="text-sm text-muted-foreground">
                    Score de leads, priorização e análise de funil
                  </p>
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
                    <div className="space-y-5 text-sm">
                      {/* Score */}
                      <div className="space-y-1.5">
                        <h3 className="font-semibold flex items-center gap-2">
                          <TrendingUp className="h-4 w-4 text-primary" />
                          Score (0–100)
                        </h3>
                        <p className="text-muted-foreground">
                          Pontuação automática que mede o nível de engajamento do lead. Considera interações no WhatsApp, avanço de status no CRM e tempo sem resposta. Quanto maior, mais engajado o lead está.
                        </p>
                      </div>

                      {/* Temperatura */}
                      <div className="space-y-2">
                        <h3 className="font-semibold flex items-center gap-2">
                          <Thermometer className="h-4 w-4 text-primary" />
                          Temperatura
                        </h3>
                        <div className="space-y-2 pl-1">
                          <div className="flex items-start gap-2">
                            <span className="text-blue-400 shrink-0">❄️</span>
                            <div><strong>Frio</strong> — Baixo engajamento. O lead não interagiu recentemente ou tem poucas interações.</div>
                          </div>
                          <div className="flex items-start gap-2">
                            <span className="text-yellow-400 shrink-0">🌤️</span>
                            <div><strong>Morno</strong> — Engajamento moderado. Respondeu mas ainda não avançou para visita ou orçamento.</div>
                          </div>
                          <div className="flex items-start gap-2">
                            <span className="text-orange-400 shrink-0">🔥</span>
                            <div><strong>Quente</strong> — Alto engajamento. Pediu visita, orçamento ou demonstrou forte interesse.</div>
                          </div>
                          <div className="flex items-start gap-2">
                            <span className="text-green-400 shrink-0">🎯</span>
                            <div><strong>Pronto</strong> — Pronto para fechar! Score máximo, orçamento enviado ou visita agendada.</div>
                          </div>
                        </div>
                      </div>

                      {/* Prioridades */}
                      <div className="space-y-2">
                        <h3 className="font-semibold flex items-center gap-2">
                          <Target className="h-4 w-4 text-primary" />
                          Cards de Prioridade
                        </h3>
                        <div className="space-y-2 pl-1">
                          <div className="flex items-start gap-2">
                            <Flame className="h-4 w-4 text-green-400 shrink-0 mt-0.5" />
                            <div><strong>Atender Agora</strong> — Leads prioritários com bom score e temperatura acima de frio. São os que mais precisam de atenção imediata.</div>
                          </div>
                          <div className="flex items-start gap-2">
                            <AlertTriangle className="h-4 w-4 text-orange-400 shrink-0 mt-0.5" />
                            <div><strong>Em Risco</strong> — Leads que pararam de responder (abandono detectado). Precisam de follow-up urgente para não serem perdidos.</div>
                          </div>
                          <div className="flex items-start gap-2">
                            <Snowflake className="h-4 w-4 text-blue-400 shrink-0 mt-0.5" />
                            <div><strong>Frios</strong> — Leads com score abaixo de 20 e sem padrão de abandono. Baixo engajamento, podem ser reaquecidos.</div>
                          </div>
                        </div>
                      </div>

                      {/* Funil */}
                      <div className="space-y-1.5">
                        <h3 className="font-semibold flex items-center gap-2">
                          <BarChart3 className="h-4 w-4 text-primary" />
                          Funil de Conversão
                        </h3>
                        <p className="text-muted-foreground">
                          Mostra a distribuição dos leads por etapa do CRM (Novo → Visita → Orçamento → Negociando → Fechado/Perdido). O percentual indica quanto cada etapa representa do total de leads. O ícone de relógio mostra o tempo médio que os leads ficam em cada etapa.
                        </p>
                      </div>

                      {/* Alertas */}
                      <div className="space-y-1.5">
                        <h3 className="font-semibold flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4 text-primary" />
                          Alertas em Tempo Real
                        </h3>
                        <p className="text-muted-foreground">
                          Você recebe notificações automáticas quando um lead muda de temperatura (esquentou ou esfriou), entra em risco de abandono ou se torna prioritário.
                        </p>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
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

            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <div className="overflow-x-auto flex justify-center pb-2">
                <div className="inline-flex gap-1.5 md:gap-2 p-1 md:p-1.5 rounded-2xl bg-muted/50 border border-border/40 shadow-sm">
                  {[
                    { value: "resumo", label: "Resumo do Dia" },
                    { value: "prioridades", label: "Prioridades" },
                    { value: "funil", label: "Funil" },
                    { value: "leads-dia", label: "Leads do Dia" },
                  ].map(t => (
                    <button
                      key={t.value}
                      onClick={() => setActiveTab(t.value)}
                      className={`inline-flex items-center gap-1.5 md:gap-2.5 px-3 py-2 md:px-6 md:py-3 rounded-lg md:rounded-xl text-xs md:text-base font-semibold transition-all duration-200 ${
                        activeTab === t.value
                          ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/30 scale-[1.02]'
                          : 'bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground'
                      }`}
                    >
                      <span>{t.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <TabsContent value="resumo" className="animate-fade-up">
                {permLoading ? <LoadingSkeleton /> : <ResumoDiarioTab />}
              </TabsContent>

              <TabsContent value="prioridades" className="animate-fade-up">
                {isLoading || isLoadingUnitPerms || permLoading ? (
                  <LoadingSkeleton />
                ) : (
                  <PrioridadesTab data={filteredData} />
                )}
              </TabsContent>

              <TabsContent value="funil" className="animate-fade-up">
                {isLoading || isLoadingUnitPerms || isDurationsLoading || permLoading ? (
                  <LoadingSkeleton />
                ) : (
                  <FunilTab data={filteredData} stageDurations={stageDurations} />
                )}
              </TabsContent>

              <TabsContent value="leads-dia" className="animate-fade-up">
                {isLoading || isLoadingUnitPerms || permLoading ? (
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
