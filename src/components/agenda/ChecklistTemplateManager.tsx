import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Trash2, Pencil, ListChecks, X, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface Template {
  id: string;
  name: string;
  items: string[];
  is_active: boolean;
}

export function ChecklistTemplateManager() {
  const { currentCompany } = useCompany();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Template | null>(null);
  const [name, setName] = useState("");
  const [items, setItems] = useState<string[]>([]);
  const [newItem, setNewItem] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchTemplates = async () => {
    if (!currentCompany?.id) return;
    const { data } = await supabase
      .from("event_checklist_templates")
      .select("*")
      .eq("company_id", currentCompany.id)
      .order("created_at");
    setTemplates(
      (data || []).map((t: any) => ({
        id: t.id,
        name: t.name,
        items: Array.isArray(t.items) ? t.items : [],
        is_active: t.is_active,
      }))
    );
    setLoading(false);
  };

  useEffect(() => {
    fetchTemplates();
  }, [currentCompany?.id]);

  const openNew = () => {
    setEditing(null);
    setName("");
    setItems([]);
    setNewItem("");
    setDialogOpen(true);
  };

  const openEdit = (t: Template) => {
    setEditing(t);
    setName(t.name);
    setItems([...t.items]);
    setNewItem("");
    setDialogOpen(true);
  };

  const addItem = () => {
    if (!newItem.trim()) return;
    setItems((prev) => [...prev, newItem.trim()]);
    setNewItem("");
  };

  const removeItem = (idx: number) => {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSave = async () => {
    if (!name.trim() || items.length === 0 || !currentCompany?.id) return;
    setSaving(true);

    if (editing) {
      await supabase
        .from("event_checklist_templates")
        .update({ name: name.trim(), items: items as any })
        .eq("id", editing.id);
      toast({ title: "Template atualizado!" });
    } else {
      await supabase
        .from("event_checklist_templates")
        .insert({
          company_id: currentCompany.id,
          name: name.trim(),
          items: items as any,
        });
      toast({ title: "Template criado!" });
    }

    setSaving(false);
    setDialogOpen(false);
    fetchTemplates();
  };

  const handleDelete = async (id: string) => {
    await supabase.from("event_checklist_templates").delete().eq("id", id);
    toast({ title: "Template excluído" });
    fetchTemplates();
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
          <ListChecks className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">Templates de Checklist</h3>
        </div>
        <Button size="sm" onClick={openNew}>
          <Plus className="h-4 w-4 mr-1" /> Novo Template
        </Button>
      </div>

      {templates.length === 0 && (
        <p className="text-sm text-muted-foreground">
          Nenhum template criado. Crie um para agilizar a criação de festas.
        </p>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        {templates.map((t) => (
          <Card key={t.id} className="border-border">
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-medium text-sm">{t.name}</span>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(t)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDelete(t.id)}>
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </div>
              </div>
              <div className="flex flex-wrap gap-1">
                {t.items.slice(0, 5).map((item, i) => (
                  <Badge key={i} variant="secondary" className="text-[10px]">
                    {item}
                  </Badge>
                ))}
                {t.items.length > 5 && (
                  <Badge variant="outline" className="text-[10px]">
                    +{t.items.length - 5}
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar Template" : "Novo Template"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nome do template</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Festa Infantil" />
            </div>

            <div>
              <Label>Itens do checklist ({items.length})</Label>
              <div className="space-y-1 mt-2 max-h-48 overflow-y-auto">
                {items.map((item, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm py-1 px-2 rounded bg-accent/30">
                    <span className="flex-1">{item}</span>
                    <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => removeItem(i)}>
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2 mt-2">
                <Input
                  placeholder="Ex: Contrato assinado"
                  value={newItem}
                  onChange={(e) => setNewItem(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addItem())}
                  className="h-8 text-sm"
                />
                <Button variant="outline" size="sm" className="h-8" onClick={addItem} disabled={!newItem.trim()}>
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
              <Button onClick={handleSave} disabled={saving || !name.trim() || items.length === 0}>
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
