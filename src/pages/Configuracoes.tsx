import { useState, useEffect } from "react";
import { showLogoutToast } from "@/lib/logoutToast";
import { LoadingScreen } from "@/components/ui/loading-screen";
import { getCompanyLogoOverride } from "@/lib/companyAssetOverrides";
import { Helmet } from "react-helmet-async";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User, Session } from "@supabase/supabase-js";
import { useUserRole } from "@/hooks/useUserRole";
import { usePermissions } from "@/hooks/usePermissions";
import { useCompanyModules } from "@/hooks/useCompanyModules";

import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { MobileMenu } from "@/components/admin/MobileMenu";


import { SidebarProvider } from "@/components/ui/sidebar";
import { Menu, Settings } from "lucide-react";
import { SettingsHub } from "@/components/settings/SettingsHub";
import { Button } from "@/components/ui/button";
import { useCompany } from "@/contexts/CompanyContext";
import { toast } from "@/hooks/use-toast";
import { AccessDeniedRedirect } from "@/components/AccessDeniedRedirect";

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
  const { currentCompany } = useCompany();
  const [user, setUser] = useState<User | null>(null);
  const [_session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUserProfile, setCurrentUserProfile] = useState<Profile | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const { role, isLoading: isLoadingRole, canManageUsers, isAdmin, isGestor } = useUserRole(user?.id);
  const { hasPermission, isLoading: isLoadingPermissions } = usePermissions(user?.id);
  const modules = useCompanyModules();
  const showOperacoes = isAdmin || modules.operacoes;
  
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
    await supabase.auth.signOut({ scope: "local" });
    showLogoutToast();
    navigate("/auth");
  };

  const handleRefresh = () => {
    window.location.reload();
  };

  if (isLoading || isLoadingRole || isLoadingPermissions) {
    return <LoadingScreen message="Carregando configurações..." />;
  }

  if (!user || !role) {
    return null;
  }

  if (!canAccessConfig) {
    return (
      <AccessDeniedRedirect message="Você não tem permissão para acessar as configurações." />
    );
  }

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
                  <img src={getCompanyLogoOverride(currentCompany?.slug, currentCompany?.logo_url) || '/placeholder.svg'} alt={currentCompany?.name || 'Logo'} className="h-8 w-auto shrink-0" />
                  <h1 className="font-display font-bold text-foreground text-sm truncate">Configurações</h1>
                </div>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 p-3 overflow-auto space-y-4">
          <SettingsHub
            userId={user.id}
            userEmail={user.email || ""}
            isAdmin={isAdmin}
            isGestor={isGestor}
            canManageUsers={canManageUsers}
            showOperacoes={showOperacoes}
            isMobile
          />
        </main>
      </div>
    );
  }

  // Desktop layout
  return (
    <SidebarProvider defaultOpen={false}>
      <Helmet><title>Configurações</title></Helmet>
      <div className="min-h-screen flex w-full bg-background">
        <AdminSidebar 
          canManageUsers={canManageUsers}
          isAdmin={isAdmin}
          currentUserName={currentUserProfile?.full_name || user.email || ""} 
          onRefresh={handleRefresh} 
          onLogout={handleLogout} 
        />
        
        <div className="flex-1 flex flex-col overflow-hidden">
          <main className="flex-1 p-3 md:p-5 overflow-auto">
            <div className="max-w-7xl mx-auto space-y-4">
              {/* Desktop header */}
              <div className="hidden md:block">
                <div className="relative rounded-2xl border border-border/30 bg-gradient-to-r from-card via-card to-primary/[0.03] shadow-[0_4px_24px_rgba(0,0,0,0.04)] overflow-hidden">
                  <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_80%_-20%,hsl(var(--primary)/0.06),transparent)]" />
                  <div className="relative flex items-center gap-4 p-5 md:p-6">
                    <div className="p-3 rounded-2xl bg-gradient-to-br from-primary to-primary/80 shadow-lg shadow-primary/20">
                      <Settings className="h-7 w-7 text-primary-foreground" />
                    </div>
                    <div>
                      <h1 className="text-2xl lg:text-3xl font-extrabold tracking-tight text-foreground">Configurações</h1>
                      <p className="text-sm text-muted-foreground/70 mt-0.5">Buffet, WhatsApp, IA, mensagens automáticas e sistema</p>
                    </div>
                  </div>
                </div>
              </div>

              <SettingsHub
                userId={user.id}
                userEmail={user.email || ""}
                isAdmin={isAdmin}
                isGestor={isGestor}
                canManageUsers={canManageUsers}
                showOperacoes={showOperacoes}
                isMobile={false}
              />
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
