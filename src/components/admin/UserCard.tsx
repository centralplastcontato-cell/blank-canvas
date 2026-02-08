import { useState } from "react";
import { UserWithRole, AppRole } from "@/types/crm";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { User, Mail, Pencil, Trash2, Loader2, KeyRound, Lock } from "lucide-react";
import { PermissionsPanel } from "./PermissionsPanel";

interface UserCardProps {
  user: UserWithRole;
  currentUserId: string;
  onToggleActive: (userId: string, currentStatus: boolean) => void;
  onUpdateRole: (userId: string, newRole: AppRole) => void;
  onUpdateName: (userId: string, newName: string) => Promise<void>;
  onDelete: (userId: string) => Promise<void>;
  onResetPassword: (userId: string, newPassword: string) => Promise<void>;
}

export function UserCard({ 
  user, 
  currentUserId, 
  onToggleActive, 
  onUpdateRole,
  onUpdateName,
  onDelete,
  onResetPassword,
}: UserCardProps) {
  const isCurrentUser = user.user_id === currentUserId;
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isPasswordOpen, setIsPasswordOpen] = useState(false);
  const [isPermissionsOpen, setIsPermissionsOpen] = useState(false);
  const [editName, setEditName] = useState(user.full_name);
  const [newPassword, setNewPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSaveName = async () => {
    if (!editName.trim()) return;
    setIsSubmitting(true);
    try {
      await onUpdateName(user.user_id, editName.trim());
      setIsEditOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetPassword = async () => {
    if (!newPassword || newPassword.length < 6) return;
    setIsSubmitting(true);
    try {
      await onResetPassword(user.user_id, newPassword);
      setIsPasswordOpen(false);
      setNewPassword("");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    setIsSubmitting(true);
    try {
      await onDelete(user.user_id);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4 space-y-4">
        {/* Header with name and status */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <User className="w-5 h-5 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="font-medium text-foreground truncate">
                {user.full_name}
              </p>
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <Mail className="w-3 h-3 flex-shrink-0" />
                <span className="truncate">{user.email}</span>
              </div>
            </div>
          </div>
          <Badge variant={user.is_active ? "default" : "secondary"}>
            {user.is_active ? "Ativo" : "Inativo"}
          </Badge>
        </div>

        {/* Role selector */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Perfil
          </label>
          <Select
            value={user.role || "visualizacao"}
            onValueChange={(v) => onUpdateRole(user.user_id, v as AppRole)}
            disabled={isCurrentUser}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="admin">Administrador</SelectItem>
              <SelectItem value="comercial">Comercial</SelectItem>
              <SelectItem value="visualizacao">Visualização</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Actions Row */}
        <div className="flex items-center justify-between gap-2 pt-2 border-t border-border">
          <div className="flex items-center gap-1">
            {/* Edit button */}
            <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 px-2">
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
                    <Label htmlFor="edit-name">Nome completo</Label>
                    <Input
                      id="edit-name"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      placeholder="Nome do usuário"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsEditOpen(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={handleSaveName} disabled={isSubmitting || !editName.trim()}>
                    {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Salvar
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* Password reset button */}
            {!isCurrentUser && (
              <Dialog open={isPasswordOpen} onOpenChange={(open) => {
                setIsPasswordOpen(open);
                if (!open) setNewPassword("");
              }}>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 px-2">
                    <KeyRound className="w-4 h-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Resetar Senha</DialogTitle>
                    <DialogDescription>
                      Defina uma nova senha para <strong>{user.full_name}</strong>.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="new-password">Nova senha</Label>
                      <Input
                        id="new-password"
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Mínimo 6 caracteres"
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsPasswordOpen(false)}>
                      Cancelar
                    </Button>
                    <Button onClick={handleResetPassword} disabled={isSubmitting || newPassword.length < 6}>
                      {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                      Salvar Senha
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}

            {/* Permissions button */}
            <Sheet open={isPermissionsOpen} onOpenChange={setIsPermissionsOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 px-2">
                  <Lock className="w-4 h-4" />
                </Button>
              </SheetTrigger>
              <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
                <SheetHeader className="mb-6">
                  <SheetTitle>Gerenciar Permissões</SheetTitle>
                </SheetHeader>
                <PermissionsPanel
                  targetUserId={user.user_id}
                  targetUserName={user.full_name}
                  currentUserId={currentUserId}
                  onClose={() => setIsPermissionsOpen(false)}
                />
              </SheetContent>
            </Sheet>

            {/* Delete button */}
            {!isCurrentUser && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 px-2 text-destructive hover:text-destructive hover:bg-destructive/10">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Excluir usuário?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Esta ação não pode ser desfeita. O usuário <strong>{user.full_name}</strong> será removido permanentemente do sistema.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction 
                      onClick={handleDelete}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Excluir
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>

          {/* Active toggle */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              {isCurrentUser ? "Você" : "Ativo"}
            </span>
            {isCurrentUser ? (
              <Switch checked={user.is_active} disabled />
            ) : user.is_active ? (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Switch checked={user.is_active} />
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Desativar usuário?</AlertDialogTitle>
                    <AlertDialogDescription>
                      O usuário <strong>{user.full_name}</strong> não poderá mais acessar o sistema. 
                      Você pode reativá-lo a qualquer momento.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction 
                      onClick={() => onToggleActive(user.user_id, user.is_active)}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Desativar
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            ) : (
              <Switch
                checked={user.is_active}
                onCheckedChange={() => onToggleActive(user.user_id, user.is_active)}
              />
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
