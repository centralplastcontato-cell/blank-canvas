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
import { Plus, Trash2, Pencil, Package, Loader2, Settings2, ChevronUp, ChevronDown, AlertTriangle } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { moveItem, readPackageEventTypes, sortOrderChanges } from "@/lib/catalogOrder";
import { DEFAULT_EVENT_TYPES, type EventTypeConfig } from "./EventTypesConfig";
import { toast } from "@/hooks/use-toast";
import { PackagePriceGrid, type PackagePriceGridHandle } from "./PackagePriceGrid";
import { PriceGridConfigDialog } from "./PriceGridConfigDialog";
import { useCompanyModules } from "@/hooks/useCompanyModules";
import { ConfirmDeleteDialog } from "./ConfirmDeleteDialog";
import { cn } from "@/lib/utils";

interface CompanyPackage {
  id: string;
  name: string;
  description: string | null;
  // "O que inclui" — um item por linha; a IA usa para explicar os pacotes
  includes?: string | null;
  // A IA (beta) pode passar valor e comparar este pacote
  ai_quote?: boolean | null;
  valor_pessoa_adicional: number | null;
  preco_separado: boolean;
  valor_pessoa_adicional_crianca: number | null;
  valor_pessoa_adicional_adulto: number | null;
  valor_adicional_antecipado: number | null;
  valor_adicional_no_dia: number | null;
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

const money = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: v % 1 ? 2 : 0 });

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
  const { currentCompany, refreshCompanies } = useCompany();
  // Textos e opções da IA Conversacional só aparecem com o módulo ligado no Hub
  const { ia_conversacional: aiModule } = useCompanyModules();
  const [packages, setPackages] = useState<CompanyPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<CompanyPackage | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [includes, setIncludes] = useState("");
  const [aiQuote, setAiQuote] = useState(true);
  const [precoSeparado, setPrecoSeparado] = useState(false);
  const [valorUnico, setValorUnico] = useState("");
  const [valorCrianca, setValorCrianca] = useState("");
  const [valorAdulto, setValorAdulto] = useState("");
  const [valorAntecipado, setValorAntecipado] = useState("");
  const [valorNoDia, setValorNoDia] = useState("");
  const [saving, setSaving] = useState(false);
  const [configOpen, setConfigOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<CompanyPackage | null>(null);
  const priceGridRef = useRef<PackagePriceGridHandle>(null);
  // Faixa de preço da grade de cada pacote (o que a IA usa para passar valor)
  const [ranges, setRanges] = useState<Record<string, { min: number; max: number }>>({});
  const [eventType, setEventType] = useState<string>("none");

  const settings = (currentCompany?.settings || null) as Record<string, unknown> | null;
  const typeLinks = readPackageEventTypes(settings);
  const eventTypes: EventTypeConfig[] = (Array.isArray(settings?.event_types) && (settings?.event_types as unknown[]).length
    ? (settings?.event_types as EventTypeConfig[])
    : DEFAULT_EVENT_TYPES);
  const typeLabel = (v: string) => eventTypes.find((t) => t.value === v)?.label;

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
    const { data: tiers } = await supabase
      .from("package_price_tiers" as any)
      .select("package_id, price")
      .eq("company_id", currentCompany.id);
    const r: Record<string, { min: number; max: number }> = {};
    ((tiers || []) as unknown as { package_id: string; price: number }[]).forEach((t) => {
      const price = Number(t.price);
      if (!(price > 0)) return;
      const cur = r[t.package_id];
      r[t.package_id] = cur ? { min: Math.min(cur.min, price), max: Math.max(cur.max, price) } : { min: price, max: price };
    });
    setRanges(r);
  };

  const move = async (index: number, direction: -1 | 1) => {
    const next = moveItem(packages, index, direction);
    if (next === packages) return;
    const changes = sortOrderChanges(next);
    setPackages(next.map((p, i) => ({ ...p, sort_order: i })));
    const results = await Promise.all(changes.map((c) => supabase.from("company_packages").update({ sort_order: c.sort_order }).eq("id", c.id)));
    if (results.some((r) => r.error)) {
      toast({ title: "Não foi possível mudar a ordem", variant: "destructive" });
      fetchPackages();
    }
  };

  // Liga o pacote a um tipo de festa (a ficha da festa sugere o pacote certo)
  const saveTypeLink = async (packageId: string, value: string) => {
    if (!currentCompany?.id) return true;
    const current = typeLinks[packageId] || "none";
    if (current === value) return true;
    const { data } = await supabase.from("companies").select("settings").eq("id", currentCompany.id).single();
    const base = (data?.settings && typeof data.settings === "object" && !Array.isArray(data.settings)) ? data.settings as Record<string, unknown> : {};
    const links = { ...readPackageEventTypes(base) };
    if (value === "none") delete links[packageId]; else links[packageId] = value;
    const { error } = await supabase.from("companies").update({ settings: { ...base, package_event_types: links } }).eq("id", currentCompany.id);
    if (!error) void refreshCompanies();
    return !error;
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
    setIncludes("");
    setAiQuote(true);
    setPrecoSeparado(false);
    setValorUnico("");
    setValorCrianca("");
    setValorAdulto("");
    setValorAntecipado("");
    setValorNoDia("");
    setEventType("none");
    setDialogOpen(true);
  };

  const openEdit = (pkg: CompanyPackage) => {
    setEditing(pkg);
    setName(pkg.name);
    setDescription(pkg.description || "");
    setIncludes(pkg.includes || "");
    setAiQuote(pkg.ai_quote !== false);
    setPrecoSeparado(pkg.preco_separado);
    setValorUnico(numToDisplay(pkg.valor_pessoa_adicional));
    setValorCrianca(numToDisplay(pkg.valor_pessoa_adicional_crianca));
    setValorAdulto(numToDisplay(pkg.valor_pessoa_adicional_adulto));
    setValorAntecipado(numToDisplay(pkg.valor_adicional_antecipado));
    setValorNoDia(numToDisplay(pkg.valor_adicional_no_dia));
    setEventType(typeLinks[pkg.id] || "none");
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!name.trim() || !currentCompany?.id) return;
    setSaving(true);

    const payload: Record<string, unknown> = {
      name: name.trim(),
      description: description.trim() || null,
      includes: includes.trim() || null,
      ai_quote: aiQuote,
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

    payload.valor_adicional_antecipado = parseCurrency(valorAntecipado);
    payload.valor_adicional_no_dia = parseCurrency(valorNoDia);

    let targetId = editing?.id;
    let failed: string | null = null;

    // Banco ainda sem a coluna "includes" (migration não rodada): salva o resto
    const missingIncludes = (err: { message?: string } | null) => !!err?.message && /includes|ai_quote/.test(err.message);
    if (editing) {
      let { error } = await supabase.from("company_packages").update(payload as any).eq("id", editing.id);
      if (missingIncludes(error)) {
        const { includes: _i, ai_quote: _q, ...rest } = payload;
        ({ error } = await supabase.from("company_packages").update(rest as any).eq("id", editing.id));
        toast({ title: "Parte do pacote não foi salva", description: "\"O que inclui\" e a opção da IA precisam da atualização do banco (SQL). O resto foi salvo." });
      }
      if (error) failed = error.message;
    } else {
      let { data: created, error } = await supabase
        .from("company_packages")
        .insert({ ...payload, company_id: currentCompany.id, sort_order: packages.length } as any)
        .select("*")
        .single();
      if (missingIncludes(error)) {
        const { includes: _i, ai_quote: _q, ...rest } = payload;
        ({ data: created, error } = await supabase
          .from("company_packages")
          .insert({ ...rest, company_id: currentCompany.id, sort_order: packages.length } as any)
          .select("*")
          .single());
        toast({ title: "Parte do pacote não foi salva", description: "\"O que inclui\" e a opção da IA precisam da atualização do banco (SQL). O resto foi salvo." });
      }
      if (error || !created) failed = error?.message || "não foi possível criar o pacote";
      else targetId = (created as any).id;
    }

    // Grade de preços (só depois do pacote salvo)
    if (!failed && targetId && priceGridRef.current) {
      const ok = await priceGridRef.current.saveTiers(targetId);
      if (!ok) failed = "a grade de preços não foi gravada (a anterior foi mantida)";
    }
    if (!failed && targetId) {
      const ok = await saveTypeLink(targetId, eventType);
      if (!ok) failed = "o tipo de festa do pacote não foi salvo";
    }

    setSaving(false);
    if (failed) {
      // A janela fica aberta para tentar de novo sem perder o que foi digitado
      toast({ title: "Não foi possível salvar", description: failed, variant: "destructive" });
      if (targetId && !editing) fetchPackages();
      return;
    }
    toast({ title: editing ? "Pacote atualizado!" : "Pacote criado!" });
    setDialogOpen(false);
    fetchPackages();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("company_packages").delete().eq("id", id);
    setDeleteTarget(null);
    if (error) {
      toast({ title: "Não foi possível excluir", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Pacote excluído" });
    fetchPackages();
  };

  // Pausado = some da ficha da festa, do formulário do cliente e da IA, sem perder nada
  const toggleActive = async (pkg: CompanyPackage) => {
    const next = !pkg.is_active;
    setPackages((prev) => prev.map((p) => (p.id === pkg.id ? { ...p, is_active: next } : p)));
    const { error } = await supabase.from("company_packages").update({ is_active: next }).eq("id", pkg.id);
    if (error) {
      setPackages((prev) => prev.map((p) => (p.id === pkg.id ? { ...p, is_active: !next } : p)));
      toast({ title: "Não foi possível mudar", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: next ? `"${pkg.name}" ativo` : `"${pkg.name}" pausado`, description: next ? "Volta a aparecer nas festas e para a IA." : "Não aparece mais nas festas novas nem para a IA. Nada foi apagado." });
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
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Package className="h-5 w-5 text-primary shrink-0" />
            <h3 className="font-semibold">Pacotes</h3>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">Cadastre os pacotes de festa que serão oferecidos nos eventos</p>
        </div>
        <div className="flex flex-wrap gap-2 sm:shrink-0">
          <Button size="sm" variant="outline" onClick={() => setConfigOpen(true)} className="flex-1 sm:flex-none">
            <Settings2 className="h-4 w-4 mr-1" /> Configurar Grade
          </Button>
          <Button size="sm" onClick={openNew} className="flex-1 sm:flex-none">
            <Plus className="h-4 w-4 mr-1" /> Novo Pacote
          </Button>
        </div>
      </div>

      {packages.length === 0 && (
        <p className="text-sm text-muted-foreground">
          Nenhum pacote criado. Cadastre seus pacotes para usá-los nos eventos.
        </p>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        {packages.map((pkg, index) => {
          const range = ranges[pkg.id];
          const includesCount = (pkg.includes || "").split("\n").map((l) => l.trim()).filter(Boolean).length;
          const extra = pkg.preco_separado
            ? [pkg.valor_pessoa_adicional_crianca != null && `criança ${money(pkg.valor_pessoa_adicional_crianca)}`, pkg.valor_pessoa_adicional_adulto != null && `adulto ${money(pkg.valor_pessoa_adicional_adulto)}`].filter(Boolean).join(" · ")
            : pkg.valor_adicional_antecipado != null || pkg.valor_adicional_no_dia != null
              ? [pkg.valor_adicional_antecipado != null && `${money(pkg.valor_adicional_antecipado)} antecipado`, pkg.valor_adicional_no_dia != null && `${money(pkg.valor_adicional_no_dia)} no dia`].filter(Boolean).join(" · ")
              : pkg.valor_pessoa_adicional != null ? `${money(pkg.valor_pessoa_adicional)} por pessoa` : "";
          const linkedType = typeLinks[pkg.id] ? typeLabel(typeLinks[pkg.id]) : null;
          return (
            <Card key={pkg.id} className={cn("border-border/60", !pkg.is_active && "opacity-60")}>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="font-bold text-[15px] text-foreground">{pkg.name}</span>
                      {!pkg.is_active && <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">Pausado</span>}
                      {linkedType && <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">{linkedType}</span>}
                    </div>
                    {pkg.description && <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{pkg.description}</p>}
                  </div>
                  <Switch checked={pkg.is_active} onCheckedChange={() => toggleActive(pkg)} aria-label={pkg.is_active ? "Pausar pacote" : "Ativar pacote"} />
                </div>

                <div className="rounded-xl bg-muted/50 px-3 py-2.5 space-y-1">
                  {range ? (
                    <p className="text-sm">
                      <span className="font-bold text-foreground">{range.min === range.max ? money(range.min) : `${money(range.min)} a ${money(range.max)}`}</span>
                      <span className="text-xs text-muted-foreground"> conforme convidados e dia</span>
                    </p>
                  ) : (
                    <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                      <AlertTriangle className="h-3.5 w-3.5" /> Sem grade de preços{aiModule && pkg.ai_quote !== false ? ": a IA não consegue passar valor" : ""}
                    </p>
                  )}
                  {extra && <p className="text-xs text-muted-foreground">Convidado extra: {extra}</p>}
                  <p className="text-xs text-muted-foreground">{includesCount ? `Inclui ${includesCount} ${includesCount === 1 ? "item" : "itens"}` : "\"O que inclui\" não preenchido"}</p>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Button variant="ghost" size="icon" className="h-8 w-8" disabled={index === 0} onClick={() => move(index, -1)} aria-label="Subir na ordem">
                      <ChevronUp className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" disabled={index === packages.length - 1} onClick={() => move(index, 1)} aria-label="Descer na ordem">
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="outline" size="sm" className="h-8 gap-1.5" onClick={() => openEdit(pkg)}>
                      <Pencil className="h-3.5 w-3.5" /> Editar
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setDeleteTarget(pkg)} aria-label="Excluir pacote">
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
      {packages.length > 1 && (
        <p className="text-[11px] text-muted-foreground">A ordem aqui é a que aparece na ficha da festa, no formulário do cliente e para a IA.</p>
      )}

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
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Tipo de festa</Label>
                <Select value={eventType} onValueChange={setEventType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Qualquer tipo</SelectItem>
                    {eventTypes.filter((t) => !t.hidden || t.value === eventType).map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-muted-foreground">Ao escolher esse tipo na ficha da festa, este pacote aparece primeiro como sugestão.</p>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">O que inclui (um item por linha)</Label>
                <Textarea
                  value={includes}
                  onChange={(e) => setIncludes(e.target.value)}
                  placeholder={"Ex.:\nCardápio: salgados, mini lanches e bolo\nBebidas: refrigerante e suco à vontade\nBrinquedos: cama elástica, piscina de bolinhas\nDecoração da mesa do bolo\nEquipe: monitores e garçons"}
                  rows={6}
                />
                {aiModule && (
                  <p className="text-[11px] text-muted-foreground">
                    A IA usa esta lista para explicar o que cada pacote tem e a diferença entre eles. Não coloque valores aqui — os preços vêm só da grade.
                  </p>
                )}
              </div>
              {aiModule && (
              <div className="flex items-start justify-between gap-3 rounded-lg border border-border/60 bg-muted/30 p-3">
                <div>
                  <Label className="text-xs font-semibold">IA pode passar valor e comparar este pacote</Label>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Desligue para pacotes que não são de aniversário (formatura, escolar, confraternização): nesses casos a IA pega tipo de evento, data e quantidade de pessoas e passa para a equipe.
                  </p>
                </div>
                <Switch checked={aiQuote} onCheckedChange={setAiQuote} />
              </div>
              )}
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

              {precoSeparado && (
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
              )}

              <div className="space-y-3 rounded-xl border border-border/50 bg-muted/20 p-3">
                <div className="space-y-1">
                  <p className="text-xs font-medium text-foreground">Convidados extras</p>
                  <p className="text-[11px] text-muted-foreground">
                    Preencha os dois valores abaixo para diferenciar confirmação antecipada e cobrança no dia do evento.
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">📋 Antecipado (R$)</Label>
                    <CurrencyInput value={valorAntecipado} onChange={setValorAntecipado} placeholder="R$ 0,00" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">🎉 No dia (R$)</Label>
                    <CurrencyInput value={valorNoDia} onChange={setValorNoDia} placeholder="R$ 0,00" />
                  </div>
                </div>
              </div>

              {!precoSeparado && (
                <div className="space-y-1.5 pt-1 border-t border-border/40">
                  <Label className="text-xs text-muted-foreground">Valor por pessoa adicional</Label>
                  <CurrencyInput value={valorUnico} onChange={setValorUnico} placeholder="R$ 0,00" />
                  <p className="text-[11px] text-muted-foreground">
                    Opcional: use se não quiser diferenciar entre antecipado e no dia.
                  </p>
                </div>
              )}
            </div>

            {/* Seção: Grade de Preços — sempre visível */}
            <div className="rounded-xl border border-border/60 bg-card p-2 sm:p-4 overflow-x-auto">
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

      <PriceGridConfigDialog
        open={configOpen}
        onOpenChange={setConfigOpen}
        companyId={currentCompany?.id || ""}
        currentSettings={currentCompany?.settings as Record<string, unknown> | null}
        onSaved={() => { void refreshCompanies(); }}
      />

      <ConfirmDeleteDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title={`Excluir o pacote "${deleteTarget?.name ?? ""}"?`}
        description={
          <>
            <p>A grade de preços dele também é apagada, e a IA para de passar valor desse pacote. Não dá para desfazer.</p>
            <p>Se for só por um tempo (ex.: fora de época), use o botão de <strong>pausar</strong> no cartão: some das festas e da IA sem perder nada.</p>
          </>
        }
        onConfirm={() => deleteTarget && handleDelete(deleteTarget.id)}
      />
    </div>
  );
}
