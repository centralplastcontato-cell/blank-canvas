// Configurações → IA → Acompanhamento: lembrete de inatividade, follow-ups
// por etapa, festa distante, lembretes antes da festa e perdido automático.

import { useEffect, useMemo, useState } from "react";
import { CalendarHeart, Clock, Loader2, MessageCircleHeart, Plus, Trash2, UserX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
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
} from "@/lib/aiFollowUp";
import { FollowUpImageUploader } from "../FollowUpImageUploader";
import { AiCard, SaveBar } from "./AiFormBits";
import { useAiAgentSettings, type AiAgentSettings } from "./useAiAgentSettings";

interface StepDraft {
  value: number;
  unit: "horas" | "dias";
  goal: string;
  image_url?: string | null;
}

interface Draft {
  enabled: boolean;
  inactivityOn: boolean;
  inactivityMinutes: number;
  secondOn: boolean;
  secondMinutes: number;
  steps: StepDraft[];
  lostOn: boolean;
  lostHours: number;
  farMonths: number;
  reactOn: boolean;
  reactDays: number[];
  reactImage: string | null;
}

function draftFrom(s: AiAgentSettings): Draft {
  const fu = normalizeFollowUpConfig(s.followup_config);
  return {
    enabled: fu.enabled,
    inactivityOn: fu.inactivity.enabled,
    inactivityMinutes: fu.inactivity.minutes,
    secondOn: fu.inactivity.second_minutes !== null,
    secondMinutes: fu.inactivity.second_minutes ?? 180,
    steps: fu.steps.map((st) => ({ ...splitDelay(st.delay_hours), goal: st.goal, image_url: st.image_url || null })),
    lostOn: fu.auto_lost.enabled,
    lostHours: fu.auto_lost.hours,
    farMonths: fu.far_months,
    reactOn: fu.reactivation.enabled,
    reactDays: fu.reactivation.days_before,
    reactImage: fu.reactivation.image_url || null,
  };
}

const minutesLabel = (m: number) => (m < 60 ? `${m} min` : m % 60 === 0 ? `${m / 60}h` : `${Math.floor(m / 60)}h${m % 60}`);

export function AiFollowUpSection() {
  const { companyId, settings, loading, saving, persist } = useAiAgentSettings();
  const [saved, setSaved] = useState<Draft | null>(null);
  const [d, setD] = useState<Draft | null>(null);
  const [uploadsBusy, setUploadsBusy] = useState(0);

  useEffect(() => {
    if (!settings || saved) return;
    const initial = draftFrom(settings);
    setSaved(initial);
    setD(initial);
  }, [settings, saved]);

  const dirty = useMemo(() => !!d && !!saved && JSON.stringify(d) !== JSON.stringify(saved), [d, saved]);

  if (loading || !settings || !d) {
    return <div className="flex items-center gap-2 text-sm text-muted-foreground p-4"><Loader2 className="w-4 h-4 animate-spin" /> Carregando...</div>;
  }

  const set = <K extends keyof Draft>(key: K) => (value: Draft[K]) => setD((prev) => (prev ? { ...prev, [key]: value } : prev));
  const setSteps = (fn: (list: StepDraft[]) => StepDraft[]) => setD((prev) => (prev ? { ...prev, steps: fn(prev.steps) } : prev));
  const setReactDays = (fn: (list: number[]) => number[]) => setD((prev) => (prev ? { ...prev, reactDays: fn(prev.reactDays) } : prev));
  const trackUpload = (busy: boolean) => setUploadsBusy((n) => Math.max(0, n + (busy ? 1 : -1)));

  const save = async () => {
    // Ligou agora: só conversas paradas a partir deste momento entram (sem disparo em massa)
    const prev = normalizeFollowUpConfig(settings.followup_config);
    const since = d.enabled ? (prev.enabled && prev.since ? prev.since : new Date().toISOString()) : null;
    const rawSteps = d.steps.map((st) => ({ delay_hours: joinDelay(st.value, st.unit), goal: st.goal, image_url: st.image_url || null }));
    const followUp = normalizeFollowUpConfig({
      enabled: d.enabled,
      since,
      inactivity: { enabled: d.inactivityOn, minutes: d.inactivityMinutes, second_minutes: d.secondOn ? d.secondMinutes : null },
      steps: rawSteps,
      auto_lost: { enabled: d.lostOn, hours: d.lostHours },
      far_months: d.farMonths,
      reactivation: { enabled: d.reactOn, days_before: d.reactDays, image_url: d.reactImage },
    });
    // Desligado: rascunho incompleto das etapas não impede salvar
    const problem = d.enabled
      ? followUpConfigProblem({
        ...followUp,
        steps: rawSteps,
        auto_lost: { enabled: d.lostOn, hours: Number(d.lostHours) },
        far_months: Number(d.farMonths),
        reactivation: { enabled: d.reactOn, days_before: d.reactDays.map(Number) },
      })
      : null;
    if (problem) {
      toast({ title: "Confira o acompanhamento", description: problem, variant: "destructive" });
      return;
    }
    const ok = await persist({ followup_config: followUp });
    if (ok) {
      const fresh = draftFrom(ok);
      setSaved(fresh);
      setD(fresh);
      toast({ title: "Salvo", description: "O acompanhamento já vale para as próximas mensagens." });
    }
  };

  return (
    <div className="space-y-4">
      <AiCard
        icon={<MessageCircleHeart className="h-4 w-4 text-violet-600" />}
        title="Acompanhamento da IA"
        description="Vale só para as conversas que a IA atende. A IA escreve cada mensagem com o que já conversou, só entre 8h e 22h, e para quando o cliente responde, marca visita, a equipe assume ou o robô é desligado na conversa."
        action={<Switch checked={d.enabled} onCheckedChange={set("enabled")} aria-label="Ligar acompanhamento da IA" />}
      >
        <p className="text-xs font-medium text-muted-foreground">
          {d.enabled
            ? "Ligado: as conversas da IA seguem as etapas abaixo (e não os follow-ups fixos do número). Conversas que já estavam paradas antes de ligar ficam de fora."
            : "Desligado: as conversas da IA recebem os follow-ups fixos do número, como hoje."}
        </p>
      </AiCard>

      <AiCard
        icon={<Clock className="h-4 w-4 text-sky-600" />}
        title="Lembrete quando o cliente some"
        description="Se o cliente para de responder no meio da conversa, a IA retoma de onde pararam. Vale para cada pausa."
        action={<Switch checked={d.inactivityOn} onCheckedChange={set("inactivityOn")} aria-label="Lembrete de inatividade" />}
      >
        {d.inactivityOn && (
          <>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">Depois de</span>
              <Select value={String(d.inactivityMinutes)} onValueChange={(v) => set("inactivityMinutes")(Number(v))}>
                <SelectTrigger className="h-10 w-32" aria-label="Tempo do 1º lembrete"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Array.from(new Set([...INACTIVITY_MINUTE_OPTIONS, d.inactivityMinutes])).sort((a, b) => a - b).map((m) => (
                    <SelectItem key={m} value={String(m)}>{minutesLabel(m)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <span className="text-muted-foreground">sem resposta</span>
            </div>
            <div className="rounded-xl border border-border/70 bg-muted/30 p-3 space-y-2">
              <div className="flex items-center justify-between gap-3">
                <Label className="text-xs font-bold">2º lembrete</Label>
                <Switch checked={d.secondOn} onCheckedChange={set("secondOn")} aria-label="2º lembrete" />
              </div>
              <p className="text-[11px] text-muted-foreground">Se ele não responder nem ao 1º, a IA manda mais um, em outro tom e sem pressão.</p>
              {d.secondOn && (
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <Select value={String(d.secondMinutes)} onValueChange={(v) => set("secondMinutes")(Number(v))}>
                    <SelectTrigger className="h-10 w-32" aria-label="Tempo do 2º lembrete"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Array.from(new Set([...SECOND_INACTIVITY_OPTIONS, d.secondMinutes])).sort((a, b) => a - b).map((m) => (
                        <SelectItem key={m} value={String(m)}>{minutesLabel(m)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <span className="text-muted-foreground">depois do 1º lembrete</span>
                </div>
              )}
            </div>
          </>
        )}
      </AiCard>

      <AiCard
        icon={<MessageCircleHeart className="h-4 w-4 text-pink-600" />}
        title="Follow-ups"
        description="O prazo conta desde a última resposta da IA sem retorno do cliente. Em cada etapa, diga o que a IA deve fazer; ela escreve no tom dela, com o nome, a data pedida e a agenda real."
      >
        {d.steps.map((st, idx) => (
          <div key={idx} className="rounded-xl border border-border/70 bg-muted/30 p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold">Etapa {idx + 1}</span>
              <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" aria-label="Remover etapa"
                onClick={() => setSteps((list) => list.filter((_, i) => i !== idx))}>
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="text-muted-foreground">Enviar depois de</span>
              <Input type="number" min={1} value={st.value} className="h-10 w-20 text-base sm:text-sm" aria-label={`Prazo da etapa ${idx + 1}`}
                onChange={(e) => setSteps((list) => list.map((x, i) => (i === idx ? { ...x, value: Number(e.target.value) } : x)))} />
              <Select value={st.unit} onValueChange={(v) => setSteps((list) => list.map((x, i) => (i === idx ? { ...x, unit: v as "horas" | "dias" } : x)))}>
                <SelectTrigger className="h-10 w-24" aria-label={`Unidade da etapa ${idx + 1}`}><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="horas">horas</SelectItem>
                  <SelectItem value="dias">dias</SelectItem>
                </SelectContent>
              </Select>
              <span className="text-muted-foreground">sem resposta</span>
            </div>
            <Textarea value={st.goal} rows={3} maxLength={600} className="text-base sm:text-sm resize-none" aria-label={`O que a IA faz na etapa ${idx + 1}`}
              placeholder="O que a IA deve fazer nesta mensagem (ex.: convidar para conhecer o espaço)"
              onChange={(e) => setSteps((list) => list.map((x, i) => (i === idx ? { ...x, goal: e.target.value } : x)))} />
            <FollowUpImageUploader
              onUploadingChange={trackUpload}
              value={st.image_url}
              onChange={(url) => setSteps((list) => list.map((x, i) => (i === idx ? { ...x, image_url: url } : x)))}
              companyId={companyId}
              followUpNumber={1}
              fileTag={`bia_etapa${idx + 1}`}
              successText={`A arte vai junto com a etapa ${idx + 1} (a mensagem da IA vira a legenda). Salve para valer.`}
              helpText="Opcional: uma arte (ex.: a assistente, a promoção). A IA escreve a mensagem como legenda. JPG/PNG/WebP até 10MB."
            />
          </div>
        ))}
        {d.steps.length < MAX_FOLLOWUP_STEPS && (
          <Button type="button" variant="outline" size="sm" className="gap-1"
            onClick={() => setSteps((list) => {
              const last = list[list.length - 1];
              const nextHours = last ? joinDelay(last.value, last.unit) + 72 : 72;
              return [...list, { ...splitDelay(nextHours), goal: list.length === 0 ? DEFAULT_STEP_GOALS[0] : "" }];
            })}>
            <Plus className="w-3.5 h-3.5" /> Adicionar etapa
          </Button>
        )}
      </AiCard>

      <AiCard
        icon={<CalendarHeart className="h-4 w-4 text-emerald-600" />}
        title="Festa distante e lembretes antes da festa"
        description='Festa distante, ou cliente que disse "vou pensar" / "é só ano que vem": a IA manda só a 1ª etapa e não insiste. Quem traz o cliente de volta são os lembretes antes da festa.'
      >
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-muted-foreground">Festa distante: mais de</span>
          <Input type="number" min={1} max={12} value={d.farMonths} onChange={(e) => set("farMonths")(Number(e.target.value))} className="h-10 w-16 text-base sm:text-sm" aria-label="Meses para festa distante" />
          <span className="text-muted-foreground">meses</span>
        </div>
        <div className="flex items-center justify-between gap-3 pt-1">
          <Label className="text-xs font-bold">Lembretes antes da festa</Label>
          <Switch checked={d.reactOn} onCheckedChange={set("reactOn")} aria-label="Lembretes antes da festa" />
        </div>
        {d.reactOn && (
          <div className="space-y-2">
            {d.reactDays.map((day, idx) => (
              <div key={idx} className="flex items-center gap-2 text-sm">
                <Input type="number" min={1} max={180} value={day} className="h-10 w-20 text-base sm:text-sm" aria-label={`Lembrete ${idx + 1}`}
                  onChange={(e) => setReactDays((list) => list.map((x, i) => (i === idx ? Number(e.target.value) : x)))} />
                <span className="text-muted-foreground flex-1">dias antes da festa</span>
                <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" aria-label="Remover lembrete"
                  onClick={() => setReactDays((list) => list.filter((_, i) => i !== idx))}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
            {d.reactDays.length < MAX_REACTIVATIONS && (
              <Button type="button" variant="outline" size="sm" className="gap-1"
                onClick={() => setReactDays((list) => {
                  // Próximo lembrete: 15 dias antes do menor, sem repetir
                  let next = list.length === 0 ? 30 : Math.max(1, Math.min(...list) - 15);
                  while (list.includes(next) && next < 180) next++;
                  return [...list, next];
                })}>
                <Plus className="w-3.5 h-3.5" /> Adicionar lembrete
              </Button>
            )}
            <FollowUpImageUploader
              onUploadingChange={trackUpload}
              value={d.reactImage}
              onChange={set("reactImage")}
              companyId={companyId}
              followUpNumber={1}
              fileTag="bia_lembrete"
              successText="A arte vai junto com os lembretes antes da festa. Salve para valer."
              helpText="Opcional: uma arte para os lembretes antes da festa (a mensagem da IA vira a legenda). JPG/PNG/WebP até 10MB."
            />
          </div>
        )}
        <p className="text-[11px] text-muted-foreground">
          {d.reactOn
            ? "A IA escreve com a agenda real: se a data do cliente ainda estiver livre, ela avisa; se foi reservada, oferece outras datas livres perto dela."
            : "Desligado: a IA segue todas as etapas, e quem lembra o cliente perto da festa é a reativação fixa (Mensagens automáticas)."}
        </p>
      </AiCard>

      <AiCard
        icon={<UserX className="h-4 w-4 text-muted-foreground" />}
        title="Mover para Perdido automaticamente"
        action={<Switch checked={d.lostOn} onCheckedChange={set("lostOn")} aria-label="Mover para Perdido automaticamente" />}
        description="Se ainda houver lembrete antes da festa para mandar, o lead espera por ele. Se o cliente voltar a falar depois, a IA continua o atendimento normalmente."
      >
        {d.lostOn && (
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <Input type="number" min={1} value={d.lostHours} onChange={(e) => set("lostHours")(Number(e.target.value))} className="h-10 w-20 text-base sm:text-sm" aria-label="Horas para Perdido" />
            <span className="text-muted-foreground">
              horas {d.steps.length > 0 ? "depois da última mensagem automática" : "depois da última resposta da IA"} sem resposta
              {d.lostHours >= 24 && d.lostHours % 24 === 0 ? ` (${delayLabel(d.lostHours)})` : ""}
            </span>
          </div>
        )}
      </AiCard>

      <SaveBar dirty={dirty} saving={saving} busyText={uploadsBusy > 0 ? "Enviando imagem…" : null} onSave={save} onDiscard={() => saved && setD(saved)} />
    </div>
  );
}
