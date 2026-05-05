import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, CreditCard, Loader2 } from "lucide-react";

interface CardFee {
  id: string;
  operator_name: string;
  antecipado: boolean;
  prazo_recebimento_dias: number;
  taxa_debito: number;
  taxa_credito_1x: number;
  taxa_credito_2x: number;
  taxa_credito_3x: number;
  taxa_credito_4x: number;
  taxa_credito_5x: number;
  taxa_credito_6x: number;
  taxa_credito_7x: number;
  taxa_credito_8x: number;
  taxa_credito_9x: number;
  taxa_credito_10x: number;
  taxa_credito_11x: number;
  taxa_credito_12x: number;
  is_active: boolean;
}

const EMPTY_FORM: Omit<CardFee, "id"> = {
  operator_name: "",
  antecipado: false,
  prazo_recebimento_dias: 30,
  taxa_debito: 0,
  taxa_credito_1x: 0,
  taxa_credito_2x: 0,
  taxa_credito_3x: 0,
  taxa_credito_4x: 0,
  taxa_credito_5x: 0,
  taxa_credito_6x: 0,
  taxa_credito_7x: 0,
  taxa_credito_8x: 0,
  taxa_credito_9x: 0,
  taxa_credito_10x: 0,
  taxa_credito_11x: 0,
  taxa_credito_12x: 0,
  is_active: true,
};

const PARCELA_FIELDS = [
  { key: "taxa_credito_1x", label: "1x" },
  { key: "taxa_credito_2x", label: "2x" },
  { key: "taxa_credito_3x", label: "3x" },
  { key: "taxa_credito_4x", label: "4x" },
  { key: "taxa_credito_5x", label: "5x" },
  { key: "taxa_credito_6x", label: "6x" },
  { key: "taxa_credito_7x", label: "7x" },
  { key: "taxa_credito_8x", label: "8x" },
  { key: "taxa_credito_9x", label: "9x" },
  { key: "taxa_credito_10x", label: "10x" },
  { key: "taxa_credito_11x", label: "11x" },
  { key: "taxa_credito_12x", label: "12x" },
] as const;

export function CardFeesManager() {
  const { currentCompany } = useCompany();
  const companyId = currentCompany?.id;
  const [fees, setFees] = useState<CardFee[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Omit<CardFee, "id">>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const fetchFees = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);
    const { data } = await supabase
      .from("company_card_fees")
      .select("*")
      .eq("company_id", companyId)
      .order("operator_name");
    setFees((data as any[]) || []);
    setLoading(false);
  }, [companyId]);

  useEffect(() => { fetchFees(); }, [fetchFees]);

  const openNew = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  };

  const openEdit = (fee: CardFee) => {
    setEditingId(fee.id);
    const { id, ...rest } = fee;
    setForm(rest);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!companyId || !form.operator_name.trim()) {
      toast({ title: "Preencha o nome da operadora", variant: "destructive" });
      return;
    }
    setSaving(true);

    if (editingId) {
      const { error } = await supabase
        .from("company_card_fees")
        .update(form as any)
        .eq("id", editingId);
      if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); setSaving(false); return; }
      toast({ title: "Operadora atualizada" });
    } else {
      const { error } = await supabase
        .from("company_card_fees")
        .insert({ ...form, company_id: companyId } as any);
      if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); setSaving(false); return; }
      toast({ title: "Operadora cadastrada" });
    }

    setSaving(false);
    setDialogOpen(false);
    fetchFees();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("company_card_fees").delete().eq("id", id);
    if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Operadora removida" });
    fetchFees();
  };

  const setField = (key: string, value: any) => setForm(prev => ({ ...prev, [key]: value }));

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-4 w-full">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary" /> Taxas de Cartão
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">Cadastre as operadoras de cartão para calcular automaticamente as taxas</p>
        </div>
        <Button size="sm" onClick={openNew} className="gap-1.5 shrink-0">
          <Plus className="h-4 w-4" /> Nova Operadora
        </Button>
      </div>

      {fees.length === 0 ? (
        <Card className="p-8 text-center">
          <CreditCard className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Nenhuma operadora cadastrada.</p>
          <p className="text-xs text-muted-foreground mt-1">Cadastre as operadoras de cartão para calcular automaticamente as taxas nas festas.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {fees.map(fee => (
            <Card key={fee.id} className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-foreground">{fee.operator_name}</h3>
                  <p className="text-xs text-muted-foreground">
                    {fee.antecipado ? "✅ Recebimento antecipado" : "📅 Recebimento normal"}
                  </p>
                </div>
                <div className="flex gap-1">
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(fee)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => handleDelete(fee.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
              <div className="grid grid-cols-4 gap-2 text-xs">
                <div className="bg-muted/50 rounded p-1.5 text-center">
                  <p className="text-muted-foreground">Débito</p>
                  <p className="font-semibold">{fee.taxa_debito}%</p>
                </div>
                <div className="bg-muted/50 rounded p-1.5 text-center">
                  <p className="text-muted-foreground">1x</p>
                  <p className="font-semibold">{fee.taxa_credito_1x}%</p>
                </div>
                <div className="bg-muted/50 rounded p-1.5 text-center">
                  <p className="text-muted-foreground">6x</p>
                  <p className="font-semibold">{fee.taxa_credito_6x}%</p>
                </div>
                <div className="bg-muted/50 rounded p-1.5 text-center">
                  <p className="text-muted-foreground">12x</p>
                  <p className="font-semibold">{fee.taxa_credito_12x}%</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar Operadora" : "Nova Operadora"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-5">
            <div className="space-y-2">
              <Label>Nome da Operadora</Label>
              <Input placeholder="Ex: Stone, Cielo, Rede..." value={form.operator_name} onChange={e => setField("operator_name", e.target.value)} />
            </div>

            <div className="flex items-center gap-3">
              <Switch checked={form.antecipado} onCheckedChange={v => setField("antecipado", v)} />
              <Label className="cursor-pointer">Valor recebido antecipadamente?</Label>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Taxa Débito (%)</Label>
              <Input type="number" step="0.01" min="0" max="100" value={form.taxa_debito || ""} onChange={e => setField("taxa_debito", parseFloat(e.target.value) || 0)} placeholder="0.00" />
            </div>

            <div className="space-y-3">
              <Label className="text-sm font-medium">Taxas Crédito por Parcela (%)</Label>
              <div className="grid grid-cols-3 gap-3">
                {PARCELA_FIELDS.map(f => (
                  <div key={f.key} className="space-y-1">
                    <Label className="text-xs text-muted-foreground">{f.label}</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      value={(form as any)[f.key] || ""}
                      onChange={e => setField(f.key, parseFloat(e.target.value) || 0)}
                      placeholder="0.00"
                      className="h-9 text-sm"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingId ? "Salvar" : "Cadastrar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
