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
    return <div className="min-h-screen bg-background flex items-center justify-center"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
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
            <NotificationBell />
          </div>

          <div className="p-4 md:p-6 max-w-6xl mx-auto">
            {/* Desktop header */}
            <div className="hidden md:flex items-center justify-between mb-6">
              <div>
                <h1 className="text-2xl font-bold flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-primary/10">
                    <FileSignature className="h-6 w-6 text-primary" />
                  </div>
                  Contratos
                </h1>
                <p className="text-sm text-muted-foreground mt-1">Gerencie modelos de contrato e contratos gerados</p>
              </div>
              <NotificationBell />
            </div>

            <Tabs defaultValue="modelos" className="space-y-4">
              <TabsList className="grid w-full grid-cols-2 max-w-md">
                <TabsTrigger value="modelos" className="gap-2">
                  <FileSignature className="h-4 w-4" /> Modelos
                </TabsTrigger>
                <TabsTrigger value="gerados" className="gap-2">
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
        </main>
      </div>
    </SidebarProvider>
  );
}
