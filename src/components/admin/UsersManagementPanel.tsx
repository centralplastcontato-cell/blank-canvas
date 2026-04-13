import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { UserWithRole, AppRole, ROLE_LABELS } from "@/types/crm";
import { useCompany } from "@/contexts/CompanyContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Plus, Loader2, Users, Pencil, Trash2, KeyRound, Lock, Eye, EyeOff } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { UserCard } from "@/components/admin/UserCard";
import { PermissionsPanel } from "@/components/admin/PermissionsPanel";

interface UsersManagementPanelProps {
  userId: string;
  isAdmin: boolean;
}

export function UsersManagementPanel({ userId, isAdmin }: UsersManagementPanelProps) {
  const isMobile = useIsMobile();
  const { currentCompanyId } = useCompany();

  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingUser, setEditingUser] = useState<UserWithRole | null>(null);
  const [resetPasswordUser, setResetPasswordUser] = useState<UserWithRole | null>(null);
  const [permissionsUser, setPermissionsUser] = useState<UserWithRole | null>(null);
  const [editName, setEditName] = useState("");
  const [desktopNewPassword, setDesktopNewPassword] = useState("");
  const [showResetPassword, setShowResetPassword] = useState(false);

  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserName, setNewUserName] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [newUserRole, setNewUserRole] = useState<AppRole>("comercial");

  useEffect(() => {
    if (currentCompanyId) fetchUsers();
  }, [currentCompanyId]);

  const fetchUsers = async () => {
    setIsLoadingUsers(true);
    let profilesQuery = supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });

    if (currentCompanyId) {
      const { data: companyMembers } = await supabase
        .from("user_companies")
        .select("user_id")
        .eq("company_id", currentCompanyId);

      const memberUserIds = (companyMembers || []).map(m => m.user_id);
      if (memberUserIds.length > 0) {
        profilesQuery = profilesQuery.in("user_id", memberUserIds);
      } else {
        setUsers([]);
        setIsLoadingUsers(false);
        return;
      }
    }

    const { data: profiles, error: profilesError } = await profilesQuery;
    if (profilesError) { setIsLoadingUsers(false); return; }

    const { data: roles } = await supabase.from("user_roles").select("*");

    const usersWithRoles: UserWithRole[] = (profiles || []).map((profile) => {
      const userRole = roles?.find((r) => r.user_id === profile.user_id);
      return { ...profile, role: userRole?.role as AppRole | undefined };
    });

    const filteredUsers = isAdmin
      ? usersWithRoles
      : usersWithRoles.filter((u) => u.role !== "admin");

    setUsers(filteredUsers);
    setIsLoadingUsers(false);
  };

  const handleCreateUser = async () => {
    if (!newUserEmail || !newUserName || !newUserPassword) {
      toast({ title: "Campos obrigatórios", description: "Preencha todos os campos.", variant: "destructive" });
      return;
    }
    if (newUserPassword.length < 6) {
      toast({ title: "Senha muito curta", description: "A senha deve ter pelo menos 6 caracteres.", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("manage-user", {
        body: { action: "create", email: newUserEmail, password: newUserPassword, full_name: newUserName, role: newUserRole, company_id: currentCompanyId, company_role: "member" },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast({ title: "Usuário criado", description: "O novo usuário foi criado com sucesso." });
      setIsDialogOpen(false);
      setNewUserEmail(""); setNewUserName(""); setNewUserPassword(""); setNewUserRole("comercial");
      fetchUsers();
    } catch (error: any) {
      toast({ title: "Erro ao criar usuário", description: error.message || "Tente novamente.", variant: "destructive" });
    } finally { setIsSubmitting(false); }
  };

  const handleToggleActive = async (targetUserId: string, currentStatus: boolean) => {
    try {
      const { data, error } = await supabase.functions.invoke("manage-user", {
        body: { action: "toggle_active", user_id: targetUserId, is_active: !currentStatus },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast({ title: currentStatus ? "Usuário desativado" : "Usuário ativado", description: currentStatus ? "O usuário não poderá mais acessar o sistema." : "O usuário pode acessar o sistema novamente." });
      fetchUsers();
    } catch (error: any) {
      toast({ title: "Erro ao alterar status", description: error.message || "Tente novamente.", variant: "destructive" });
    }
  };

  const handleUpdateRole = async (targetUserId: string, newRole: AppRole) => {
    try {
      const { data, error } = await supabase.functions.invoke("manage-user", {
        body: { action: "update", user_id: targetUserId, role: newRole },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast({ title: "Perfil atualizado", description: `Perfil alterado para ${ROLE_LABELS[newRole]}.` });
      fetchUsers();
    } catch (error: any) {
      toast({ title: "Erro ao atualizar perfil", description: error.message || "Tente novamente.", variant: "destructive" });
    }
  };

  const handleUpdateName = async (targetUserId: string, newName: string) => {
    try {
      const { data, error } = await supabase.functions.invoke("manage-user", {
        body: { action: "update", user_id: targetUserId, full_name: newName },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast({ title: "Nome atualizado", description: "O nome do usuário foi alterado com sucesso." });
      fetchUsers();
    } catch (error: any) {
      toast({ title: "Erro ao atualizar nome", description: error.message || "Tente novamente.", variant: "destructive" });
    }
  };

  const handleUpdateEmail = async (targetUserId: string, newEmail: string) => {
    try {
      const { data, error } = await supabase.functions.invoke("manage-user", {
        body: { action: "update", user_id: targetUserId, email: newEmail },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast({ title: "Email atualizado", description: "O email foi alterado com sucesso." });
      fetchUsers();
    } catch (error: any) {
      toast({ title: "Erro ao atualizar email", description: error.message, variant: "destructive" });
    }
  };

  const handleDeleteUser = async (targetUserId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke("manage-user", {
        body: { action: "delete", user_id: targetUserId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast({ title: "Usuário excluído", description: "O usuário foi removido permanentemente." });
      fetchUsers();
    } catch (error: any) {
      toast({ title: "Erro ao excluir usuário", description: error.message || "Tente novamente.", variant: "destructive" });
    }
  };

  const handleResetPassword = async (targetUserId: string, newPassword: string) => {
    try {
      const { data, error } = await supabase.functions.invoke("manage-user", {
        body: { action: "reset_password", user_id: targetUserId, new_password: newPassword },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast({ title: "Senha alterada", description: "A nova senha foi definida com sucesso." });
    } catch (error: any) {
      toast({ title: "Erro ao resetar senha", description: error.message || "Tente novamente.", variant: "destructive" });
    }
  };

  const renderDialogContent = () => (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Criar Novo Usuário</DialogTitle>
        <DialogDescription>Preencha os dados para criar um novo usuário no sistema.</DialogDescription>
      </DialogHeader>
      <div className="space-y-4 py-4">
        <div className="space-y-2">
          <Label htmlFor="panel-name">Nome completo</Label>
          <Input id="panel-name" value={newUserName} onChange={(e) => setNewUserName(e.target.value)} placeholder="Nome do usuário" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="panel-email">Email</Label>
          <Input id="panel-email" type="email" value={newUserEmail} onChange={(e) => setNewUserEmail(e.target.value)} placeholder="email@exemplo.com" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="panel-password">Senha</Label>
          <Input id="panel-password" type="password" value={newUserPassword} onChange={(e) => setNewUserPassword(e.target.value)} placeholder="Mínimo 6 caracteres" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="panel-role">Perfil</Label>
          <Select value={newUserRole} onValueChange={(v) => setNewUserRole(v as AppRole)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="gestor">Gestor</SelectItem>
              <SelectItem value="comercial">Comercial</SelectItem>
              <SelectItem value="visualizacao">Visualização</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
        <Button onClick={handleCreateUser} disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          Criar Usuário
        </Button>
      </DialogFooter>
    </DialogContent>
  );

  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden">
      <div className="p-4 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-primary" />
          <span className="font-medium text-foreground">
            {users.length} usuário{users.length !== 1 ? "s" : ""} cadastrado{users.length !== 1 ? "s" : ""}
          </span>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="w-4 h-4 mr-2" />Novo Usuário</Button>
          </DialogTrigger>
          {renderDialogContent()}
        </Dialog>
      </div>

      {isLoadingUsers ? (
        <div className="p-8 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : isMobile ? (
        <div className="p-4 space-y-4">
          {users.map((u) => (
            <UserCard
              key={u.id}
              user={u}
              currentUserId={userId}
              onToggleActive={handleToggleActive}
              onUpdateRole={handleUpdateRole}
              onUpdateName={handleUpdateName}
              onUpdateEmail={handleUpdateEmail}
              onDelete={handleDeleteUser}
              onResetPassword={handleResetPassword}
            />
          ))}
          {users.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">Nenhum usuário cadastrado.</div>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Perfil</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Ativo</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">{u.full_name}</TableCell>
                  <TableCell>{u.email}</TableCell>
                  <TableCell>
                    <Select value={u.role || "visualizacao"} onValueChange={(v) => handleUpdateRole(u.user_id, v as AppRole)} disabled={u.user_id === userId}>
                      <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="gestor">Gestor</SelectItem>
                        <SelectItem value="comercial">Comercial</SelectItem>
                        <SelectItem value="visualizacao">Visualização</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Badge variant={u.is_active ? "default" : "secondary"}>{u.is_active ? "Ativo" : "Inativo"}</Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    {u.user_id === userId ? (
                      <Switch checked={u.is_active} disabled />
                    ) : u.is_active ? (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <button type="button" className="inline-flex"><Switch checked={u.is_active} /></button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Desativar usuário?</AlertDialogTitle>
                            <AlertDialogDescription>O usuário <strong>{u.full_name}</strong> não poderá mais acessar o sistema.</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleToggleActive(u.user_id, u.is_active)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Desativar</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    ) : (
                      <Switch checked={u.is_active} onCheckedChange={() => handleToggleActive(u.user_id, u.is_active)} />
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Dialog open={editingUser?.id === u.id} onOpenChange={(open) => { if (open) { setEditingUser(u); setEditName(u.full_name); } else { setEditingUser(null); setEditName(""); } }}>
                        <DialogTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><Pencil className="w-4 h-4" /></Button></DialogTrigger>
                        <DialogContent>
                          <DialogHeader><DialogTitle>Editar Usuário</DialogTitle><DialogDescription>Altere o nome do usuário.</DialogDescription></DialogHeader>
                          <div className="space-y-4 py-4">
                            <div className="space-y-2">
                              <Label htmlFor="edit-name-panel">Nome completo</Label>
                              <Input id="edit-name-panel" value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="Nome do usuário" />
                            </div>
                          </div>
                          <DialogFooter>
                            <Button variant="outline" onClick={() => setEditingUser(null)}>Cancelar</Button>
                            <Button onClick={async () => { if (editName.trim() && editingUser) { await handleUpdateName(editingUser.user_id, editName.trim()); setEditingUser(null); } }} disabled={isSubmitting || !editName.trim()}>Salvar</Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>

                      {u.user_id !== userId && (
                        <Dialog open={resetPasswordUser?.id === u.id} onOpenChange={(open) => { if (open) { setResetPasswordUser(u); setDesktopNewPassword(""); } else { setResetPasswordUser(null); setDesktopNewPassword(""); } }}>
                          <DialogTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8" title="Resetar senha"><KeyRound className="w-4 h-4" /></Button></DialogTrigger>
                          <DialogContent>
                            <DialogHeader><DialogTitle>Resetar Senha</DialogTitle><DialogDescription>Defina uma nova senha para <strong>{u.full_name}</strong>.</DialogDescription></DialogHeader>
                            <div className="space-y-4 py-4">
                              <div className="space-y-2">
                                <Label htmlFor="reset-pw-panel">Nova senha</Label>
                                <div className="relative">
                                  <Input id="reset-pw-panel" type={showResetPassword ? "text" : "password"} value={desktopNewPassword} onChange={(e) => setDesktopNewPassword(e.target.value)} placeholder="Mínimo 6 caracteres" />
                                  <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" onClick={() => setShowResetPassword(!showResetPassword)}>
                                    {showResetPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                  </button>
                                </div>
                              </div>
                            </div>
                            <DialogFooter>
                              <Button variant="outline" onClick={() => setResetPasswordUser(null)}>Cancelar</Button>
                              <Button onClick={async () => { if (desktopNewPassword.length >= 6 && resetPasswordUser) { await handleResetPassword(resetPasswordUser.user_id, desktopNewPassword); setResetPasswordUser(null); setDesktopNewPassword(""); } }} disabled={isSubmitting || desktopNewPassword.length < 6}>Salvar Senha</Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                      )}

                      <Sheet open={permissionsUser?.id === u.id} onOpenChange={(open) => { if (open) setPermissionsUser(u); else setPermissionsUser(null); }}>
                        <SheetTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8" title="Gerenciar permissões"><Lock className="w-4 h-4" /></Button></SheetTrigger>
                        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
                          <SheetHeader className="mb-6"><SheetTitle>Gerenciar Permissões</SheetTitle></SheetHeader>
                          {permissionsUser && <PermissionsPanel targetUserId={permissionsUser.user_id} targetUserName={permissionsUser.full_name} currentUserId={userId} onClose={() => setPermissionsUser(null)} />}
                        </SheetContent>
                      </Sheet>

                      {u.user_id !== userId && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"><Trash2 className="w-4 h-4" /></Button></AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader><AlertDialogTitle>Excluir usuário?</AlertDialogTitle><AlertDialogDescription>Esta ação não pode ser desfeita. O usuário <strong>{u.full_name}</strong> será removido permanentemente.</AlertDialogDescription></AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDeleteUser(u.user_id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Excluir</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
