import { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User, Session } from "@supabase/supabase-js";
import { useUserRole } from "@/hooks/useUserRole";
import { usePermissions } from "@/hooks/usePermissions";

import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { MobileMenu } from "@/components/admin/MobileMenu";
import { WhatsAppConfig } from "@/components/whatsapp/WhatsAppConfig";

import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import logoCastelo from "@/assets/logo-castelo.png";
import { toast } from "@/hooks/use-toast";

interface Profile {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  is_active: boolean;
  avatar_url: string | null;
}

export default function Configuracoes() {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [_session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUserProfile, setCurrentUserProfile] = useState<Profile | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const { role, isLoading: isLoadingRole, canManageUsers, isAdmin } = useUserRole(user?.id);
  const { hasPermission, isLoading: isLoadingPermissions } = usePermissions(user?.id);
  
  const canAccessConfig = isAdmin || hasPermission('config.view');

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

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast({
      title: "Logout realizado",
      description: "Você saiu da sua conta.",
    });
    navigate("/auth");
  };

  const handleRefresh = () => {
    window.location.reload();
  };

  if (isLoading || isLoadingRole || isLoadingPermissions) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user || !role) {
    return null;
  }

  if (!canAccessConfig) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-lg font-semibold mb-2">Acesso restrito</h2>
          <p className="text-muted-foreground">Você não tem permissão para acessar as configurações.</p>
        </div>
      </div>
    );
  }

  const getInitials = (name: string) => {
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  };

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  // Mobile layout
  if (isMobile) {
    return (
      <div className="h-dvh flex flex-col overflow-hidden bg-gradient-to-br from-background to-muted/30">
        <Helmet><title>Configurações</title></Helmet>
        {/* Mobile Header */}
        <header className="bg-card/80 backdrop-blur-sm border-b border-border/60 shrink-0 z-10 shadow-subtle">
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
                  currentPage="configuracoes"
                  userName={currentUserProfile?.full_name || ""}
                  userEmail={user.email || ""}
                  canManageUsers={canManageUsers}
                  onRefresh={handleRefresh}
                  onLogout={handleLogout}
                />

                <div className="flex items-center gap-2 min-w-0">
                  <img src={logoCastelo} alt="Castelo da Diversão" className="h-8 w-auto shrink-0" />
                  <h1 className="font-display font-bold text-foreground text-sm truncate">Configurações</h1>
                </div>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 p-3 overflow-auto space-y-6">
          <WhatsAppConfig userId={user.id} isAdmin={isAdmin} />
        </main>
      </div>
    );
  }

  // Desktop layout
  return (
    <SidebarProvider>
      <Helmet><title>Configurações</title></Helmet>
      <div className="h-dvh flex w-full overflow-hidden">
        <AdminSidebar 
          canManageUsers={canManageUsers}
          isAdmin={isAdmin}
          currentUserName={currentUserProfile?.full_name || user.email || ""} 
          onRefresh={handleRefresh} 
          onLogout={handleLogout} 
        />
        
        <SidebarInset className="flex-1 flex flex-col overflow-hidden min-w-0 bg-gradient-to-br from-background to-muted/30">
          {/* Desktop Header - Premium Glass Effect */}
          <header className="bg-card/80 backdrop-blur-sm border-b border-border/60 shrink-0 z-10 shadow-subtle">
            <div className="px-4 py-2.5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <SidebarTrigger className="text-muted-foreground hover:text-foreground" />
                <h1 className="font-display font-bold text-foreground">Configurações</h1>
              </div>
              
              {/* User Info Desktop - Premium Style */}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 bg-border rounded-full pl-3 pr-1 py-1">
                  <span className="text-sm text-muted-foreground hidden lg:block">{currentUserProfile?.full_name || user.email}</span>
                  <Avatar className="h-8 w-8 border-2 border-primary/20">
                    <AvatarImage src={currentUserProfile?.avatar_url || undefined} />
                    <AvatarFallback className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground text-sm font-medium">
                      {getInitials(currentUserProfile?.full_name || user.email || "U")}
                    </AvatarFallback>
                  </Avatar>
                </div>
              </div>
            </div>
          </header>

          <main className="flex-1 p-6 overflow-auto space-y-6">
            <WhatsAppConfig userId={user.id} isAdmin={isAdmin} />
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
