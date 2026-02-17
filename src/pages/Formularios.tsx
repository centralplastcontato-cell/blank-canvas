import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

import { SidebarProvider } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { MobileMenu } from "@/components/admin/MobileMenu";
import { NotificationBell } from "@/components/admin/NotificationBell";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { FolderOpen, Menu, Loader2, ClipboardCheck, PartyPopper, FileSignature, UtensilsCrossed, ListChecks, FileText, Package, Users, Wrench, HardHat } from "lucide-react";
import logoCastelo from "@/assets/logo-castelo.png";
import { AvaliacoesContent } from "./Avaliacoes";
import { PreFestaContent } from "./PreFesta";
import { ContratoContent } from "./Contrato";
import { CardapioContent } from "./Cardapio";
import { EventStaffManager } from "@/components/agenda/EventStaffManager";
import { PackagesManager } from "@/components/admin/PackagesManager";
import { MaintenanceManager } from "@/components/agenda/MaintenanceManager";
import { PartyMonitoringManager } from "@/components/agenda/PartyMonitoringManager";
import { AttendanceManager } from "@/components/agenda/AttendanceManager";
import { EventInfoManager } from "@/components/agenda/EventInfoManager";
import { FreelancerManagerContent } from "./FreelancerManager";

export default function Formularios() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  
  const [isAdmin, setIsAdmin] = useState(false);
  const [permLoading, setPermLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<{ id: string; name: string; email: string; avatar?: string | null } | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const activeSection = searchParams.get("section") || "formularios";
  const activeTab = searchParams.get("tab") || "avaliacoes";

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

  return (
    <SidebarProvider defaultOpen={false}>
      <div className="min-h-screen flex w-full bg-background">
        <AdminSidebar canManageUsers={isAdmin} isAdmin={isAdmin} currentUserName={currentUser?.name || ""} onRefresh={handleRefresh} onLogout={handleLogout} />
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
                    currentPage="formularios"
                    userName={currentUser?.name || ""}
                    userEmail={currentUser?.email || ""}
                    userAvatar={currentUser?.avatar}
                    canManageUsers={isAdmin}
                    isAdmin={isAdmin}
                    onRefresh={handleRefresh}
                    onLogout={handleLogout}
                  />
                  <div className="flex items-center gap-2 min-w-0">
                    <img src={logoCastelo} alt="Logo" className="h-8 w-auto shrink-0" />
                    <h1 className="font-display font-bold text-foreground text-sm truncate">Operações</h1>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <NotificationBell />
                </div>
              </div>
            </div>
          </header>

          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Desktop header */}
            <div className="hidden md:flex items-center justify-between gap-3 p-6 pb-0">
              <div className="flex items-center gap-3">
                <FolderOpen className="h-7 w-7 text-primary" />
                <div>
                  <h1 className="text-2xl font-bold">Operações</h1>
                  <p className="text-sm text-muted-foreground">Gerencie formulários, checklists e pacotes da sua empresa</p>
                </div>
              </div>
            </div>

            {/* Top-level section tabs */}
            <Tabs
              value={activeSection}
              onValueChange={handleSectionChange}
              className="flex-1 flex flex-col overflow-hidden"
            >
              <div className="px-3 md:px-6 pt-3 md:pt-4 overflow-x-auto">
                <TabsList className="w-max md:w-auto">
                  <TabsTrigger value="formularios" className="flex-1 md:flex-none gap-1.5">
                    <FileText className="h-4 w-4" />
                    <span>Formulários</span>
                  </TabsTrigger>
                  <TabsTrigger value="checklist" className="flex-1 md:flex-none gap-1.5">
                    <ListChecks className="h-4 w-4" />
                    <span>Checklist</span>
                  </TabsTrigger>
                  <TabsTrigger value="pacotes" className="flex-1 md:flex-none gap-1.5">
                    <Package className="h-4 w-4" />
                    <span>Pacotes</span>
                  </TabsTrigger>
                  <TabsTrigger value="freelancer" className="flex-1 md:flex-none gap-1.5">
                    <HardHat className="h-4 w-4" />
                    <span>Freelancer</span>
                  </TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="formularios" className="flex-1 overflow-hidden mt-0 flex flex-col data-[state=inactive]:hidden">
                <Tabs
                  value={activeTab}
                  onValueChange={handleTabChange}
                  className="flex-1 flex flex-col overflow-hidden"
                >
                  <div className="px-3 md:px-6 pt-2 overflow-x-auto">
                    <TabsList className="w-max md:w-auto">
                      <TabsTrigger value="avaliacoes" className="shrink-0 gap-1.5">
                        <ClipboardCheck className="h-4 w-4" />
                        <span>Avaliações</span>
                      </TabsTrigger>
                      <TabsTrigger value="prefesta" className="shrink-0 gap-1.5">
                        <PartyPopper className="h-4 w-4" />
                        <span>Pré-Festa</span>
                      </TabsTrigger>
                      <TabsTrigger value="contrato" className="shrink-0 gap-1.5">
                        <FileSignature className="h-4 w-4" />
                        <span>Contrato</span>
                      </TabsTrigger>
                      <TabsTrigger value="cardapio" className="shrink-0 gap-1.5">
                        <UtensilsCrossed className="h-4 w-4" />
                        <span>Cardápio</span>
                      </TabsTrigger>
                    </TabsList>
                  </div>

                  <TabsContent value="avaliacoes" className="flex-1 overflow-y-auto mt-0 p-3 md:p-6 pt-3">
                    <AvaliacoesContent />
                  </TabsContent>
                  <TabsContent value="prefesta" className="flex-1 overflow-y-auto mt-0 p-3 md:p-6 pt-3">
                    <PreFestaContent />
                  </TabsContent>
                  <TabsContent value="contrato" className="flex-1 overflow-y-auto mt-0 p-3 md:p-6 pt-3">
                    <ContratoContent />
                  </TabsContent>
                  <TabsContent value="cardapio" className="flex-1 overflow-y-auto mt-0 p-3 md:p-6 pt-3">
                    <CardapioContent />
                  </TabsContent>
                </Tabs>
              </TabsContent>

              <TabsContent value="checklist" className="flex-1 overflow-hidden mt-0 flex flex-col data-[state=inactive]:hidden">
                <Tabs defaultValue="equipe" className="flex-1 flex flex-col overflow-hidden">
                  <div className="px-3 md:px-6 pt-2 overflow-x-auto">
                    <TabsList className="w-max md:w-auto">
                      <TabsTrigger value="equipe" className="shrink-0 gap-1.5">
                        <Users className="h-4 w-4" />
                        <span>Equipe</span>
                      </TabsTrigger>
                      <TabsTrigger value="manutencao" className="shrink-0 gap-1.5">
                        <Wrench className="h-4 w-4" />
                        <span>Manutenção</span>
                      </TabsTrigger>
                      <TabsTrigger value="acompanhamento" className="shrink-0 gap-1.5">
                        <ClipboardCheck className="h-4 w-4" />
                        <span>Acompanhamento</span>
                      </TabsTrigger>
                      <TabsTrigger value="presenca" className="shrink-0 gap-1.5">
                        <Users className="h-4 w-4" />
                        <span>Presença</span>
                      </TabsTrigger>
                      <TabsTrigger value="informacoes" className="shrink-0 gap-1.5">
                        <FileText className="h-4 w-4" />
                        <span>Informações</span>
                      </TabsTrigger>
                    </TabsList>
                  </div>
                  <TabsContent value="equipe" className="flex-1 overflow-y-auto mt-0 p-3 md:p-6 pt-3">
                    <EventStaffManager />
                  </TabsContent>
                  <TabsContent value="manutencao" className="flex-1 overflow-y-auto mt-0 p-3 md:p-6 pt-3">
                    <MaintenanceManager />
                  </TabsContent>
                  <TabsContent value="acompanhamento" className="flex-1 overflow-y-auto mt-0 p-3 md:p-6 pt-3">
                    <PartyMonitoringManager />
                  </TabsContent>
                  <TabsContent value="presenca" className="flex-1 overflow-y-auto mt-0 p-3 md:p-6 pt-3">
                    <AttendanceManager />
                  </TabsContent>
                  <TabsContent value="informacoes" className="flex-1 overflow-y-auto mt-0 p-3 md:p-6 pt-3">
                    <EventInfoManager />
                  </TabsContent>
                </Tabs>
              </TabsContent>

              <TabsContent value="pacotes" className="flex-1 overflow-y-auto mt-0 p-3 md:p-6 pt-3 data-[state=inactive]:hidden">
                <PackagesManager />
              </TabsContent>

              <TabsContent value="freelancer" className="flex-1 overflow-y-auto mt-0 p-3 md:p-6 pt-3 data-[state=inactive]:hidden">
                <FreelancerManagerContent />
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </SidebarProvider>
  );
}
