import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Trash2, Pencil, Package, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface CompanyPackage {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  sort_order: number;
}

export function PackagesManager() {
  const { currentCompany } = useCompany();
  const [packages, setPackages] = useState<CompanyPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<CompanyPackage | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchPackages = async () => {
    if (!currentCompany?.id) return;
    const { data } = await supabase
      .from("company_packages")
      .select("*")
      .eq("company_id", currentCompany.id)
      .order("sort_order")
      .order("created_at");
    setPackages(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchPackages();
  }, [currentCompany?.id]);

  const openNew = () => {
    setEditing(null);
    setName("");
    setDescription("");
    setDialogOpen(true);
  };

  const openEdit = (pkg: CompanyPackage) => {
    setEditing(pkg);
    setName(pkg.name);
    setDescription(pkg.description || "");
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!name.trim() || !currentCompany?.id) return;
    setSaving(true);

    if (editing) {
      await supabase
        .from("company_packages")
        .update({ name: name.trim(), description: description.trim() || null })
        .eq("id", editing.id);
      toast({ title: "Pacote atualizado!" });
    } else {
      await supabase
        .from("company_packages")
        .insert({
          company_id: currentCompany.id,
          name: name.trim(),
          description: description.trim() || null,
        });
      toast({ title: "Pacote criado!" });
    }

    setSaving(false);
    setDialogOpen(false);
    fetchPackages();
  };

  const handleDelete = async (id: string) => {
    await supabase.from("company_packages").delete().eq("id", id);
    toast({ title: "Pacote excluído" });
    fetchPackages();
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Package className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">Pacotes</h3>
        </div>
        <Button size="sm" onClick={openNew}>
          <Plus className="h-4 w-4 mr-1" /> Novo Pacote
        </Button>
      </div>

      {packages.length === 0 && (
        <p className="text-sm text-muted-foreground">
          Nenhum pacote criado. Cadastre seus pacotes para usá-los nos eventos.
        </p>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        {packages.map((pkg) => (
          <Card key={pkg.id} className="border-border">
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-medium text-sm">{pkg.name}</span>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(pkg)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDelete(pkg.id)}>
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </div>
              </div>
              {pkg.description && (
                <p className="text-xs text-muted-foreground line-clamp-2">{pkg.description}</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar Pacote" : "Novo Pacote"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nome do pacote</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Pacote Premium" />
            </div>
            <div>
              <Label>Descrição</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Descrição do pacote (opcional)"
                rows={3}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
              <Button onClick={handleSave} disabled={saving || !name.trim()}>
                {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                {editing ? "Salvar" : "Criar"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
