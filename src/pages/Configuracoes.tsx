import { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User, Session } from "@supabase/supabase-js";
import { useUserRole } from "@/hooks/useUserRole";
import { usePermissions } from "@/hooks/usePermissions";

import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { MobileMenu } from "@/components/admin/MobileMenu";
import { WhatsAppConfig } from "@/components/whatsapp/WhatsAppConfig";
import { PartyControlConfig } from "@/components/admin/PartyControlConfig";
import { ChecklistTemplateManager } from "@/components/agenda/ChecklistTemplateManager";
import { ProfileContent } from "@/components/admin/ProfileContent";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { SidebarProvider } from "@/components/ui/sidebar";
import { Menu, Settings, MessageSquare, PartyPopper, UserCircle } from "lucide-react";
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
  const [searchParams] = useSearchParams();
  const defaultTab = searchParams.get("tab") === "perfil" ? "perfil" : "whatsapp";
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

        <main className="flex-1 p-3 overflow-auto space-y-4">
          <Tabs defaultValue={defaultTab}>
            <TabsList className="w-full">
              <TabsTrigger value="perfil" className="flex-1 gap-2">
                <UserCircle className="h-4 w-4" />
                Perfil
              </TabsTrigger>
              <TabsTrigger value="whatsapp" className="flex-1 gap-2">
                <MessageSquare className="h-4 w-4" />
                WhatsApp
              </TabsTrigger>
              <TabsTrigger value="festa" className="flex-1 gap-2">
                <PartyPopper className="h-4 w-4" />
                Festa
              </TabsTrigger>
            </TabsList>
            <TabsContent value="perfil" className="mt-4">
              <ProfileContent userId={user.id} userEmail={user.email || ""} />
            </TabsContent>
            <TabsContent value="whatsapp" className="mt-4">
              <WhatsAppConfig userId={user.id} isAdmin={isAdmin} />
            </TabsContent>
            <TabsContent value="festa" className="mt-4 space-y-6">
              <PartyControlConfig />
              <div className="pt-2">
                <ChecklistTemplateManager />
              </div>
            </TabsContent>
          </Tabs>
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
              <div className="hidden md:flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-primary/10">
                  <Settings className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold tracking-tight">Configurações</h1>
                  <p className="text-sm text-muted-foreground">
                    Gerencie WhatsApp, bot e preferências do sistema
                  </p>
                </div>
              </div>

              <Tabs defaultValue={defaultTab}>
                <TabsList>
                  <TabsTrigger value="perfil" className="gap-2">
                    <UserCircle className="h-4 w-4" />
                    Perfil
                  </TabsTrigger>
                  <TabsTrigger value="whatsapp" className="gap-2">
                    <MessageSquare className="h-4 w-4" />
                    WhatsApp
                  </TabsTrigger>
                  <TabsTrigger value="festa" className="gap-2">
                    <PartyPopper className="h-4 w-4" />
                    Controle da Festa
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="perfil" className="mt-4">
                  <ProfileContent userId={user.id} userEmail={user.email || ""} />
                </TabsContent>
                <TabsContent value="whatsapp" className="mt-4">
                  <WhatsAppConfig userId={user.id} isAdmin={isAdmin} />
                </TabsContent>
                <TabsContent value="festa" className="mt-4 space-y-6">
                  <PartyControlConfig />
                  <div className="pt-2">
                    <ChecklistTemplateManager />
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
