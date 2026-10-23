import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentCompanyId } from "@/hooks/useCurrentCompanyId";
import { useCompany } from "@/contexts/CompanyContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, Loader2, PartyPopper, RotateCcw, EyeOff, Eye, ChevronUp, ChevronDown } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { ConfirmDeleteDialog } from "./ConfirmDeleteDialog";

export interface EventTypeConfig {
  value: string;
  label: string;
  /** Oculto: não aparece para escolher em festas novas, mas as festas que já usam continuam com o nome certo */
  hidden?: boolean;
}

export const DEFAULT_EVENT_TYPES: EventTypeConfig[] = [
  { value: "aniversario", label: "Aniversário" },
  { value: "formatura", label: "Formatura" },
  { value: "escolar", label: "Escolar" },
  { value: "aniversario_kids", label: "Aniversário Kids" },
  { value: "confraternizacao", label: "Confraternização" },
];

const serialize = (types: EventTypeConfig[]) => JSON.stringify(types.map((t) => ({ value: t.value, label: t.label.trim(), hidden: !!t.hidden })));

export function EventTypesConfig() {
  const companyId = useCurrentCompanyId();
  const { refreshCompanies } = useCompany();
  const [types, setTypes] = useState<EventTypeConfig[]>(DEFAULT_EVENT_TYPES);
  const [savedTypes, setSavedTypes] = useState<EventTypeConfig[]>(DEFAULT_EVENT_TYPES);
  const [usage, setUsage] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [confirmRestore, setConfirmRestore] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<number | null>(null);

  useEffect(() => {
    if (!companyId) return;
    (async () => {
      const { data } = await supabase.from("companies").select("settings").eq("id", companyId).single();
      let loaded = DEFAULT_EVENT_TYPES;
      if (data?.settings && typeof data.settings === "object" && !Array.isArray(data.settings)) {
        const s = data.settings as Record<string, unknown>;
        if (Array.isArray(s.event_types) && s.event_types.length > 0) loaded = s.event_types as EventTypeConfig[];
      }
      setTypes(loaded);
      setSavedTypes(loaded);
      setLoading(false);

      // Quantas festas usam cada tipo (para não apagar um tipo em uso)
      const counts = await Promise.all(loaded.map(async (t) => {
        const { count } = await supabase
          .from("company_events")
          .select("id", { count: "exact", head: true })
          .eq("company_id", companyId)
          .eq("event_type", t.value);
        return [t.value, count || 0] as const;
      }));
      setUsage(Object.fromEntries(counts));
    })();
  }, [companyId]);

  const dirty = useMemo(() => serialize(types) !== serialize(savedTypes), [types, savedTypes]);

  // Aviso ao fechar a aba com alterações não salvas
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const visible = types.map((t, idx) => ({ t, idx })).filter(({ t }) => !t.hidden);
  const hidden = types.map((t, idx) => ({ t, idx })).filter(({ t }) => t.hidden);

  const addType = () => setTypes([...types, { value: `custom_${Date.now()}`, label: "" }]);
  const updateLabel = (idx: number, label: string) => setTypes(types.map((t, i) => (i === idx ? { ...t, label } : t)));
  // Troca de lugar com o tipo visível de cima/baixo (a ordem é a da ficha da festa)
  const moveVisible = (pos: number, direction: -1 | 1) => {
    const a = visible[pos]?.idx;
    const b = visible[pos + direction]?.idx;
    if (a === undefined || b === undefined) return;
    const next = [...types];
    [next[a], next[b]] = [next[b], next[a]];
    setTypes(next);
  };
  const setHidden = (idx: number, value: boolean) => setTypes(types.map((t, i) => (i === idx ? { ...t, hidden: value } : t)));

  const askRemove = (idx: number) => {
    if (visible.length <= 1 && !types[idx].hidden) return;
    if ((usage[types[idx].value] || 0) > 0) setRemoveTarget(idx);
    else setTypes(types.filter((_, i) => i !== idx));
  };

  const restoreDefaults = () => {
    // Tipos em uso que não fazem parte do padrão ficam ocultos (as festas mantêm o nome)
    const keep = types
      .filter((t) => (usage[t.value] || 0) > 0 && !DEFAULT_EVENT_TYPES.some((d) => d.value === t.value))
      .map((t) => ({ ...t, hidden: true }));
    setTypes([...DEFAULT_EVENT_TYPES, ...keep]);
    setConfirmRestore(false);
  };

  const handleSave = async () => {
    if (types.some((t) => !t.label.trim())) {
      toast({ title: "Preencha todos os nomes", variant: "destructive" });
      return;
    }
    setSaving(true);
    const normalized = types.map((t) => ({ value: t.value, label: t.label.trim(), ...(t.hidden ? { hidden: true } : {}) }));
    // Lê de novo para não apagar outra configuração salva nesse meio tempo
    const { data: current } = await supabase.from("companies").select("settings").eq("id", companyId).single();
    const base = (current?.settings && typeof current.settings === "object" && !Array.isArray(current.settings)) ? current.settings as Record<string, unknown> : {};
    const { error } = await supabase.from("companies").update({ settings: { ...base, event_types: normalized } }).eq("id", companyId);
    setSaving(false);
    if (error) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Tipos de festa salvos!" });
    setTypes(normalized);
    setSavedTypes(normalized);
    void refreshCompanies();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const usageText = (value: string) => {
    const n = usage[value];
    if (n === undefined) return null;
    return n === 0 ? "nenhuma festa" : n === 1 ? "1 festa" : `${n} festas`;
  };
  const target = removeTarget !== null ? types[removeTarget] : null;

  return (
    <div className="rounded-xl border border-border/60 bg-card p-4 sm:p-5 space-y-4">
      <div className="flex items-center gap-2.5">
        <div className="p-2 rounded-lg bg-primary/10">
          <PartyPopper className="h-4 w-4 text-primary" />
        </div>
        <div>
          <h3 className="text-sm font-semibold">Tipos de Festa</h3>
          <p className="text-xs text-muted-foreground">Defina os tipos de evento que seu buffet trabalha</p>
        </div>
      </div>

      <div className="space-y-2">
        {visible.map(({ t, idx }, pos) => (
          <div key={t.value} className="flex items-center gap-1.5">
            <div className="flex flex-col">
              <Button variant="ghost" size="icon" className="h-5 w-7" disabled={pos === 0} onClick={() => moveVisible(pos, -1)} aria-label="Subir na ordem">
                <ChevronUp className="h-3.5 w-3.5" />
              </Button>
              <Button variant="ghost" size="icon" className="h-5 w-7" disabled={pos === visible.length - 1} onClick={() => moveVisible(pos, 1)} aria-label="Descer na ordem">
                <ChevronDown className="h-3.5 w-3.5" />
              </Button>
            </div>
            <div className="relative flex-1">
              <Input
                className="h-9 text-sm pr-24"
                value={t.label}
                onChange={(e) => updateLabel(idx, e.target.value)}
                placeholder="Nome do tipo de festa"
                aria-label="Nome do tipo de festa"
              />
              {usageText(t.value) && (
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-muted-foreground">{usageText(t.value)}</span>
              )}
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 shrink-0"
              onClick={() => askRemove(idx)}
              disabled={visible.length <= 1}
              aria-label="Remover tipo"
            >
              <Trash2 className="h-3.5 w-3.5 text-destructive" />
            </Button>
          </div>
        ))}
      </div>

      <Button variant="outline" size="sm" className="text-xs" onClick={addType}>
        <Plus className="h-3.5 w-3.5 mr-1" /> Adicionar tipo
      </Button>

      {hidden.length > 0 && (
        <div className="rounded-lg border border-dashed border-border p-3 space-y-2">
          <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5"><EyeOff className="h-3.5 w-3.5" /> Ocultos (não aparecem para escolher)</p>
          {hidden.map(({ t, idx }) => (
            <div key={t.value} className="flex items-center justify-between gap-2 text-sm">
              <span className="truncate">{t.label} <span className="text-[11px] text-muted-foreground">· {usageText(t.value) ?? ""}</span></span>
              <Button variant="ghost" size="sm" className="h-8 text-xs gap-1" onClick={() => setHidden(idx, false)}>
                <Eye className="h-3.5 w-3.5" /> Mostrar
              </Button>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between gap-2 pt-2 border-t border-border/40">
        <Button variant="ghost" size="sm" className="text-xs text-muted-foreground" onClick={() => setConfirmRestore(true)}>
          <RotateCcw className="h-3.5 w-3.5 mr-1" /> Restaurar padrão
        </Button>
        <div className="flex items-center gap-2">
          {dirty && <span className="text-[11px] font-medium text-amber-700 dark:text-amber-400">Alterações não salvas</span>}
          <Button size="sm" onClick={handleSave} disabled={saving || !dirty}>
            {saving && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
            Salvar
          </Button>
        </div>
      </div>

      <ConfirmDeleteDialog
        open={confirmRestore}
        onOpenChange={setConfirmRestore}
        title="Voltar para os tipos padrão?"
        description={
          <>
            <p>A lista volta a ser: {DEFAULT_EVENT_TYPES.map((d) => d.label).join(", ")}. Os tipos que você criou saem da lista.</p>
            <p>Tipos que já estão em festas ficam ocultos, e essas festas continuam com o nome certo. Nada é salvo até você clicar em Salvar.</p>
          </>
        }
        confirmLabel="Restaurar"
        onConfirm={restoreDefaults}
      />

      <ConfirmDeleteDialog
        open={!!target}
        onOpenChange={(o) => !o && setRemoveTarget(null)}
        title={`"${target?.label ?? ""}" está em ${usageText(target?.value ?? "") ?? "festas"}`}
        description={
          <p>Para essas festas não ficarem sem nome, o tipo vai ser <strong>ocultado</strong>: não aparece mais para escolher em festas novas, e você pode mostrar de novo quando quiser.</p>
        }
        confirmLabel="Ocultar"
        onConfirm={() => { if (removeTarget !== null) setHidden(removeTarget, true); setRemoveTarget(null); }}
      />
    </div>
  );
}
