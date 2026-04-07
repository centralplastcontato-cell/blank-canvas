import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentCompanyId } from "@/hooks/useCurrentCompanyId";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, Loader2, PartyPopper, RotateCcw } from "lucide-react";
import { toast } from "@/hooks/use-toast";

export interface EventTypeConfig {
  value: string;
  label: string;
}

export const DEFAULT_EVENT_TYPES: EventTypeConfig[] = [
  { value: "aniversario", label: "Aniversário" },
  { value: "formatura", label: "Formatura" },
  { value: "escolar", label: "Escolar" },
  { value: "aniversario_kids", label: "Aniversário Kids" },
  { value: "confraternizacao", label: "Confraternização" },
];

export function EventTypesConfig() {
  const companyId = useCurrentCompanyId();
  const [types, setTypes] = useState<EventTypeConfig[]>(DEFAULT_EVENT_TYPES);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    if (!companyId) return;
    (async () => {
      const { data } = await supabase
        .from("companies")
        .select("settings")
        .eq("id", companyId)
        .single();
      if (data?.settings && typeof data.settings === "object" && !Array.isArray(data.settings)) {
        const s = data.settings as Record<string, unknown>;
        setSettings(s);
        if (Array.isArray(s.event_types) && s.event_types.length > 0) {
          setTypes(s.event_types as EventTypeConfig[]);
        }
      }
      setLoading(false);
    })();
  }, [companyId]);

  const addType = () => {
    const key = `custom_${Date.now()}`;
    setTypes([...types, { value: key, label: "" }]);
  };

  const updateLabel = (idx: number, label: string) => {
    setTypes(types.map((t, i) => (i === idx ? { ...t, label } : t)));
  };

  const removeType = (idx: number) => {
    if (types.length <= 1) return;
    setTypes(types.filter((_, i) => i !== idx));
  };

  const restoreDefaults = () => {
    setTypes([...DEFAULT_EVENT_TYPES]);
  };

  const handleSave = async () => {
    const invalid = types.some((t) => !t.label.trim());
    if (invalid) {
      toast({ title: "Preencha todos os nomes", variant: "destructive" });
      return;
    }

    setSaving(true);
    const normalizedTypes = types.map((t) => ({
      value: t.value,
      label: t.label.trim(),
    }));

    const newSettings = { ...(settings || {}), event_types: normalizedTypes };

    const { error } = await supabase
      .from("companies")
      .update({ settings: newSettings } as any)
      .eq("id", companyId);

    if (error) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Tipos de festa salvos!" });
      setSettings(newSettings);
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

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
        {types.map((t, idx) => (
          <div key={t.value} className="flex items-center gap-2">
            <Input
              className="h-9 text-sm flex-1"
              value={t.label}
              onChange={(e) => updateLabel(idx, e.target.value)}
              placeholder="Nome do tipo de festa"
            />
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 shrink-0"
              onClick={() => removeType(idx)}
              disabled={types.length <= 1}
            >
              <Trash2 className="h-3.5 w-3.5 text-destructive" />
            </Button>
          </div>
        ))}
      </div>

      <Button variant="outline" size="sm" className="text-xs" onClick={addType}>
        <Plus className="h-3.5 w-3.5 mr-1" /> Adicionar tipo
      </Button>

      <div className="flex items-center justify-between pt-2 border-t border-border/40">
        <Button variant="ghost" size="sm" className="text-xs text-muted-foreground" onClick={restoreDefaults}>
          <RotateCcw className="h-3.5 w-3.5 mr-1" /> Restaurar padrão
        </Button>
        <Button size="sm" onClick={handleSave} disabled={saving}>
          {saving && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
          Salvar
        </Button>
      </div>
    </div>
  );
}
