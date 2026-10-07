// Acompanhamento da Bia (Configurar IA → Follow-up): lembrete de inatividade,
// follow-ups por etapa (prazo + objetivo; a Bia escreve) e perdido automático.
// Mesmas regras de supabase/functions/_shared/ai-followup.ts (servidor).

export interface FollowUpStep {
  delay_hours: number;
  goal: string;
}

export interface AiFollowUpConfig {
  inactivity: { enabled: boolean; minutes: number };
  steps: FollowUpStep[];
  auto_lost: { enabled: boolean; hours: number };
}

export const MAX_FOLLOWUP_STEPS = 6;
export const INACTIVITY_MINUTE_OPTIONS = [15, 30, 45, 60, 90, 120, 180, 240];

export const DEFAULT_STEP_GOALS = [
  "Retomar o contato com leveza: perguntar se conseguiu ver as fotos, o vídeo e os pacotes, lembrar da data que ele pediu (se ainda estiver disponível) e convidar para conhecer o espaço.",
  "Última mensagem, gentil e sem pressão: dizer que o contato fica em aberto, lembrar da data dele (só se ainda estiver disponível) e que é só responder aqui quando quiser.",
];

export const DEFAULT_AI_FOLLOWUP: AiFollowUpConfig = {
  inactivity: { enabled: true, minutes: 60 },
  steps: [
    { delay_hours: 72, goal: DEFAULT_STEP_GOALS[0] },
    { delay_hours: 288, goal: DEFAULT_STEP_GOALS[1] },
  ],
  auto_lost: { enabled: true, hours: 48 },
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
    inactivity?: { enabled?: unknown; minutes?: unknown };
    steps?: unknown;
    auto_lost?: { enabled?: unknown; hours?: unknown };
  };
  const r = raw as Raw;
  const rawSteps = (Array.isArray(r.steps) ? r.steps : DEFAULT_AI_FOLLOWUP.steps) as Array<{ delay_hours?: unknown; goal?: unknown } | null>;
  return {
    inactivity: {
      enabled: r.inactivity ? r.inactivity.enabled === true : DEFAULT_AI_FOLLOWUP.inactivity.enabled,
      minutes: num(r.inactivity?.minutes, DEFAULT_AI_FOLLOWUP.inactivity.minutes, 5, 720),
    },
    steps: rawSteps
      .slice(0, MAX_FOLLOWUP_STEPS)
      .map((s, i) => ({
        delay_hours: num(s?.delay_hours, DEFAULT_AI_FOLLOWUP.steps[Math.min(i, 1)].delay_hours, 1, 2160),
        goal: String(s?.goal || "").trim().slice(0, 600) || DEFAULT_STEP_GOALS[Math.min(i, DEFAULT_STEP_GOALS.length - 1)],
      }))
      .sort((a: FollowUpStep, b: FollowUpStep) => a.delay_hours - b.delay_hours),
    auto_lost: {
      enabled: r.auto_lost ? r.auto_lost.enabled === true : DEFAULT_AI_FOLLOWUP.auto_lost.enabled,
      hours: num(r.auto_lost?.hours, DEFAULT_AI_FOLLOWUP.auto_lost.hours, 1, 2160),
    },
  };
}

/** Prazo para editar: dias quando dá certinho, senão horas */
export function splitDelay(hours: number): { value: number; unit: "horas" | "dias" } {
  return hours % 24 === 0 ? { value: hours / 24, unit: "dias" } : { value: hours, unit: "horas" };
}

export function joinDelay(value: number, unit: "horas" | "dias"): number {
  const v = Math.max(1, Math.round(Number(value) || 1));
  return unit === "dias" ? v * 24 : v;
}

/** "3 dias" / "36 horas" / "1 dia" */
export function delayLabel(hours: number): string {
  const { value, unit } = splitDelay(hours);
  if (value === 1) return unit === "dias" ? "1 dia" : "1 hora";
  return `${value} ${unit}`;
}

/** Problema para mostrar ao salvar (null = ok) */
export function followUpConfigProblem(cfg: AiFollowUpConfig): string | null {
  if (cfg.steps.some((s) => !s.goal.trim())) return "Escreva o objetivo de cada etapa.";
  const delays = cfg.steps.map((s) => s.delay_hours);
  if (new Set(delays).size !== delays.length) return "Duas etapas estão com o mesmo prazo.";
  return null;
}
