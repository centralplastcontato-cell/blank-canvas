import { LoadingScreen } from "@/components/ui/loading-screen";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { useUserRole } from "@/hooks/useUserRole";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { MobileMenu } from "@/components/admin/MobileMenu";
import { NotificationBell } from "@/components/admin/NotificationBell";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Menu, FileSignature, FileText } from "lucide-react";
import { ContractModelsList } from "@/components/contracts/ContractModelsList";
import { GeneratedContractsList } from "@/components/contracts/GeneratedContractsList";

export default function ContratosModule() {
  const navigate = useNavigate();
  const { currentCompany } = useCompany();
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [profile, setProfile] = useState<any>(null);

  const { isAdmin, canManageUsers } = useUserRole(user?.id);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setIsLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!isLoading && !user) navigate("/auth");
  }, [isLoading, user]);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("full_name, email, avatar_url").eq("user_id", user.id).single()
      .then(({ data }) => { if (data) setProfile(data); });
  }, [user]);

  const handleLogout = async () => { await supabase.auth.signOut(); navigate("/auth"); };
  const handleRefresh = () => window.location.reload();

  if (isLoading || !user) {
    return <LoadingScreen message="Carregando contratos..." />;
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <AdminSidebar
          canManageUsers={canManageUsers}
          isAdmin={isAdmin}
          currentUserName={profile?.full_name || user.email || ""}
          onRefresh={handleRefresh}
          onLogout={handleLogout}
        />
        <main className="flex-1 overflow-auto">
          {/* Mobile header */}
          <div className="md:hidden flex items-center justify-between p-4 border-b border-border/40 bg-card/80 backdrop-blur-sm sticky top-0 z-30">
            <MobileMenu
              isOpen={isMobileMenuOpen}
              onOpenChange={setIsMobileMenuOpen}
              trigger={<button className="p-2 rounded-xl hover:bg-accent"><Menu className="h-5 w-5" /></button>}
              currentPage="formularios"
              userName={profile?.full_name || ""}
              userEmail={profile?.email || user.email || ""}
              userAvatar={profile?.avatar_url}
              canManageUsers={canManageUsers}
              isAdmin={isAdmin}
              onLogout={handleLogout}
            />
            <h1 className="text-lg font-bold flex items-center gap-2">
              <FileSignature className="h-5 w-5 text-primary" /> Contratos
            </h1>
            <div />
          </div>

          <div className="flex-1 p-3 md:p-5 overflow-auto">
          <div className="max-w-7xl mx-auto space-y-4">
            {/* Desktop header */}
            <div className="hidden md:block mb-6">
              <div className="relative rounded-2xl border border-border/30 bg-gradient-to-r from-card via-card to-primary/[0.03] shadow-[0_4px_24px_rgba(0,0,0,0.04)] overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_80%_-20%,hsl(var(--primary)/0.06),transparent)]" />
                <div className="relative flex items-center justify-between gap-4 p-5 md:p-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-2xl bg-gradient-to-br from-primary to-primary/80 shadow-lg shadow-primary/20">
                      <FileSignature className="h-7 w-7 text-primary-foreground" />
                    </div>
                    <div>
                      <h1 className="text-2xl lg:text-3xl font-extrabold tracking-tight text-foreground">Contratos</h1>
                      <p className="text-sm text-muted-foreground/70 mt-0.5">Gerencie modelos de contrato e contratos gerados</p>
                    </div>
                  </div>
                  <div />
                </div>
              </div>
            </div>

            <Tabs defaultValue="modelos" className="space-y-4">
              <TabsList className="bg-transparent p-0 h-auto gap-1.5 flex-wrap">
                <TabsTrigger value="modelos" className="gap-2 rounded-xl px-5 py-2 text-sm font-medium border border-border data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:border-primary data-[state=active]:shadow-sm data-[state=inactive]:bg-transparent data-[state=inactive]:text-muted-foreground data-[state=inactive]:shadow-none hover:bg-accent hover:text-foreground">
                  <FileSignature className="h-4 w-4" /> Modelos
                </TabsTrigger>
                <TabsTrigger value="gerados" className="gap-2 rounded-xl px-5 py-2 text-sm font-medium border border-border data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:border-primary data-[state=active]:shadow-sm data-[state=inactive]:bg-transparent data-[state=inactive]:text-muted-foreground data-[state=inactive]:shadow-none hover:bg-accent hover:text-foreground">
                  <FileText className="h-4 w-4" /> Gerados
                </TabsTrigger>
              </TabsList>

              <TabsContent value="modelos">
                <ContractModelsList userId={user.id} />
              </TabsContent>

              <TabsContent value="gerados">
                <GeneratedContractsList userId={user.id} />
              </TabsContent>
            </Tabs>
          </div>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
