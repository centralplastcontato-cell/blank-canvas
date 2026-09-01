import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sparkles, Loader2, Save } from "lucide-react";
import { useCompany } from "@/contexts/CompanyContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface AiAgentSettings {
  id?: string;
  enabled: boolean;
  unit: string | null;
  activated_at: string | null;
  extra_instructions: string | null;
  visit_hours: string;
}

const DEFAULT_VISIT_HOURS = "Segunda a sexta, das 10:00 às 17:00, de meia em meia hora";

export function AiAgentSection() {
  const { currentCompany } = useCompany();
  const [settings, setSettings] = useState<AiAgentSettings | null>(null);
  const [units, setUnits] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editInstructions, setEditInstructions] = useState("");
  const [editVisitHours, setEditVisitHours] = useState(DEFAULT_VISIT_HOURS);

  useEffect(() => {
    if (!currentCompany?.id) return;
    (async () => {
      setLoading(true);
      const [{ data: row }, { data: instances }] = await Promise.all([
        (supabase as any)
          .from("ai_agent_settings")
          .select("id, enabled, unit, activated_at, extra_instructions, visit_hours")
          .eq("company_id", currentCompany.id)
          .maybeSingle(),
        supabase
          .from("wapi_instances")
          .select("unit")
          .eq("company_id", currentCompany.id)
          .eq("is_active", true),
      ]);
      const loaded: AiAgentSettings = row || {
        enabled: false,
        unit: null,
        activated_at: null,
        extra_instructions: null,
        visit_hours: DEFAULT_VISIT_HOURS,
      };
      setSettings(loaded);
      setEditInstructions(loaded.extra_instructions || "");
      setEditVisitHours(loaded.visit_hours || DEFAULT_VISIT_HOURS);
      const unitList = Array.from(
        new Set(((instances || []) as { unit: string | null }[]).map((i) => i.unit).filter(Boolean))
      ) as string[];
      setUnits(unitList.sort());
      setLoading(false);
    })();
  }, [currentCompany?.id]);

  const persist = async (patch: Partial<AiAgentSettings>) => {
    if (!currentCompany?.id || !settings) return;
    setSaving(true);
    const next = { ...settings, ...patch };
    const { data, error } = await (supabase as any)
      .from("ai_agent_settings")
      .upsert(
        {
          company_id: currentCompany.id,
          enabled: next.enabled,
          unit: next.unit,
          activated_at: next.activated_at,
          extra_instructions: next.extra_instructions,
          visit_hours: next.visit_hours,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "company_id" }
      )
      .select("id, enabled, unit, activated_at, extra_instructions, visit_hours")
      .single();
    setSaving(false);
    if (error) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
      return;
    }
    setSettings(data as AiAgentSettings);
    return data as AiAgentSettings;
  };

  const handleToggle = async (checked: boolean) => {
    if (!settings) return;
    if (checked && !settings.unit) {
      toast({
        title: "Escolha o número primeiro",
        description: "Selecione em qual número (unidade) a IA vai atender antes de ligar.",
        variant: "destructive",
      });
      return;
    }
    // Cada nova ativação marca "a partir de agora": leads/conversas anteriores ficam de fora
    const saved = await persist({
      enabled: checked,
      activated_at: checked ? new Date().toISOString() : settings.activated_at,
    });
    if (saved) {
      toast({
        title: checked ? "IA ligada" : "IA desligada",
        description: checked
          ? `A IA vai atender leads novos no ${saved.unit}.`
          : "As conversas voltam para a equipe / bot padrão.",
      });
    }
  };

  if (loading || !settings) {
    return (
      <div className="flex items-center gap-2 p-4 border rounded-lg border-dashed text-sm text-muted-foreground">
        <Loader2 className="w-4 h-4 animate-spin" /> Carregando IA conversacional...
      </div>
    );
  }

  return (
    <div className="p-3 sm:p-4 border rounded-lg border-dashed border-violet-400/60 bg-violet-500/5 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-start sm:items-center gap-3 min-w-0">
          <div className={`p-2 rounded-full shrink-0 ${settings.enabled ? "bg-violet-500/20 text-violet-600" : "bg-muted text-muted-foreground"}`}>
            <Sparkles className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div className="min-w-0">
            <h4 className="font-medium text-sm sm:text-base flex items-center gap-2">
              IA Conversacional
              <Badge variant="outline" className="text-violet-600 border-violet-400">Beta</Badge>
            </h4>
            <p className="text-xs sm:text-sm text-muted-foreground">
              IA conversa, tira dúvidas, envia materiais e agenda visitas — só para leads novos, no número escolhido
            </p>
            {settings.enabled && (
              <p className="text-xs text-violet-600 mt-1">
                ⚡ Atendendo leads novos no {settings.unit}. Desligar devolve as conversas para a equipe.
              </p>
            )}
          </div>
        </div>
        <Switch
          checked={settings.enabled}
          onCheckedChange={handleToggle}
          disabled={saving}
          className="shrink-0 self-end sm:self-auto"
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label className="text-xs">Número (unidade) do teste</Label>
          <Select
            value={settings.unit || ""}
            onValueChange={(value) => persist({ unit: value })}
            disabled={saving || settings.enabled}
          >
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Selecione a unidade" />
            </SelectTrigger>
            <SelectContent>
              {units.map((u) => (
                <SelectItem key={u} value={u}>{u}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {settings.enabled && (
            <p className="text-[11px] text-muted-foreground">Desligue a IA para trocar o número.</p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Horários de visita que a IA pode oferecer</Label>
          <Input
            value={editVisitHours}
            onChange={(e) => setEditVisitHours(e.target.value)}
            className="h-9 text-sm"
            placeholder={DEFAULT_VISIT_HOURS}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">Informações do buffet (única fonte que a IA usa para responder)</Label>
        <Textarea
          value={editInstructions}
          onChange={(e) => setEditInstructions(e.target.value)}
          rows={4}
          className="text-sm"
          placeholder={"Ex.: Endereço: Rua X, 123 — Sorocaba/SP.\nFestas de 3 horas de duração. Espaço com brinquedos para 1 a 12 anos.\nEstacionamento próprio. Não trabalhamos com festas externas."}
        />
        <p className="text-[11px] text-muted-foreground">
          A IA nunca fala preços nem promete nada — valores só via PDF de pacotes e equipe. O que não estiver aqui, ela transfere para um atendente.
        </p>
      </div>

      <div className="flex justify-end">
        <Button
          size="sm"
          variant="outline"
          disabled={saving || (editInstructions === (settings.extra_instructions || "") && editVisitHours === settings.visit_hours)}
          onClick={() => persist({ extra_instructions: editInstructions.trim() || null, visit_hours: editVisitHours.trim() || DEFAULT_VISIT_HOURS })}
        >
          {saving ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Save className="w-3.5 h-3.5 mr-1.5" />}
          Salvar textos
        </Button>
      </div>
    </div>
  );
}
