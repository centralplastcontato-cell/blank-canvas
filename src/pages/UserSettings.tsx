import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User, Session } from "@supabase/supabase-js";
import { useUserRole } from "@/hooks/useUserRole";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { MobileMenu } from "@/components/admin/MobileMenu";
import { ProfileContent } from "@/components/admin/ProfileContent";
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { toast } from "@/hooks/use-toast";
import { Menu, UserCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCompany } from "@/contexts/CompanyContext";

export default function UserSettings() {
  const navigate = useNavigate();
  const { currentCompany } = useCompany();
  const [user, setUser] = useState<User | null>(null);
  const [_session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [fullName, setFullName] = useState("");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const { role, isLoading: isLoadingRole, canManageUsers, isAdmin } = useUserRole(user?.id);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setIsLoading(false);
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setIsLoading(false);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!isLoading && !user) navigate("/auth");
  }, [isLoading, user, navigate]);

  useEffect(() => {
    if (user) {
      supabase.from("profiles").select("full_name").eq("user_id", user.id).single().then(({ data }) => {
        if (data) setFullName(data.full_name || "");
      });
    }
  }, [user]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast({ title: "Logout realizado", description: "Você saiu da sua conta." });
    navigate("/auth");
  };

  const handleRefresh = () => window.location.reload();

  if (isLoading || isLoadingRole) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user || !role) return null;

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  if (isMobile) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <header className="bg-card border-b border-border sticky top-0 z-10">
          <div className="px-3 py-3">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <MobileMenu
                isOpen={isMobileMenuOpen}
                onOpenChange={setIsMobileMenuOpen}
                trigger={<Button variant="ghost" size="icon" className="h-9 w-9"><Menu className="w-5 h-5" /></Button>}
                currentPage="perfil"
                userName={fullName || "Usuário"}
                userEmail={user.email || ""}
                userAvatar={null}
                canManageUsers={canManageUsers}
                isAdmin={isAdmin}
                onRefresh={handleRefresh}
                onLogout={handleLogout}
              />
              <div className="flex items-center gap-2 min-w-0">
                <img src={currentCompany?.logo_url || '/placeholder.svg'} alt={currentCompany?.name || 'Logo'} className="h-8 w-auto shrink-0" />
                <h1 className="font-display font-bold text-foreground text-sm truncate">Perfil</h1>
              </div>
            </div>
          </div>
        </header>
        <main className="flex-1 p-4">
          <ProfileContent userId={user.id} userEmail={user.email || ""} />
        </main>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AdminSidebar
          canManageUsers={canManageUsers}
          currentUserName={fullName || user.email || ""}
          onRefresh={handleRefresh}
          onLogout={handleLogout}
        />
        <SidebarInset className="flex-1 flex flex-col">
          <header className="bg-card border-b border-border sticky top-0 z-10">
            <div className="px-4 py-3 flex items-center gap-4">
              <SidebarTrigger />
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-primary/10">
                  <UserCircle className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h1 className="font-display font-bold text-foreground text-lg">Perfil</h1>
                  <p className="text-sm text-muted-foreground">Gerencie suas informações pessoais</p>
                </div>
              </div>
            </div>
          </header>
          <main className="flex-1 p-6">
            <ProfileContent userId={user.id} userEmail={user.email || ""} />
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
