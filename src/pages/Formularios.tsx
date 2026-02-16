import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

import { SidebarProvider } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { MobileMenu } from "@/components/admin/MobileMenu";
import { NotificationBell } from "@/components/admin/NotificationBell";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { FileText, Menu, Loader2, ClipboardCheck, PartyPopper, FileSignature } from "lucide-react";
import logoCastelo from "@/assets/logo-castelo.png";
import { AvaliacoesContent } from "./Avaliacoes";
import { PreFestaContent } from "./PreFesta";
import { ContratoContent } from "./Contrato";

export default function Formularios() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  
  const [isAdmin, setIsAdmin] = useState(false);
  const [permLoading, setPermLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<{ id: string; name: string; email: string; avatar?: string | null } | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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
                    <h1 className="font-display font-bold text-foreground text-sm truncate">Formulários</h1>
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
                <FileText className="h-7 w-7 text-primary" />
                <div>
                  <h1 className="text-2xl font-bold">Formulários</h1>
                  <p className="text-sm text-muted-foreground">Gerencie avaliações, pré-festa e outros formulários</p>
                </div>
              </div>
            </div>

            <Tabs
              value={activeTab}
              onValueChange={(v) => setSearchParams({ tab: v })}
              className="flex-1 flex flex-col overflow-hidden"
            >
              <div className="px-3 md:px-6 pt-3 md:pt-4">
                <TabsList className="w-full md:w-auto">
                  <TabsTrigger value="avaliacoes" className="flex-1 md:flex-none gap-1.5">
                    <ClipboardCheck className="h-4 w-4" />
                    <span>Avaliações</span>
                  </TabsTrigger>
                  <TabsTrigger value="prefesta" className="flex-1 md:flex-none gap-1.5">
                    <PartyPopper className="h-4 w-4" />
                    <span>Pré-Festa</span>
                  </TabsTrigger>
                  <TabsTrigger value="contrato" className="flex-1 md:flex-none gap-1.5">
                    <FileSignature className="h-4 w-4" />
                    <span>Contrato</span>
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
            </Tabs>
          </div>
        </div>
      </div>
    </SidebarProvider>
  );
}
