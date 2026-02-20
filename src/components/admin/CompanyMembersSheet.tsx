import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Company, UserCompanyRole } from "@/types/company";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
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
import { Loader2, Trash2, UserPlus } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface MemberRow {
  id: string;
  user_id: string;
  role: UserCompanyRole;
  is_default: boolean;
  profile?: {
    full_name: string;
    email: string;
  };
}

interface CompanyMembersSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  company: Company | null;
}

export function CompanyMembersSheet({ open, onOpenChange, company }: CompanyMembersSheetProps) {
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [availableUsers, setAvailableUsers] = useState<{ user_id: string; full_name: string; email: string }[]>([]);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [selectedRole, setSelectedRole] = useState<UserCompanyRole>("member");
  const [isAdding, setIsAdding] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);

  const fetchMembers = async () => {
    if (!company) return;
    setIsLoading(true);

    const { data: ucData, error: ucErr } = await supabase
      .from("user_companies")
      .select("id, user_id, role, is_default")
      .eq("company_id", company.id);

    if (ucErr) {
      console.error("Error fetching members:", ucErr);
      setIsLoading(false);
      return;
    }

    // Fetch profiles for all member user_ids
    const userIds = (ucData || []).map((m) => m.user_id);
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, full_name, email")
      .in("user_id", userIds.length > 0 ? userIds : ["none"]);

    const membersWithProfiles: MemberRow[] = (ucData || []).map((m) => ({
      ...m,
      role: m.role as UserCompanyRole,
      profile: profiles?.find((p) => p.user_id === m.user_id),
    }));

    setMembers(membersWithProfiles);

    // Fetch users NOT in this company for the add form
    const { data: allProfiles } = await supabase
      .from("profiles")
      .select("user_id, full_name, email")
      .eq("is_active", true);

    const memberUserIds = new Set(userIds);
    setAvailableUsers(
      (allProfiles || []).filter((p) => !memberUserIds.has(p.user_id))
    );

    setIsLoading(false);
  };

  useEffect(() => {
    if (open && company) {
      fetchMembers();
      setShowAddForm(false);
    }
  }, [open, company]);

  const handleAddMember = async () => {
    if (!selectedUserId || !company) return;
    setIsAdding(true);

    const { error } = await supabase.from("user_companies").insert({
      user_id: selectedUserId,
      company_id: company.id,
      role: selectedRole,
      is_default: false,
    });

    if (error) {
      toast({
        title: "Erro ao adicionar membro",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({ title: "Membro adicionado", description: "O usuário foi vinculado à empresa." });
      setSelectedUserId("");
      setSelectedRole("member");
      setShowAddForm(false);
      fetchMembers();
    }
    setIsAdding(false);
  };

  const handleUpdateRole = async (ucId: string, newRole: UserCompanyRole) => {
    const { error } = await supabase
      .from("user_companies")
      .update({ role: newRole })
      .eq("id", ucId);

    if (error) {
      toast({ title: "Erro ao atualizar", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Papel atualizado" });
      fetchMembers();
    }
  };

  const handleRemoveMember = async (ucId: string) => {
    const { error } = await supabase.from("user_companies").delete().eq("id", ucId);
    if (error) {
      toast({ title: "Erro ao remover", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Membro removido" });
      fetchMembers();
    }
  };


  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            Membros — {company?.name}
          </SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          {/* Add member button / form */}
          {!showAddForm ? (
            <Button variant="outline" className="w-full" onClick={() => setShowAddForm(true)}>
              <UserPlus className="mr-2 h-4 w-4" />
              Adicionar membro
            </Button>
          ) : (
            <div className="space-y-3 p-3 rounded-lg border bg-muted/30">
              <Label>Selecionar usuário</Label>
              {availableUsers.length === 0 ? (
                <p className="text-sm text-muted-foreground">Todos os usuários já são membros desta empresa.</p>
              ) : (
                <>
                  <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Escolha um usuário..." />
                    </SelectTrigger>
                    <SelectContent>
                      {availableUsers.map((u) => (
                        <SelectItem key={u.user_id} value={u.user_id}>
                          {u.full_name} ({u.email})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Label>Papel</Label>
                  <Select value={selectedRole} onValueChange={(v) => setSelectedRole(v as UserCompanyRole)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="owner">Proprietário</SelectItem>
                      <SelectItem value="admin">Administrador</SelectItem>
                      <SelectItem value="member">Membro</SelectItem>
                    </SelectContent>
                  </Select>

                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setShowAddForm(false)} className="flex-1">
                      Cancelar
                    </Button>
                    <Button size="sm" onClick={handleAddMember} disabled={!selectedUserId || isAdding} className="flex-1">
                      {isAdding && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Adicionar
                    </Button>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Members list */}
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : members.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Nenhum membro vinculado.</p>
          ) : (
            <div className="space-y-2">
              {members.map((member) => {
                const name = member.profile?.full_name || "?";
                const initials = name
                  .split(" ")
                  .slice(0, 2)
                  .map((n) => n[0])
                  .join("")
                  .toUpperCase();

                return (
                  <div key={member.id} className="flex items-center gap-3 p-3 rounded-lg border bg-card">
                    {/* Avatar */}
                    <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-primary font-semibold text-sm">
                      {initials}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium leading-tight">
                        {name}
                      </p>
                      <p className="text-xs text-muted-foreground leading-tight mt-0.5 break-all">
                        {member.profile?.email || member.user_id}
                      </p>
                    </div>

                    {/* Role + Delete stacked on mobile */}
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <Select
                        value={member.role}
                        onValueChange={(v) => handleUpdateRole(member.id, v as UserCompanyRole)}
                      >
                        <SelectTrigger className="w-[120px] h-7 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="owner">Proprietário</SelectItem>
                          <SelectItem value="admin">Administrador</SelectItem>
                          <SelectItem value="member">Membro</SelectItem>
                        </SelectContent>
                      </Select>

                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-6 px-2 text-xs text-destructive hover:text-destructive hover:bg-destructive/10 w-full justify-center">
                            <Trash2 className="h-3 w-3 mr-1" />
                            Remover
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Remover membro?</AlertDialogTitle>
                            <AlertDialogDescription>
                              {member.profile?.full_name} perderá acesso a esta empresa.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleRemoveMember(member.id)}>
                              Remover
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
