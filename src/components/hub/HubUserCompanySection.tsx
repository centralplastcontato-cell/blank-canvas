import { useState } from "react";
import { Company } from "@/types/company";
import { UserWithRole, AppRole } from "@/types/crm";
import { UserCard } from "@/components/admin/UserCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Building2, ChevronDown, Pencil, Shield, KeyRound, Trash2, Lock, Users } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { PermissionsPanel } from "@/components/admin/PermissionsPanel";

interface HubUserCompanySectionProps {
  company: Company | null;
  users: UserWithRole[];
  currentUserId: string;
  onToggleActive: (userId: string, current: boolean) => void;
  onUpdateRole: (userId: string, newRole: AppRole) => void;
  onUpdateName: (userId: string, newName: string) => Promise<void>;
  onUpdateEmail: (userId: string, newEmail: string) => Promise<void>;
  onDelete: (userId: string) => Promise<void>;
  onResetPassword: (userId: string, newPassword: string) => Promise<void>;
}

export function HubUserCompanySection({
  company, users, currentUserId,
  onToggleActive, onUpdateRole, onUpdateName, onUpdateEmail, onDelete, onResetPassword,
}: HubUserCompanySectionProps) {
  const isMobile = useIsMobile();
  const [isOpen, setIsOpen] = useState(true);
  const [editingUser, setEditingUser] = useState<UserWithRole | null>(null);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [resetPasswordUser, setResetPasswordUser] = useState<UserWithRole | null>(null);
  const [desktopNewPassword, setDesktopNewPassword] = useState("");
  const [permissionsUser, setPermissionsUser] = useState<UserWithRole | null>(null);

  const companyName = company?.name || "Sem Empresa Vinculada";

  return (
    <>
      {/* Permissions Sheet */}
      <Sheet open={!!permissionsUser} onOpenChange={(open) => !open && setPermissionsUser(null)}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader><SheetTitle>Permissões — {permissionsUser?.full_name}</SheetTitle></SheetHeader>
          {permissionsUser && <PermissionsPanel targetUserId={permissionsUser.user_id} targetUserName={permissionsUser.full_name} currentUserId={currentUserId} targetCompanyId={company?.id} onClose={() => setPermissionsUser(null)} />}
        </SheetContent>
      </Sheet>

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
            <Button disabled={desktopNewPassword.length < 6} onClick={() => { if (resetPasswordUser) { onResetPassword(resetPasswordUser.user_id, desktopNewPassword); setResetPasswordUser(null); } }}>Alterar Senha</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <button className="w-full flex items-center justify-between gap-3 rounded-lg border bg-card p-4 hover:bg-accent/50 transition-colors text-left">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                {company ? (
                  company.logo_url ? (
                    <img src={company.logo_url} alt={company.name} className="h-7 w-7 rounded object-contain" />
                  ) : (
                    <Building2 className="h-4 w-4 text-primary" />
                  )
                ) : (
                  <Users className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
              <div>
                <p className="font-semibold text-foreground text-sm">{companyName}</p>
                <p className="text-xs text-muted-foreground">{users.length} usuário{users.length !== 1 ? "s" : ""}</p>
              </div>
            </div>
            <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}`} />
          </button>
        </CollapsibleTrigger>

        <CollapsibleContent className="mt-2">
          {users.length === 0 ? (
            <div className="text-center py-6 text-sm text-muted-foreground">Nenhum usuário nesta empresa.</div>
          ) : isMobile ? (
            <div className="space-y-3">
              {users.map((u) => (
                <UserCard
                  key={u.id}
                  user={u}
                  currentUserId={currentUserId}
                  onToggleActive={onToggleActive}
                  onUpdateRole={onUpdateRole}
                  onUpdateName={onUpdateName}
                  onUpdateEmail={onUpdateEmail}
                  onDelete={onDelete}
                  onResetPassword={onResetPassword}
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
                            <Input value={editName} onChange={(e) => setEditName(e.target.value)} className="h-8 w-40" placeholder="Nome" />
                            <Input value={editEmail} onChange={(e) => setEditEmail(e.target.value)} className="h-8 w-48" placeholder="Email" type="email" />
                            <Button size="sm" variant="ghost" onClick={() => {
                              if (editName !== u.full_name) onUpdateName(u.user_id, editName);
                              if (editEmail !== u.email) onUpdateEmail(u.user_id, editEmail);
                              setEditingUser(null);
                            }}>✓</Button>
                            <Button size="sm" variant="ghost" onClick={() => setEditingUser(null)}>✗</Button>
                          </div>
                        ) : (
                          <span className="font-medium">{u.full_name}</span>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{u.email}</TableCell>
                      <TableCell>
                        <Select value={u.role || "visualizacao"} onValueChange={(v) => onUpdateRole(u.user_id, v as AppRole)} disabled={u.user_id === currentUserId}>
                          <SelectTrigger className="h-8 w-36"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="gestor">Gestor</SelectItem>
                            <SelectItem value="comercial">Comercial</SelectItem>
                            <SelectItem value="visualizacao">Visualização</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Switch checked={u.is_active} onCheckedChange={() => onToggleActive(u.user_id, u.is_active)} disabled={u.user_id === currentUserId} />
                          <Badge variant={u.is_active ? "default" : "secondary"}>{u.is_active ? "Ativo" : "Inativo"}</Badge>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button size="icon" variant="ghost" onClick={() => { setEditingUser(u); setEditName(u.full_name); setEditEmail(u.email); }}><Pencil className="h-4 w-4" /></Button>
                          <Button size="icon" variant="ghost" onClick={() => setPermissionsUser(u)}><Shield className="h-4 w-4" /></Button>
                          <Button size="icon" variant="ghost" onClick={() => { setResetPasswordUser(u); setDesktopNewPassword(""); }}><KeyRound className="h-4 w-4" /></Button>
                          {u.user_id !== currentUserId && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild><Button size="icon" variant="ghost" className="text-destructive"><Trash2 className="h-4 w-4" /></Button></AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader><AlertDialogTitle>Excluir usuário?</AlertDialogTitle><AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription></AlertDialogHeader>
                                <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => onDelete(u.user_id)}>Excluir</AlertDialogAction></AlertDialogFooter>
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
        </CollapsibleContent>
      </Collapsible>
    </>
  );
}
