import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Trash2, Pencil, Package, Loader2, ChevronUp, ChevronDown, Search } from "lucide-react";
import { moveItem, sortOrderChanges } from "@/lib/catalogOrder";
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

const money = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const norm = (t: string) => t.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

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
  // Um opcional custa um valor fixo OU um valor por pessoa (antes dava para preencher os dois)
  const [mode, setMode] = useState<"fixed" | "per_person">("fixed");
  const [hadBoth, setHadBoth] = useState(false);
  const [search, setSearch] = useState("");
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
    setMode("fixed");
    setHadBoth(false);
    setDialogOpen(true);
  };

  const openEdit = (opt: CompanyOptional) => {
    setEditing(opt);
    setName(opt.name);
    setDescription(opt.description || "");
    setValor(numToDisplay(opt.value));
    setValorPorPessoa(numToDisplay(opt.valor_por_pessoa));
    const perPerson = (opt.valor_por_pessoa ?? 0) > 0;
    setMode(perPerson ? "per_person" : "fixed");
    setHadBoth(perPerson && (opt.value ?? 0) > 0);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!name.trim() || !currentCompany?.id) return;
    setSaving(true);

    const payload: Record<string, unknown> = {
      name: name.trim(),
      description: description.trim() || null,
      value: mode === "fixed" ? parseCurrency(valor) : null,
      valor_por_pessoa: mode === "per_person" ? parseCurrency(valorPorPessoa) : null,
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

  const move = async (index: number, direction: -1 | 1) => {
    const next = moveItem(optionals, index, direction);
    if (next === optionals) return;
    const changes = sortOrderChanges(next);
    setOptionals(next.map((o, i) => ({ ...o, sort_order: i })));
    const results = await Promise.all(changes.map((c) => supabase.from("company_optionals" as any).update({ sort_order: c.sort_order } as any).eq("id", c.id)));
    if (results.some((r) => r.error)) {
      toast({ title: "Não foi possível mudar a ordem", variant: "destructive" });
      fetchOptionals();
    }
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

      {optionals.length > 6 && (
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar opcional" className="pl-9" aria-label="Buscar opcional" />
        </div>
      )}

      {optionals.length > 0 && (
        <div className="overflow-hidden rounded-2xl border border-border/60 bg-card divide-y divide-border/60">
          {optionals
            .map((opt, index) => ({ opt, index }))
            .filter(({ opt }) => !search.trim() || norm(opt.name + " " + (opt.description || "")).includes(norm(search)))
            .map(({ opt, index }) => {
              const price = (opt.valor_por_pessoa ?? 0) > 0
                ? `${money(opt.valor_por_pessoa as number)} por pessoa`
                : (opt.value ?? 0) > 0 ? money(opt.value as number) : "Sem valor";
              return (
                <div key={opt.id} className={cn("flex items-center gap-2 px-3 py-2.5", !opt.is_active && "opacity-60")}>
                  {!search.trim() && (
                    <div className="flex flex-col">
                      <Button variant="ghost" size="icon" className="h-6 w-7" disabled={index === 0} onClick={() => move(index, -1)} aria-label="Subir na ordem">
                        <ChevronUp className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-6 w-7" disabled={index === optionals.length - 1} onClick={() => move(index, 1)} aria-label="Descer na ordem">
                        <ChevronDown className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                  <button type="button" onClick={() => openEdit(opt)} className="min-w-0 flex-1 text-left">
                    <span className="flex flex-wrap items-center gap-1.5">
                      <span className="font-semibold text-sm text-foreground">{opt.name}</span>
                      {!opt.is_active && <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">Pausado</span>}
                    </span>
                    {opt.description && <span className="block text-xs text-muted-foreground truncate">{opt.description}</span>}
                    <span className={cn("block text-xs font-semibold", price === "Sem valor" ? "text-muted-foreground" : "text-primary")}>{price}</span>
                  </button>
                  <Switch checked={opt.is_active} onCheckedChange={() => toggleActive(opt)} aria-label={opt.is_active ? "Pausar opcional" : "Ativar opcional"} className="scale-90" />
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(opt)} aria-label="Editar opcional">
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setDeleteTarget(opt)} aria-label="Excluir opcional">
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </div>
              );
            })}
        </div>
      )}
      {optionals.length > 1 && !search.trim() && (
        <p className="text-[11px] text-muted-foreground">A ordem aqui é a que aparece ao montar a festa.</p>
      )}

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
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Como cobra</Label>
                <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Como cobra">
                  {([["fixed", "Valor fixo", "Ex.: taxa do bar"], ["per_person", "Por pessoa", "Multiplica pelos convidados"]] as const).map(([v, label, hint]) => (
                    <button
                      key={v}
                      type="button"
                      role="radio"
                      aria-checked={mode === v}
                      onClick={() => setMode(v)}
                      className={cn("rounded-xl border p-2.5 text-left transition-colors", mode === v ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50")}
                    >
                      <span className="block text-sm font-semibold">{label}</span>
                      <span className="block text-[11px] text-muted-foreground">{hint}</span>
                    </button>
                  ))}
                </div>
                {mode === "fixed" ? (
                  <CurrencyInput value={valor} onChange={setValor} placeholder="R$ 0,00" />
                ) : (
                  <CurrencyInput value={valorPorPessoa} onChange={setValorPorPessoa} placeholder="R$ 0,00 por pessoa" />
                )}
                {hadBoth && (
                  <p className="text-[11px] text-amber-700 dark:text-amber-400">
                    Este opcional tinha os dois valores preenchidos. Ao salvar, fica só o que estiver escolhido acima.
                  </p>
                )}
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
