import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useCompanyModules } from "@/hooks/useCompanyModules";
import { useLeadIntelligence } from "@/hooks/useLeadIntelligence";
import { useUnitPermissions } from "@/hooks/useUnitPermissions";
import { useCompanyUnits } from "@/hooks/useCompanyUnits";
import { useCompany } from "@/contexts/CompanyContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  const { currentCompany } = useCompany();

  const [isAdmin, setIsAdmin] = useState(false);
  const [hasView, setHasView] = useState(false);
  const [hasExport, setHasExport] = useState(false);
  const [permLoading, setPermLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<{ id: string; name: string } | null>(null);
  const [selectedUnit, setSelectedUnit] = useState<string>("all");

  const { units } = useCompanyUnits(currentCompany?.id);
  const { canViewAll, allowedUnits, isLoading: isLoadingUnitPerms } = useUnitPermissions(currentUser?.id, currentCompany?.id);

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

  // Filter data by unit permissions and selected unit
  const filteredData = (data || []).filter(d => {
    // Admin sees all
    if (isAdmin || canViewAll) {
      if (selectedUnit === "all") return true;
      return d.lead_unit === selectedUnit || d.lead_unit === "As duas";
    }
    // Non-admin: filter by allowed units
    const unitMatch = allowedUnits.includes(d.lead_unit || "") || d.lead_unit === "As duas";
    if (selectedUnit === "all") return unitMatch;
    return (d.lead_unit === selectedUnit || d.lead_unit === "As duas");
  });

  // Build unit options for selector
  const unitOptions = isAdmin || canViewAll
    ? units.map(u => ({ value: u.name, label: u.name }))
    : units.filter(u => allowedUnits.includes(u.name)).map(u => ({ value: u.name, label: u.name }));

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
        <main className="flex-1 p-3 md:p-6 overflow-x-hidden overflow-y-auto">
          <div className="max-w-7xl mx-auto space-y-6">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-3">
                <Brain className="h-7 w-7 text-primary" />
                <div>
                  <h1 className="text-2xl font-bold">Inteligência</h1>
                  <p className="text-sm text-muted-foreground">
                    Score de leads, priorização e análise de funil
                  </p>
                </div>
              </div>
              {unitOptions.length > 1 && (
                <Select value={selectedUnit} onValueChange={setSelectedUnit}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Todas as unidades" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as unidades</SelectItem>
                    {unitOptions.map(u => (
                      <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <Tabs defaultValue="prioridades">
              <TabsList>
                <TabsTrigger value="prioridades">Prioridades</TabsTrigger>
                <TabsTrigger value="funil">Funil</TabsTrigger>
                <TabsTrigger value="leads-dia">Leads do Dia</TabsTrigger>
              </TabsList>

              <TabsContent value="prioridades">
                {isLoading || isLoadingUnitPerms ? (
                  <div className="flex justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <PrioridadesTab data={filteredData} />
                )}
              </TabsContent>

              <TabsContent value="funil">
                {isLoading || isLoadingUnitPerms ? (
                  <div className="flex justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <FunilTab data={filteredData} />
                )}
              </TabsContent>

              <TabsContent value="leads-dia">
                {isLoading || isLoadingUnitPerms ? (
                  <div className="flex justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <LeadsDoDiaTab data={filteredData} canExport={hasExport} />
                )}
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
