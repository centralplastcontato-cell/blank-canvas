// Acompanhamento da Bia (Configurar IA → Follow-up): lembrete de inatividade,
// follow-ups por etapa (prazo + objetivo; a Bia escreve) e perdido automático.
// Mesmas regras de supabase/functions/_shared/ai-followup.ts (servidor).

export interface FollowUpStep {
  delay_hours: number;
  goal: string;
}

export interface AiFollowUpConfig {
  enabled: boolean; // desligado = conversas da Bia seguem os follow-ups fixos do número
  since: string | null; // quando foi ligado (conversas paradas antes ficam de fora)
  inactivity: { enabled: boolean; minutes: number };
  steps: FollowUpStep[];
  auto_lost: { enabled: boolean; hours: number };
  far_months: number; // festa a mais de X meses: só a 1ª etapa e espera os lembretes antes da festa
  reactivation: { enabled: boolean; days_before: number[] }; // lembretes X dias antes da festa
}

export const MAX_FOLLOWUP_STEPS = 6;
export const INACTIVITY_MINUTE_OPTIONS = [15, 30, 45, 60, 90, 120, 180, 240];

export const DEFAULT_STEP_GOALS = [
  "Convidar para conhecer o espaço, oferecendo 2 horários de visita, de forma leve.",
  "Lembrar da data dele (se ainda estiver disponível) e da promoção, se houver, com o prazo real. Perguntar se ficou alguma dúvida.",
  "Despedida gentil e sem pressão: o contato fica em aberto e é só responder aqui quando quiser.",
];
export const MAX_REACTIVATIONS = 3;

export const DEFAULT_AI_FOLLOWUP: AiFollowUpConfig = {
  enabled: false,
  since: null,
  inactivity: { enabled: true, minutes: 60 },
  steps: [
    { delay_hours: 24, goal: DEFAULT_STEP_GOALS[0] },
    { delay_hours: 96, goal: DEFAULT_STEP_GOALS[1] },
    { delay_hours: 240, goal: DEFAULT_STEP_GOALS[2] },
  ],
  auto_lost: { enabled: true, hours: 48 },
  far_months: 3,
  reactivation: { enabled: true, days_before: [60, 30] },
};

const num = (v: unknown, def: number, min: number, max: number): number => {
  const n = Number(v);
  if (!Number.isFinite(n)) return def;
  return Math.min(max, Math.max(min, Math.round(n)));
};

/** Configuração salva (ou vazia) → configuração válida, com limites e etapas em ordem */
export function normalizeFollowUpConfig(raw: unknown): AiFollowUpConfig {
  if (!raw || typeof raw !== "object") return structuredClone(DEFAULT_AI_FOLLOWUP);
  type Raw = {
    enabled?: unknown;
    since?: unknown;
    inactivity?: { enabled?: unknown; minutes?: unknown };
    steps?: unknown;
    auto_lost?: { enabled?: unknown; hours?: unknown };
    far_months?: unknown;
    reactivation?: { enabled?: unknown; days_before?: unknown };
  };
  const r = raw as Raw;
  const rawSteps = (Array.isArray(r.steps) ? r.steps : DEFAULT_AI_FOLLOWUP.steps) as Array<{ delay_hours?: unknown; goal?: unknown } | null>;
  const since = typeof r.since === "string" && !Number.isNaN(Date.parse(r.since)) ? r.since : null;
  return {
    enabled: r.enabled === true && since !== null,
    since,
    inactivity: {
      enabled: r.inactivity ? r.inactivity.enabled === true : DEFAULT_AI_FOLLOWUP.inactivity.enabled,
      minutes: num(r.inactivity?.minutes, DEFAULT_AI_FOLLOWUP.inactivity.minutes, 5, 720),
    },
    steps: rawSteps
      .slice(0, MAX_FOLLOWUP_STEPS)
      .map((s, i) => ({
        delay_hours: num(s?.delay_hours, DEFAULT_AI_FOLLOWUP.steps[Math.min(i, DEFAULT_AI_FOLLOWUP.steps.length - 1)].delay_hours, 1, 2160),
        goal: String(s?.goal || "").trim().slice(0, 600) || DEFAULT_STEP_GOALS[Math.min(i, DEFAULT_STEP_GOALS.length - 1)],
      }))
      .sort((a: FollowUpStep, b: FollowUpStep) => a.delay_hours - b.delay_hours),
    auto_lost: {
      enabled: r.auto_lost ? r.auto_lost.enabled === true : DEFAULT_AI_FOLLOWUP.auto_lost.enabled,
      hours: num(r.auto_lost?.hours, DEFAULT_AI_FOLLOWUP.auto_lost.hours, 1, 2160),
    },
    far_months: num(r.far_months, DEFAULT_AI_FOLLOWUP.far_months, 1, 12),
    reactivation: {
      enabled: r.reactivation ? r.reactivation.enabled === true : DEFAULT_AI_FOLLOWUP.reactivation.enabled,
      days_before: [...new Set(
        (Array.isArray(r.reactivation?.days_before) ? r.reactivation!.days_before as unknown[] : DEFAULT_AI_FOLLOWUP.reactivation.days_before)
          .map((d) => num(d, 30, 1, 180)),
      )].sort((a, b) => b - a).slice(0, MAX_REACTIVATIONS),
    },
  };
}

/** Prazo para editar: dias quando dá certinho, senão horas */
export function splitDelay(hours: number): { value: number; unit: "horas" | "dias" } {
  return hours % 24 === 0 ? { value: hours / 24, unit: "dias" } : { value: hours, unit: "horas" };
}

/** Prazo digitado → horas (0/vazio continua 0, para a validação avisar) */
export function joinDelay(value: number, unit: "horas" | "dias"): number {
  const v = Math.round(Number(value) || 0);
  return unit === "dias" ? v * 24 : v;
}

/** "3 dias" / "36 horas" / "1 dia" */
export function delayLabel(hours: number): string {
  const { value, unit } = splitDelay(hours);
  if (value === 1) return unit === "dias" ? "1 dia" : "1 hora";
  return `${value} ${unit}`;
}

export const MAX_DELAY_HOURS = 2160; // 90 dias

/** Problema para mostrar ao salvar (null = ok) */
export function followUpConfigProblem(cfg: AiFollowUpConfig): string | null {
  if (cfg.steps.some((s) => !s.goal.trim())) return "Escreva o objetivo de cada etapa.";
  if (cfg.steps.some((s) => !Number.isFinite(s.delay_hours) || s.delay_hours < 1 || s.delay_hours > MAX_DELAY_HOURS)) {
    return "O prazo de cada etapa precisa ser de pelo menos 1 hora e no máximo 90 dias.";
  }
  if (cfg.auto_lost.enabled && (!Number.isFinite(cfg.auto_lost.hours) || cfg.auto_lost.hours < 1 || cfg.auto_lost.hours > MAX_DELAY_HOURS)) {
    return "O prazo para mover para Perdido precisa ser de pelo menos 1 hora e no máximo 2160 horas (90 dias).";
  }
  if (!Number.isFinite(cfg.far_months) || cfg.far_months < 1 || cfg.far_months > 12) {
    return "Festa distante: escolha entre 1 e 12 meses.";
  }
  if (cfg.reactivation.enabled && cfg.reactivation.days_before.some((d) => !Number.isFinite(d) || d < 1 || d > 180)) {
    return "Lembretes antes da festa: cada um precisa ser de 1 a 180 dias antes.";
  }
  if (cfg.reactivation.enabled && new Set(cfg.reactivation.days_before).size !== cfg.reactivation.days_before.length) {
    return "Lembretes antes da festa: dois lembretes estão com o mesmo número de dias.";
  }
  const delays = cfg.steps.map((s) => s.delay_hours);
  if (new Set(delays).size !== delays.length) return "Duas etapas estão com o mesmo prazo.";
  return null;
}
