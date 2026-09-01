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
import { Sparkles, Loader2, Save, Pencil, Check } from "lucide-react";
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
  const [configOpen, setConfigOpen] = useState(false);
  const [editUnit, setEditUnit] = useState<string | null>(null);
  const [editVisitHours, setEditVisitHours] = useState(DEFAULT_VISIT_HOURS);
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
        title: "Configure a IA primeiro",
        description: "Toque em Configurar e escolha o número (unidade) que ela vai atender.",
        variant: "destructive",
      });
      return;
    }
    if (checked && !(settings.extra_instructions || "").trim()) {
      toast({
        title: "Preencha as informações do buffet",
        description: "Toque em Configurar — sem informações, a IA transfere quase tudo para a equipe.",
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

  const openConfig = () => {
    if (!settings) return;
    setEditUnit(settings.unit);
    setEditVisitHours(settings.visit_hours || DEFAULT_VISIT_HOURS);
    setInfoValues(parseBuffetInfo(settings.extra_instructions));
    setConfigOpen(true);
  };

  const saveConfig = async () => {
    const saved = await persist({
      unit: editUnit,
      visit_hours: editVisitHours.trim() || DEFAULT_VISIT_HOURS,
      extra_instructions: serializeBuffetInfo(infoValues),
    });
    if (saved) {
      setConfigOpen(false);
      toast({ title: "Configurações salvas", description: "A IA passa a usar essas informações imediatamente." });
    }
  };

  if (loading || !settings) {
    return (
      <div className="rounded-2xl border border-border bg-card p-5 flex items-center gap-2 text-sm text-muted-foreground shadow-sm">
        <Loader2 className="w-4 h-4 animate-spin" /> Carregando IA...
      </div>
    );
  }

  const filledCount = BUFFET_FIELDS.filter((f) => (parseBuffetInfo(settings.extra_instructions)[f.key] || "").trim()).length;

  return (
    <>
      {/* Peça da IA na central de comando */}
      <div className={`relative rounded-2xl bg-card p-5 flex flex-col gap-3 transition-all ${settings.enabled ? "border-2 border-violet-500 shadow-md shadow-violet-500/10" : "border border-border shadow-sm"}`}>
        <div className="flex items-start justify-between gap-2">
          <div className="w-11 h-11 rounded-xl bg-violet-500/10 flex items-center justify-center">
            <Sparkles className="w-6 h-6 text-violet-600" />
          </div>
          <Switch checked={settings.enabled} onCheckedChange={handleToggle} disabled={saving} />
        </div>
        <div>
          <h4 className="font-display font-medium text-base flex items-center gap-2">
            IA Conversacional
            <Badge variant="outline" className="text-violet-600 border-violet-400 text-[10px]">BETA</Badge>
          </h4>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1 leading-relaxed">
            Conversa natural, tira dúvidas, envia materiais e agenda visitas — só leads novos
          </p>
        </div>
        <div className="mt-auto pt-1 flex items-center justify-between gap-2">
          {settings.enabled ? (
            <span className="text-[11px] font-extrabold tracking-wide text-green-700 bg-green-500/15 rounded-full px-3 py-1">EM USO · {settings.unit}</span>
          ) : (
            <span className="text-[11px] font-extrabold tracking-wide text-muted-foreground bg-muted rounded-full px-3 py-1">DESLIGADA</span>
          )}
          <Button size="sm" variant="ghost" className="h-7 text-xs gap-1 text-primary hover:text-primary" onClick={openConfig}>
            <Pencil className="w-3 h-3" />
            Configurar
          </Button>
        </div>
      </div>

      {/* Modal único de configuração da IA */}
      <Dialog open={configOpen} onOpenChange={setConfigOpen}>
        <DialogContent className="max-w-[580px] max-h-[90vh] flex flex-col p-0 gap-0">
          <DialogHeader className="px-6 pt-6 pb-4 border-b border-border/40">
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-violet-600" />
              Configurar IA Conversacional
            </DialogTitle>
            <p className="text-xs text-muted-foreground mt-1">
              A IA nunca fala preços nem promete nada — valores só via PDF de pacotes e equipe. O que não estiver aqui, ela transfere para um atendente.
            </p>
          </DialogHeader>
          <div className="overflow-y-auto px-6 py-4 space-y-4 flex-1">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Número (unidade) do teste</Label>
                <Select value={editUnit || ""} onValueChange={setEditUnit} disabled={settings.enabled}>
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
                <Label className="text-xs font-medium">Horários de visita</Label>
                <Input
                  value={editVisitHours}
                  onChange={(e) => setEditVisitHours(e.target.value)}
                  className="h-9 text-sm"
                  placeholder={DEFAULT_VISIT_HOURS}
                />
              </div>
            </div>

            <div className="pt-1 border-t border-border/40">
              <div className="flex items-center justify-between py-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Informações do buffet</Label>
                <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                  {filledCount > 0 && <Check className="w-3 h-3 text-green-600" />}
                  {filledCount} de {BUFFET_FIELDS.length} preenchidos
                </span>
              </div>
              <div className="space-y-4">
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
            </div>
          </div>
          <DialogFooter className="px-6 py-4 border-t border-border/40">
            <Button variant="ghost" onClick={() => setConfigOpen(false)} disabled={saving}>Cancelar</Button>
            <Button onClick={saveConfig} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
