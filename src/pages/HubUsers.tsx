import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { HubLayout } from "@/components/hub/HubLayout";
import { UserWithRole, AppRole } from "@/types/crm";
import { Company } from "@/types/company";
import { Button } from "@/components/ui/button";
import { Plus, Loader2, Users, History } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { HubUserCreateDialog } from "@/components/hub/HubUserCreateDialog";
import { HubUserCompanySection } from "@/components/hub/HubUserCompanySection";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface UserWithCompanies extends UserWithRole {
  company_ids: string[];
}

export default function HubUsers() {
  return (
    <HubLayout
      currentPage="users"
      header={
        <div>
          <h1 className="text-lg font-bold text-foreground flex items-center gap-2">
            <Users className="h-5 w-5" /> Gerenciar Usuários
          </h1>
          <p className="text-xs text-muted-foreground">Crie, edite e gerencie os usuários do sistema</p>
        </div>
      }
    >
      {({ user }) => <HubUsersContent currentUserId={user.id} />}
    </HubLayout>
  );
}

export function HubUsersContent({ currentUserId }: { currentUserId: string }) {
  const [users, setUsers] = useState<UserWithCompanies[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setIsLoading(true);
    const [profilesRes, rolesRes, companiesRes, ucRes] = await Promise.all([
      supabase.from("profiles").select("*").order("created_at", { ascending: false }),
      supabase.from("user_roles").select("*"),
      supabase.from("companies").select("*").order("name"),
      supabase.from("user_companies").select("*"),
    ]);

    const profiles = profilesRes.data || [];
    const roles = rolesRes.data || [];
    const companyList = (companiesRes.data || []) as Company[];
    const userCompanies = ucRes.data || [];

    const usersWithData: UserWithCompanies[] = profiles.map((p) => {
      const r = roles.find((r) => r.user_id === p.user_id);
      const ucs = userCompanies.filter((uc) => uc.user_id === p.user_id);
      return { ...p, role: r?.role as AppRole | undefined, company_ids: ucs.map((uc) => uc.company_id) };
    });

    setUsers(usersWithData);
    setCompanies(companyList);
    setIsLoading(false);
  };

  const handleCreateUser = async (data: { email: string; name: string; password: string; role: AppRole; company_id: string }) => {
    const { data: result, error } = await supabase.functions.invoke("manage-user", {
      body: { action: "create", email: data.email, password: data.password, full_name: data.name, role: data.role, company_id: data.company_id, company_role: "member" },
    });
    if (error) throw error;
    if (result?.error) throw new Error(result.error);
    toast({ title: "Usuário criado" });
    fetchData();
  };

  const handleToggleActive = async (userId: string, current: boolean) => {
    try {
      const { data, error } = await supabase.functions.invoke("manage-user", { body: { action: "toggle_active", user_id: userId, is_active: !current } });
      if (error) throw error; if (data?.error) throw new Error(data.error);
      toast({ title: current ? "Usuário desativado" : "Usuário ativado" }); fetchData();
    } catch (err: any) { toast({ title: "Erro", description: err.message, variant: "destructive" }); }
  };

  const handleUpdateRole = async (userId: string, newRole: AppRole) => {
    try {
      const { data, error } = await supabase.functions.invoke("manage-user", { body: { action: "update", user_id: userId, role: newRole } });
      if (error) throw error; if (data?.error) throw new Error(data.error);
      toast({ title: "Perfil atualizado" }); fetchData();
    } catch (err: any) { toast({ title: "Erro", description: err.message, variant: "destructive" }); }
  };

  const handleUpdateName = async (userId: string, newName: string) => {
    try {
      const { data, error } = await supabase.functions.invoke("manage-user", { body: { action: "update", user_id: userId, full_name: newName } });
      if (error) throw error; if (data?.error) throw new Error(data.error);
      toast({ title: "Nome atualizado" }); fetchData();
    } catch (err: any) { toast({ title: "Erro", description: err.message, variant: "destructive" }); }
  };

  const handleUpdateEmail = async (userId: string, newEmail: string) => {
    try {
      const { data, error } = await supabase.functions.invoke("manage-user", { body: { action: "update", user_id: userId, email: newEmail } });
      if (error) throw error; if (data?.error) throw new Error(data.error);
      toast({ title: "Email atualizado" }); fetchData();
    } catch (err: any) { toast({ title: "Erro", description: err.message, variant: "destructive" }); }
  };

  const handleDeleteUser = async (userId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke("manage-user", { body: { action: "delete", user_id: userId } });
      if (error) throw error; if (data?.error) throw new Error(data.error);
      toast({ title: "Usuário excluído" }); fetchData();
    } catch (err: any) { toast({ title: "Erro", description: err.message, variant: "destructive" }); }
  };

  const handleResetPassword = async (userId: string, newPassword: string) => {
    try {
      const { data, error } = await supabase.functions.invoke("manage-user", { body: { action: "reset_password", user_id: userId, new_password: newPassword } });
      if (error) throw error; if (data?.error) throw new Error(data.error);
      toast({ title: "Senha alterada" });
    } catch (err: any) { toast({ title: "Erro", description: err.message, variant: "destructive" }); }
  };

  if (isLoading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  // Group: child companies only (exclude hub/root)
  const childCompanies = companies.filter(c => c.parent_id !== null);

  // Users not linked to any child company
  const unlinkedUsers = users.filter(u => u.company_ids.length === 0 || u.company_ids.every(cid => !childCompanies.some(c => c.id === cid)));

  return (
    <>
      <HubUserCreateDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        companies={childCompanies}
        onSubmit={handleCreateUser}
      />

      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <p className="text-sm text-muted-foreground">{users.length} usuário{users.length !== 1 ? "s" : ""} no total</p>
          <div className="flex gap-2">
            <PasswordResetHistoryDialog />
            <Button onClick={() => setIsDialogOpen(true)} size="sm"><Plus className="mr-2 h-4 w-4" /> Novo Usuário</Button>
          </div>
        </div>

        {childCompanies.map((company) => {
          const companyUsers = users.filter(u => u.company_ids.includes(company.id));
          return (
            <HubUserCompanySection
              key={company.id}
              company={company}
              users={companyUsers}
              currentUserId={currentUserId}
              onToggleActive={handleToggleActive}
              onUpdateRole={handleUpdateRole}
              onUpdateName={handleUpdateName}
              onUpdateEmail={handleUpdateEmail}
              onDelete={handleDeleteUser}
              onResetPassword={handleResetPassword}
            />
          );
        })}

        {unlinkedUsers.length > 0 && (
          <HubUserCompanySection
            company={null}
            users={unlinkedUsers}
            currentUserId={currentUserId}
            onToggleActive={handleToggleActive}
            onUpdateRole={handleUpdateRole}
            onUpdateName={handleUpdateName}
            onUpdateEmail={handleUpdateEmail}
            onDelete={handleDeleteUser}
            onResetPassword={handleResetPassword}
          />
        )}
      </div>
    </>
  );
}

interface PasswordResetLog {
  id: string;
  target_user_name: string | null;
  target_user_email: string | null;
  reset_by_user_name: string | null;
  created_at: string;
}

function PasswordResetHistoryDialog() {
  const [open, setOpen] = useState(false);
  const [logs, setLogs] = useState<PasswordResetLog[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchLogs = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("password_reset_logs" as any)
      .select("id, target_user_name, target_user_email, reset_by_user_name, created_at")
      .order("created_at", { ascending: false })
      .limit(50);
    setLogs((data as any as PasswordResetLog[]) || []);
    setLoading(false);
  };

  const handleOpen = () => {
    setOpen(true);
    fetchLogs();
  };

  return (
    <>
      <Button variant="outline" size="sm" onClick={handleOpen}>
        <History className="mr-2 h-4 w-4" /> Histórico de Senhas
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Histórico de Redefinições de Senha</DialogTitle>
            <DialogDescription>Registro de todas as senhas redefinidas por administradores.</DialogDescription>
          </DialogHeader>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : logs.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Nenhuma redefinição de senha registrada.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuário</TableHead>
                  <TableHead>Redefinido por</TableHead>
                  <TableHead>Data</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium text-sm">{log.target_user_name || "—"}</p>
                        <p className="text-xs text-muted-foreground">{log.target_user_email || "—"}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{log.reset_by_user_name || "—"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(log.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
