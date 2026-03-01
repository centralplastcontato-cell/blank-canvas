import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentCompanyId } from "@/hooks/useCurrentCompanyId";
import { useIsMobile } from "@/hooks/use-mobile";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { MobileMenu } from "@/components/admin/MobileMenu";
import { ContactFormDialog } from "@/components/admin/ContactFormDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { BookUser, Plus, Search, Pencil, Trash2, Menu, Users } from "lucide-react";
import { toast } from "sonner";
import { useUserRole } from "@/hooks/useUserRole";


interface Contact {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  notes: string | null;
  tags: string[];
  created_at: string;
}

export default function Contatos() {
  const navigate = useNavigate();
  const companyId = useCurrentCompanyId();
  const isMobile = useIsMobile();
  const [user, setUser] = useState<{ id: string } | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) { navigate("/auth"); return; }
      setUser({ id: data.user.id });
      setUserEmail(data.user.email || "");
      supabase.from("profiles").select("full_name, avatar_url").eq("user_id", data.user.id).maybeSingle().then(({ data: p }) => {
        if (p) { setUserName(p.full_name || ""); setUserAvatar(p.avatar_url); }
      });
    });
  }, [navigate]);

  const { isAdmin, canManageUsers } = useUserRole(user?.id);

  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [userAvatar, setUserAvatar] = useState<string | null>(null);


  const fetchContacts = async () => {
    if (!companyId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("company_contacts")
      .select("id, name, phone, email, notes, tags, created_at")
      .eq("company_id", companyId)
      .order("name");
    if (error) { toast.error("Erro ao carregar contatos"); console.error(error); }
    else setContacts((data || []).map((c: any) => ({ ...c, tags: Array.isArray(c.tags) ? c.tags : [] })));
    setLoading(false);
  };

  useEffect(() => { fetchContacts(); }, [companyId]);

  const handleSave = async (data: { name: string; phone: string; email: string; notes: string; tags: string[] }) => {
    if (!companyId) return;
    setSaving(true);
    if (editingContact) {
      const { error } = await supabase.from("company_contacts").update({
        name: data.name, phone: data.phone || null, email: data.email || null,
        notes: data.notes || null, tags: data.tags,
      }).eq("id", editingContact.id);
      if (error) toast.error("Erro ao atualizar contato");
      else { toast.success("Contato atualizado!"); setDialogOpen(false); setEditingContact(null); fetchContacts(); }
    } else {
      const { data: user } = await supabase.auth.getUser();
      const { error } = await supabase.from("company_contacts").insert({
        company_id: companyId, name: data.name, phone: data.phone || null,
        email: data.email || null, notes: data.notes || null, tags: data.tags,
        created_by: user?.user?.id || null,
      });
      if (error) toast.error("Erro ao criar contato");
      else { toast.success("Contato criado!"); setDialogOpen(false); fetchContacts(); }
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from("company_contacts").delete().eq("id", deleteId);
    if (error) toast.error("Erro ao excluir contato");
    else { toast.success("Contato excluído!"); fetchContacts(); }
    setDeleteId(null);
  };

  const handleLogout = async () => { await supabase.auth.signOut(); navigate("/auth"); };

  const filtered = contacts.filter((c) => {
    const q = search.toLowerCase();
    return c.name.toLowerCase().includes(q) || (c.phone || "").includes(q) || (c.email || "").toLowerCase().includes(q);
  });

  const content = (
    <div className="flex-1 min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-background/95 backdrop-blur border-b border-border px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {isMobile && (
              <MobileMenu
                isOpen={mobileMenuOpen}
                onOpenChange={setMobileMenuOpen}
                trigger={<Button variant="ghost" size="icon"><Menu className="h-5 w-5" /></Button>}
                currentPage="atendimento"
                userName={userName}
                userEmail={userEmail}
                userAvatar={userAvatar}
                canManageUsers={canManageUsers}
                isAdmin={isAdmin}
                onRefresh={fetchContacts}
                onLogout={handleLogout}
              />
            )}
            <div className="flex items-center gap-2">
              <BookUser className="h-5 w-5 text-primary" />
              <h1 className="text-lg font-bold">Contatos</h1>
            </div>
          </div>
          <Button size="sm" onClick={() => { setEditingContact(null); setDialogOpen(true); }}>
            <Plus className="h-4 w-4 mr-1" /> Novo
          </Button>
        </div>
      </header>

      <main className="p-4 max-w-5xl mx-auto space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <Users className="h-8 w-8 text-primary" />
              <div>
                <p className="text-2xl font-bold">{contacts.length}</p>
                <p className="text-xs text-muted-foreground">Total de contatos</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, telefone ou e-mail..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Table / Cards */}
        {loading ? (
          <div className="text-center py-12 text-muted-foreground">Carregando...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12">
            <BookUser className="h-12 w-12 mx-auto text-muted-foreground/40 mb-3" />
            <p className="text-muted-foreground">{search ? "Nenhum contato encontrado" : "Nenhum contato cadastrado ainda"}</p>
            {!search && (
              <Button variant="outline" className="mt-3" onClick={() => { setEditingContact(null); setDialogOpen(true); }}>
                <Plus className="h-4 w-4 mr-1" /> Adicionar primeiro contato
              </Button>
            )}
          </div>
        ) : isMobile ? (
          <div className="space-y-2">
            {filtered.map((c) => (
              <Card key={c.id} className="p-3">
                <div className="flex items-start justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium truncate">{c.name}</p>
                    {c.phone && <p className="text-sm text-muted-foreground">{c.phone}</p>}
                    {c.email && <p className="text-sm text-muted-foreground truncate">{c.email}</p>}
                    {c.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {c.tags.map((t) => <Badge key={t} variant="secondary" className="text-[10px]">{t}</Badge>)}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-1 shrink-0 ml-2">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditingContact({ ...c, phone: c.phone || "", email: c.email || "", notes: c.notes || "" }); setDialogOpen(true); }}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeleteId(c.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>E-mail</TableHead>
                  <TableHead>Tags</TableHead>
                  <TableHead className="w-24">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell>{c.phone || "—"}</TableCell>
                    <TableCell>{c.email || "—"}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {c.tags.map((t) => <Badge key={t} variant="secondary" className="text-[10px]">{t}</Badge>)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditingContact({ ...c, phone: c.phone || "", email: c.email || "", notes: c.notes || "" }); setDialogOpen(true); }}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeleteId(c.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        )}
      </main>

      <ContactFormDialog
        open={dialogOpen}
        onOpenChange={(o) => { setDialogOpen(o); if (!o) setEditingContact(null); }}
        contact={editingContact}
        onSave={handleSave}
        loading={saving}
      />

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir contato?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );

  if (isMobile) return content;

  return (
    <SidebarProvider defaultOpen={false}>
      <div className="flex min-h-screen w-full">
        <AdminSidebar
          canManageUsers={canManageUsers}
          isAdmin={isAdmin}
          currentUserName={userName}
          onRefresh={fetchContacts}
          onLogout={handleLogout}
        />
        {content}
      </div>
    </SidebarProvider>
  );
}
