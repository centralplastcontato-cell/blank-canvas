import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { HubLayout } from "@/components/hub/HubLayout";
import { UserWithRole, AppRole, ROLE_LABELS } from "@/types/crm";
import { UserCard } from "@/components/admin/UserCard";
import { PermissionsPanel } from "@/components/admin/PermissionsPanel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import { Plus, Loader2, Users, Shield, Pencil, Trash2, KeyRound, Lock } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";

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

function HubUsersContent({ currentUserId }: { currentUserId: string }) {
  const isMobile = useIsMobile();
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingUser, setEditingUser] = useState<UserWithRole | null>(null);
  const [resetPasswordUser, setResetPasswordUser] = useState<UserWithRole | null>(null);
  const [permissionsUser, setPermissionsUser] = useState<UserWithRole | null>(null);
  const [editName, setEditName] = useState("");
  const [desktopNewPassword, setDesktopNewPassword] = useState("");
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserName, setNewUserName] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [newUserRole, setNewUserRole] = useState<AppRole>("comercial");

  useEffect(() => { fetchUsers(); }, []);

  const fetchUsers = async () => {
    setIsLoadingUsers(true);
    const { data: profiles } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
    const { data: roles } = await supabase.from("user_roles").select("*");
    const usersWithRoles: UserWithRole[] = (profiles || []).map((p) => {
      const r = roles?.find((r) => r.user_id === p.user_id);
      return { ...p, role: r?.role as AppRole | undefined };
    });
    setUsers(usersWithRoles);
    setIsLoadingUsers(false);
  };

  const handleCreateUser = async () => {
    if (!newUserEmail || !newUserName || !newUserPassword) {
      toast({ title: "Campos obrigatórios", variant: "destructive" }); return;
    }
    if (newUserPassword.length < 6) {
      toast({ title: "Senha muito curta", description: "Mínimo 6 caracteres", variant: "destructive" }); return;
    }
    setIsSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("manage-user", {
        body: { action: "create", email: newUserEmail, password: newUserPassword, full_name: newUserName, role: newUserRole },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast({ title: "Usuário criado" });
      setIsDialogOpen(false); setNewUserEmail(""); setNewUserName(""); setNewUserPassword(""); setNewUserRole("comercial");
      fetchUsers();
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally { setIsSubmitting(false); }
  };

  const handleToggleActive = async (userId: string, current: boolean) => {
    try {
      const { data, error } = await supabase.functions.invoke("manage-user", { body: { action: "toggle_active", user_id: userId, is_active: !current } });
      if (error) throw error; if (data?.error) throw new Error(data.error);
      toast({ title: current ? "Usuário desativado" : "Usuário ativado" }); fetchUsers();
    } catch (err: any) { toast({ title: "Erro", description: err.message, variant: "destructive" }); }
  };

  const handleUpdateRole = async (userId: string, newRole: AppRole) => {
    try {
      const { data, error } = await supabase.functions.invoke("manage-user", { body: { action: "update", user_id: userId, role: newRole } });
      if (error) throw error; if (data?.error) throw new Error(data.error);
      toast({ title: "Perfil atualizado", description: `Alterado para ${ROLE_LABELS[newRole]}.` }); fetchUsers();
    } catch (err: any) { toast({ title: "Erro", description: err.message, variant: "destructive" }); }
  };

  const handleUpdateName = async (userId: string, newName: string) => {
    try {
      const { data, error } = await supabase.functions.invoke("manage-user", { body: { action: "update", user_id: userId, full_name: newName } });
      if (error) throw error; if (data?.error) throw new Error(data.error);
      toast({ title: "Nome atualizado" }); fetchUsers();
    } catch (err: any) { toast({ title: "Erro", description: err.message, variant: "destructive" }); }
  };

  const handleDeleteUser = async (userId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke("manage-user", { body: { action: "delete", user_id: userId } });
      if (error) throw error; if (data?.error) throw new Error(data.error);
      toast({ title: "Usuário excluído" }); fetchUsers();
    } catch (err: any) { toast({ title: "Erro", description: err.message, variant: "destructive" }); }
  };

  const handleResetPassword = async (userId: string, newPassword: string) => {
    try {
      const { data, error } = await supabase.functions.invoke("manage-user", { body: { action: "reset_password", user_id: userId, new_password: newPassword } });
      if (error) throw error; if (data?.error) throw new Error(data.error);
      toast({ title: "Senha alterada" });
    } catch (err: any) { toast({ title: "Erro", description: err.message, variant: "destructive" }); }
  };

  if (isLoadingUsers) {
    return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <>
      {/* Permissions Sheet */}
      <Sheet open={!!permissionsUser} onOpenChange={(open) => !open && setPermissionsUser(null)}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader><SheetTitle>Permissões — {permissionsUser?.full_name}</SheetTitle></SheetHeader>
          {permissionsUser && <PermissionsPanel targetUserId={permissionsUser.user_id} targetUserName={permissionsUser.full_name} currentUserId={currentUserId} onClose={() => setPermissionsUser(null)} />}
        </SheetContent>
      </Sheet>

      {/* Create User Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Criar Novo Usuário</DialogTitle>
            <DialogDescription>Preencha os dados para criar um novo usuário.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2"><Label>Nome completo</Label><Input value={newUserName} onChange={(e) => setNewUserName(e.target.value)} placeholder="Nome" /></div>
            <div className="space-y-2"><Label>Email</Label><Input type="email" value={newUserEmail} onChange={(e) => setNewUserEmail(e.target.value)} placeholder="email@exemplo.com" /></div>
            <div className="space-y-2"><Label>Senha</Label><Input type="password" value={newUserPassword} onChange={(e) => setNewUserPassword(e.target.value)} placeholder="Mínimo 6 caracteres" /></div>
            <div className="space-y-2">
              <Label>Perfil</Label>
              <Select value={newUserRole} onValueChange={(v) => setNewUserRole(v as AppRole)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Administrador</SelectItem>
                  <SelectItem value="comercial">Comercial</SelectItem>
                  <SelectItem value="visualizacao">Visualização</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreateUser} disabled={isSubmitting}>{isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Criar Usuário"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <p className="text-sm text-muted-foreground">{users.length} usuário{users.length !== 1 ? "s" : ""}</p>
          <Button onClick={() => setIsDialogOpen(true)} size="sm"><Plus className="mr-2 h-4 w-4" /> Novo Usuário</Button>
        </div>

        {isMobile ? (
          <div className="space-y-3">
            {users.map((u) => (
              <UserCard
                key={u.id}
                user={u}
                currentUserId={currentUserId}
                onToggleActive={handleToggleActive}
                onUpdateRole={handleUpdateRole}
                onUpdateName={handleUpdateName}
                onDelete={handleDeleteUser}
                onResetPassword={handleResetPassword}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Perfil</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell>
                      {editingUser?.id === u.id ? (
                        <div className="flex items-center gap-2">
                          <Input value={editName} onChange={(e) => setEditName(e.target.value)} className="h-8 w-40" />
                          <Button size="sm" variant="ghost" onClick={() => { handleUpdateName(u.user_id, editName); setEditingUser(null); }}>✓</Button>
                          <Button size="sm" variant="ghost" onClick={() => setEditingUser(null)}>✗</Button>
                        </div>
                      ) : (
                        <span className="font-medium">{u.full_name}</span>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{u.email}</TableCell>
                    <TableCell>
                      <Select value={u.role || "visualizacao"} onValueChange={(v) => handleUpdateRole(u.user_id, v as AppRole)} disabled={u.user_id === currentUserId}>
                        <SelectTrigger className="h-8 w-36"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">Administrador</SelectItem>
                          <SelectItem value="comercial">Comercial</SelectItem>
                          <SelectItem value="visualizacao">Visualização</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Switch checked={u.is_active} onCheckedChange={() => handleToggleActive(u.user_id, u.is_active)} disabled={u.user_id === currentUserId} />
                        <Badge variant={u.is_active ? "default" : "secondary"}>{u.is_active ? "Ativo" : "Inativo"}</Badge>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button size="icon" variant="ghost" onClick={() => { setEditingUser(u); setEditName(u.full_name); }}><Pencil className="h-4 w-4" /></Button>
                        <Button size="icon" variant="ghost" onClick={() => setPermissionsUser(u)}><Shield className="h-4 w-4" /></Button>
                        <Button size="icon" variant="ghost" onClick={() => { setResetPasswordUser(u); setDesktopNewPassword(""); }}><KeyRound className="h-4 w-4" /></Button>
                        {u.user_id !== currentUserId && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild><Button size="icon" variant="ghost" className="text-destructive"><Trash2 className="h-4 w-4" /></Button></AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader><AlertDialogTitle>Excluir usuário?</AlertDialogTitle><AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription></AlertDialogHeader>
                              <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => handleDeleteUser(u.user_id)}>Excluir</AlertDialogAction></AlertDialogFooter>
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

      {/* Reset Password Dialog */}
      <Dialog open={!!resetPasswordUser} onOpenChange={(open) => !open && setResetPasswordUser(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Resetar Senha — {resetPasswordUser?.full_name}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nova senha</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input type="password" className="pl-9" value={desktopNewPassword} onChange={(e) => setDesktopNewPassword(e.target.value)} placeholder="Mínimo 6 caracteres" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResetPasswordUser(null)}>Cancelar</Button>
            <Button disabled={desktopNewPassword.length < 6} onClick={() => { if (resetPasswordUser) { handleResetPassword(resetPasswordUser.user_id, desktopNewPassword); setResetPasswordUser(null); } }}>Alterar Senha</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
