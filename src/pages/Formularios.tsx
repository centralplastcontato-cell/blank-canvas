import { useEffect, useState, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

import { SidebarProvider } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { MobileMenu } from "@/components/admin/MobileMenu";
import { NotificationBell } from "@/components/admin/NotificationBell";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { FolderOpen, Menu, Loader2, ClipboardCheck, PartyPopper, FileSignature, UtensilsCrossed, ListChecks, FileText, Package, Users, Wrench, HardHat, ShieldAlert, CalendarClock, LayoutTemplate, CreditCard } from "lucide-react";
import { useCompany } from "@/contexts/CompanyContext";
import { AvaliacoesContent } from "./Avaliacoes";
import { PreFestaContent } from "./PreFesta";
import { ContratoContent } from "./Contrato";
import { CardapioContent } from "./Cardapio";
import { EventStaffManager } from "@/components/agenda/EventStaffManager";
import { ChecklistTemplateManager } from "@/components/agenda/ChecklistTemplateManager";
import { PackagesManager } from "@/components/admin/PackagesManager";
import { OptionalsManager } from "@/components/admin/OptionalsManager";
import { MaintenanceManager } from "@/components/agenda/MaintenanceManager";
import { PartyMonitoringManager } from "@/components/agenda/PartyMonitoringManager";
import { AttendanceManager } from "@/components/agenda/AttendanceManager";
import { EventInfoManager } from "@/components/agenda/EventInfoManager";
import { FreelancerManagerContent } from "./FreelancerManager";
import { FreelancerEvaluationsTab } from "@/components/freelancer/FreelancerEvaluationsTab";
import { FreelancerSchedulesTab } from "@/components/freelancer/FreelancerSchedulesTab";
import { CardFeesManager } from "@/components/admin/CardFeesManager";

export default function Formularios() {
  const navigate = useNavigate();
  const { currentCompany } = useCompany();
  const [searchParams, setSearchParams] = useSearchParams();
  
  const [isAdmin, setIsAdmin] = useState(false);
  const [isOwnerOrAdmin, setIsOwnerOrAdmin] = useState(false);
  const [canManageUsers, setCanManageUsers] = useState(false);
  const [permLoading, setPermLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<{ id: string; name: string; email: string; avatar?: string | null } | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [userPermissions, setUserPermissions] = useState<Record<string, boolean>>({});

  const activeSection = searchParams.get("section") || "formularios";
  const activeTab = searchParams.get("tab") || "avaliacoes";

  useEffect(() => {
    async function check() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/auth"); return; }
      const [profileResult, adminResult, permsResult, roleResult] = await Promise.all([
        supabase.from("profiles").select("full_name, avatar_url").eq("user_id", user.id).single(),
        supabase.rpc("is_admin", { _user_id: user.id }),
        supabase.from("user_permissions").select("permission, granted").eq("user_id", user.id),
        supabase.from("user_companies").select("role").eq("user_id", user.id).limit(1).single(),
      ]);
      setCurrentUser({ id: user.id, name: profileResult.data?.full_name || "Usuário", email: user.email || "", avatar: profileResult.data?.avatar_url });
      const isSuperAdmin = adminResult.data === true;
      setIsAdmin(isSuperAdmin);
      const role = roleResult.data?.role;
      setIsOwnerOrAdmin(isSuperAdmin || role === 'owner' || role === 'admin');
      setCanManageUsers(isSuperAdmin || role === 'admin' || role === 'gestor' || role === 'owner');

      const permsMap: Record<string, boolean> = {};
      permsResult.data?.forEach((p) => { permsMap[p.permission] = p.granted; });
      setUserPermissions(permsMap);
      setPermLoading(false);
    }
    check();
  }, [navigate]);

  // Permission check - owners/admins bypass
  const canView = isOwnerOrAdmin || userPermissions['operacoes.view'];
  const canFormularios = isOwnerOrAdmin || userPermissions['operacoes.formularios'];
  const canChecklist = isOwnerOrAdmin || userPermissions['operacoes.checklist'];
  const canPacotes = isOwnerOrAdmin || userPermissions['operacoes.pacotes'];
  const canFreelancer = isOwnerOrAdmin || userPermissions['operacoes.freelancer'];
  const canAvaliacoes = isOwnerOrAdmin || userPermissions['operacoes.avaliacoes'];

  const visibleSections = useMemo(() => {
    const sections: { value: string; label: string; icon: React.ElementType }[] = [];
    if (canPacotes) sections.push({ value: "contratos", label: "Pacotes", icon: Package });
    if (canPacotes) sections.push({ value: "opcionais", label: "Opcionais", icon: Package });
    if (canFormularios) sections.push({ value: "formularios", label: "Formulários", icon: FileText });
    if (canChecklist) sections.push({ value: "checklist", label: "Checklist", icon: ListChecks });
    if (canFreelancer || canAvaliacoes) sections.push({ value: "freelancer", label: "Freelancer", icon: HardHat });
    if (canPacotes) sections.push({ value: "taxas_cartao", label: "Taxas de Cartão", icon: CreditCard });
    return sections;
  }, [canFormularios, canChecklist, canPacotes, canFreelancer, canAvaliacoes]);

  // Auto-select the first visible section if current is not visible
  const effectiveSection = useMemo(() => {
    if (visibleSections.find(s => s.value === activeSection)) return activeSection;
    return visibleSections[0]?.value || "formularios";
  }, [activeSection, visibleSections]);

  const handleLogout = async () => { await supabase.auth.signOut(); navigate("/auth"); };
  const handleRefresh = () => { window.location.reload(); };

  const handleSectionChange = (section: string) => {
    const params: Record<string, string> = { section };
    if (section === "formularios") params.tab = activeTab;
    setSearchParams(params);
  };

  const handleTabChange = (tab: string) => {
    setSearchParams({ section: "formularios", tab });
  };

  if (permLoading) {
    return <div className="flex items-center justify-center min-h-screen"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  if (!canView) {
    return (
      <SidebarProvider defaultOpen={false}>
        <div className="min-h-screen flex w-full bg-background">
          <AdminSidebar canManageUsers={canManageUsers} isAdmin={isAdmin} currentUserName={currentUser?.name || ""} onRefresh={handleRefresh} onLogout={handleLogout} />
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center space-y-4 p-8">
              <ShieldAlert className="h-16 w-16 text-muted-foreground mx-auto" />
              <h2 className="text-xl font-semibold">Acesso Restrito</h2>
              <p className="text-muted-foreground max-w-md">
                Você não tem permissão para acessar a seção de Operações. Solicite ao administrador.
              </p>
            </div>
          </div>
        </div>
      </SidebarProvider>
    );
  }

  if (visibleSections.length === 0) {
    return (
      <SidebarProvider defaultOpen={false}>
        <div className="min-h-screen flex w-full bg-background">
          <AdminSidebar canManageUsers={isAdmin} isAdmin={isAdmin} currentUserName={currentUser?.name || ""} onRefresh={handleRefresh} onLogout={handleLogout} />
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center space-y-4 p-8">
              <ShieldAlert className="h-16 w-16 text-muted-foreground mx-auto" />
              <h2 className="text-xl font-semibold">Sem permissões</h2>
              <p className="text-muted-foreground max-w-md">
                Nenhuma seção está disponível para você. Solicite permissões ao administrador.
              </p>
            </div>
          </div>
        </div>
      </SidebarProvider>
    );
  }

  return (
    <SidebarProvider defaultOpen={false}>
      <div className="min-h-screen flex w-full bg-background">
          <AdminSidebar canManageUsers={canManageUsers} isAdmin={isAdmin} currentUserName={currentUser?.name || ""} onRefresh={handleRefresh} onLogout={handleLogout} />
        <div className="flex-1 flex flex-col overflow-hidden min-w-0">
          {/* Mobile Header */}
          <header className="bg-card border-b border-border shrink-0 z-10 md:hidden">
            <div className="px-3 py-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <MobileMenu
                    isOpen={isMobileMenuOpen}
                    onOpenChange={setIsMobileMenuOpen}
                    trigger={<Button variant="ghost" size="icon" className="h-9 w-9"><Menu className="w-5 h-5" /></Button>}
                    currentPage="formularios"
                    userName={currentUser?.name || ""}
                    userEmail={currentUser?.email || ""}
                    userAvatar={currentUser?.avatar}
                    canManageUsers={canManageUsers}
                    isAdmin={isAdmin}
                    onRefresh={handleRefresh}
                    onLogout={handleLogout}
                  />
                  <div className="flex items-center gap-2 min-w-0">
                    <img src={currentCompany?.logo_url || '/placeholder.svg'} alt={currentCompany?.name || 'Logo'} className="h-8 w-auto shrink-0" />
                    <h1 className="font-display font-bold text-foreground text-sm truncate">Operações</h1>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <NotificationBell />
                </div>
              </div>
            </div>
          </header>

          <div className="flex-1 flex flex-col overflow-hidden min-w-0">
            {/* Desktop header */}
            <div className="hidden md:block px-3 md:px-5 pt-3 md:pt-4 pb-0">
              <div className="max-w-7xl mx-auto">
                <div className="relative rounded-2xl border border-border/30 bg-gradient-to-r from-card via-card to-primary/[0.03] shadow-[0_4px_24px_rgba(0,0,0,0.04)] overflow-hidden">
                  <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_80%_-20%,hsl(var(--primary)/0.06),transparent)]" />
                  <div className="relative flex items-center gap-4 p-5 md:p-6">
                    <div className="p-3 rounded-2xl bg-gradient-to-br from-primary to-primary/80 shadow-lg shadow-primary/20">
                      <FolderOpen className="h-7 w-7 text-primary-foreground" />
                    </div>
                    <div>
                      <h1 className="text-2xl lg:text-3xl font-extrabold tracking-tight text-foreground">Operações</h1>
                      <p className="text-sm text-muted-foreground/70 mt-0.5">Gerencie formulários, checklists e pacotes da sua empresa</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Top-level section tabs */}
            <Tabs
              value={effectiveSection}
              onValueChange={handleSectionChange}
              className="flex-1 flex flex-col overflow-hidden"
            >
              <div className="px-3 md:px-5 pt-3 md:pt-4">
                <div className="max-w-7xl mx-auto">
                  <TabsList>
                    {visibleSections.map(s => (
                      <TabsTrigger key={s.value} value={s.value} className="gap-2">
                        <s.icon className="h-4 w-4" />
                        {s.label}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                </div>
              </div>

              {canFormularios && (
                <TabsContent value="formularios" className="flex-1 overflow-hidden mt-0 flex flex-col data-[state=inactive]:hidden">
                  <Tabs
                    value={activeTab}
                    onValueChange={handleTabChange}
                    className="flex-1 flex flex-col overflow-hidden"
                  >
                    <div className="px-3 md:px-5 pt-2">
                      <div className="max-w-7xl mx-auto">
                      <TabsList>
                        {[
                          { value: "avaliacoes", icon: ClipboardCheck, label: "Avaliações" },
                          { value: "prefesta", icon: PartyPopper, label: "Pré-Festa" },
                          { value: "contrato", icon: FileSignature, label: "Contrato" },
                          { value: "cardapio", icon: UtensilsCrossed, label: "Cardápio" },
                        ].map(t => (
                          <TabsTrigger key={t.value} value={t.value} className="gap-2" onClick={() => handleTabChange(t.value)}>
                            <t.icon className="h-4 w-4" />
                            {t.label}
                          </TabsTrigger>
                        ))}
                      </TabsList>
                      </div>
                    </div>

                    <TabsContent value="avaliacoes" className="flex-1 overflow-y-auto mt-0 p-3 md:p-5 pt-3">
                      <div className="max-w-7xl mx-auto"><AvaliacoesContent /></div>
                    </TabsContent>
                    <TabsContent value="prefesta" className="flex-1 overflow-y-auto mt-0 p-3 md:p-5 pt-3">
                      <div className="max-w-7xl mx-auto"><PreFestaContent /></div>
                    </TabsContent>
                    <TabsContent value="contrato" className="flex-1 overflow-y-auto mt-0 p-3 md:p-5 pt-3">
                      <div className="max-w-7xl mx-auto"><ContratoContent /></div>
                    </TabsContent>
                    <TabsContent value="cardapio" className="flex-1 overflow-y-auto mt-0 p-3 md:p-5 pt-3">
                      <div className="max-w-7xl mx-auto"><CardapioContent /></div>
                    </TabsContent>
                  </Tabs>
                </TabsContent>
              )}

              {canChecklist && (
               <TabsContent value="checklist" className="flex-1 overflow-hidden mt-0 flex flex-col data-[state=inactive]:hidden">
                  <Tabs defaultValue="equipe" className="flex-1 flex flex-col overflow-hidden">
                     <div className="px-3 md:px-5 pt-2">
                      <div className="max-w-7xl mx-auto">
                      <TabsList>
                        {[
                          { value: "equipe", icon: Users, label: "Equipe" },
                          { value: "manutencao", icon: Wrench, label: "Manutenção" },
                          { value: "acompanhamento", icon: ClipboardCheck, label: "Acompanhamento" },
                          { value: "presenca", icon: Users, label: "Presença" },
                          { value: "informacoes", icon: FileText, label: "Informações" },
                          { value: "templates", icon: LayoutTemplate, label: "Templates" },
                        ].map(t => (
                          <TabsTrigger key={t.value} value={t.value} className="gap-2">
                            <t.icon className="h-4 w-4" />
                            {t.label}
                          </TabsTrigger>
                        ))}
                      </TabsList>
                      </div>
                    </div>
                    <TabsContent value="equipe" className="flex-1 overflow-y-auto mt-0 p-3 md:p-5 pt-3">
                      <div className="max-w-7xl mx-auto"><EventStaffManager /></div>
                    </TabsContent>
                    <TabsContent value="manutencao" className="flex-1 overflow-y-auto mt-0 p-3 md:p-5 pt-3">
                      <div className="max-w-7xl mx-auto"><MaintenanceManager /></div>
                    </TabsContent>
                    <TabsContent value="acompanhamento" className="flex-1 overflow-y-auto mt-0 p-3 md:p-5 pt-3">
                      <div className="max-w-7xl mx-auto"><PartyMonitoringManager /></div>
                    </TabsContent>
                    <TabsContent value="presenca" className="flex-1 overflow-y-auto mt-0 p-3 md:p-5 pt-3">
                      <div className="max-w-7xl mx-auto"><AttendanceManager /></div>
                    </TabsContent>
                    <TabsContent value="informacoes" className="flex-1 overflow-y-auto mt-0 p-3 md:p-5 pt-3">
                      <div className="max-w-7xl mx-auto"><EventInfoManager /></div>
                    </TabsContent>
                    <TabsContent value="templates" className="flex-1 overflow-y-auto mt-0 p-3 md:p-5 pt-3">
                      <div className="max-w-7xl mx-auto"><ChecklistTemplateManager /></div>
                    </TabsContent>
                  </Tabs>
                </TabsContent>
              )}

              {canPacotes && (
                <TabsContent value="contratos" className="flex-1 overflow-y-auto mt-0 p-3 md:p-5 pt-3">
                  <div className="max-w-7xl mx-auto"><PackagesManager /></div>
                </TabsContent>
              )}

              {canPacotes && (
                <TabsContent value="opcionais" className="flex-1 overflow-y-auto mt-0 p-3 md:p-5 pt-3">
                  <div className="max-w-7xl mx-auto"><OptionalsManager /></div>
                </TabsContent>
              )}

              {(canFreelancer || canAvaliacoes) && (
                <TabsContent value="freelancer" className="flex-1 overflow-hidden mt-0 flex flex-col data-[state=inactive]:hidden">
                  <Tabs defaultValue={canFreelancer ? "escalas" : "avaliacoes-fl"} className="flex-1 flex flex-col overflow-hidden">
                    <div className="px-3 md:px-5 pt-4">
                      <div className="max-w-7xl mx-auto">
                      <TabsList>
                        {canFreelancer && (
                          <TabsTrigger value="escalas" className="gap-1.5">
                            <CalendarClock className="h-3.5 w-3.5" />
                            Escalas
                          </TabsTrigger>
                        )}
                        {canFreelancer && (
                          <TabsTrigger value="cadastro" className="gap-1.5">
                            <HardHat className="h-3.5 w-3.5" />
                            Cadastro
                          </TabsTrigger>
                        )}
                        {canAvaliacoes && (
                          <TabsTrigger value="avaliacoes-fl" className="gap-1.5">
                            <ClipboardCheck className="h-3.5 w-3.5" />
                            Avaliações
                          </TabsTrigger>
                        )}
                      </TabsList>
                      </div>
                    </div>
                    {canFreelancer && (
                      <TabsContent value="escalas" className="flex-1 overflow-y-auto mt-0 p-3 md:p-5 pt-3">
                        <div className="max-w-7xl mx-auto"><FreelancerSchedulesTab /></div>
                      </TabsContent>
                    )}
                    {canFreelancer && (
                      <TabsContent value="cadastro" className="flex-1 overflow-y-auto mt-0 p-3 md:p-5 pt-3">
                        <div className="max-w-7xl mx-auto"><FreelancerManagerContent /></div>
                      </TabsContent>
                    )}
                    {canAvaliacoes && (
                      <TabsContent value="avaliacoes-fl" className="flex-1 overflow-y-auto mt-0 p-3 md:p-5 pt-3">
                        <div className="max-w-7xl mx-auto"><FreelancerEvaluationsTab /></div>
                      </TabsContent>
                    )}
                  </Tabs>
                </TabsContent>
              )}

              {canPacotes && (
                <TabsContent value="taxas_cartao" className="flex-1 overflow-y-auto mt-0 p-3 md:p-5 pt-4">
                  <div className="max-w-7xl mx-auto w-full">
                    <CardFeesManager />
                  </div>
                </TabsContent>
              )}
            </Tabs>
          </div>
        </div>
      </div>
    </SidebarProvider>
  );
}
