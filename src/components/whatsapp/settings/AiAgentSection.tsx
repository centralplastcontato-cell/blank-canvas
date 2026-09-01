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

const DAY_NAMES = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"];
const DAY_SHORT = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
const TIME_OPTIONS = Array.from({ length: 25 }, (_, i) => {
  const h = String(Math.floor(i / 2) + 8).padStart(2, "0");
  return `${h}:${i % 2 === 0 ? "00" : "30"}`;
});

// Os horários são editados de forma estruturada (dias + das/até + intervalo)
// e serializados na frase que a IA lê; a frase salva é desmontada ao reabrir.
function serializeVisitHours(days: number[], start: string, end: string, halfHour: boolean): string {
  const sorted = [...days].sort((a, b) => a - b);
  const key = sorted.join(",");
  let daysText: string;
  if (key === "0,1,2,3,4") daysText = "Segunda a sexta";
  else if (key === "0,1,2,3,4,5") daysText = "Segunda a sábado";
  else if (key === "0,1,2,3,4,5,6") daysText = "Todos os dias";
  else if (sorted.length === 1) daysText = DAY_NAMES[sorted[0]];
  else daysText = sorted.map((d) => DAY_NAMES[d]).join(", ").replace(/, ([^,]*)$/, " e $1");
  return `${daysText}, das ${start} às ${end}, ${halfHour ? "de meia em meia hora" : "de hora em hora"}`;
}

function parseVisitHours(text: string | null): { days: number[]; start: string; end: string; halfHour: boolean } {
  const fallback = { days: [0, 1, 2, 3, 4], start: "10:00", end: "17:00", halfHour: true };
  if (!text || !text.trim()) return fallback;
  const t = text.toLowerCase();
  let days: number[] = [];
  if (t.includes("todos os dias")) days = [0, 1, 2, 3, 4, 5, 6];
  else if (t.includes("segunda a sábado") || t.includes("segunda a sabado")) days = [0, 1, 2, 3, 4, 5];
  else if (t.includes("segunda a sexta")) days = [0, 1, 2, 3, 4];
  else {
    const tokens: [string, number][] = [["segunda", 0], ["terça", 1], ["terca", 1], ["quarta", 2], ["quinta", 3], ["sexta", 4], ["sábado", 5], ["sabado", 5], ["domingo", 6]];
    tokens.forEach(([tok, idx]) => { if (t.includes(tok) && !days.includes(idx)) days.push(idx); });
  }
  if (days.length === 0) days = fallback.days;
  const norm = (s: string) => {
    const mm = s.replace("h", ":").match(/(\d{1,2}):?(\d{2})?/);
    return mm ? `${mm[1].padStart(2, "0")}:${mm[2] || "00"}` : null;
  };
  const m = t.match(/das\s+(\d{1,2}[:h]?\d{0,2})\s+às?\s+(\d{1,2}[:h]?\d{0,2})/);
  return {
    days,
    start: (m && norm(m[1])) || fallback.start,
    end: (m && norm(m[2])) || fallback.end,
    halfHour: !t.includes("hora em hora"),
  };
}

// Campos estruturados do modal. São serializados em texto rotulado dentro de
// extra_instructions ("Endereço: ...\nDuração da festa: ...") — o mesmo texto
// que vai para o prompt da IA — e desserializados de volta ao abrir o modal.
const BUFFET_FIELDS: { key: string; label: string; multiline: boolean; placeholder: string; group: string; hint?: string }[] = [
  { key: "endereco", label: "Endereço", multiline: false, placeholder: "Rua X, 123 — Sorocaba/SP", group: "basico" },
  { key: "duracao", label: "Duração da festa", multiline: false, placeholder: "3 horas", group: "basico" },
  { key: "faixa_etaria", label: "Faixa etária", multiline: false, placeholder: "Crianças de 1 a 12 anos", group: "basico" },
  { key: "estrutura", label: "Estrutura e brinquedos", multiline: true, placeholder: "Cama elástica, piscina de bolinhas, arena de games, fraldário, área para os pais...", group: "estrutura", hint: "O que o espaço tem — é daqui que a IA responde \"o que tem aí?\"" },
  { key: "diferenciais", label: "Diferenciais", multiline: true, placeholder: "9 anos de tradição, +4.000 festas realizadas, nota 4,7 no Google, estacionamento próprio...", group: "estrutura", hint: "Argumentos que a IA usa para convencer e quebrar objeções" },
  { key: "regras", label: "Regras e o que não fazemos", multiline: true, placeholder: "Não fazemos festas externas. Visitas somente com agendamento...", group: "regras", hint: "Limites claros evitam que a IA prometa o que vocês não fazem" },
  { key: "outros", label: "Outras informações", multiline: true, placeholder: "Qualquer outra informação que a IA pode afirmar com segurança", group: "regras" },
];

const FIELD_GROUPS = [
  { id: "basico", label: "Básico" },
  { id: "estrutura", label: "Estrutura" },
  { id: "regras", label: "Regras" },
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
  const [configTab, setConfigTab] = useState("basico");
  const [editUnit, setEditUnit] = useState<string | null>(null);
  const [visitDays, setVisitDays] = useState<number[]>([0, 1, 2, 3, 4]);
  const [visitStart, setVisitStart] = useState("10:00");
  const [visitEnd, setVisitEnd] = useState("17:00");
  const [visitHalfHour, setVisitHalfHour] = useState(true);
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
    const parsed = parseVisitHours(settings.visit_hours);
    setVisitDays(parsed.days);
    setVisitStart(parsed.start);
    setVisitEnd(parsed.end);
    setVisitHalfHour(parsed.halfHour);
    setInfoValues(parseBuffetInfo(settings.extra_instructions));
    setConfigTab("basico");
    setConfigOpen(true);
  };

  const toggleVisitDay = (day: number) => {
    setVisitDays((prev) => prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]);
  };

  const saveConfig = async () => {
    if (visitDays.length === 0) {
      toast({ title: "Escolha os dias de visita", description: "Marque pelo menos um dia da semana.", variant: "destructive" });
      return;
    }
    if (visitEnd <= visitStart) {
      toast({ title: "Horário inválido", description: "O horário final precisa ser depois do inicial.", variant: "destructive" });
      return;
    }
    const saved = await persist({
      unit: editUnit,
      visit_hours: serializeVisitHours(visitDays, visitStart, visitEnd, visitHalfHour),
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

      {/* Modal único de configuração da IA — organizado em abinhas */}
      <Dialog open={configOpen} onOpenChange={setConfigOpen}>
        <DialogContent className="max-w-[580px] max-h-[92vh] flex flex-col p-0 gap-0 rounded-2xl">
          <DialogHeader className="px-5 sm:px-6 pt-5 pb-3 border-b border-border/40">
            <DialogTitle className="flex items-center gap-2 text-base">
              <div className="w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center shrink-0">
                <Sparkles className="w-5 h-5 text-violet-600" />
              </div>
              Configurar IA
            </DialogTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              Preencha só o que a IA pode afirmar — ela nunca fala preços nem promete nada.
            </p>
          </DialogHeader>

          {/* Abinhas de navegação */}
          <div className="px-5 sm:px-6 pt-3 pb-1">
            <div className="grid grid-cols-3 gap-1.5 bg-muted rounded-xl p-1">
              {FIELD_GROUPS.map((g) => {
                const groupFields = BUFFET_FIELDS.filter((f) => f.group === g.id);
                const filled = groupFields.filter((f) => (infoValues[f.key] || "").trim()).length;
                const active = configTab === g.id;
                return (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => setConfigTab(g.id)}
                    className={`flex items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-xs font-bold transition-all ${active ? "bg-card shadow-sm text-foreground" : "text-muted-foreground"}`}
                  >
                    {g.label}
                    <span className={`text-[10px] font-extrabold rounded-full px-1.5 py-0.5 ${filled === groupFields.length ? "bg-green-500/15 text-green-700" : "bg-border/70 text-muted-foreground"}`}>
                      {filled === groupFields.length ? <Check className="w-3 h-3" /> : `${filled}/${groupFields.length}`}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="overflow-y-auto px-5 sm:px-6 py-4 space-y-4 flex-1">
            {configTab === "basico" && (
              <div className="space-y-4">
                <div className="rounded-xl border border-violet-300/50 bg-violet-500/5 p-3.5 space-y-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold">Número que a IA atende</Label>
                    <Select value={editUnit || ""} onValueChange={setEditUnit} disabled={settings.enabled}>
                      <SelectTrigger className="h-10 bg-card border-border shadow-sm">
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
                    <Label className="text-xs font-bold">Dias em que ela pode oferecer visita</Label>
                    <div className="flex flex-wrap gap-1.5">
                      {DAY_SHORT.map((d, idx) => {
                        const on = visitDays.includes(idx);
                        return (
                          <button
                            key={d}
                            type="button"
                            onClick={() => toggleVisitDay(idx)}
                            className={`min-w-[44px] h-9 px-2 rounded-lg text-xs font-bold transition-all border ${on ? "bg-violet-600 text-white border-violet-600 shadow-sm" : "bg-card text-muted-foreground border-border"}`}
                          >
                            {d}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold">Das</Label>
                      <Select value={visitStart} onValueChange={setVisitStart}>
                        <SelectTrigger className="h-10 bg-card border-border shadow-sm"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {TIME_OPTIONS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold">Até</Label>
                      <Select value={visitEnd} onValueChange={setVisitEnd}>
                        <SelectTrigger className="h-10 bg-card border-border shadow-sm"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {TIME_OPTIONS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold">Horários oferecidos</Label>
                    <Select value={visitHalfHour ? "meia" : "hora"} onValueChange={(v) => setVisitHalfHour(v === "meia")}>
                      <SelectTrigger className="h-10 bg-card border-border shadow-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="meia">De meia em meia hora</SelectItem>
                        <SelectItem value="hora">De hora em hora</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {visitDays.length > 0 && (
                    <p className="text-[11px] text-violet-700 bg-violet-500/10 rounded-lg px-3 py-2">
                      A IA vai oferecer: <span className="font-bold">{serializeVisitHours(visitDays, visitStart, visitEnd, visitHalfHour)}</span>
                    </p>
                  )}
                </div>
                {BUFFET_FIELDS.filter((f) => f.group === "basico").map((f) => (
                  <div key={f.key} className="space-y-1.5">
                    <Label className="text-xs font-bold">{f.label}</Label>
                    <Input
                      value={infoValues[f.key] || ""}
                      onChange={(e) => setInfoValues((prev) => ({ ...prev, [f.key]: e.target.value }))}
                      className="h-10 text-base sm:text-sm bg-card border-border shadow-sm"
                      placeholder={`Ex.: ${f.placeholder}`}
                    />
                  </div>
                ))}
              </div>
            )}

            {configTab !== "basico" && (
              <div className="space-y-4">
                {BUFFET_FIELDS.filter((f) => f.group === configTab).map((f) => (
                  <div key={f.key} className="space-y-1.5">
                    <Label className="text-xs font-bold">{f.label}</Label>
                    {f.hint && <p className="text-[11px] text-muted-foreground">{f.hint}</p>}
                    <Textarea
                      value={infoValues[f.key] || ""}
                      onChange={(e) => setInfoValues((prev) => ({ ...prev, [f.key]: e.target.value }))}
                      rows={4}
                      className="text-base sm:text-sm bg-card border-border shadow-sm resize-none"
                      placeholder={`Ex.: ${f.placeholder}`}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          <DialogFooter className="px-5 sm:px-6 py-3.5 border-t border-border/40 flex-col-reverse sm:flex-row gap-2">
            <Button variant="ghost" onClick={() => setConfigOpen(false)} disabled={saving} className="w-full sm:w-auto">Cancelar</Button>
            <Button onClick={saveConfig} disabled={saving} className="w-full sm:w-auto">
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              Salvar tudo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
