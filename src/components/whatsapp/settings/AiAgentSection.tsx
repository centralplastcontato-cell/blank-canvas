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

// Os horários são editados de forma estruturada (dias + das/até + intervalo,
// com um horário à parte para o sábado quando ele é diferente do resto da
// semana) e serializados na frase que a IA lê; a frase salva é desmontada ao
// reabrir. As duas partes (dias de semana; sábado) ficam separadas por ";".
function daysToText(sortedDays: number[]): string {
  const key = sortedDays.join(",");
  if (key === "0,1,2,3,4") return "Segunda a sexta";
  if (key === "0,1,2,3,4,5") return "Segunda a sábado";
  if (key === "0,1,2,3,4,5,6") return "Todos os dias";
  if (sortedDays.length === 1) return DAY_NAMES[sortedDays[0]];
  return sortedDays.map((d) => DAY_NAMES[d]).join(", ").replace(/, ([^,]*)$/, " e $1");
}

export function serializeVisitHours(
  days: number[],
  start: string,
  end: string,
  halfHour: boolean,
  satDifferent = false,
  satStart = "",
  satEnd = "",
): string {
  const sorted = [...days].sort((a, b) => a - b);
  const useSatSplit = satDifferent && sorted.includes(5);
  const mainDays = useSatSplit ? sorted.filter((d) => d !== 5) : sorted;
  const intervalText = (h: boolean) => (h ? "de meia em meia hora" : "de hora em hora");
  const parts: string[] = [];
  if (mainDays.length > 0) parts.push(`${daysToText(mainDays)}, das ${start} às ${end}, ${intervalText(halfHour)}`);
  if (useSatSplit) parts.push(`sábado, das ${satStart} às ${satEnd}, ${intervalText(halfHour)}`);
  return parts.join("; ");
}

// Lê um trecho ("Segunda a sexta, das 10:00 às 17:00, de meia em meia hora")
// e devolve os dias/horário que ele descreve, ou dias=[] se não reconhecer nada.
function parseVisitHoursSegment(text: string): { days: number[]; start: string | null; end: string | null; halfHour: boolean } {
  const t = text.toLowerCase();
  let days: number[] = [];
  if (t.includes("todos os dias")) days = [0, 1, 2, 3, 4, 5, 6];
  else if (t.includes("segunda a sábado") || t.includes("segunda a sabado")) days = [0, 1, 2, 3, 4, 5];
  else if (t.includes("segunda a sexta")) days = [0, 1, 2, 3, 4];
  else {
    const tokens: [string, number][] = [["segunda", 0], ["terça", 1], ["terca", 1], ["quarta", 2], ["quinta", 3], ["sexta", 4], ["sábado", 5], ["sabado", 5], ["domingo", 6]];
    tokens.forEach(([tok, idx]) => { if (t.includes(tok) && !days.includes(idx)) days.push(idx); });
  }
  const norm = (s: string) => {
    const mm = s.replace("h", ":").match(/(\d{1,2}):?(\d{2})?/);
    return mm ? `${mm[1].padStart(2, "0")}:${mm[2] || "00"}` : null;
  };
  const m = t.match(/das\s+(\d{1,2}[:h]?\d{0,2})\s+às?\s+(\d{1,2}[:h]?\d{0,2})/);
  return {
    days,
    start: m && norm(m[1]),
    end: m && norm(m[2]),
    halfHour: !t.includes("hora em hora"),
  };
}

interface ParsedVisitHours {
  days: number[];
  start: string;
  end: string;
  halfHour: boolean;
  satDifferent: boolean;
  satStart: string;
  satEnd: string;
}

export function parseVisitHours(text: string | null): ParsedVisitHours {
  const fallback: ParsedVisitHours = {
    days: [0, 1, 2, 3, 4],
    start: "10:00",
    end: "17:00",
    halfHour: true,
    satDifferent: false,
    satStart: "09:00",
    satEnd: "13:00",
  };
  if (!text || !text.trim()) return fallback;
  const segments = text.split(/;\s*/).map(parseVisitHoursSegment).filter((s) => s.days.length > 0);
  if (segments.length === 0) return fallback;

  // Um trecho isolado só de sábado, junto com outro dos demais dias: horário diferente.
  const satSeg = segments.find((s) => s.days.length === 1 && s.days[0] === 5);
  const mainSeg = segments.find((s) => s !== satSeg);
  if (satSeg && mainSeg) {
    return {
      days: Array.from(new Set([...mainSeg.days, 5])),
      start: mainSeg.start || fallback.start,
      end: mainSeg.end || fallback.end,
      halfHour: mainSeg.halfHour,
      satDifferent: true,
      satStart: satSeg.start || fallback.satStart,
      satEnd: satSeg.end || fallback.satEnd,
    };
  }

  const s = segments[0];
  return {
    days: s.days,
    start: s.start || fallback.start,
    end: s.end || fallback.end,
    halfHour: s.halfHour,
    satDifferent: false,
    satStart: fallback.satStart,
    satEnd: fallback.satEnd,
  };
}

// Campos estruturados do modal. São serializados em texto rotulado dentro de
// extra_instructions ("Endereço: ...\nDuração da festa: ...") — o mesmo texto
// que vai para o prompt da IA — e desserializados de volta ao abrir o modal.
// "select" é para perguntas objetivas (2-4 respostas fixas, sem valor/promessa);
// "text"/"textarea" continuam livres para o que só cada buffet sabe descrever.
interface BuffetField {
  key: string;
  label: string;
  type: "text" | "textarea" | "select";
  placeholder?: string;
  options?: string[];
  group: string;
  hint?: string;
}

const BUFFET_FIELDS: BuffetField[] = [
  { key: "endereco", label: "Endereço", type: "text", placeholder: "Rua X, 123 — Sorocaba/SP", group: "basico" },
  { key: "duracao", label: "Duração da festa", type: "text", placeholder: "3 horas", group: "basico" },
  { key: "faixa_etaria", label: "Faixa etária", type: "text", placeholder: "Crianças de 1 a 12 anos", group: "basico" },
  { key: "estrutura", label: "Estrutura e brinquedos", type: "textarea", placeholder: "Cama elástica, piscina de bolinhas, arena de games, fraldário, área para os pais...", group: "estrutura", hint: "O que o espaço tem — é daqui que a IA responde \"o que tem aí?\"" },
  { key: "diferenciais", label: "Diferenciais", type: "textarea", placeholder: "9 anos de tradição, +4.000 festas realizadas, nota 4,7 no Google, estacionamento próprio...", group: "estrutura", hint: "Argumentos que a IA usa para convencer e quebrar objeções" },
  // Perguntas rápidas: as mesmas que todo cliente faz no WhatsApp, com poucas
  // respostas possíveis. Nunca incluem valor/desconto — a IA nunca fala preço.
  { key: "comida_externa", label: "Pode levar comida/bolo de fora?", type: "select", options: ["À vontade", "Só bolo e doces", "Não, é tudo do buffet"], group: "perguntas" },
  { key: "bebida_alcoolica", label: "Bebida alcoólica", type: "select", options: ["Servimos", "Não servimos", "Só os pais podem trazer"], group: "perguntas" },
  { key: "espaco_coberto", label: "O espaço é coberto (funciona com chuva)?", type: "select", options: ["Totalmente coberto", "Parcialmente coberto", "Ao ar livre"], group: "perguntas" },
  { key: "estacionamento", label: "Estacionamento", type: "select", options: ["Vaga própria grátis", "Vaga própria paga", "Só na rua", "Não tem"], group: "perguntas" },
  { key: "acessibilidade", label: "Acessibilidade (cadeirante)", type: "select", options: ["Sim, rampa e banheiro adaptado", "Parcial", "Não"], group: "perguntas" },
  { key: "hora_extra", label: "Hora extra", type: "select", options: ["Dá para estender, a equipe combina", "Não é possível"], group: "perguntas" },
  { key: "fraldario", label: "Área para bebês/fraldário", type: "select", options: ["Sim", "Não"], group: "perguntas" },
  { key: "fotografo", label: "Fotógrafo/filmagem", type: "select", options: ["O buffet oferece", "É por conta da família", "Não oferecemos"], group: "perguntas" },
  { key: "animal", label: "Animal de estimação", type: "select", options: ["Pode levar", "Não pode"], group: "perguntas" },
  { key: "monitores", label: "Monitores acompanhando as crianças", type: "select", options: ["O tempo todo", "Só nos brinquedos", "Não temos"], group: "perguntas" },
  { key: "regras", label: "Regras e o que não fazemos", type: "textarea", placeholder: "Não fazemos festas externas. Visitas somente com agendamento...", group: "regras", hint: "Limites claros evitam que a IA prometa o que vocês não fazem" },
  { key: "outros", label: "Outras informações", type: "textarea", placeholder: "Qualquer outra informação que a IA pode afirmar com segurança", group: "regras" },
];

const FIELD_GROUPS = [
  { id: "basico", label: "Básico" },
  { id: "estrutura", label: "Estrutura" },
  { id: "perguntas", label: "Rápidas" },
  { id: "regras", label: "Regras" },
];

export function serializeBuffetInfo(values: Record<string, string>): string | null {
  const parts = BUFFET_FIELDS
    .filter((f) => (values[f.key] || "").trim())
    .map((f) => `${f.label}: ${values[f.key].trim()}`);
  return parts.length > 0 ? parts.join("\n") : null;
}

export function parseBuffetInfo(text: string | null): Record<string, string> {
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
  const [visitSatDifferent, setVisitSatDifferent] = useState(false);
  const [visitSatStart, setVisitSatStart] = useState("09:00");
  const [visitSatEnd, setVisitSatEnd] = useState("13:00");
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
    setVisitSatDifferent(parsed.satDifferent);
    setVisitSatStart(parsed.satStart);
    setVisitSatEnd(parsed.satEnd);
    setInfoValues(parseBuffetInfo(settings.extra_instructions));
    setConfigTab("basico");
    setConfigOpen(true);
  };

  const toggleVisitDay = (day: number) => {
    // Sábado saiu da seleção: o horário diferente dele não faz mais sentido.
    if (day === 5 && visitDays.includes(5)) setVisitSatDifferent(false);
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
    if (visitSatDifferent && visitDays.includes(5) && visitSatEnd <= visitSatStart) {
      toast({ title: "Horário de sábado inválido", description: "O horário final precisa ser depois do inicial.", variant: "destructive" });
      return;
    }
    const saved = await persist({
      unit: editUnit,
      visit_hours: serializeVisitHours(visitDays, visitStart, visitEnd, visitHalfHour, visitSatDifferent, visitSatStart, visitSatEnd),
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
            <div className="grid grid-cols-4 gap-1.5 bg-muted rounded-xl p-1">
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
                  {visitDays.includes(5) && (
                    <div className="space-y-2 rounded-lg border border-violet-300/40 bg-card/60 p-3">
                      <div className="flex items-center justify-between gap-2">
                        <Label className="text-xs font-bold">Sábado tem horário diferente</Label>
                        <Switch checked={visitSatDifferent} onCheckedChange={setVisitSatDifferent} />
                      </div>
                      {visitSatDifferent && (
                        <div className="grid grid-cols-2 gap-3 pt-1">
                          <div className="space-y-1.5">
                            <Label className="text-xs font-bold">Das (sábado)</Label>
                            <Select value={visitSatStart} onValueChange={setVisitSatStart}>
                              <SelectTrigger className="h-10 bg-card border-border shadow-sm"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {TIME_OPTIONS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-xs font-bold">Até (sábado)</Label>
                            <Select value={visitSatEnd} onValueChange={setVisitSatEnd}>
                              <SelectTrigger className="h-10 bg-card border-border shadow-sm"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {TIME_OPTIONS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  {visitDays.length > 0 && (
                    <p className="text-[11px] text-violet-700 bg-violet-500/10 rounded-lg px-3 py-2">
                      A IA vai oferecer: <span className="font-bold">{serializeVisitHours(visitDays, visitStart, visitEnd, visitHalfHour, visitSatDifferent, visitSatStart, visitSatEnd)}</span>
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
                    {f.type === "select" ? (
                      <Select
                        value={infoValues[f.key] || ""}
                        onValueChange={(v) => setInfoValues((prev) => ({ ...prev, [f.key]: v }))}
                      >
                        <SelectTrigger className="h-10 bg-card border-border shadow-sm">
                          <SelectValue placeholder="Selecione uma opção" />
                        </SelectTrigger>
                        <SelectContent>
                          {(f.options || []).map((opt) => (
                            <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Textarea
                        value={infoValues[f.key] || ""}
                        onChange={(e) => setInfoValues((prev) => ({ ...prev, [f.key]: e.target.value }))}
                        rows={4}
                        className="text-base sm:text-sm bg-card border-border shadow-sm resize-none"
                        placeholder={`Ex.: ${f.placeholder}`}
                      />
                    )}
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
