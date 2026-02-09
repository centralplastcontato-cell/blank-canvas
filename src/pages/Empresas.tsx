import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User, Session } from "@supabase/supabase-js";
import { useUserRole } from "@/hooks/useUserRole";
import { usePermissions } from "@/hooks/usePermissions";
import { Company } from "@/types/company";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { MobileMenu } from "@/components/admin/MobileMenu";
import { CompanyFormDialog } from "@/components/admin/CompanyFormDialog";
import { CompanyMembersSheet } from "@/components/admin/CompanyMembersSheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { Building2, Plus, Pencil, Users, Loader2, Menu } from "lucide-react";
import { toast } from "@/hooks/use-toast";


interface Profile {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  avatar_url?: string | null;
  is_active: boolean;
}

export default function EmpresasPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [_session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [isLoadingCompanies, setIsLoadingCompanies] = useState(true);
  const [currentUserProfile, setCurrentUserProfile] = useState<Profile | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Dialog states
  const [formOpen, setFormOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [membersCompany, setMembersCompany] = useState<Company | null>(null);
  const [membersOpen, setMembersOpen] = useState(false);
  const [memberCounts, setMemberCounts] = useState<Record<string, number>>({});

  const { isAdmin, isLoading: isLoadingRole, hasFetched, canManageUsers } = useUserRole(user?.id);
  const { hasPermission } = usePermissions(user?.id);
  const canAccessB2B = isAdmin || hasPermission('b2b.view');

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
      supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .single()
        .then(({ data }) => { if (data) setCurrentUserProfile(data as Profile); });
    }
  }, [user]);

  // Track which userId the role was fetched for to avoid stale state race condition
  const [roleCheckedForUser, setRoleCheckedForUser] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoadingRole && hasFetched && user?.id) {
      setRoleCheckedForUser(user.id);
    }
  }, [isLoadingRole, hasFetched, user?.id]);

  useEffect(() => {
    if (roleCheckedForUser && user && roleCheckedForUser === user.id && !isAdmin) {
      toast({ title: "Acesso negado", description: "Apenas administradores podem gerenciar empresas.", variant: "destructive" });
      navigate("/atendimento");
    }
  }, [roleCheckedForUser, isAdmin, user, navigate]);

  useEffect(() => {
    if (isAdmin) fetchCompanies();
  }, [isAdmin]);

  const fetchCompanies = async () => {
    setIsLoadingCompanies(true);
    const { data, error } = await supabase
      .from("companies")
      .select("*")
      .order("name");

    if (error) {
      console.error("Error fetching companies:", error);
    } else {
      setCompanies((data || []) as Company[]);

      // Fetch member counts
      const { data: ucData } = await supabase
        .from("user_companies")
        .select("company_id");

      if (ucData) {
        const counts: Record<string, number> = {};
        ucData.forEach((uc) => {
          counts[uc.company_id] = (counts[uc.company_id] || 0) + 1;
        });
        setMemberCounts(counts);
      }
    }
    setIsLoadingCompanies(false);
  };

  const handleCreateCompany = async (data: { name: string; slug: string; is_active: boolean; logo_url: string }) => {
    const { error } = await supabase.from("companies").insert({
      name: data.name,
      slug: data.slug,
      is_active: data.is_active,
      logo_url: data.logo_url || null,
    });

    if (error) {
      toast({ title: "Erro ao criar empresa", description: error.message, variant: "destructive" });
      throw error;
    }
    toast({ title: "Empresa criada", description: `${data.name} foi criada com sucesso.` });
    fetchCompanies();
  };

  const handleUpdateCompany = async (data: { name: string; slug: string; is_active: boolean; logo_url: string }) => {
    if (!editingCompany) return;
    const { error } = await supabase
      .from("companies")
      .update({
        name: data.name,
        slug: data.slug,
        is_active: data.is_active,
        logo_url: data.logo_url || null,
      })
      .eq("id", editingCompany.id);

    if (error) {
      toast({ title: "Erro ao atualizar empresa", description: error.message, variant: "destructive" });
      throw error;
    }
    toast({ title: "Empresa atualizada" });
    setEditingCompany(null);
    fetchCompanies();
  };

  const handleOpenCreate = () => {
    setEditingCompany(null);
    setFormOpen(true);
  };

  const handleOpenEdit = (company: Company) => {
    setEditingCompany(company);
    setFormOpen(true);
  };

  const handleOpenMembers = (company: Company) => {
    setMembersCompany(company);
    setMembersOpen(true);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  const handleRefresh = () => fetchCompanies();

  if (isLoading || isLoadingRole) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!user || !isAdmin) return null;

  const isMobile = typeof window !== "undefined" && window.innerWidth < 768;

  return (
    <>
      <CompanyFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        company={editingCompany}
        onSubmit={editingCompany ? handleUpdateCompany : handleCreateCompany}
      />
      <CompanyMembersSheet
        open={membersOpen}
        onOpenChange={setMembersOpen}
        company={membersCompany}
      />

      <SidebarProvider>
        <div className="min-h-screen flex w-full bg-background">
          {!isMobile && (
            <AdminSidebar
              canManageUsers={canManageUsers}
              canAccessB2B={canAccessB2B}
              currentUserName={currentUserProfile?.full_name || ""}
              onRefresh={handleRefresh}
              onLogout={handleLogout}
            />
          )}

          <SidebarInset className="flex-1">
            {/* Header */}
            <header className="bg-card border-b border-border px-4 py-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                {isMobile ? (
                  <MobileMenu
                    isOpen={isMobileMenuOpen}
                    onOpenChange={setIsMobileMenuOpen}
                    trigger={
                      <Button variant="ghost" size="icon" className="h-9 w-9">
                        <Menu className="w-5 h-5" />
                      </Button>
                    }
                    currentPage="empresas"
                    userName={currentUserProfile?.full_name || ""}
                    userEmail={user.email || ""}
                    userAvatar={currentUserProfile?.avatar_url}
                    canManageUsers={canManageUsers}
                    canAccessB2B={canAccessB2B}
                    onLogout={handleLogout}
                  />
                ) : (
                  <SidebarTrigger />
                )}
                <div>
                  <h1 className="text-lg font-bold text-foreground flex items-center gap-2">
                    <Building2 className="h-5 w-5" />
                    Empresas
                  </h1>
                  <p className="text-xs text-muted-foreground">
                    Gerencie as empresas e seus membros
                  </p>
                </div>
              </div>

              <Button onClick={handleOpenCreate} size="sm">
                <Plus className="mr-2 h-4 w-4" />
                Nova Empresa
              </Button>
            </header>

            {/* Content */}
            <div className="p-4 md:p-6">
              {isLoadingCompanies ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : companies.length === 0 ? (
                <div className="text-center py-12">
                  <Building2 className="h-12 w-12 mx-auto text-muted-foreground/40 mb-3" />
                  <p className="text-muted-foreground">Nenhuma empresa cadastrada.</p>
                  <Button onClick={handleOpenCreate} className="mt-4">
                    <Plus className="mr-2 h-4 w-4" />
                    Criar primeira empresa
                  </Button>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {companies.map((company) => (
                    <div
                      key={company.id}
                      className="rounded-xl border bg-card p-5 space-y-4 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          {company.logo_url ? (
                            <img
                              src={company.logo_url}
                              alt={company.name}
                              className="h-10 w-10 rounded-lg object-contain bg-muted shrink-0"
                            />
                          ) : (
                            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                              <Building2 className="h-5 w-5 text-primary" />
                            </div>
                          )}
                          <div className="min-w-0">
                            <h3 className="font-semibold text-foreground truncate">{company.name}</h3>
                            <p className="text-xs text-muted-foreground truncate">{company.slug}</p>
                          </div>
                        </div>
                        <Badge variant={company.is_active ? "default" : "secondary"}>
                          {company.is_active ? "Ativa" : "Inativa"}
                        </Badge>
                      </div>

                      <div className="text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Users className="h-3.5 w-3.5" />
                          {memberCounts[company.id] || 0} membro{(memberCounts[company.id] || 0) !== 1 ? "s" : ""}
                        </span>
                      </div>

                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={() => handleOpenEdit(company)}
                        >
                          <Pencil className="mr-1.5 h-3.5 w-3.5" />
                          Editar
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={() => handleOpenMembers(company)}
                        >
                          <Users className="mr-1.5 h-3.5 w-3.5" />
                          Membros
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </SidebarInset>
        </div>
      </SidebarProvider>
    </>
  );
}
