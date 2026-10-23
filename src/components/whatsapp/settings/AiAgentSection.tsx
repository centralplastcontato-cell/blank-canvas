import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { firstLessonOf } from "@/lib/lessons";
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
import { Sparkles, Loader2, Save, Pencil, Check, FlaskConical, Cpu, Wallet, BellRing, CalendarOff, Building2, Plus, Trash2, MessageCircleHeart, PlayCircle } from "lucide-react";
import { useCompany } from "@/contexts/CompanyContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { AiSimulatorDialog } from "./AiSimulatorDialog";
import { FollowUpImageUploader } from "./FollowUpImageUploader";
import { AiQuestionnaireTab } from "./AiQuestionnaireTab";
import { QUESTIONNAIRE_COMPANY_IDS } from "@/lib/aiQuestionnaire";
import { BUFFET_FIELDS, parseBuffetInfo, serializeBuffetInfo } from "@/lib/aiBuffetFields";
import { DEFAULT_TEAM_HOURS, parseVisitHours, serializeTeamHours, serializeVisitHours } from "@/lib/businessHours";
import {
  DEFAULT_STEP_GOALS,
  INACTIVITY_MINUTE_OPTIONS,
  SECOND_INACTIVITY_OPTIONS,
  MAX_FOLLOWUP_STEPS,
  MAX_REACTIVATIONS,
  delayLabel,
  followUpConfigProblem,
  joinDelay,
  normalizeFollowUpConfig,
  splitDelay,
  type AiFollowUpConfig,
} from "@/lib/aiFollowUp";
import {
  AI_MODELS,
  DEFAULT_AI_MODEL,
  estimateTypicalConversationUsd,
  formatBrlFromUsd,
  getAiModel,
  summarizeAiUsage,
  type AiUsageRow,
} from "@/lib/aiModels";

interface AiAgentSettings {
  id?: string;
  enabled: boolean;
  unit: string | null;
  activated_at: string | null;
  extra_instructions: string | null;
  visit_hours: string;
  // Modo de Teste da própria IA — separado do Modo de Teste do bot fixo.
  // Ligado, a IA só conversa com este número; para os demais, nada muda,
  // a conversa segue com o bot fixo normalmente.
  test_mode_enabled: boolean;
  test_mode_number: string | null;
  // Modelo de IA dos clientes e, opcionalmente, um outro só para o número de
  // teste — para comparar modelos sem mexer no atendimento de verdade.
  model: string;
  test_model: string | null;
  // Passagem para a equipe: horário de atendimento e alerta forte
  team_hours?: string | null;
  handoff_alert_minutes?: number | null;
  handoff_alert_phone?: string | null;
  // Horários de festa para a IA dizer as datas livres da agenda
  party_slots?: string | null;
  // Recesso / dias fechados: sem festas, visitas e atendimento da equipe
  closed_periods?: ClosedPeriod[] | null;
  // Acompanhamento da Bia: inatividade, follow-ups por etapa e perdido automático
  followup_config?: AiFollowUpConfig | null;
  // Apresentação: nome da assistente e a arte dela (vai na 1ª mensagem)
  assistant_name?: string | null;
  intro_image_url?: string | null;
  // Outros números com a IA, cada um com a sua data de liberação (só clientes novos dali em diante)
  extra_units?: ExtraUnit[] | null;
  // Alerta de cliente com festa nos próximos 60 dias (sininho + WhatsApp do alerta)
  party_soon_alert?: boolean | null;
  // Confraternização de empresas: roteiro próprio da IA + opção na lista do começo
  corporate_events_enabled?: boolean | null;
  corporate_max_guests?: number | null;
}

interface ExtraUnit {
  unit: string;
  activated_at: string;
}

// Etapa de follow-up na tela (prazo em horas ou dias)
interface FollowUpStepDraft {
  value: number;
  unit: "horas" | "dias";
  goal: string;
  image_url?: string | null;
}

interface ClosedPeriod {
  start: string; // AAAA-MM-DD
  end: string;
}

const BASE_COLUMNS = "id, enabled, unit, activated_at, extra_instructions, visit_hours, test_mode_enabled, test_mode_number, model";
const HANDOFF_COLUMNS = "team_hours, handoff_alert_minutes, handoff_alert_phone";
const ALERT_MINUTE_OPTIONS = [5, 10, 15, 20, 30];
// Valor do Select para "mesmo modelo dos clientes" (o Select não aceita "")
const SAME_MODEL = "__same__";
const USAGE_WINDOW_DAYS = 30;

function modelLabel(id: string): string {
  return getAiModel(id)?.label || id;
}

// Banco ainda sem as colunas novas (migration não rodada)
function isMissingNewColumn(error: { message?: string } | null): boolean {
  return !!error?.message && /test_model|team_hours|handoff_alert|party_slots|closed_periods|followup_config|assistant_name|intro_image_url|extra_units/.test(error.message);
}

const DEFAULT_VISIT_HOURS = "Segunda a sexta, das 10:00 às 17:00, de meia em meia hora";
const DEFAULT_PARTY_SLOTS = "13:00-17:00, 19:00-23:00";

const DAY_SHORT = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
const TIME_OPTIONS = Array.from({ length: 25 }, (_, i) => {
  const h = String(Math.floor(i / 2) + 8).padStart(2, "0");
  return `${h}:${i % 2 === 0 ? "00" : "30"}`;
});

// Os horários são editados de forma estruturada (dias + das/até + intervalo,
// com um horário à parte para o sábado quando ele é diferente do resto da
// semana) e serializados na frase que a IA lê; a frase salva é desmontada ao
// reabrir. As regras ficam em _shared/business-hours.ts (as mesmas da IA).
export { parseVisitHours, serializeVisitHours };

// Campos estruturados: ver src/lib/aiBuffetFields.ts
const FIELD_GROUPS = [
  { id: "basico", label: "Básico" },
  { id: "estrutura", label: "Estrutura" },
  { id: "perguntas", label: "Rápidas" },
  { id: "regras", label: "Regras" },
  { id: "followup", label: "Follow-up" },
];

// serializeBuffetInfo/parseBuffetInfo: ver src/lib/aiBuffetFields.ts
export { parseBuffetInfo, serializeBuffetInfo };

function ModelOption({ id }: { id: string }) {
  const m = getAiModel(id);
  if (!m) return <span>{id}</span>;
  return (
    <span className="flex flex-col items-start">
      <span className="font-semibold">{m.label}</span>
      <span className="text-[11px] opacity-70">
        {m.hint} · ≈ {formatBrlFromUsd(estimateTypicalConversationUsd(m.id))}/conversa
      </span>
    </span>
  );
}

function UsageTable({ title, rows }: { title: string; rows: ReturnType<typeof summarizeAiUsage> }) {
  if (rows.length === 0) return null;
  return (
    <div className="space-y-1.5">
      <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide">{title}</p>
      <div className="rounded-lg border border-border overflow-hidden">
        <table className="w-full text-xs">
          <thead className="bg-muted/60 text-muted-foreground">
            <tr>
              <th className="text-left font-semibold px-2.5 py-1.5">Modelo</th>
              <th className="text-right font-semibold px-2.5 py-1.5">Conversas</th>
              <th className="text-right font-semibold px-2.5 py-1.5">Total</th>
              <th className="text-right font-semibold px-2.5 py-1.5">Média</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((u) => (
              <tr key={u.model} className="border-t border-border/60">
                <td className="px-2.5 py-1.5">{getAiModel(u.model)?.label.replace(/ \((OpenAI|Anthropic)\)$/, "") || u.model}</td>
                <td className="px-2.5 py-1.5 text-right tabular-nums">{u.conversations}</td>
                <td className="px-2.5 py-1.5 text-right tabular-nums">{formatBrlFromUsd(u.totalUsd)}</td>
                <td className="px-2.5 py-1.5 text-right tabular-nums font-semibold">{formatBrlFromUsd(u.avgPerConversationUsd)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
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
  const [testModeEnabled, setTestModeEnabled] = useState(false);
  const [testModeNumber, setTestModeNumber] = useState("");
  const [editModel, setEditModel] = useState(DEFAULT_AI_MODEL);
  const [editTestModel, setEditTestModel] = useState(SAME_MODEL);
  const [usageRows, setUsageRows] = useState<AiUsageRow[]>([]);
  const [simOpen, setSimOpen] = useState(false);
  const [teamDays, setTeamDays] = useState<number[]>([0, 1, 2, 3, 4, 5]);
  const [teamStart, setTeamStart] = useState("09:00");
  const [teamEnd, setTeamEnd] = useState("18:00");
  const [teamSatDifferent, setTeamSatDifferent] = useState(true);
  const [teamSatStart, setTeamSatStart] = useState("09:00");
  const [teamSatEnd, setTeamSatEnd] = useState("13:00");
  const [alertMinutes, setAlertMinutes] = useState(10);
  const [alertPhone, setAlertPhone] = useState("");
  const [partySoonAlert, setPartySoonAlert] = useState(false);
  const [corporateOn, setCorporateOn] = useState(false);
  const [corporateMax, setCorporateMax] = useState("");
  const [partySlots, setPartySlots] = useState(DEFAULT_PARTY_SLOTS);
  const [closedPeriods, setClosedPeriods] = useState<ClosedPeriod[]>([]);
  const [fuEnabled, setFuEnabled] = useState(false);
  const [fuInactivityOn, setFuInactivityOn] = useState(true);
  const [fuInactivityMinutes, setFuInactivityMinutes] = useState(30);
  const [fuSecondOn, setFuSecondOn] = useState(true);
  const [fuSecondMinutes, setFuSecondMinutes] = useState(180);
  const [fuSteps, setFuSteps] = useState<FollowUpStepDraft[]>([]);
  const [fuLostOn, setFuLostOn] = useState(true);
  const [fuLostHours, setFuLostHours] = useState(48);
  const [fuFarMonths, setFuFarMonths] = useState(3);
  const [fuReactOn, setFuReactOn] = useState(true);
  const [fuReactDays, setFuReactDays] = useState<number[]>([60, 30]);
  const [fuReactImage, setFuReactImage] = useState<string | null>(null);
  const [introName, setIntroName] = useState("");
  const [introImage, setIntroImage] = useState<string | null>(null);
  // Imagens subindo agora: o "Salvar tudo" espera (senão o link da imagem se perde)
  const [uploadsBusy, setUploadsBusy] = useState(0);
  const trackUpload = (busy: boolean) => setUploadsBusy((n) => Math.max(0, n + (busy ? 1 : -1)));
  // Vídeo "como configurar" (Aprenda a usar), quando já estiver publicado
  const [howToLessonId, setHowToLessonId] = useState<string | null>(null);
  useEffect(() => { firstLessonOf("Inteligência Artificial").then(setHowToLessonId); }, []);

  useEffect(() => {
    if (!currentCompany?.id) return;
    (async () => {
      setLoading(true);
      const since = new Date(Date.now() - USAGE_WINDOW_DAYS * 24 * 3600 * 1000).toISOString();
      const [settingsRes, { data: instances }, usageRes] = await Promise.all([
        (supabase as any)
          .from("ai_agent_settings")
          .select("*")
          .eq("company_id", currentCompany.id)
          .maybeSingle(),
        supabase
          .from("wapi_instances")
          .select("unit")
          .eq("company_id", currentCompany.id)
          .eq("is_active", true),
        (supabase as any)
          .from("ai_agent_usage")
          .select("conversation_id, model, kind, cost_usd, is_test")
          .eq("company_id", currentCompany.id)
          .gte("created_at", since)
          .limit(10000),
      ]);
      let row = settingsRes.data;
      if (settingsRes.error && isMissingNewColumn(settingsRes.error)) {
        const retry = await (supabase as any)
          .from("ai_agent_settings")
          .select(BASE_COLUMNS)
          .eq("company_id", currentCompany.id)
          .maybeSingle();
        row = retry.data ? { ...retry.data, test_model: null } : null;
      }
      // Tabela de consumo ainda não criada: painel fica vazio, sem erro
      setUsageRows((usageRes?.data || []) as AiUsageRow[]);
      const loaded: AiAgentSettings = row || {
        enabled: false,
        unit: null,
        activated_at: null,
        extra_instructions: null,
        visit_hours: DEFAULT_VISIT_HOURS,
        test_mode_enabled: false,
        test_mode_number: null,
        model: DEFAULT_AI_MODEL,
        test_model: null,
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
    const payload: Record<string, unknown> = {
      company_id: currentCompany.id,
      enabled: next.enabled,
      unit: next.unit,
      activated_at: next.activated_at,
      extra_instructions: next.extra_instructions,
      visit_hours: next.visit_hours,
      test_mode_enabled: next.test_mode_enabled,
      test_mode_number: next.test_mode_number,
      model: next.model || DEFAULT_AI_MODEL,
      test_model: next.test_model,
      team_hours: next.team_hours ?? null,
      handoff_alert_minutes: next.handoff_alert_minutes ?? 10,
      handoff_alert_phone: next.handoff_alert_phone ?? null,
      party_slots: next.party_slots ?? null,
      closed_periods: next.closed_periods ?? [],
      followup_config: next.followup_config ?? null,
      assistant_name: next.assistant_name ?? null,
      intro_image_url: next.intro_image_url ?? null,
      // Só manda quando o banco já tem a coluna (veio na leitura)
      ...(next.extra_units !== undefined ? { extra_units: next.extra_units ?? [] } : {}),
      ...(next.party_soon_alert !== undefined ? { party_soon_alert: next.party_soon_alert === true } : {}),
      ...(next.corporate_events_enabled !== undefined
        ? { corporate_events_enabled: next.corporate_events_enabled === true, corporate_max_guests: next.corporate_max_guests ?? null }
        : {}),
      updated_at: new Date().toISOString(),
    };
    const save = (body: Record<string, unknown>, columns: string) => (supabase as any)
      .from("ai_agent_settings")
      .upsert(body, { onConflict: "company_id" })
      .select(columns)
      .single();
    let { data, error } = await save(payload, "*");
    if (error && isMissingNewColumn(error)) {
      // Banco sem as colunas novas: salva o resto e avisa que falta a atualização
      const { test_model: _t, team_hours: _h, handoff_alert_minutes: _m, handoff_alert_phone: _p, party_slots: _s, closed_periods: _c, followup_config: _f, assistant_name: _n, intro_image_url: _i, extra_units: _x, ...withoutNew } = payload;
      ({ data, error } = await save(withoutNew, BASE_COLUMNS));
      if (!error) {
        data = { ...data, test_model: null };
        toast({ title: "Parte das configurações não foi salva", description: "Falta rodar a atualização do banco (SQL) da IA. O resto foi salvo." });
      }
    }
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

  // Liga/desliga a IA em outro número. Ligar marca "a partir de agora": a IA só
  // pega os clientes novos desse número, não entra nas conversas em andamento.
  const toggleExtraUnit = async (unit: string, on: boolean) => {
    if (!settings) return;
    if (settings.extra_units === undefined) {
      toast({ title: "Falta atualizar o banco", description: "Rode o SQL dos outros números da IA e tente de novo.", variant: "destructive" });
      return;
    }
    const others = (settings.extra_units || []).filter((e) => e.unit !== unit);
    const extra_units = on ? [...others, { unit, activated_at: new Date().toISOString() }] : others;
    const saved = await persist({ extra_units });
    if (saved) {
      toast({
        title: on ? `IA ligada no ${unit}` : `IA desligada no ${unit}`,
        description: on
          ? "Ela atende os clientes novos desse número a partir de agora. As conversas em andamento continuam como estão."
          : "As conversas novas desse número voltam para o bot padrão e a equipe.",
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
    setTestModeEnabled(settings.test_mode_enabled || false);
    setTestModeNumber(settings.test_mode_number || "");
    setEditModel(settings.model || DEFAULT_AI_MODEL);
    setEditTestModel(settings.test_model || SAME_MODEL);
    const team = parseVisitHours(settings.team_hours || DEFAULT_TEAM_HOURS);
    setTeamDays(team.days);
    setTeamStart(team.start);
    setTeamEnd(team.end);
    setTeamSatDifferent(team.satDifferent);
    setTeamSatStart(team.satStart);
    setTeamSatEnd(team.satEnd);
    setAlertMinutes(settings.handoff_alert_minutes || 10);
    setAlertPhone(settings.handoff_alert_phone || "");
    setPartySoonAlert(settings.party_soon_alert === true);
    setCorporateOn(settings.corporate_events_enabled === true);
    setCorporateMax(settings.corporate_max_guests ? String(settings.corporate_max_guests) : "");
    setPartySlots(settings.party_slots || DEFAULT_PARTY_SLOTS);
    setClosedPeriods(Array.isArray(settings.closed_periods) ? settings.closed_periods : []);
    const fu = normalizeFollowUpConfig(settings.followup_config);
    setFuEnabled(fu.enabled);
    setFuInactivityOn(fu.inactivity.enabled);
    setFuInactivityMinutes(fu.inactivity.minutes);
    setFuSecondOn(fu.inactivity.second_minutes !== null);
    setFuSecondMinutes(fu.inactivity.second_minutes ?? 180);
    setFuSteps(fu.steps.map((st) => ({ ...splitDelay(st.delay_hours), goal: st.goal, image_url: st.image_url || null })));
    setFuLostOn(fu.auto_lost.enabled);
    setFuLostHours(fu.auto_lost.hours);
    setFuFarMonths(fu.far_months);
    setFuReactOn(fu.reactivation.enabled);
    setFuReactDays(fu.reactivation.days_before);
    setFuReactImage(fu.reactivation.image_url || null);
    setIntroName(settings.assistant_name || "");
    setIntroImage(settings.intro_image_url || null);
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
    if (teamDays.length === 0 || teamEnd <= teamStart) {
      toast({ title: "Horário da equipe inválido", description: "Marque os dias e um horário final depois do inicial.", variant: "destructive" });
      return;
    }
    if (alertPhone.trim() && alertPhone.replace(/\D/g, "").length < 10) {
      toast({ title: "WhatsApp do alerta inválido", description: "Informe com DDD, ex.: 15 98112-1710.", variant: "destructive" });
      return;
    }
    const periods = closedPeriods.filter((p) => p.start || p.end);
    if (periods.some((p) => !p.start || !p.end || p.end < p.start)) {
      toast({ title: "Confira o recesso", description: "Preencha o primeiro e o último dia de cada período (o último não pode ser antes do primeiro).", variant: "destructive" });
      return;
    }
    // Ligou agora: só conversas paradas a partir deste momento entram (sem disparo em massa)
    const prevFu = normalizeFollowUpConfig(settings.followup_config);
    const fuSince = fuEnabled ? (prevFu.enabled && prevFu.since ? prevFu.since : new Date().toISOString()) : null;
    const rawSteps = fuSteps.map((st) => ({ delay_hours: joinDelay(st.value, st.unit), goal: st.goal, image_url: st.image_url || null }));
    const followUp = normalizeFollowUpConfig({
      enabled: fuEnabled,
      since: fuSince,
      inactivity: { enabled: fuInactivityOn, minutes: fuInactivityMinutes, second_minutes: fuSecondOn ? fuSecondMinutes : null },
      steps: rawSteps,
      auto_lost: { enabled: fuLostOn, hours: fuLostHours },
      far_months: fuFarMonths,
      reactivation: { enabled: fuReactOn, days_before: fuReactDays, image_url: fuReactImage },
    });
    // Desligado: rascunho incompleto das etapas não impede salvar o resto
    const fuProblem = fuEnabled
      ? followUpConfigProblem({
        ...followUp,
        steps: rawSteps,
        auto_lost: { enabled: fuLostOn, hours: Number(fuLostHours) },
        far_months: Number(fuFarMonths),
        reactivation: { enabled: fuReactOn, days_before: fuReactDays.map(Number) },
      })
      : null;
    if (fuProblem) {
      setConfigTab("followup");
      toast({ title: "Confira o follow-up", description: fuProblem, variant: "destructive" });
      return;
    }
    if (testModeEnabled && !testModeNumber.trim()) {
      toast({ title: "Informe o número de teste", description: "Preencha o WhatsApp que vai testar a IA sozinho.", variant: "destructive" });
      return;
    }
    const saved = await persist({
      unit: editUnit,
      visit_hours: serializeVisitHours(visitDays, visitStart, visitEnd, visitHalfHour, visitSatDifferent, visitSatStart, visitSatEnd),
      extra_instructions: serializeBuffetInfo(infoValues),
      test_mode_enabled: testModeEnabled,
      // O número de teste fica guardado mesmo com o teste desligado: ele
      // continua falando sempre com a IA e aceitando #reiniciar
      test_mode_number: testModeNumber.trim() || null,
      model: editModel,
      test_model: testModeNumber.trim() && editTestModel !== SAME_MODEL && editTestModel !== editModel ? editTestModel : null,
      team_hours: serializeTeamHours(teamDays, teamStart, teamEnd, teamSatDifferent, teamSatStart, teamSatEnd),
      handoff_alert_minutes: alertMinutes,
      handoff_alert_phone: alertPhone.trim() || null,
      // Só quando o banco já tem a coluna (veio na leitura)
      ...(settings.party_soon_alert !== undefined ? { party_soon_alert: partySoonAlert } : {}),
      ...(settings.corporate_events_enabled !== undefined
        ? {
            corporate_events_enabled: corporateOn,
            corporate_max_guests: parseInt(corporateMax.replace(/\D/g, ""), 10) > 0 ? parseInt(corporateMax.replace(/\D/g, ""), 10) : null,
          }
        : {}),
      party_slots: partySlots.trim() && partySlots.trim() !== DEFAULT_PARTY_SLOTS ? partySlots.trim() : null,
      closed_periods: [...periods].sort((a, b) => a.start.localeCompare(b.start)),
      followup_config: followUp,
      assistant_name: introName.trim().slice(0, 30) || null,
      intro_image_url: introImage || null,
    });
    if (saved) {
      setConfigOpen(false);
      toast({ title: "Configurações salvas", description: "A IA passa a usar essas informações imediatamente." });
    }
  };

  // Aba "Questionário": por enquanto só para o Castelo (revisar antes de liberar)
  const showQuestionnaire = !!currentCompany?.id && QUESTIONNAIRE_COMPANY_IDS.includes(currentCompany.id);
  const configGroups = showQuestionnaire ? [...FIELD_GROUPS, { id: "questionario", label: "Questionário" }] : FIELD_GROUPS;

  const clientUsage = summarizeAiUsage(usageRows.filter((r) => !r.is_test));
  const testUsage = summarizeAiUsage(usageRows.filter((r) => r.is_test));
  const clientTotalUsd = clientUsage.reduce((sum, u) => sum + u.totalUsd, 0);
  const clientConversations = clientUsage.reduce((sum, u) => sum + u.conversations, 0);

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
          <p className="text-[11px] text-muted-foreground mt-1.5 flex items-center gap-1">
            <Cpu className="w-3 h-3" /> {modelLabel(settings.model || DEFAULT_AI_MODEL)}
            {clientConversations > 0 && (
              <span> · {formatBrlFromUsd(clientTotalUsd)} em {USAGE_WINDOW_DAYS} dias ({clientConversations} conversa{clientConversations === 1 ? "" : "s"})</span>
            )}
          </p>
        </div>
        <div className="mt-auto pt-1 flex items-center justify-between gap-2">
          {settings.enabled ? (
            <span className="text-[11px] font-extrabold tracking-wide text-green-700 bg-green-500/15 rounded-full px-3 py-1">EM USO · {[settings.unit, ...(settings.extra_units || []).map((e) => e.unit)].filter(Boolean).join(" + ")}</span>
          ) : (
            <span className="text-[11px] font-extrabold tracking-wide text-muted-foreground bg-muted rounded-full px-3 py-1">DESLIGADA</span>
          )}
          <div className="flex items-center gap-1">
            {howToLessonId && (
              <Button asChild size="sm" variant="ghost" className="h-7 text-xs gap-1 text-muted-foreground">
                <Link to={`/aprenda?aula=${howToLessonId}`}>
                  <PlayCircle className="w-3.5 h-3.5" />
                  Ver vídeo
                </Link>
              </Button>
            )}
            <Button size="sm" variant="ghost" className="h-7 text-xs gap-1 text-primary hover:text-primary" onClick={openConfig}>
              <Pencil className="w-3 h-3" />
              Configurar
            </Button>
          </div>
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
            <div className="grid grid-cols-6 gap-1.5 bg-muted rounded-xl p-1">
              {configGroups.map((g, gi) => {
                const groupFields = BUFFET_FIELDS.filter((f) => f.group === g.id);
                const filled = groupFields.filter((f) => (infoValues[f.key] || "").trim()).length;
                const active = configTab === g.id;
                return (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => setConfigTab(g.id)}
                    className={`${configGroups.length === 6 || gi < 3 ? "col-span-2" : "col-span-3"} min-w-0 flex flex-wrap items-center justify-center gap-1 rounded-lg px-1.5 py-2 text-xs font-bold transition-all ${active ? "bg-card shadow-sm text-foreground" : "text-muted-foreground"}`}
                  >
                    <span className="whitespace-nowrap">{g.label}</span>
                    {groupFields.length > 0 && (
                      <span className={`text-[10px] font-extrabold rounded-full px-1.5 py-0.5 ${filled === groupFields.length ? "bg-green-500/15 text-green-700" : "bg-border/70 text-muted-foreground"}`}>
                        {filled === groupFields.length ? <Check className="w-3 h-3" /> : `${filled}/${groupFields.length}`}
                      </span>
                    )}
                    {g.id === "followup" && (
                      <span className={`text-[10px] font-extrabold rounded-full px-1.5 py-0.5 ${fuEnabled ? "bg-green-500/15 text-green-700" : "bg-border/70 text-muted-foreground"}`}>
                        {fuEnabled ? "Ligado" : "Desligado"}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="overflow-y-auto px-5 sm:px-6 py-4 space-y-4 flex-1">
            {configTab === "basico" && (
              <div className="space-y-4">
                <div className="rounded-xl border border-violet-300/50 bg-violet-500/5 p-3.5 space-y-3">
                  <div>
                    <p className="text-sm font-bold">Apresentação</p>
                    <p className="text-[11px] text-muted-foreground">
                      A primeira mensagem da IA vai com esta arte e ela se apresenta pelo nome — no WhatsApp e na boas-vindas do site.
                    </p>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold">Nome da assistente</Label>
                    <Input
                      value={introName}
                      onChange={(e) => setIntroName(e.target.value)}
                      placeholder="Ex.: Ana"
                      maxLength={30}
                      className="h-10 bg-card border-border shadow-sm"
                    />
                  </div>
                  <FollowUpImageUploader
                    onUploadingChange={trackUpload}
                    value={introImage}
                    onChange={setIntroImage}
                    companyId={currentCompany?.id}
                    followUpNumber={1}
                    fileTag="bia_apresentacao"
                    successText="A arte vai na primeira mensagem da IA (a apresentação vira a legenda). Salve para valer."
                    helpText="Opcional: a arte da assistente (ex.: a assistente na recepção). Sem imagem, a primeira mensagem vai só com texto. JPG/PNG/WebP até 10MB."
                  />
                </div>
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
                  {settings.unit && units.some((u) => u !== settings.unit) && (
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold">Outros números com a IA</Label>
                      <p className="text-[11px] text-muted-foreground">
                        Ligue um de cada vez. A IA só atende os clientes novos desse número a partir do momento em que você ligar — as conversas em andamento continuam com o bot e a equipe. Salva na hora.
                      </p>
                      <div className="space-y-1.5">
                        {units.filter((u) => u !== settings.unit).map((u) => {
                          const extra = (settings.extra_units || []).find((e) => e.unit === u);
                          return (
                            <div key={u} className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card px-3 py-2 shadow-sm">
                              <div className="min-w-0">
                                <p className="text-sm font-bold">{u}</p>
                                <p className="text-[11px] text-muted-foreground">
                                  {extra
                                    ? `IA atendendo clientes novos desde ${new Date(extra.activated_at).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}`
                                    : "Só bot padrão e equipe"}
                                </p>
                              </div>
                              <Switch
                                checked={!!extra}
                                onCheckedChange={(on) => toggleExtraUnit(u, on)}
                                disabled={saving}
                                aria-label={`IA no ${u}`}
                              />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
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

                {/* Modelo de IA: OpenAI ou Anthropic, trocado aqui sem mexer em código */}
                <div className="rounded-xl border border-border bg-card p-3.5 space-y-2.5">
                  <Label className="text-xs font-bold flex items-center gap-1.5">
                    <Cpu className="w-3.5 h-3.5 text-violet-600" />
                    Modelo de IA (clientes)
                  </Label>
                  <Select value={editModel} onValueChange={setEditModel}>
                    <SelectTrigger className="h-auto min-h-10 py-1.5 bg-card border-border shadow-sm text-left">
                      <SelectValue>{modelLabel(editModel)}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {AI_MODELS.map((m) => (
                        <SelectItem key={m.id} value={m.id} className="py-2"><ModelOption id={m.id} /></SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-[11px] text-muted-foreground">
                    Custo por conversa é estimativa; o valor real aparece abaixo conforme a IA atende. Modelos Claude precisam da chave da Anthropic cadastrada no Supabase — sem ela, a IA usa o GPT-4o mini.
                  </p>
                  {(clientUsage.length > 0 || testUsage.length > 0) ? (
                    <div className="space-y-3 pt-1">
                      <p className="text-xs font-bold flex items-center gap-1.5">
                        <Wallet className="w-3.5 h-3.5 text-green-600" /> Consumo real — últimos {USAGE_WINDOW_DAYS} dias
                      </p>
                      <UsageTable title="Clientes" rows={clientUsage} />
                      <UsageTable title="Número de teste" rows={testUsage} />
                      <p className="text-[10px] text-muted-foreground">Inclui áudios transcritos e fotos. Valores em reais aproximados (cotação fixa).</p>
                    </div>
                  ) : (
                    <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                      <Wallet className="w-3.5 h-3.5" /> O consumo real aparece aqui depois das primeiras conversas.
                    </p>
                  )}
                </div>

                {/* Passagem para a equipe: a IA informa este horário ao cliente e,
                    se ninguém responder em X minutos de expediente, dispara o
                    alerta forte no WhatsApp abaixo (além do sininho). */}
                <div className="rounded-xl border border-border bg-card p-3.5 space-y-2.5">
                  <Label className="text-xs font-bold flex items-center gap-1.5">
                    <BellRing className="w-3.5 h-3.5 text-red-600" />
                    Passagem para a equipe
                  </Label>
                  <p className="text-[11px] text-muted-foreground">
                    Horário de atendimento da equipe — a IA informa ao cliente quando passa a conversa.
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {DAY_SHORT.map((d, idx) => {
                      const on = teamDays.includes(idx);
                      return (
                        <button
                          key={d}
                          type="button"
                          onClick={() => {
                            if (idx === 5 && on) setTeamSatDifferent(false);
                            setTeamDays((prev) => (prev.includes(idx) ? prev.filter((x) => x !== idx) : [...prev, idx]));
                          }}
                          className={`min-w-[44px] h-9 px-2 rounded-lg text-xs font-bold transition-all border ${on ? "bg-violet-600 text-white border-violet-600 shadow-sm" : "bg-card text-muted-foreground border-border"}`}
                        >
                          {d}
                        </button>
                      );
                    })}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold">Das</Label>
                      <Select value={teamStart} onValueChange={setTeamStart}>
                        <SelectTrigger className="h-10 bg-card border-border shadow-sm"><SelectValue /></SelectTrigger>
                        <SelectContent>{TIME_OPTIONS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold">Até</Label>
                      <Select value={teamEnd} onValueChange={setTeamEnd}>
                        <SelectTrigger className="h-10 bg-card border-border shadow-sm"><SelectValue /></SelectTrigger>
                        <SelectContent>{TIME_OPTIONS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  </div>
                  {teamDays.includes(5) && (
                    <div className="space-y-2 rounded-lg border border-border bg-muted/30 p-3">
                      <div className="flex items-center justify-between gap-2">
                        <Label className="text-xs font-bold">Sábado tem horário diferente</Label>
                        <Switch checked={teamSatDifferent} onCheckedChange={setTeamSatDifferent} />
                      </div>
                      {teamSatDifferent && (
                        <div className="grid grid-cols-2 gap-3 pt-1">
                          <Select value={teamSatStart} onValueChange={setTeamSatStart}>
                            <SelectTrigger className="h-10 bg-card border-border shadow-sm"><SelectValue /></SelectTrigger>
                            <SelectContent>{TIME_OPTIONS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                          </Select>
                          <Select value={teamSatEnd} onValueChange={setTeamSatEnd}>
                            <SelectTrigger className="h-10 bg-card border-border shadow-sm"><SelectValue /></SelectTrigger>
                            <SelectContent>{TIME_OPTIONS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                          </Select>
                        </div>
                      )}
                    </div>
                  )}
                  <div className="grid grid-cols-1 sm:grid-cols-[1fr_1.4fr] gap-3 pt-1">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold">Alerta se a equipe não responder em</Label>
                      <Select value={String(alertMinutes)} onValueChange={(v) => setAlertMinutes(Number(v))}>
                        <SelectTrigger className="h-10 bg-card border-border shadow-sm"><SelectValue /></SelectTrigger>
                        <SelectContent>{ALERT_MINUTE_OPTIONS.map((m) => <SelectItem key={m} value={String(m)}>{m} min</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold">WhatsApp que recebe o alerta</Label>
                      <Input
                        value={alertPhone}
                        onChange={(e) => setAlertPhone(e.target.value)}
                        className="h-10 text-base sm:text-sm bg-card border-border shadow-sm"
                        placeholder="Ex.: 15 98112-1710"
                      />
                    </div>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Quando a IA passa uma conversa para a equipe e ninguém responde o cliente nesse tempo (contando só o horário de atendimento), esse WhatsApp recebe um alerta 🚨 com o nome do cliente e o motivo, além do sininho. Sem número, fica só o sininho.
                  </p>
                  {settings.party_soon_alert !== undefined && (
                    <div className="space-y-1 rounded-lg border border-border bg-muted/30 p-3">
                      <div className="flex items-center justify-between gap-2">
                        <Label className="text-xs font-bold">🎉 Avisar quando a festa for nos próximos 60 dias</Label>
                        <Switch checked={partySoonAlert} onCheckedChange={setPartySoonAlert} aria-label="Avisar festa nos próximos 60 dias" />
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        Vale para todos os clientes (IA, robô e site). Com data exata (site), conta 60 dias; quando só tem o mês (IA e robô), vale o mês atual e o seguinte. Aviso no sininho e no WhatsApp acima, uma vez por cliente.
                      </p>
                    </div>
                  )}
                </div>

                {/* Confraternização de empresas: a IA reconhece empresa, não pergunta de
                    aniversariante e a lista do começo ganha a opção (só com a coluna no banco) */}
                {settings.corporate_events_enabled !== undefined && (
                  <div className="rounded-xl border border-border bg-card p-3.5 space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <Label className="text-xs font-bold flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-sky-600" />
                        Atender confraternização de empresas
                      </Label>
                      <Switch checked={corporateOn} onCheckedChange={setCorporateOn} aria-label="Atender confraternização de empresas" />
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      A IA reconhece quando é empresa (confraternização, colaboradores, fim de ano da equipe), não pergunta de aniversariante e usa o mesmo pacote, PDF e agenda. A lista "Como posso te ajudar?" ganha a opção 🏢 Confraternização de empresa, o lead fica marcado como Empresa e a equipe recebe um aviso.
                    </p>
                    {corporateOn && (
                      <div className="flex items-center gap-2">
                        <Label className="text-xs whitespace-nowrap">Capacidade máxima</Label>
                        <Input
                          inputMode="numeric"
                          value={corporateMax}
                          onChange={(e) => setCorporateMax(e.target.value.replace(/\D/g, "").slice(0, 4))}
                          className="h-9 w-24 text-base sm:text-sm bg-card border-border shadow-sm"
                          placeholder="120"
                        />
                        <span className="text-xs text-muted-foreground">pessoas</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Recesso / dias fechados: a IA não oferece festa nem visita
                    nesses dias e avisa quando a equipe volta; o site bloqueia os dias */}
                <div className="rounded-xl border border-border bg-card p-3.5 space-y-2.5">
                  <Label className="text-xs font-bold flex items-center gap-1.5">
                    <CalendarOff className="w-3.5 h-3.5 text-amber-600" />
                    Recesso / dias fechados
                  </Label>
                  <p className="text-[11px] text-muted-foreground">
                    Sem festas e sem visitas nesses dias. A IA e a equipe continuam atendendo normalmente (a IA só não oferece esses dias). No site, esses dias ficam bloqueados.
                  </p>
                  {closedPeriods.map((p, idx) => (
                    <div key={idx} className="rounded-lg border border-border/70 bg-muted/30 p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold">Período {idx + 1}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground"
                          aria-label="Remover período"
                          onClick={() => setClosedPeriods((list) => list.filter((_, i) => i !== idx))}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div className="space-y-1 min-w-0">
                          <Label className="text-[11px] text-muted-foreground">Primeiro dia</Label>
                          <Input
                            type="date"
                            value={p.start}
                            onChange={(e) => setClosedPeriods((list) => list.map((x, i) => (i === idx ? { ...x, start: e.target.value } : x)))}
                            className="h-10 w-full min-w-0 appearance-none text-base sm:text-sm bg-card border-border shadow-sm"
                          />
                        </div>
                        <div className="space-y-1 min-w-0">
                          <Label className="text-[11px] text-muted-foreground">Último dia</Label>
                          <Input
                            type="date"
                            value={p.end}
                            min={p.start || undefined}
                            onChange={(e) => setClosedPeriods((list) => list.map((x, i) => (i === idx ? { ...x, end: e.target.value } : x)))}
                            className="h-10 w-full min-w-0 appearance-none text-base sm:text-sm bg-card border-border shadow-sm"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-1"
                    onClick={() => setClosedPeriods((list) => [...list, { start: "", end: "" }])}
                  >
                    <Plus className="w-3.5 h-3.5" /> Adicionar período
                  </Button>
                </div>

                {/* Horários de festa: a IA cruza com a agenda (festas e pré-reservas) */}
                <div className="rounded-xl border border-border bg-muted/30 p-3.5 space-y-2">
                  <Label className="text-xs font-bold">Horários de festa (todos os dias)</Label>
                  <Input
                    value={partySlots}
                    onChange={(e) => setPartySlots(e.target.value)}
                    className="h-10 text-base sm:text-sm bg-card border-border shadow-sm"
                    placeholder={DEFAULT_PARTY_SLOTS}
                  />
                  <p className="text-[11px] text-muted-foreground">
                    A IA consulta a agenda (festas e pré-reservas) e diz quais desses horários estão livres "neste momento" — ela só lê a agenda, nunca reserva. Pré-reserva ocupa o dia inteiro.
                  </p>
                </div>

                {/* Modo de Teste da IA: diferente do Modo de Teste do bot fixo (que
                    pausa TODO o número). Aqui só a IA fica restrita a um telefone —
                    o resto dos clientes continua sendo atendido normalmente. */}
                <div className="rounded-xl border border-dashed border-amber-400/60 bg-amber-500/5 p-3.5 space-y-2.5">
                  <Label className="text-xs font-bold flex items-center gap-1.5">
                    <FlaskConical className="w-3.5 h-3.5 text-amber-600" />
                    Seu número de teste
                  </Label>
                  <Input
                    value={testModeNumber}
                    onChange={(e) => setTestModeNumber(e.target.value)}
                    className="h-10 text-base sm:text-sm bg-card border-border shadow-sm"
                    placeholder="Ex.: 15 98112-1710"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Esse WhatsApp sempre conversa com a IA, mesmo depois de liberada para todos. Mande <span className="font-bold">#reiniciar</span> dele para a IA começar uma conversa do zero (não apague a conversa na Central para testar).
                  </p>
                  <div className="flex items-center justify-between gap-2 pt-1">
                    <Label className="text-xs font-bold">Só esse número fala com a IA</Label>
                    <Switch checked={testModeEnabled} onCheckedChange={setTestModeEnabled} />
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    {testModeEnabled
                      ? "Ligado: os outros clientes continuam com o bot de sempre, sem nenhuma mudança."
                      : "Desligado: a IA atende os leads novos do número; o seu continua sendo o de teste."}
                  </p>
                  {testModeNumber.trim() && (
                    <div className="space-y-1.5 pt-1">
                      <Label className="text-xs font-bold">Modelo no número de teste</Label>
                      <Select value={editTestModel} onValueChange={setEditTestModel}>
                        <SelectTrigger className="h-auto min-h-10 py-1.5 bg-card border-border shadow-sm text-left">
                          <SelectValue>{editTestModel === SAME_MODEL ? "O mesmo dos clientes" : modelLabel(editTestModel)}</SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={SAME_MODEL} className="py-2">O mesmo dos clientes</SelectItem>
                          {AI_MODELS.map((m) => (
                            <SelectItem key={m.id} value={m.id} className="py-2"><ModelOption id={m.id} /></SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-[11px] text-muted-foreground">
                        Para comparar: escolha um modelo, converse; troque e converse de novo.
                      </p>
                    </div>
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

                {/* Simulador de testes */}
                <div className="rounded-xl border border-violet-500/30 bg-violet-500/5 p-3.5 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Label className="text-xs font-bold flex items-center gap-1.5"><FlaskConical className="w-3.5 h-3.5 text-violet-600" /> Testes da IA</Label>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Simula umas 30 conversas de clientes (preço, datas, desconto, visita, formatura…) e mostra o que passou e o que falhou. Não envia nada pelo WhatsApp. Salve antes as mudanças que quiser testar.
                    </p>
                  </div>
                  <Button size="sm" variant="outline" className="shrink-0" onClick={() => setSimOpen(true)}>Rodar testes</Button>
                </div>
              </div>
            )}

            {configTab === "followup" && (
              <div className="space-y-4">
                <div className="rounded-xl border border-violet-300/50 bg-violet-500/5 p-3.5 space-y-1.5">
                  <Label className="text-xs font-bold flex items-center gap-1.5">
                    <MessageCircleHeart className="w-3.5 h-3.5 text-violet-600" />
                    Acompanhamento da IA
                  </Label>
                  <p className="text-[11px] text-muted-foreground">
                    Vale só para as conversas que a IA atende. Os follow-ups do bot fixo (configurados em cada número) continuam iguais. A IA escreve cada mensagem com o que já conversou, só entre 8h e 22h, e para quando o cliente responde, marca visita, a equipe assume ou o robô é desligado na conversa.
                  </p>
                  <div className="flex items-center justify-between gap-3 pt-1">
                    <Label className="text-xs font-bold">Ligar acompanhamento da IA</Label>
                    <Switch checked={fuEnabled} onCheckedChange={setFuEnabled} />
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    {fuEnabled
                      ? "Ligado: as conversas da IA saem dos follow-ups fixos do número e seguem as etapas abaixo. Conversas que já estavam paradas antes de ligar ficam de fora."
                      : "Desligado: as conversas da IA recebem os follow-ups fixos do número, como hoje."}
                  </p>
                </div>

                {/* Lembrete curto quando o cliente some no meio da conversa */}
                <div className="rounded-xl border border-border bg-card p-3.5 space-y-2.5">
                  <div className="flex items-center justify-between gap-3">
                    <Label className="text-xs font-bold">Lembrete de inatividade</Label>
                    <Switch checked={fuInactivityOn} onCheckedChange={setFuInactivityOn} />
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Quando o cliente para de responder no meio da conversa, a IA retoma de onde pararam. Vale para cada pausa: se ele responder e parar de novo, o lembrete volta a valer.
                  </p>
                  {fuInactivityOn && (
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-muted-foreground">Depois de</span>
                      <Select value={String(fuInactivityMinutes)} onValueChange={(v) => setFuInactivityMinutes(Number(v))}>
                        <SelectTrigger className="h-10 w-32 bg-card border-border shadow-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from(new Set([...INACTIVITY_MINUTE_OPTIONS, fuInactivityMinutes])).sort((a, b) => a - b).map((m) => (
                            <SelectItem key={m} value={String(m)}>{m < 60 ? `${m} min` : m % 60 === 0 ? `${m / 60}h` : `${Math.floor(m / 60)}h${m % 60}`}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <span className="text-muted-foreground">sem resposta</span>
                    </div>
                  )}
                  {fuInactivityOn && (
                    <div className="rounded-lg border border-border/70 bg-muted/30 p-3 space-y-2">
                      <div className="flex items-center justify-between gap-3">
                        <Label className="text-xs font-bold">2º lembrete</Label>
                        <Switch checked={fuSecondOn} onCheckedChange={setFuSecondOn} />
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        Se ele não responder nem ao 1º, a IA manda mais um, em outro tom e sem pressão. Depois disso, só os follow-ups.
                      </p>
                      {fuSecondOn && (
                        <div className="flex flex-wrap items-center gap-2 text-sm">
                          <Select value={String(fuSecondMinutes)} onValueChange={(v) => setFuSecondMinutes(Number(v))}>
                            <SelectTrigger className="h-10 w-32 bg-card border-border shadow-sm">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {Array.from(new Set([...SECOND_INACTIVITY_OPTIONS, fuSecondMinutes])).sort((a, b) => a - b).map((m) => (
                                <SelectItem key={m} value={String(m)}>{m < 60 ? `${m} min` : m % 60 === 0 ? `${m / 60}h` : `${Math.floor(m / 60)}h${m % 60}`}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <span className="text-muted-foreground">depois do 1º lembrete</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Follow-ups por etapa: prazo + objetivo (a IA escreve) */}
                <div className="rounded-xl border border-border bg-card p-3.5 space-y-3">
                  <Label className="text-xs font-bold">Follow-ups</Label>
                  <p className="text-[11px] text-muted-foreground">
                    O prazo conta desde a última resposta da IA sem retorno do cliente. Em cada etapa, diga o que a IA deve fazer — ela escreve no tom dela, com o nome, a data pedida e a agenda real (nunca inventa vagas nem passa valores que o cliente não pediu).
                  </p>
                  {fuSteps.map((st, idx) => (
                    <div key={idx} className="rounded-lg border border-border/70 bg-muted/30 p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold">Etapa {idx + 1}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground"
                          aria-label="Remover etapa"
                          onClick={() => setFuSteps((list) => list.filter((_, i) => i !== idx))}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-sm">
                        <span className="text-muted-foreground">Enviar depois de</span>
                        <Input
                          type="number"
                          min={1}
                          value={st.value}
                          onChange={(e) => setFuSteps((list) => list.map((x, i) => (i === idx ? { ...x, value: Number(e.target.value) } : x)))}
                          className="h-10 w-20 text-base sm:text-sm bg-card border-border shadow-sm"
                        />
                        <Select
                          value={st.unit}
                          onValueChange={(v) => setFuSteps((list) => list.map((x, i) => (i === idx ? { ...x, unit: v as "horas" | "dias" } : x)))}
                        >
                          <SelectTrigger className="h-10 w-24 bg-card border-border shadow-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="horas">horas</SelectItem>
                            <SelectItem value="dias">dias</SelectItem>
                          </SelectContent>
                        </Select>
                        <span className="text-muted-foreground">sem resposta</span>
                      </div>
                      <Textarea
                        value={st.goal}
                        onChange={(e) => setFuSteps((list) => list.map((x, i) => (i === idx ? { ...x, goal: e.target.value } : x)))}
                        rows={3}
                        maxLength={600}
                        className="text-base sm:text-sm bg-card border-border shadow-sm resize-none"
                        placeholder="O que a IA deve fazer nesta mensagem (ex.: convidar para conhecer o espaço)"
                      />
                      <FollowUpImageUploader
                        onUploadingChange={trackUpload}
                        value={st.image_url}
                        onChange={(url) => setFuSteps((list) => list.map((x, i) => (i === idx ? { ...x, image_url: url } : x)))}
                        companyId={currentCompany?.id}
                        followUpNumber={1}
                        fileTag={`bia_etapa${idx + 1}`}
                        successText={`A arte vai junto com a etapa ${idx + 1} (a mensagem da IA vira a legenda). Salve para valer.`}
                        helpText="Opcional: uma arte (ex.: a assistente, a promoção). A IA escreve a mensagem como legenda. Sem imagem, vai só o texto. JPG/PNG/WebP até 10MB."
                      />
                    </div>
                  ))}
                  {fuSteps.length < MAX_FOLLOWUP_STEPS && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="gap-1"
                      onClick={() => setFuSteps((list) => {
                        const last = list[list.length - 1];
                        const nextHours = last ? joinDelay(last.value, last.unit) + 72 : 72;
                        return [...list, { ...splitDelay(nextHours), goal: list.length === 0 ? DEFAULT_STEP_GOALS[0] : "" }];
                      })}
                    >
                      <Plus className="w-3.5 h-3.5" /> Adicionar etapa
                    </Button>
                  )}
                </div>

                {/* Festa distante: sem insistir; lembretes antes da festa com a agenda real */}
                <div className="rounded-xl border border-border bg-card p-3.5 space-y-3">
                  <Label className="text-xs font-bold">Festa distante e lembretes antes da festa</Label>
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <span className="text-muted-foreground">Festa distante: mais de</span>
                    <Input
                      type="number"
                      min={1}
                      max={12}
                      value={fuFarMonths}
                      onChange={(e) => setFuFarMonths(Number(e.target.value))}
                      className="h-10 w-16 text-base sm:text-sm bg-card border-border shadow-sm"
                    />
                    <span className="text-muted-foreground">meses</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Festa distante, ou cliente que disse "vou pensar" / "é só ano que vem": a IA manda só a 1ª etapa e não insiste. Quem traz o cliente de volta são os lembretes antes da festa.
                  </p>
                  <div className="flex items-center justify-between gap-3 pt-1">
                    <Label className="text-xs font-bold">Lembretes antes da festa</Label>
                    <Switch checked={fuReactOn} onCheckedChange={setFuReactOn} />
                  </div>
                  {fuReactOn && (
                    <div className="space-y-2">
                      {fuReactDays.map((d, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-sm">
                          <Input
                            type="number"
                            min={1}
                            max={180}
                            value={d}
                            onChange={(e) => setFuReactDays((list) => list.map((x, i) => (i === idx ? Number(e.target.value) : x)))}
                            className="h-10 w-20 text-base sm:text-sm bg-card border-border shadow-sm"
                          />
                          <span className="text-muted-foreground flex-1">dias antes da festa</span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground"
                            aria-label="Remover lembrete"
                            onClick={() => setFuReactDays((list) => list.filter((_, i) => i !== idx))}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                      {fuReactDays.length < MAX_REACTIVATIONS && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="gap-1"
                          onClick={() => setFuReactDays((list) => {
                            // Próximo lembrete: 15 dias antes do menor, sem repetir
                            let next = list.length === 0 ? 30 : Math.max(1, Math.min(...list) - 15);
                            while (list.includes(next) && next < 180) next++;
                            return [...list, next];
                          })}
                        >
                          <Plus className="w-3.5 h-3.5" /> Adicionar lembrete
                        </Button>
                      )}
                    </div>
                  )}
                  {fuReactOn && (
                    <FollowUpImageUploader
                      onUploadingChange={trackUpload}
                      value={fuReactImage}
                      onChange={setFuReactImage}
                      companyId={currentCompany?.id}
                      followUpNumber={1}
                      fileTag="bia_lembrete"
                      successText="A arte vai junto com os lembretes antes da festa. Salve para valer."
                      helpText="Opcional: uma arte para os lembretes antes da festa (a mensagem da IA vira a legenda). JPG/PNG/WebP até 10MB."
                    />
                  )}
                  <p className="text-[11px] text-muted-foreground">
                    {fuReactOn
                      ? "A IA escreve com a agenda real: se a data do cliente ainda estiver livre, ela avisa; se foi reservada, oferece outras datas livres perto dela. Se o cliente só disse o mês, ela mostra datas livres do mês. Nessas conversas, a reativação fixa não manda mensagem."
                      : "Desligado: a IA segue todas as etapas, e quem lembra o cliente perto da festa é a reativação fixa (Automações), como hoje."}
                  </p>
                </div>

                {/* Perdido automático depois da última etapa */}
                <div className="rounded-xl border border-border bg-card p-3.5 space-y-2.5">
                  <div className="flex items-center justify-between gap-3">
                    <Label className="text-xs font-bold">Mover para Perdido automaticamente</Label>
                    <Switch checked={fuLostOn} onCheckedChange={setFuLostOn} />
                  </div>
                  {fuLostOn && (
                    <div className="flex flex-wrap items-center gap-2 text-sm">
                      <Input
                        type="number"
                        min={1}
                        value={fuLostHours}
                        onChange={(e) => setFuLostHours(Number(e.target.value))}
                        className="h-10 w-20 text-base sm:text-sm bg-card border-border shadow-sm"
                      />
                      <span className="text-muted-foreground">
                        horas {fuSteps.length > 0 ? "depois da última mensagem automática" : "depois da última resposta da IA"} sem resposta
                        {fuLostHours >= 24 && fuLostHours % 24 === 0 ? ` (${delayLabel(fuLostHours)})` : ""}
                      </span>
                    </div>
                  )}
                  <p className="text-[11px] text-muted-foreground">
                    Se ainda houver lembrete antes da festa para mandar, o lead espera por ele (não vira Perdido antes). Festa que já passou vira Perdido. Se o cliente voltar a falar depois, a IA continua o atendimento normalmente.
                  </p>
                </div>
              </div>
            )}

            {configTab === "questionario" && currentCompany?.id && (
              <AiQuestionnaireTab companyId={currentCompany.id} />
            )}

            {configTab !== "basico" && configTab !== "followup" && configTab !== "questionario" && (
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
            {configTab === "questionario" ? (
              // O questionário tem os próprios botões de salvar/enviar
              <Button variant="ghost" onClick={() => setConfigOpen(false)} className="w-full sm:w-auto">Fechar</Button>
            ) : (
              <>
                <Button variant="ghost" onClick={() => setConfigOpen(false)} disabled={saving} className="w-full sm:w-auto">Cancelar</Button>
                <Button onClick={saveConfig} disabled={saving || uploadsBusy > 0} className="w-full sm:w-auto">
                  {saving || uploadsBusy > 0 ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                  {uploadsBusy > 0 ? "Enviando imagem…" : "Salvar tudo"}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AiSimulatorDialog
        open={simOpen}
        onOpenChange={setSimOpen}
        model={(settings.test_mode_enabled && settings.test_model) || settings.model || DEFAULT_AI_MODEL}
      />
    </>
  );
}
