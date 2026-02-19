import { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User, Session } from "@supabase/supabase-js";
import { useUserRole } from "@/hooks/useUserRole";
import { usePermissions } from "@/hooks/usePermissions";
import { useCompany } from "@/contexts/CompanyContext";
import { UserWithRole, AppRole, ROLE_LABELS } from "@/types/crm";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { MobileMenu } from "@/components/admin/MobileMenu";
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
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Plus, Loader2, Users, Shield, Pencil, Trash2, KeyRound, Lock, Menu } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import logoCastelo from "@/assets/logo-castelo.png";
import { useIsMobile } from "@/hooks/use-mobile";
import { UserCard } from "@/components/admin/UserCard";
import { PermissionsPanel } from "@/components/admin/PermissionsPanel";

interface Profile {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  is_active: boolean;
}

export default function UsersPage() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [user, setUser] = useState<User | null>(null);
  const [_session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingUser, setEditingUser] = useState<UserWithRole | null>(null);
  const [resetPasswordUser, setResetPasswordUser] = useState<UserWithRole | null>(null);
  const [permissionsUser, setPermissionsUser] = useState<UserWithRole | null>(null);
  const [editName, setEditName] = useState("");
  const [desktopNewPassword, setDesktopNewPassword] = useState("");
  const [currentUserProfile, setCurrentUserProfile] = useState<Profile | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Form state
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserName, setNewUserName] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [newUserRole, setNewUserRole] = useState<AppRole>("comercial");

  const { isAdmin, isLoading: isLoadingRole, hasFetched, error: roleError, canManageUsers } = useUserRole(user?.id);
  const { hasPermission } = usePermissions(user?.id);
  const { currentCompanyId } = useCompany();
  
  const [accessChecked, setAccessChecked] = useState(false);

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

  // Fetch current user profile
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

  useEffect(() => {
    if (!isLoadingRole && hasFetched && user && !accessChecked) {
      console.log('[Users] Access check - canManageUsers:', canManageUsers, 'hasFetched:', hasFetched, 'roleError:', roleError);
      
      if (!canManageUsers) {
        const timeoutId = setTimeout(() => {
          console.log('[Users] No management access, redirecting...');
          toast({
            title: "Acesso negado",
            description: "Você não tem permissão para acessar esta página.",
            variant: "destructive",
          });
          navigate("/admin");
        }, 300);
        
        return () => clearTimeout(timeoutId);
      } else {
        console.log('[Users] Management access confirmed');
        setAccessChecked(true);
      }
    }
  }, [isLoadingRole, hasFetched, canManageUsers, user, navigate, accessChecked, roleError]);

  useEffect(() => {
    if (canManageUsers && currentCompanyId) {
      fetchUsers();
    }
  }, [canManageUsers, currentCompanyId]);

  const fetchUsers = async () => {
    setIsLoadingUsers(true);
    
    // Fetch users that belong to the current company
    let profilesQuery = supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });

    // If we have a current company, filter by company membership
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

    if (profilesError) {
      console.error("Error fetching profiles:", profilesError);
      setIsLoadingUsers(false);
      return;
    }

    const { data: roles, error: rolesError } = await supabase
      .from("user_roles")
      .select("*");

    if (rolesError) {
      console.error("Error fetching roles:", rolesError);
    }

    const usersWithRoles: UserWithRole[] = (profiles || []).map((profile) => {
      const userRole = roles?.find((r) => r.user_id === profile.user_id);
      return {
        ...profile,
        role: userRole?.role as AppRole | undefined,
      };
    });

    // Hide super admins from non-admin users to keep focus on local team
    const filteredUsers = isAdmin
      ? usersWithRoles
      : usersWithRoles.filter((u) => u.role !== "admin");

    setUsers(filteredUsers);
    setIsLoadingUsers(false);
  };

  const handleCreateUser = async () => {
    if (!newUserEmail || !newUserName || !newUserPassword) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha todos os campos.",
        variant: "destructive",
      });
      return;
    }

    if (newUserPassword.length < 6) {
      toast({
        title: "Senha muito curta",
        description: "A senha deve ter pelo menos 6 caracteres.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const { data, error } = await supabase.functions.invoke("manage-user", {
        body: {
          action: "create",
          email: newUserEmail,
          password: newUserPassword,
          full_name: newUserName,
          role: newUserRole,
          company_id: currentCompanyId,
          company_role: "member",
        },
      });

      if (error) throw error;

      if (data?.error) {
        throw new Error(data.error);
      }

      toast({
        title: "Usuário criado",
        description: "O novo usuário foi criado com sucesso.",
      });

      setIsDialogOpen(false);
      setNewUserEmail("");
      setNewUserName("");
      setNewUserPassword("");
      setNewUserRole("comercial");
      fetchUsers();
    } catch (error: any) {
      console.error("Error creating user:", error);
      toast({
        title: "Erro ao criar usuário",
        description: error.message || "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleActive = async (userId: string, currentStatus: boolean) => {
    try {
      const { data, error } = await supabase.functions.invoke("manage-user", {
        body: {
          action: "toggle_active",
          user_id: userId,
          is_active: !currentStatus,
        },
      });

      if (error) throw error;

      if (data?.error) {
        throw new Error(data.error);
      }

      toast({
        title: currentStatus ? "Usuário desativado" : "Usuário ativado",
        description: currentStatus 
          ? "O usuário não poderá mais acessar o sistema." 
          : "O usuário pode acessar o sistema novamente.",
      });

      fetchUsers();
    } catch (error: any) {
      console.error("Error toggling user:", error);
      toast({
        title: "Erro ao alterar status",
        description: error.message || "Tente novamente.",
        variant: "destructive",
      });
    }
  };

  const handleUpdateRole = async (userId: string, newRole: AppRole) => {
    try {
      const { data, error } = await supabase.functions.invoke("manage-user", {
        body: {
          action: "update",
          user_id: userId,
          role: newRole,
        },
      });

      if (error) throw error;

      if (data?.error) {
        throw new Error(data.error);
      }

      toast({
        title: "Perfil atualizado",
        description: `Perfil alterado para ${ROLE_LABELS[newRole]}.`,
      });

      fetchUsers();
    } catch (error: any) {
      console.error("Error updating role:", error);
      toast({
        title: "Erro ao atualizar perfil",
        description: error.message || "Tente novamente.",
        variant: "destructive",
      });
    }
  };

  const handleUpdateName = async (userId: string, newName: string) => {
    try {
      const { data, error } = await supabase.functions.invoke("manage-user", {
        body: {
          action: "update",
          user_id: userId,
          full_name: newName,
        },
      });

      if (error) throw error;

      if (data?.error) {
        throw new Error(data.error);
      }

      toast({
        title: "Nome atualizado",
        description: "O nome do usuário foi alterado com sucesso.",
      });

      fetchUsers();
    } catch (error: any) {
      console.error("Error updating name:", error);
      toast({
        title: "Erro ao atualizar nome",
        description: error.message || "Tente novamente.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteUser = async (userId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke("manage-user", {
        body: {
          action: "delete",
          user_id: userId,
        },
      });

      if (error) throw error;

      if (data?.error) {
        throw new Error(data.error);
      }

      toast({
        title: "Usuário excluído",
        description: "O usuário foi removido permanentemente.",
      });

      fetchUsers();
    } catch (error: any) {
      console.error("Error deleting user:", error);
      toast({
        title: "Erro ao excluir usuário",
        description: error.message || "Tente novamente.",
        variant: "destructive",
      });
    }
  };

  const handleResetPassword = async (userId: string, newPassword: string) => {
    try {
      const { data, error } = await supabase.functions.invoke("manage-user", {
        body: {
          action: "reset_password",
          user_id: userId,
          new_password: newPassword,
        },
      });

      if (error) throw error;

      if (data?.error) {
        throw new Error(data.error);
      }

      toast({
        title: "Senha alterada",
        description: "A nova senha foi definida com sucesso.",
      });
    } catch (error: any) {
      console.error("Error resetting password:", error);
      toast({
        title: "Erro ao resetar senha",
        description: error.message || "Tente novamente.",
        variant: "destructive",
      });
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast({
      title: "Logout realizado",
      description: "Você saiu da sua conta.",
    });
    navigate("/auth");
  };

  const handleRefresh = () => {
    fetchUsers();
  };

  const renderDialogContent = () => (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Criar Novo Usuário</DialogTitle>
        <DialogDescription>
          Preencha os dados para criar um novo usuário no sistema.
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4 py-4">
        <div className="space-y-2">
          <Label htmlFor="name">Nome completo</Label>
          <Input
            id="name"
            value={newUserName}
            onChange={(e) => setNewUserName(e.target.value)}
            placeholder="Nome do usuário"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={newUserEmail}
            onChange={(e) => setNewUserEmail(e.target.value)}
            placeholder="email@exemplo.com"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Senha</Label>
          <Input
            id="password"
            type="password"
            value={newUserPassword}
            onChange={(e) => setNewUserPassword(e.target.value)}
            placeholder="Mínimo 6 caracteres"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="role">Perfil</Label>
          <Select
            value={newUserRole}
            onValueChange={(v) => setNewUserRole(v as AppRole)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="gestor">Gestor</SelectItem>
              <SelectItem value="comercial">Comercial</SelectItem>
              <SelectItem value="visualizacao">Visualização</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
          Cancelar
        </Button>
        <Button onClick={handleCreateUser} disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          Criar Usuário
        </Button>
      </DialogFooter>
    </DialogContent>
  );

  const renderUsersContent = () => (
    <div className="bg-card rounded-xl border border-border overflow-hidden">
      <div className="p-4 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-primary" />
          <span className="font-medium text-foreground">
            {users.length} usuário{users.length !== 1 ? "s" : ""} cadastrado
            {users.length !== 1 ? "s" : ""}
          </span>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Novo Usuário
            </Button>
          </DialogTrigger>
          {renderDialogContent()}
        </Dialog>
      </div>

      {isLoadingUsers ? (
        <div className="p-8 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : isMobile ? (
        /* Mobile: Cards Layout */
        <div className="p-4 space-y-4">
          {users.map((u) => (
            <UserCard
              key={u.id}
              user={u}
              currentUserId={user!.id}
              onToggleActive={handleToggleActive}
              onUpdateRole={handleUpdateRole}
              onUpdateName={handleUpdateName}
              onDelete={handleDeleteUser}
              onResetPassword={handleResetPassword}
            />
          ))}
          {users.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum usuário cadastrado.
            </div>
          )}
        </div>
      ) : (
        /* Desktop: Table Layout */
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
                    <Select
                      value={u.role || "visualizacao"}
                      onValueChange={(v) => handleUpdateRole(u.user_id, v as AppRole)}
                      disabled={u.user_id === user!.id}
                    >
                      <SelectTrigger className="w-40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="gestor">Gestor</SelectItem>
                        <SelectItem value="comercial">Comercial</SelectItem>
                        <SelectItem value="visualizacao">Visualização</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Badge variant={u.is_active ? "default" : "secondary"}>
                      {u.is_active ? "Ativo" : "Inativo"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    {u.user_id === user!.id ? (
                      <Switch checked={u.is_active} disabled />
                    ) : u.is_active ? (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <button type="button" className="inline-flex">
                            <Switch checked={u.is_active} />
                          </button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Desativar usuário?</AlertDialogTitle>
                            <AlertDialogDescription>
                              O usuário <strong>{u.full_name}</strong> não poderá mais acessar o sistema. 
                              Você pode reativá-lo a qualquer momento.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction 
                              onClick={() => handleToggleActive(u.user_id, u.is_active)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Desativar
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    ) : (
                      <Switch
                        checked={u.is_active}
                        onCheckedChange={() => handleToggleActive(u.user_id, u.is_active)}
                      />
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      {/* Edit button */}
                      <Dialog 
                        open={editingUser?.id === u.id} 
                        onOpenChange={(open) => {
                          if (open) {
                            setEditingUser(u);
                            setEditName(u.full_name);
                          } else {
                            setEditingUser(null);
                            setEditName("");
                          }
                        }}
                      >
                        <DialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <Pencil className="w-4 h-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Editar Usuário</DialogTitle>
                            <DialogDescription>
                              Altere o nome do usuário.
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4 py-4">
                            <div className="space-y-2">
                              <Label htmlFor="edit-name-desktop">Nome completo</Label>
                              <Input
                                id="edit-name-desktop"
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                                placeholder="Nome do usuário"
                              />
                            </div>
                          </div>
                          <DialogFooter>
                            <Button variant="outline" onClick={() => setEditingUser(null)}>
                              Cancelar
                            </Button>
                            <Button 
                              onClick={async () => {
                                if (editName.trim() && editingUser) {
                                  await handleUpdateName(editingUser.user_id, editName.trim());
                                  setEditingUser(null);
                                }
                              }} 
                              disabled={isSubmitting || !editName.trim()}
                            >
                              Salvar
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>

                      {/* Password reset button */}
                      {u.user_id !== user!.id && (
                        <Dialog 
                          open={resetPasswordUser?.id === u.id} 
                          onOpenChange={(open) => {
                            if (open) {
                              setResetPasswordUser(u);
                              setDesktopNewPassword("");
                            } else {
                              setResetPasswordUser(null);
                              setDesktopNewPassword("");
                            }
                          }}
                        >
                          <DialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8" title="Resetar senha">
                              <KeyRound className="w-4 h-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Resetar Senha</DialogTitle>
                              <DialogDescription>
                                Defina uma nova senha para <strong>{u.full_name}</strong>.
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                              <div className="space-y-2">
                                <Label htmlFor="reset-password-desktop">Nova senha</Label>
                                <Input
                                  id="reset-password-desktop"
                                  type="password"
                                  value={desktopNewPassword}
                                  onChange={(e) => setDesktopNewPassword(e.target.value)}
                                  placeholder="Mínimo 6 caracteres"
                                />
                              </div>
                            </div>
                            <DialogFooter>
                              <Button variant="outline" onClick={() => setResetPasswordUser(null)}>
                                Cancelar
                              </Button>
                              <Button 
                                onClick={async () => {
                                  if (desktopNewPassword.length >= 6 && resetPasswordUser) {
                                    await handleResetPassword(resetPasswordUser.user_id, desktopNewPassword);
                                    setResetPasswordUser(null);
                                    setDesktopNewPassword("");
                                  }
                                }} 
                                disabled={isSubmitting || desktopNewPassword.length < 6}
                              >
                                Salvar Senha
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                      )}

                      {/* Permissions button */}
                      <Sheet 
                        open={permissionsUser?.id === u.id}
                        onOpenChange={(open) => {
                          if (open) {
                            setPermissionsUser(u);
                          } else {
                            setPermissionsUser(null);
                          }
                        }}
                      >
                        <SheetTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8" title="Gerenciar permissões">
                            <Lock className="w-4 h-4" />
                          </Button>
                        </SheetTrigger>
                        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
                          <SheetHeader className="mb-6">
                            <SheetTitle>Gerenciar Permissões</SheetTitle>
                          </SheetHeader>
                          {permissionsUser && (
                            <PermissionsPanel
                              targetUserId={permissionsUser.user_id}
                              targetUserName={permissionsUser.full_name}
                              currentUserId={user!.id}
                              onClose={() => setPermissionsUser(null)}
                            />
                          )}
                        </SheetContent>
                      </Sheet>

                      {/* Delete button */}
                      {u.user_id !== user!.id && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Excluir usuário?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Esta ação não pode ser desfeita. O usuário <strong>{u.full_name}</strong> será removido permanentemente do sistema.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction 
                                onClick={() => handleDeleteUser(u.user_id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Excluir
                              </AlertDialogAction>
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

  if (isLoading || isLoadingRole || (!accessChecked && !roleError)) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Verificando permissões...</p>
      </div>
    );
  }

  if (!user || (!canManageUsers && hasFetched)) {
    return null;
  }

  // Mobile layout
  if (isMobile) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        {/* Mobile Header */}
        <header className="bg-card border-b border-border sticky top-0 z-10">
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
                  currentPage="users"
                  userName={currentUserProfile?.full_name || ""}
                  userEmail={user.email || ""}
                  canManageUsers={canManageUsers}
                  onRefresh={handleRefresh}
                  onLogout={handleLogout}
                />

                <div className="flex items-center gap-2 min-w-0">
                  <img src={logoCastelo} alt="Castelo da Diversão" className="h-8 w-auto shrink-0" />
                  <h1 className="font-display font-bold text-foreground text-sm truncate">Gerenciar Usuários</h1>
                </div>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 p-3">
          {renderUsersContent()}
        </main>
      </div>
    );
  }

  // Desktop layout with Sidebar
  return (
    <SidebarProvider>
      <Helmet><title>Usuários</title></Helmet>
      <div className="min-h-screen flex w-full">
        <AdminSidebar 
          canManageUsers={canManageUsers}
          
          currentUserName={currentUserProfile?.full_name || user.email || ""} 
          onRefresh={handleRefresh} 
          onLogout={handleLogout} 
        />
        
        <SidebarInset className="flex-1 flex flex-col">
          {/* Desktop Header */}
          <header className="bg-card/80 backdrop-blur-sm border-b border-border sticky top-0 z-10 shrink-0">
            <div className="px-6 py-3 flex items-center gap-4">
              <SidebarTrigger />
              <div className="flex items-center gap-3 flex-1">
                <div className="p-2.5 rounded-xl bg-primary/10">
                  <Shield className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h1 className="font-display font-bold text-foreground text-lg tracking-tight">Gestão de Usuários</h1>
                  <p className="text-sm text-muted-foreground">{currentUserProfile?.full_name || user.email}</p>
                </div>
              </div>
            </div>
          </header>

          <main className="flex-1 p-6">
            {renderUsersContent()}
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
