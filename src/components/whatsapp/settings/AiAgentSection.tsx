import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sparkles, Loader2, Save, Pencil, AlertTriangle, Check } from "lucide-react";
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

// Campos estruturados do modal. São serializados em texto rotulado dentro de
// extra_instructions ("Endereço: ...\nDuração da festa: ...") — o mesmo texto
// que vai para o prompt da IA — e desserializados de volta ao abrir o modal.
const BUFFET_FIELDS: { key: string; label: string; multiline: boolean; placeholder: string }[] = [
  { key: "endereco", label: "Endereço", multiline: false, placeholder: "Rua X, 123 — Sorocaba/SP" },
  { key: "duracao", label: "Duração da festa", multiline: false, placeholder: "3 horas" },
  { key: "faixa_etaria", label: "Faixa etária", multiline: false, placeholder: "Brinquedos para crianças de 1 a 12 anos" },
  { key: "estrutura", label: "Estrutura e brinquedos", multiline: true, placeholder: "Cama elástica, piscina de bolinhas, arena de games, fraldário, área para os pais..." },
  { key: "diferenciais", label: "Diferenciais", multiline: true, placeholder: "9 anos de tradição, +4.000 festas realizadas, nota 4,7 no Google, estacionamento próprio..." },
  { key: "regras", label: "Regras e o que não fazemos", multiline: true, placeholder: "Não fazemos festas externas. Visitas somente com agendamento..." },
  { key: "outros", label: "Outras informações", multiline: true, placeholder: "Qualquer outra informação que a IA pode afirmar com segurança" },
];

function serializeBuffetInfo(values: Record<string, string>): string | null {
  const parts = BUFFET_FIELDS
    .filter((f) => (values[f.key] || "").trim())
    .map((f) => `${f.label}: ${values[f.key].trim()}`);
  return parts.length > 0 ? parts.join("\n") : null;
}

function parseBuffetInfo(text: string | null): Record<string, string> {
  const values: Record<string, string> = {};
  if (!text) return values;
  let currentKey: string | null = null;
  const unmatched: string[] = [];
  for (const line of text.split("\n")) {
    const field = BUFFET_FIELDS.find((f) => line.startsWith(`${f.label}:`));
    if (field) {
      currentKey = field.key;
      values[field.key] = line.slice(field.label.length + 1).trim();
    } else if (currentKey) {
      values[currentKey] = `${values[currentKey]}\n${line}`;
    } else {
      unmatched.push(line);
    }
  }
  // Texto antigo sem rótulos (ou linhas soltas) cai em "Outras informações"
  const leftover = unmatched.join("\n").trim();
  if (leftover) {
    values["outros"] = [leftover, values["outros"] || ""].filter(Boolean).join("\n");
  }
  Object.keys(values).forEach((k) => { values[k] = values[k].trim(); });
  return values;
}

export function AiAgentSection() {
  const { currentCompany } = useCompany();
  const [settings, setSettings] = useState<AiAgentSettings | null>(null);
  const [units, setUnits] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editVisitHours, setEditVisitHours] = useState(DEFAULT_VISIT_HOURS);
  const [infoDialogOpen, setInfoDialogOpen] = useState(false);
  const [infoValues, setInfoValues] = useState<Record<string, string>>({});

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
    if (checked && !(settings.extra_instructions || "").trim()) {
      toast({
        title: "Preencha as informações do buffet",
        description: "Sem informações, a IA vai transferir quase tudo para a equipe.",
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

  const openInfoDialog = () => {
    setInfoValues(parseBuffetInfo(settings?.extra_instructions || null));
    setInfoDialogOpen(true);
  };

  const saveInfoDialog = async () => {
    const serialized = serializeBuffetInfo(infoValues);
    const saved = await persist({ extra_instructions: serialized });
    if (saved) {
      setInfoDialogOpen(false);
      toast({ title: "Informações salvas", description: "A IA passa a usar essas informações imediatamente." });
    }
  };

  if (loading || !settings) {
    return (
      <div className="flex items-center gap-2 p-4 border rounded-lg border-dashed text-sm text-muted-foreground">
        <Loader2 className="w-4 h-4 animate-spin" /> Carregando IA conversacional...
      </div>
    );
  }

  const parsedPreview = parseBuffetInfo(settings.extra_instructions);
  const filledFields = BUFFET_FIELDS.filter((f) => (parsedPreview[f.key] || "").trim());

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
          <div className="flex gap-1.5">
            <Input
              value={editVisitHours}
              onChange={(e) => setEditVisitHours(e.target.value)}
              className="h-9 text-sm"
              placeholder={DEFAULT_VISIT_HOURS}
            />
            <Button
              size="icon"
              variant="outline"
              className="h-9 w-9 shrink-0"
              disabled={saving || editVisitHours === settings.visit_hours}
              onClick={() => persist({ visit_hours: editVisitHours.trim() || DEFAULT_VISIT_HOURS })}
              title="Salvar horários"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            </Button>
          </div>
        </div>
      </div>

      {/* Informações do buffet — resumo + modal com campos separados */}
      <div className="rounded-lg border border-border/60 bg-background/60 p-3 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <Label className="text-xs">Informações do buffet (única fonte que a IA usa para responder)</Label>
          <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5 shrink-0" onClick={openInfoDialog}>
            <Pencil className="w-3 h-3" />
            {filledFields.length > 0 ? "Editar" : "Preencher"}
          </Button>
        </div>
        {filledFields.length === 0 ? (
          <div className="flex items-start gap-2 text-xs text-amber-700 dark:text-amber-400">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            <span>Nada preenchido ainda — sem informações, a IA vai transferir quase tudo para a equipe.</span>
          </div>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {BUFFET_FIELDS.map((f) => {
              const filled = (parsedPreview[f.key] || "").trim().length > 0;
              return (
                <Badge
                  key={f.key}
                  variant="outline"
                  className={filled ? "text-emerald-700 border-emerald-400/60 gap-1" : "text-muted-foreground/60 border-border/60"}
                >
                  {filled && <Check className="w-3 h-3" />}
                  {f.label}
                </Badge>
              );
            })}
          </div>
        )}
        <p className="text-[11px] text-muted-foreground">
          A IA nunca fala preços nem promete nada — valores só via PDF de pacotes e equipe. O que não estiver aqui, ela transfere para um atendente.
        </p>
      </div>

      <Dialog open={infoDialogOpen} onOpenChange={setInfoDialogOpen}>
        <DialogContent className="max-w-[560px] max-h-[90vh] flex flex-col p-0 gap-0">
          <DialogHeader className="px-6 pt-6 pb-4 border-b border-border/40">
            <DialogTitle>Informações do buffet</DialogTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Preencha o que a IA pode afirmar com segurança. Campos vazios são simplesmente ignorados.
            </p>
          </DialogHeader>
          <div className="overflow-y-auto px-6 py-4 space-y-4 flex-1">
            {BUFFET_FIELDS.map((f) => (
              <div key={f.key} className="space-y-1.5">
                <Label className="text-xs font-medium">{f.label}</Label>
                {f.multiline ? (
                  <Textarea
                    value={infoValues[f.key] || ""}
                    onChange={(e) => setInfoValues((prev) => ({ ...prev, [f.key]: e.target.value }))}
                    rows={3}
                    className="text-sm"
                    placeholder={f.placeholder}
                  />
                ) : (
                  <Input
                    value={infoValues[f.key] || ""}
                    onChange={(e) => setInfoValues((prev) => ({ ...prev, [f.key]: e.target.value }))}
                    className="text-sm"
                    placeholder={f.placeholder}
                  />
                )}
              </div>
            ))}
          </div>
          <DialogFooter className="px-6 py-4 border-t border-border/40">
            <Button variant="ghost" onClick={() => setInfoDialogOpen(false)} disabled={saving}>Cancelar</Button>
            <Button onClick={saveInfoDialog} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              Salvar informações
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
