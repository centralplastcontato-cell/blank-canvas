import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, RotateCcw, Loader2, Settings2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { DEFAULT_DAY_TYPES, DEFAULT_GUEST_TIERS, type DayTypeConfig, type DayMappingToken } from "@/lib/brazilian-holidays";

const DAY_TOKENS: { token: DayMappingToken; short: string; full: string }[] = [
  { token: "1", short: "Seg", full: "Segunda" },
  { token: "2", short: "Ter", full: "Terça" },
  { token: "3", short: "Qua", full: "Quarta" },
  { token: "4", short: "Qui", full: "Quinta" },
  { token: "5", short: "Sex", full: "Sexta" },
  { token: "6", short: "Sáb", full: "Sábado" },
  { token: "0", short: "Dom", full: "Domingo" },
  { token: "vespera_feriado", short: "Véspera", full: "Véspera de Feriado" },
  { token: "feriado", short: "Feriado", full: "Feriado" },
];

const PRESET_DAY_TYPES: DayTypeConfig[] = [
  { key: "seg_qui", label: "Seg a Qui" },
  { key: "seg_sex", label: "Seg a Sex" },
  { key: "seg_ter", label: "Seg e Ter" },
  { key: "qua_qui", label: "Qua e Qui" },
  { key: "sexta", label: "Sexta" },
  { key: "sabado", label: "Sábado" },
  { key: "domingo", label: "Domingo" },
  { key: "sab_dom", label: "Sáb e Dom" },
  { key: "sex_sab_dom", label: "Sex, Sáb e Dom" },
  { key: "vespera_feriado", label: "Véspera de Feriado" },
  { key: "feriado", label: "Feriado" },
];

interface PriceGridConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: string;
  currentSettings: Record<string, unknown> | null;
  onSaved: () => void;
}

export function PriceGridConfigDialog({ open, onOpenChange, companyId, currentSettings, onSaved }: PriceGridConfigDialogProps) {
  const existingDayTypes = (currentSettings?.day_type_config as DayTypeConfig[]) || DEFAULT_DAY_TYPES;
  const existingGuestTiers = (currentSettings?.guest_tiers as number[]) || DEFAULT_GUEST_TIERS;

  const [dayTypes, setDayTypes] = useState<DayTypeConfig[]>(existingDayTypes);
  const [guestTiers, setGuestTiers] = useState<number[]>(existingGuestTiers);
  const [newTier, setNewTier] = useState("");
  const [saving, setSaving] = useState(false);
  const [presetValue, setPresetValue] = useState("");

  // Reset state when dialog opens
  const handleOpenChange = (v: boolean) => {
    if (v) {
      setDayTypes((currentSettings?.day_type_config as DayTypeConfig[]) || DEFAULT_DAY_TYPES);
      setGuestTiers((currentSettings?.guest_tiers as number[]) || DEFAULT_GUEST_TIERS);
      setNewTier("");
      setPresetValue("");
    }
    onOpenChange(v);
  };

  const addPresetDayType = (key: string) => {
    const preset = PRESET_DAY_TYPES.find((p) => p.key === key);
    if (!preset || dayTypes.some((d) => d.key === key)) {
      toast({ title: "Esse tipo de dia já existe na grade" });
      return;
    }
    setDayTypes([...dayTypes, { ...preset }]);
    setPresetValue("");
  };

  const addCustomDayType = () => {
    const id = `custom_${Date.now()}`;
    setDayTypes([...dayTypes, { key: id, label: "Novo tipo" }]);
  };

  const updateDayTypeLabel = (idx: number, label: string) => {
    setDayTypes(dayTypes.map((d, i) => (i === idx ? { ...d, label } : d)));
  };

  const removeDayType = (idx: number) => {
    if (dayTypes.length <= 1) return;
    setDayTypes(dayTypes.filter((_, i) => i !== idx));
  };

  const addGuestTier = () => {
    const num = parseInt(newTier, 10);
    if (!num || num <= 0) return;
    if (guestTiers.includes(num)) {
      toast({ title: "Essa faixa já existe" });
      return;
    }
    setGuestTiers([...guestTiers, num].sort((a, b) => a - b));
    setNewTier("");
  };

  const removeGuestTier = (idx: number) => {
    if (guestTiers.length <= 1) return;
    setGuestTiers(guestTiers.filter((_, i) => i !== idx));
  };

  const restoreDefaults = () => {
    setDayTypes([...DEFAULT_DAY_TYPES]);
    setGuestTiers([...DEFAULT_GUEST_TIERS]);
  };

  const handleSave = async () => {
    setSaving(true);
    const newSettings = {
      ...(currentSettings || {}),
      day_type_config: dayTypes,
      guest_tiers: guestTiers,
    };

    const { error } = await supabase
      .from("companies")
      .update({ settings: newSettings } as any)
      .eq("id", companyId);

    if (error) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Grade configurada com sucesso!" });
      onSaved();
      onOpenChange(false);
    }
    setSaving(false);
  };

  const availablePresets = PRESET_DAY_TYPES.filter((p) => !dayTypes.some((d) => d.key === p.key));

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg max-w-[calc(100vw-2rem)] p-0 gap-0 overflow-hidden bg-background border-border/60 shadow-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="px-4 pt-4 pb-3 sm:px-6 sm:pt-6 sm:pb-4">
          <DialogTitle className="text-lg font-bold flex items-center gap-2">
            <Settings2 className="h-5 w-5 text-primary" />
            Configurar Grade de Preços
          </DialogTitle>
          <p className="text-sm text-muted-foreground mt-0.5">
            Defina os tipos de dia (colunas) e faixas de convidados (linhas) da grade de preços dos seus pacotes.
          </p>
        </DialogHeader>

        <div className="px-4 pb-4 sm:px-6 sm:pb-6 space-y-4">
          {/* Tipos de Dia */}
          <div className="rounded-xl border border-border/60 bg-card p-4 space-y-3">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">📅 Tipos de Dia (colunas)</span>

            <div className="space-y-2">
              {dayTypes.map((dt, idx) => (
                <div key={dt.key} className="flex items-center gap-2">
                  <Input
                    className="h-8 text-sm flex-1"
                    value={dt.label}
                    onChange={(e) => updateDayTypeLabel(idx, e.target.value)}
                    placeholder="Nome da coluna"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0"
                    onClick={() => removeDayType(idx)}
                    disabled={dayTypes.length <= 1}
                  >
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-2">
              {availablePresets.length > 0 && (
                <Select value={presetValue} onValueChange={addPresetDayType}>
                  <SelectTrigger className="h-8 text-xs flex-1">
                    <SelectValue placeholder="Adicionar pré-definido..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availablePresets.map((p) => (
                      <SelectItem key={p.key} value={p.key} className="text-xs">{p.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <Button variant="outline" size="sm" className="h-8 text-xs shrink-0" onClick={addCustomDayType}>
                <Plus className="h-3.5 w-3.5 mr-1" /> Personalizado
              </Button>
            </div>
          </div>

          {/* Faixas de Convidados */}
          <div className="rounded-xl border border-border/60 bg-card p-4 space-y-3">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">👥 Faixas de Convidados (linhas)</span>

            <div className="flex flex-wrap gap-2">
              {guestTiers.map((tier, idx) => (
                <div key={tier} className="flex items-center gap-1 bg-muted/50 rounded-lg px-2.5 py-1.5 border border-border/40">
                  <span className="text-sm font-medium">{tier}</span>
                  <button
                    onClick={() => removeGuestTier(idx)}
                    disabled={guestTiers.length <= 1}
                    className="text-destructive/60 hover:text-destructive ml-0.5 disabled:opacity-30"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <Input
                className="h-8 text-sm w-24"
                type="number"
                min={1}
                placeholder="Ex: 80"
                value={newTier}
                onChange={(e) => setNewTier(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addGuestTier()}
              />
              <Button variant="outline" size="sm" className="h-8 text-xs" onClick={addGuestTier}>
                <Plus className="h-3.5 w-3.5 mr-1" /> Adicionar
              </Button>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-2">
            <Button variant="ghost" size="sm" className="text-xs text-muted-foreground" onClick={restoreDefaults}>
              <RotateCcw className="h-3.5 w-3.5 mr-1" /> Restaurar padrão
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>Cancelar</Button>
              <Button size="sm" onClick={handleSave} disabled={saving || dayTypes.length === 0 || guestTiers.length === 0}>
                {saving && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
                Salvar
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
