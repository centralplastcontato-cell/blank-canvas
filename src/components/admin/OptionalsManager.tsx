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
import { Switch } from "@/components/ui/switch";
import { ConfirmDeleteDialog } from "./ConfirmDeleteDialog";
import { cn } from "@/lib/utils";

interface CompanyOptional {
  id: string;
  name: string;
  description: string | null;
  value: number | null;
  valor_por_pessoa: number | null;
  is_active: boolean;
  sort_order: number;
}

function formatCurrency(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (!digits) return "";
  const num = parseInt(digits, 10);
  return (num / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function parseCurrency(formatted: string): number | null {
  if (!formatted.trim()) return null;
  const cleaned = formatted.replace(/\./g, "").replace(",", ".");
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

function CurrencyInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace("R$ ", "");
    onChange(formatCurrency(raw));
  };
  return (
    <Input
      type="text"
      inputMode="decimal"
      value={value ? `R$ ${value}` : ""}
      onChange={handleChange}
      placeholder={placeholder || "R$ 0,00"}
    />
  );
}

export function OptionalsManager() {
  const { currentCompany } = useCompany();
  const [optionals, setOptionals] = useState<CompanyOptional[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<CompanyOptional | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [valor, setValor] = useState("");
  const [valorPorPessoa, setValorPorPessoa] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<CompanyOptional | null>(null);

  const fetchOptionals = async () => {
    if (!currentCompany?.id) return;
    const { data } = await supabase
      .from("company_optionals" as any)
      .select("*")
      .eq("company_id", currentCompany.id)
      .order("sort_order")
      .order("created_at");
    setOptionals((data as unknown as CompanyOptional[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchOptionals();
  }, [currentCompany?.id]);

  const numToDisplay = (v: number | null) =>
    v != null ? v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "";

  const openNew = () => {
    setEditing(null);
    setName("");
    setDescription("");
    setValor("");
    setValorPorPessoa("");
    setDialogOpen(true);
  };

  const openEdit = (opt: CompanyOptional) => {
    setEditing(opt);
    setName(opt.name);
    setDescription(opt.description || "");
    setValor(numToDisplay(opt.value));
    setValorPorPessoa(numToDisplay(opt.valor_por_pessoa));
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!name.trim() || !currentCompany?.id) return;
    setSaving(true);

    const payload: Record<string, unknown> = {
      name: name.trim(),
      description: description.trim() || null,
      value: parseCurrency(valor),
      valor_por_pessoa: parseCurrency(valorPorPessoa),
    };

    const { error } = editing
      ? await supabase.from("company_optionals" as any).update(payload).eq("id", editing.id)
      : await supabase.from("company_optionals" as any).insert({ ...payload, company_id: currentCompany.id, sort_order: optionals.length } as any);

    setSaving(false);
    if (error) {
      // A janela fica aberta para tentar de novo sem perder o que foi digitado
      toast({ title: "Não foi possível salvar", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: editing ? "Opcional atualizado!" : "Opcional criado!" });
    setDialogOpen(false);
    fetchOptionals();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("company_optionals" as any).delete().eq("id", id);
    setDeleteTarget(null);
    if (error) {
      toast({ title: "Não foi possível excluir", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Opcional excluído" });
    fetchOptionals();
  };

  // Pausado = some da lista ao montar a festa, sem perder nada
  const toggleActive = async (opt: CompanyOptional) => {
    const next = !opt.is_active;
    setOptionals((prev) => prev.map((o) => (o.id === opt.id ? { ...o, is_active: next } : o)));
    const { error } = await supabase.from("company_optionals" as any).update({ is_active: next } as any).eq("id", opt.id);
    if (error) {
      setOptionals((prev) => prev.map((o) => (o.id === opt.id ? { ...o, is_active: !next } : o)));
      toast({ title: "Não foi possível mudar", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: next ? `"${opt.name}" ativo` : `"${opt.name}" pausado`, description: next ? "Volta a aparecer ao montar a festa." : "Não aparece mais ao montar festas novas. Nada foi apagado." });
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">Opcionais</h3>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">Cadastre itens opcionais para adicionar rapidamente às festas</p>
        </div>
        <Button size="sm" onClick={openNew}>
          <Plus className="h-4 w-4 mr-1" /> Novo Opcional
        </Button>
      </div>

      {optionals.length === 0 && (
        <p className="text-sm text-muted-foreground">
          Nenhum opcional cadastrado. Crie opcionais para adicioná-los rapidamente às festas.
        </p>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        {optionals.map((opt) => (
          <Card key={opt.id} className={cn("group border-border/50 bg-gradient-to-br from-card to-muted/30 hover:border-primary/20 hover:shadow-lg transition-all duration-300", !opt.is_active && "opacity-60")}>
            <CardContent className="p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/15 transition-colors">
                    <Package className="h-4 w-4 text-primary" />
                  </div>
                  <span className="font-semibold text-sm text-foreground">{opt.name}</span>
                  {!opt.is_active && <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">Pausado</span>}
                </div>
                <div className="flex items-center gap-0.5">
                  <Switch checked={opt.is_active} onCheckedChange={() => toggleActive(opt)} aria-label={opt.is_active ? "Pausar opcional" : "Ativar opcional"} className="scale-75" />
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(opt)} aria-label="Editar opcional">
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setDeleteTarget(opt)} aria-label="Excluir opcional">
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </div>
              </div>
              {opt.description && (
                <p className="text-xs text-muted-foreground line-clamp-2 pl-[46px]">{opt.description}</p>
              )}
              {(opt.value != null && opt.value > 0 || opt.valor_por_pessoa != null && opt.valor_por_pessoa > 0) && (
                <div className="ml-[46px] flex flex-wrap gap-1.5">
                  {opt.value != null && opt.value > 0 && (
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-primary/5 border border-primary/10">
                      <span className="text-[11px] font-semibold text-primary tracking-wide uppercase">
                        R$ {opt.value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  )}
                  {opt.valor_por_pessoa != null && opt.valor_por_pessoa > 0 && (
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-accent/50 border border-border/50">
                      <span className="text-[11px] font-semibold text-muted-foreground tracking-wide">
                        R$ {opt.valor_por_pessoa.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}/pessoa
                      </span>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md p-0 gap-0 overflow-hidden bg-background border-border/60 shadow-xl">
          <DialogHeader className="p-6 pb-4">
            <DialogTitle className="text-lg font-bold">{editing ? "Editar Opcional" : "Novo Opcional"}</DialogTitle>
            <p className="text-sm text-muted-foreground mt-0.5">
              {editing ? "Atualize as informações do opcional" : "Cadastre um novo item opcional para seus eventos"}
            </p>
          </DialogHeader>

          <div className="px-6 pb-6 space-y-4">
            <div className="rounded-xl border border-border/60 bg-card p-4 space-y-4">
              <div className="flex items-center gap-2 mb-1">
                <Package className="h-4 w-4 text-primary" />
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Informações</span>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Nome do opcional *</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Mesa de doces, DJ" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Descrição</Label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Descrição do opcional (opcional)"
                  rows={3}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Valor fixo (R$)</Label>
                <CurrencyInput value={valor} onChange={setValor} placeholder="R$ 0,00" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Valor por pessoa (R$)</Label>
                <CurrencyInput value={valorPorPessoa} onChange={setValorPorPessoa} placeholder="R$ 0,00" />
                <p className="text-[10px] text-muted-foreground">Se preenchido, será multiplicado pela qtde de convidados ao adicionar na festa.</p>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
              <Button onClick={handleSave} disabled={saving || !name.trim()}>
                {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                {editing ? "Salvar" : "Criar"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDeleteDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title={`Excluir o opcional "${deleteTarget?.name ?? ""}"?`}
        description={
          <>
            <p>Festas que já têm esse opcional continuam com ele. Ele só sai da lista para festas novas. Não dá para desfazer.</p>
            <p>Se for só por um tempo, use o botão de <strong>pausar</strong> no cartão.</p>
          </>
        }
        onConfirm={() => deleteTarget && handleDelete(deleteTarget.id)}
      />
    </div>
  );
}
