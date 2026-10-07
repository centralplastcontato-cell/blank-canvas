// Jornada de acompanhamento das conversas da Bia (IA): lembrete de
// inatividade durante a conversa, follow-ups por etapa (a Bia escreve pelo
// objetivo de cada etapa) e perdido automático. Configurado em Configurar IA
// → "Acompanhamento da Bia" (ai_agent_settings.followup_config). Aqui fica só
// a regra de QUANDO cada coisa é devida — sem banco, sem envio.

export interface FollowUpStep {
  delay_hours: number; // horas de silêncio do cliente desde a última resposta da Bia
  goal: string; // o que a Bia deve fazer nessa mensagem
}

export interface AiFollowUpConfig {
  enabled: boolean; // chave geral: desligada = conversas da Bia seguem os follow-ups fixos do número
  since: string | null; // ISO — quando foi ligada: conversas paradas antes disso ficam de fora
  inactivity: { enabled: boolean; minutes: number };
  steps: FollowUpStep[];
  auto_lost: { enabled: boolean; hours: number }; // horas depois da última etapa
}

export const MAX_FOLLOWUP_STEPS = 6;
// Lembrete de inatividade só enquanto a conversa ainda está "quente"
export const INACTIVITY_MAX_SILENCE_MS = 12 * 3600000;
// Duas mensagens automáticas nunca saem com menos que isso entre elas
// (ex.: sistema fora do ar e duas etapas vencidas ao mesmo tempo)
export const MIN_GAP_BETWEEN_FOLLOWUPS_MS = 12 * 3600000;

export const DEFAULT_STEP_GOALS = [
  "Retomar o contato com leveza: perguntar se conseguiu ver as fotos, o vídeo e os pacotes, lembrar da data que ele pediu (se ainda estiver disponível) e convidar para conhecer o espaço.",
  "Última mensagem, gentil e sem pressão: dizer que o contato fica em aberto, lembrar da data dele (só se ainda estiver disponível) e que é só responder aqui quando quiser.",
];

export const DEFAULT_AI_FOLLOWUP: AiFollowUpConfig = {
  enabled: false,
  since: null,
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
  const r = raw as Record<string, any>;
  const inactivity = {
    enabled: r.inactivity ? r.inactivity.enabled === true : DEFAULT_AI_FOLLOWUP.inactivity.enabled,
    minutes: num(r.inactivity?.minutes, DEFAULT_AI_FOLLOWUP.inactivity.minutes, 5, 720),
  };
  const rawSteps = Array.isArray(r.steps) ? r.steps : DEFAULT_AI_FOLLOWUP.steps;
  const steps = rawSteps
    .slice(0, MAX_FOLLOWUP_STEPS)
    .map((s: any, i: number) => ({
      delay_hours: num(s?.delay_hours, DEFAULT_AI_FOLLOWUP.steps[Math.min(i, 1)].delay_hours, 1, 2160),
      goal: String(s?.goal || "").trim().slice(0, 600) || DEFAULT_STEP_GOALS[Math.min(i, DEFAULT_STEP_GOALS.length - 1)],
    }))
    .sort((a: FollowUpStep, b: FollowUpStep) => a.delay_hours - b.delay_hours);
  const auto_lost = {
    enabled: r.auto_lost ? r.auto_lost.enabled === true : DEFAULT_AI_FOLLOWUP.auto_lost.enabled,
    hours: num(r.auto_lost?.hours, DEFAULT_AI_FOLLOWUP.auto_lost.hours, 1, 2160),
  };
  const since = typeof r.since === "string" && !Number.isNaN(Date.parse(r.since)) ? r.since : null;
  return { enabled: r.enabled === true && since !== null, since, inactivity, steps, auto_lost };
}

/** Mensagem da conversa, só com o que a jornada precisa */
export interface JourneyMessage {
  atMs: number;
  fromMe: boolean;
  byAi?: boolean; // enviada pela Bia (metadata.source "ai_agent"); nossa sem isso = equipe
  isMedia?: boolean; // foto/vídeo/PDF
  text?: string;
  followup?: string | null; // "inatividade" | "etapa_1" | "etapa_2" ... (mensagens automáticas da jornada)
}

export type JourneyAction =
  | { kind: "inactivity" }
  | { kind: "step"; index: number }
  | { kind: "lost" };

export interface JourneyPlan {
  action: JourneyAction | null;
  anchorMs: number | null; // última resposta de verdade da Bia (o silêncio conta daqui)
  why: string;
}

const stepIndexOf = (f: string | null | undefined): number | null => {
  const m = String(f || "").match(/^etapa_(\d+)$/);
  return m ? Number(m[1]) - 1 : null;
};

/**
 * O que está devido agora numa conversa da Bia em que o cliente parou de
 * responder. O silêncio conta a partir da última resposta de verdade da Bia
 * (as mensagens automáticas da jornada não reiniciam a contagem); quando o
 * cliente responde, a jornada recomeça do zero.
 */
export function nextJourneyAction(cfg: AiFollowUpConfig, messages: JourneyMessage[], nowMs: number): JourneyPlan {
  const msgs = [...messages].sort((a, b) => a.atMs - b.atMs);
  if (msgs.length === 0) return { action: null, anchorMs: null, why: "sem mensagens" };
  if (!msgs[msgs.length - 1].fromMe) return { action: null, anchorMs: null, why: "cliente falou por último" };
  let lastInbound = -1;
  msgs.forEach((m, i) => { if (!m.fromMe) lastInbound = i; });
  let anchorIdx = -1;
  for (let i = msgs.length - 1; i > lastInbound; i--) {
    if (msgs[i].fromMe && !msgs[i].followup) { anchorIdx = i; break; }
  }
  // Alguém da equipe escreveu depois do cliente: a conversa é dela agora
  if (msgs.slice(lastInbound + 1).some((m) => m.fromMe && m.byAi === false)) {
    return { action: null, anchorMs: null, why: "equipe respondeu" };
  }
  if (anchorIdx < 0) return { action: null, anchorMs: null, why: "sem resposta da Bia depois do cliente" };
  const anchorMs = msgs[anchorIdx].atMs;
  if (!cfg.enabled || !cfg.since) return { action: null, anchorMs, why: "acompanhamento desligado" };
  // Conversa parada antes de ligar o acompanhamento: fica de fora (sem disparo em massa)
  if (anchorMs < Date.parse(cfg.since)) return { action: null, anchorMs, why: "parada antes de ligar o acompanhamento" };
  const after = msgs.slice(anchorIdx + 1).filter((m) => m.fromMe && m.followup);
  const inactivitySent = after.some((m) => m.followup === "inatividade");
  const stepMsgs = after.filter((m) => stepIndexOf(m.followup) !== null);
  const stepsSent = stepMsgs.reduce((n, m) => Math.max(n, (stepIndexOf(m.followup) as number) + 1), 0);
  const lastAutoMs = after.length > 0 ? after[after.length - 1].atMs : null;
  const silence = nowMs - anchorMs;

  if (stepsSent < cfg.steps.length) {
    const step = cfg.steps[stepsSent];
    const gapOk = lastAutoMs === null || nowMs - lastAutoMs >= MIN_GAP_BETWEEN_FOLLOWUPS_MS;
    if (silence >= step.delay_hours * 3600000 && gapOk) {
      return { action: { kind: "step", index: stepsSent }, anchorMs, why: `etapa ${stepsSent + 1} (${step.delay_hours}h sem resposta)` };
    }
    const firstStepMs = cfg.steps[0] ? cfg.steps[0].delay_hours * 3600000 : Infinity;
    // Lembrete só quando a Bia ficou esperando o cliente: depois dos materiais
    // ou de uma pergunta (não depois de "qualquer coisa estou aqui 😊")
    const aiTexts = msgs.slice(lastInbound + 1, anchorIdx + 1).filter((m) => m.fromMe && !m.followup && !m.isMedia);
    const waiting = msgs[anchorIdx].isMedia === true || /\?/.test(aiTexts[aiTexts.length - 1]?.text || "");
    if (
      cfg.inactivity.enabled && !inactivitySent && stepsSent === 0 && waiting &&
      silence >= cfg.inactivity.minutes * 60000 &&
      silence < Math.min(INACTIVITY_MAX_SILENCE_MS, firstStepMs)
    ) {
      return { action: { kind: "inactivity" }, anchorMs, why: `inatividade (${cfg.inactivity.minutes} min sem resposta)` };
    }
    return { action: null, anchorMs, why: "nada devido ainda" };
  }

  // Todas as etapas enviadas (ou nenhuma configurada): perdido automático
  if (cfg.auto_lost.enabled) {
    const since = cfg.steps.length > 0 ? (stepMsgs.length > 0 ? stepMsgs[stepMsgs.length - 1].atMs : anchorMs) : anchorMs;
    if (nowMs - since >= cfg.auto_lost.hours * 3600000) {
      return { action: { kind: "lost" }, anchorMs, why: `perdido (${cfg.auto_lost.hours}h depois da última etapa)` };
    }
  }
  return { action: null, anchorMs, why: "jornada concluída" };
}

/** Rótulo gravado na mensagem automática (metadata.ai_followup) */
export function followupLabel(action: JourneyAction): string | null {
  if (action.kind === "inactivity") return "inatividade";
  if (action.kind === "step") return `etapa_${action.index + 1}`;
  return null;
}

/** Horário de envio das mensagens automáticas (Brasília): 8h às 21h59 */
export function inSendWindowBR(nowMs: number, minHour = 8, maxHour = 22): boolean {
  const h = new Date(nowMs - 3 * 3600000).getUTCHours();
  return h >= minHour && h < maxHour;
}
