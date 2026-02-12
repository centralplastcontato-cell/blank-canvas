import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useCompanyModules } from "@/hooks/useCompanyModules";
import { useLeadIntelligence } from "@/hooks/useLeadIntelligence";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Brain, Loader2, ShieldAlert } from "lucide-react";
import { PrioridadesTab } from "@/components/inteligencia/PrioridadesTab";
import { FunilTab } from "@/components/inteligencia/FunilTab";
import { LeadsDoDiaTab } from "@/components/inteligencia/LeadsDoDiaTab";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/admin/AdminSidebar";

export default function Inteligencia() {
  const navigate = useNavigate();
  const modules = useCompanyModules();
  const { data, isLoading } = useLeadIntelligence();

  const [isAdmin, setIsAdmin] = useState(false);
  const [hasView, setHasView] = useState(false);
  const [hasExport, setHasExport] = useState(false);
  const [permLoading, setPermLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => {
    async function check() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/auth"); return; }

      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("user_id", user.id)
        .single();

      setCurrentUser({ id: user.id, name: profile?.full_name || "Usuário" });

      // Check admin via RPC
      const { data: adminResult } = await supabase.rpc("is_admin", { _user_id: user.id });
      const userIsAdmin = adminResult === true;
      setIsAdmin(userIsAdmin);

      if (userIsAdmin) {
        setHasView(true);
        setHasExport(true);
        setPermLoading(false);
        return;
      }

      const { data: perms } = await supabase
        .from("user_permissions")
        .select("permission, granted")
        .eq("user_id", user.id)
        .in("permission", ["ic.view", "ic.export"]);

      const permMap = new Map(perms?.map(p => [p.permission, p.granted]) || []);
      setHasView(permMap.get("ic.view") === true);
      setHasExport(permMap.get("ic.export") === true);
      setPermLoading(false);
    }
    check();
  }, [navigate]);

  if (!modules.inteligencia && !isAdmin) {
    if (permLoading) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      );
    }
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-3">
          <ShieldAlert className="h-12 w-12 text-muted-foreground mx-auto" />
          <p className="text-muted-foreground">Módulo Inteligência não está habilitado.</p>
        </div>
      </div>
    );
  }

  if (permLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!hasView) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-3">
          <ShieldAlert className="h-12 w-12 text-muted-foreground mx-auto" />
          <p className="text-muted-foreground">Você não tem permissão para acessar este módulo.</p>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider defaultOpen={false}>
      <div className="min-h-screen flex w-full bg-background">
        <AdminSidebar
          canManageUsers={isAdmin}
          isAdmin={isAdmin}
          currentUserName={currentUser?.name || ""}
          onRefresh={() => window.location.reload()}
          onLogout={async () => {
            await supabase.auth.signOut();
            navigate("/auth");
          }}
        />
        <main className="flex-1 p-4 md:p-6 overflow-auto">
          <div className="max-w-7xl mx-auto space-y-6">
            <div className="flex items-center gap-3">
              <Brain className="h-7 w-7 text-primary" />
              <div>
                <h1 className="text-2xl font-bold">Inteligência</h1>
                <p className="text-sm text-muted-foreground">
                  Score de leads, priorização e análise de funil
                </p>
              </div>
            </div>

            <Tabs defaultValue="prioridades">
              <TabsList>
                <TabsTrigger value="prioridades">Prioridades</TabsTrigger>
                <TabsTrigger value="funil">Funil</TabsTrigger>
                <TabsTrigger value="leads-dia">Leads do Dia</TabsTrigger>
              </TabsList>

              <TabsContent value="prioridades">
                {isLoading ? (
                  <div className="flex justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <PrioridadesTab data={data || []} />
                )}
              </TabsContent>

              <TabsContent value="funil">
                {isLoading ? (
                  <div className="flex justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <FunilTab data={data || []} />
                )}
              </TabsContent>

              <TabsContent value="leads-dia">
                {isLoading ? (
                  <div className="flex justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <LeadsDoDiaTab data={data || []} canExport={hasExport} />
                )}
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
