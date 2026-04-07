import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Trash2, Pencil, Package, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { PackagePriceGrid, type PackagePriceGridHandle } from "./PackagePriceGrid";

interface CompanyPackage {
  id: string;
  name: string;
  description: string | null;
  valor_pessoa_adicional: number | null;
  preco_separado: boolean;
  valor_pessoa_adicional_crianca: number | null;
  valor_pessoa_adicional_adulto: number | null;
  is_active: boolean;
  sort_order: number;
}

function formatCurrency(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (!digits) return "";
  const num = parseInt(digits, 10);
  const formatted = (num / 100).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return formatted;
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
    <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">R$</span>
      <Input className="pl-9" placeholder={placeholder} value={value} onChange={handleChange} inputMode="decimal" />
    </div>
  );
}

export function PackagesManager() {
  const { currentCompany } = useCompany();
  const [packages, setPackages] = useState<CompanyPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<CompanyPackage | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [precoSeparado, setPrecoSeparado] = useState(false);
  const [valorUnico, setValorUnico] = useState("");
  const [valorCrianca, setValorCrianca] = useState("");
  const [valorAdulto, setValorAdulto] = useState("");
  const [saving, setSaving] = useState(false);
  const priceGridRef = useRef<PackagePriceGridHandle>(null);

  const fetchPackages = async () => {
    if (!currentCompany?.id) return;
    const { data } = await supabase
      .from("company_packages")
      .select("*")
      .eq("company_id", currentCompany.id)
      .order("sort_order")
      .order("created_at");
    setPackages((data as unknown as CompanyPackage[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchPackages();
  }, [currentCompany?.id]);

  const numToDisplay = (v: number | null) =>
    v != null ? v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "";

  const openNew = () => {
    setEditing(null);
    setName("");
    setDescription("");
    setPrecoSeparado(false);
    setValorUnico("");
    setValorCrianca("");
    setValorAdulto("");
    setDialogOpen(true);
  };

  const openEdit = (pkg: CompanyPackage) => {
    setEditing(pkg);
    setName(pkg.name);
    setDescription(pkg.description || "");
    setPrecoSeparado(pkg.preco_separado);
    setValorUnico(numToDisplay(pkg.valor_pessoa_adicional));
    setValorCrianca(numToDisplay(pkg.valor_pessoa_adicional_crianca));
    setValorAdulto(numToDisplay(pkg.valor_pessoa_adicional_adulto));
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!name.trim() || !currentCompany?.id) return;
    setSaving(true);

    const payload: Record<string, unknown> = {
      name: name.trim(),
      description: description.trim() || null,
      preco_separado: precoSeparado,
    };

    if (precoSeparado) {
      payload.valor_pessoa_adicional = null;
      payload.valor_pessoa_adicional_crianca = parseCurrency(valorCrianca);
      payload.valor_pessoa_adicional_adulto = parseCurrency(valorAdulto);
    } else {
      payload.valor_pessoa_adicional = parseCurrency(valorUnico);
      payload.valor_pessoa_adicional_crianca = null;
      payload.valor_pessoa_adicional_adulto = null;
    }

    let targetId = editing?.id;

    if (editing) {
      await supabase.from("company_packages").update(payload).eq("id", editing.id);
    } else {
      const { data: created } = await supabase
        .from("company_packages")
        .insert({ ...payload, company_id: currentCompany.id } as any)
        .select("*")
        .single();
      if (created) {
        targetId = (created as any).id;
      }
    }

    // Save price tiers
    if (targetId && priceGridRef.current) {
      await priceGridRef.current.saveTiers(targetId);
    }

    toast({ title: editing ? "Pacote atualizado!" : "Pacote criado!" });
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
    <div className="max-w-6xl mx-auto space-y-4">
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
          <Card key={pkg.id} className="group border-border/50 bg-gradient-to-br from-card to-muted/30 hover:border-primary/20 hover:shadow-lg transition-all duration-300">
            <CardContent className="p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/15 transition-colors">
                    <Package className="h-4 w-4 text-primary" />
                  </div>
                  <span className="font-semibold text-sm text-foreground">{pkg.name}</span>
                </div>
                <div className="flex gap-0.5 opacity-60 group-hover:opacity-100 transition-opacity">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(pkg)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDelete(pkg.id)}>
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </div>
              </div>
              {pkg.description && (
                <p className="text-xs text-muted-foreground line-clamp-2 pl-[46px]">{pkg.description}</p>
              )}
              <div className="ml-[46px] flex flex-wrap gap-2">
                {pkg.preco_separado ? (
                  <>
                    {pkg.valor_pessoa_adicional_crianca != null && (
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-500/5 border border-blue-500/10">
                        <span className="text-[11px] font-semibold text-blue-600 tracking-wide">
                          🧒 Criança: R$ {pkg.valor_pessoa_adicional_crianca.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    )}
                    {pkg.valor_pessoa_adicional_adulto != null && (
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-orange-500/5 border border-orange-500/10">
                        <span className="text-[11px] font-semibold text-orange-600 tracking-wide">
                          🧑 Adulto: R$ {pkg.valor_pessoa_adicional_adulto.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    )}
                  </>
                ) : (
                  pkg.valor_pessoa_adicional != null && (
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-primary/5 border border-primary/10">
                      <span className="text-[11px] font-semibold text-primary tracking-wide uppercase">
                        Pessoa adicional: R$ {pkg.valor_pessoa_adicional.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  )
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-3xl max-w-[calc(100vw-2rem)] p-0 gap-0 overflow-hidden bg-background border-border/60 shadow-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="px-4 pt-4 pb-3 sm:px-6 sm:pt-6 sm:pb-4">
            <DialogTitle className="text-lg font-bold">{editing ? "Editar Pacote" : "Novo Pacote"}</DialogTitle>
            <p className="text-sm text-muted-foreground mt-0.5">
              {editing ? "Atualize as informações do pacote" : "Cadastre um novo pacote para seus eventos"}
            </p>
          </DialogHeader>

          <div className="px-4 pb-4 sm:px-6 sm:pb-6 space-y-4">
            {/* Seção: Informações */}
            <div className="rounded-xl border border-border/60 bg-card p-4 space-y-4">
              <div className="flex items-center gap-2 mb-1">
                <Package className="h-4 w-4 text-primary" />
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Informações</span>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Nome do pacote *</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Pacote Premium" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Descrição</Label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Descrição do pacote (opcional)"
                  rows={3}
                />
              </div>
            </div>

            {/* Seção: Valores */}
            <div className="rounded-xl border border-border/60 bg-card p-4 space-y-4">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">💰 Valores</span>
              </div>

              <div className="flex items-center justify-between">
                <Label className="text-xs text-muted-foreground">Preços separados (criança / adulto)</Label>
                <Switch checked={precoSeparado} onCheckedChange={setPrecoSeparado} />
              </div>

              {precoSeparado ? (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">🧒 Criança (R$)</Label>
                    <CurrencyInput value={valorCrianca} onChange={setValorCrianca} placeholder="R$ 0,00" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">🧑 Adulto (R$)</Label>
                    <CurrencyInput value={valorAdulto} onChange={setValorAdulto} placeholder="R$ 0,00" />
                  </div>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Valor por pessoa adicional (R$)</Label>
                  <CurrencyInput value={valorUnico} onChange={setValorUnico} placeholder="R$ 0,00" />
                </div>
              )}
            </div>

            {/* Seção: Grade de Preços — sempre visível */}
            <div className="rounded-xl border border-border/60 bg-card p-4">
              <PackagePriceGrid
                ref={priceGridRef}
                packageId={editing?.id}
                companyId={currentCompany?.id || ""}
                settings={currentCompany?.settings as Record<string, unknown> | null}
              />
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
    </div>
  );
}
