import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, UserCheck, Loader2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Seller {
  id: string;
  name: string;
  is_active: boolean;
  created_at: string;
}

export function SellersManager() {
  const { currentCompany } = useCompany();
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const fetchSellers = async () => {
    if (!currentCompany) return;
    const { data, error } = await supabase
      .from("company_sellers")
      .select("*")
      .eq("company_id", currentCompany.id)
      .order("name");
    if (!error && data) setSellers(data as Seller[]);
    setLoading(false);
  };

  useEffect(() => { fetchSellers(); }, [currentCompany?.id]);

  const handleAdd = async () => {
    if (!newName.trim() || !currentCompany) return;
    setAdding(true);
    const { error } = await supabase.from("company_sellers").insert({
      company_id: currentCompany.id,
      name: newName.trim(),
    });
    if (error) {
      toast({ title: "Erro ao adicionar", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Vendedor adicionado!" });
      setNewName("");
      fetchSellers();
    }
    setAdding(false);
  };

  const handleToggleActive = async (seller: Seller) => {
    const { error } = await supabase
      .from("company_sellers")
      .update({ is_active: !seller.is_active })
      .eq("id", seller.id);
    if (!error) {
      setSellers(prev => prev.map(s => s.id === seller.id ? { ...s, is_active: !s.is_active } : s));
    }
  };

  const handleSaveEdit = async () => {
    if (!editingId || !editName.trim()) return;
    const { error } = await supabase
      .from("company_sellers")
      .update({ name: editName.trim() })
      .eq("id", editingId);
    if (!error) {
      setSellers(prev => prev.map(s => s.id === editingId ? { ...s, name: editName.trim() } : s));
      toast({ title: "Vendedor atualizado!" });
    }
    setEditingId(null);
    setEditName("");
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from("company_sellers").delete().eq("id", deleteId);
    if (!error) {
      setSellers(prev => prev.filter(s => s.id !== deleteId));
      toast({ title: "Vendedor removido!" });
    }
    setDeleteId(null);
  };

  if (loading) {
    return <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <UserCheck className="h-5 w-5 text-primary" />
            Vendedores
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Cadastre os vendedores que aparecerão na seleção de eventos e festas
          </p>
        </div>
      </div>

      {/* Add new */}
      <div className="flex gap-2">
        <Input
          placeholder="Nome do vendedor..."
          value={newName}
          onChange={e => setNewName(e.target.value)}
          onKeyDown={e => e.key === "Enter" && handleAdd()}
          className="max-w-sm"
        />
        <Button onClick={handleAdd} disabled={adding || !newName.trim()}>
          <Plus className="h-4 w-4 mr-1" />
          Adicionar
        </Button>
      </div>

      {/* List */}
      {sellers.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <UserCheck className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>Nenhum vendedor cadastrado</p>
          <p className="text-sm mt-1">Adicione vendedores acima para que apareçam na seleção de eventos</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {sellers.map(seller => (
            <Card key={seller.id} className={!seller.is_active ? "opacity-60" : ""}>
              <CardContent className="p-4 flex items-center justify-between gap-3">
                {editingId === seller.id ? (
                  <div className="flex items-center gap-2 flex-1">
                    <Input
                      value={editName}
                      onChange={e => setEditName(e.target.value)}
                      onKeyDown={e => { if (e.key === "Enter") handleSaveEdit(); if (e.key === "Escape") setEditingId(null); }}
                      autoFocus
                      className="h-8"
                    />
                    <Button size="sm" onClick={handleSaveEdit}>Salvar</Button>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-medium truncate">{seller.name}</span>
                      {!seller.is_active && <Badge variant="secondary" className="text-[10px]">Inativo</Badge>}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Switch
                        checked={seller.is_active}
                        onCheckedChange={() => handleToggleActive(seller)}
                        className="scale-75"
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => { setEditingId(seller.id); setEditName(seller.name); }}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => setDeleteId(seller.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AlertDialog open={!!deleteId} onOpenChange={open => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir vendedor?</AlertDialogTitle>
            <AlertDialogDescription>
              Essa ação não pode ser desfeita. O vendedor será removido da lista.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
