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
  auto_lost: { enabled: boolean; hours: number }; // horas depois da última mensagem automática
  // Festa a mais de X meses (ou cliente que disse "vou pensar / só ano que vem"):
  // só a 1ª etapa e espera os lembretes antes da festa
  far_months: number;
  // Lembretes antes da festa (a Bia escreve com a agenda real): dias antes da data
  reactivation: { enabled: boolean; days_before: number[] };
}

export const MAX_FOLLOWUP_STEPS = 6;
// Lembrete de inatividade só enquanto a conversa ainda está "quente"
export const INACTIVITY_MAX_SILENCE_MS = 12 * 3600000;
// Duas mensagens automáticas nunca saem com menos que isso entre elas
// (ex.: sistema fora do ar e duas etapas vencidas ao mesmo tempo)
export const MIN_GAP_BETWEEN_FOLLOWUPS_MS = 12 * 3600000;

export const DEFAULT_STEP_GOALS = [
  "Convidar para conhecer o espaço, oferecendo 2 horários de visita, de forma leve.",
  "Lembrar da data dele (se ainda estiver disponível) e da promoção, se houver, com o prazo real. Perguntar se ficou alguma dúvida.",
  "Despedida gentil e sem pressão: o contato fica em aberto e é só responder aqui quando quiser.",
];
export const MAX_REACTIVATIONS = 3;
const DAY_MS = 86400000;
// Lembrete antes da festa que passou do dia (sistema fora do ar) por mais que isso não sai mais
const REACTIVATION_STALE_MS = 7 * DAY_MS;
// Lembrete antes da festa só com essa folga depois da última etapa (nada de mensagens coladas)
const REMINDER_BUFFER_MS = 10 * DAY_MS;

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
  const r = raw as Record<string, any>;
  const inactivity = {
    enabled: r.inactivity ? r.inactivity.enabled === true : DEFAULT_AI_FOLLOWUP.inactivity.enabled,
    minutes: num(r.inactivity?.minutes, DEFAULT_AI_FOLLOWUP.inactivity.minutes, 5, 720),
  };
  const rawSteps = Array.isArray(r.steps) ? r.steps : DEFAULT_AI_FOLLOWUP.steps;
  const steps = rawSteps
    .slice(0, MAX_FOLLOWUP_STEPS)
    .map((s: any, i: number) => ({
      delay_hours: num(s?.delay_hours, DEFAULT_AI_FOLLOWUP.steps[Math.min(i, DEFAULT_AI_FOLLOWUP.steps.length - 1)].delay_hours, 1, 2160),
      goal: String(s?.goal || "").trim().slice(0, 600) || DEFAULT_STEP_GOALS[Math.min(i, DEFAULT_STEP_GOALS.length - 1)],
    }))
    .sort((a: FollowUpStep, b: FollowUpStep) => a.delay_hours - b.delay_hours);
  const auto_lost = {
    enabled: r.auto_lost ? r.auto_lost.enabled === true : DEFAULT_AI_FOLLOWUP.auto_lost.enabled,
    hours: num(r.auto_lost?.hours, DEFAULT_AI_FOLLOWUP.auto_lost.hours, 1, 2160),
  };
  const since = typeof r.since === "string" && !Number.isNaN(Date.parse(r.since)) ? r.since : null;
  const far_months = num(r.far_months, DEFAULT_AI_FOLLOWUP.far_months, 1, 12);
  const rawDays = Array.isArray(r.reactivation?.days_before) ? r.reactivation.days_before : DEFAULT_AI_FOLLOWUP.reactivation.days_before;
  const reactivation = {
    enabled: r.reactivation ? r.reactivation.enabled === true : DEFAULT_AI_FOLLOWUP.reactivation.enabled,
    days_before: [...new Set((rawDays as unknown[]).map((d) => num(d, 30, 1, 180)))].sort((a, b) => b - a).slice(0, MAX_REACTIVATIONS),
  };
  return { enabled: r.enabled === true && since !== null, since, inactivity, steps, auto_lost, far_months, reactivation };
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
  | { kind: "reactivation"; daysBefore: number }
  | { kind: "lost" };

/** O que a jornada sabe da festa (para festa distante e lembretes antes da data) */
export interface JourneyContext {
  dataFesta: unknown; // bot_data.data_festa (AAAA-MM-DD)
  mes: unknown; // bot_data.mes ("Março")
  clientTexts: string[]; // últimas mensagens do cliente (até a parada)
}

export interface JourneyPlan {
  action: JourneyAction | null;
  anchorMs: number | null; // última resposta de verdade da Bia (o silêncio conta daqui)
  why: string;
  party?: { ymd: string; exact: boolean } | null; // data da festa usada (exata ou aproximada pelo mês)
  nextDueMs?: number | null; // próximo lembrete antes da festa agendado (para achar a conversa depois)
}

const stepIndexOf = (f: string | null | undefined): number | null => {
  const m = String(f || "").match(/^etapa_(\d+)$/);
  return m ? Number(m[1]) - 1 : null;
};
const reactivationDaysOf = (f: string | null | undefined): number | null => {
  const m = String(f || "").match(/^reativacao_(\d+)$/);
  return m ? Number(m[1]) : null;
};
// Meio-dia de Brasília do dia da festa
const partyMs = (ymd: string) => Date.parse(`${ymd}T12:00:00-03:00`);

const MONTHS_PT = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];

/**
 * Data da festa para a jornada: a exata (bot_data.data_festa) ou, só com o
 * mês, o dia 15 da próxima vez que esse mês chega A PARTIR DE `refYmd` (o dia
 * em que a conversa parou — não "hoje", para não pular de ano depois). Ano
 * dito pelo cliente ("2027", "ano que vem") vale mais.
 */
export function partyReference(dataFesta: unknown, mes: unknown, refYmd: string, yearHint: number | null = null): { ymd: string; exact: boolean } | null {
  if (typeof dataFesta === "string" && /^\d{4}-\d{2}-\d{2}$/.test(dataFesta)) return { ymd: dataFesta, exact: true };
  const t = String(mes || "").trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  if (!t) return null;
  const idx = MONTHS_PT.findIndex((m) => t.startsWith(m.normalize("NFD").replace(/[\u0300-\u036f]/g, "").slice(0, 3)));
  if (idx < 0) return null;
  const [ry, rm] = refYmd.split("-").map(Number);
  const yearInText = t.match(/(20\d{2})|\/(\d{2})\b/);
  const year = yearInText
    ? Number(yearInText[1] || `20${yearInText[2]}`)
    : yearHint && yearHint >= ry
    ? yearHint
    : (idx + 1 >= rm ? ry : ry + 1);
  return { ymd: `${year}-${String(idx + 1).padStart(2, "0")}-15`, exact: false };
}

/** Ano que o cliente falou: "em 2027" ou "ano que vem" (relativo a refYmd) */
export function yearHintFrom(clientTexts: string[], refYmd: string): number | null {
  const ry = Number(refYmd.slice(0, 4));
  for (const t of [...clientTexts].reverse()) {
    const y = t.match(/\b(20\d{2})\b/);
    if (y && Number(y[1]) >= ry && Number(y[1]) <= ry + 2) return Number(y[1]);
    if (/ano que vem|pr[óo]ximo ano/i.test(t)) return ry + 1;
  }
  return null;
}

// "vou pensar", "é só ano que vem", "mais pra frente", "vou ver com meu marido"...
const POSTPONE = /vou pensar|pensar (?:com calma|melhor|direitinho)|mais (?:pra|para) frente|(?:festa|anivers[áa]rio)[^.?!]{0,30}(?:ano que vem|pr[óo]ximo ano)|(?:s[óo]|somente|apenas) (?:no |pro |para o )?(?:ano que vem|pr[óo]ximo ano)|ainda (?:t[áa]|est[áa]|[ée]) (?:muito )?cedo/i;

/** O cliente sinalizou que não vai decidir agora? (últimas mensagens dele) */
export function clientPostponed(clientTexts: string[]): boolean {
  return clientTexts.some((t) => POSTPONE.test(t));
}

/**
 * O que está devido agora numa conversa da Bia em que o cliente parou de
 * responder. O silêncio conta a partir da última resposta de verdade da Bia
 * (as mensagens automáticas da jornada não reiniciam a contagem); quando o
 * cliente responde, a jornada recomeça do zero.
 */
/**
 * A jornada da Bia é dona desta conversa? (acompanhamento ligado, a última
 * resposta da Bia é de depois de ligar e ninguém da equipe falou depois do
 * cliente). Só assim os follow-ups fixos do número pulam a conversa — senão
 * ela continua recebendo os fixos, como antes.
 */
export function journeyOwns(cfg: AiFollowUpConfig, messages: JourneyMessage[]): boolean {
  const plan = nextJourneyAction(cfg, messages, Number.MAX_SAFE_INTEGER);
  return plan.anchorMs !== null && !OUTSIDE_REASONS.has(plan.why);
}
const OUTSIDE_REASONS = new Set(["acompanhamento desligado", "parada antes de ligar o acompanhamento"]);

export function nextJourneyAction(cfg: AiFollowUpConfig, messages: JourneyMessage[], nowMs: number, ctx?: JourneyContext): JourneyPlan {
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
  const gapOk = lastAutoMs === null || nowMs - lastAutoMs >= MIN_GAP_BETWEEN_FOLLOWUPS_MS;

  // Data da festa, medida a partir do dia em que a conversa parou
  const anchorYmd = new Date(anchorMs - 3 * 3600000).toISOString().slice(0, 10);
  const clientTexts = ctx?.clientTexts || [];
  const partyRef = ctx ? partyReference(ctx.dataFesta, ctx.mes, anchorYmd, yearHintFrom(clientTexts, anchorYmd)) : null;
  const party = partyRef ? partyMs(partyRef.ymd) : null;
  const base = { anchorMs, party: partyRef };
  // Festa com data exata que já passou: perdido — mas só depois do silêncio
  // do perdido automático (nunca no meio de uma conversa)
  if (party !== null && partyRef?.exact && party < nowMs - DAY_MS / 2) {
    if (cfg.auto_lost.enabled && silence >= cfg.auto_lost.hours * 3600000) {
      return { ...base, action: { kind: "lost" }, why: "a data da festa já passou" };
    }
    return { ...base, action: null, why: "a data da festa já passou" };
  }
  // Lembretes antes da festa que ainda cabem (depois das etapas, com folga)
  const reminderPoints = cfg.reactivation.enabled && party !== null
    ? cfg.reactivation.days_before.map((d) => ({ d, at: party - d * DAY_MS })).sort((a, b) => a.at - b.at)
    : [];
  // Festa distante (medida quando a conversa parou) ou cliente que vai decidir
  // depois: só a 1ª etapa — mas só quando há lembrete antes da festa marcado
  // para depois; sem lembrete, segue todas as etapas
  const distant = clientPostponed(clientTexts) || (party !== null && party - anchorMs > cfg.far_months * 30 * DAY_MS);
  const firstStepEnd = anchorMs + (cfg.steps[0]?.delay_hours || 0) * 3600000;
  const reminderAhead = reminderPoints.some((p) => p.at > firstStepEnd + REMINDER_BUFFER_MS);
  const steps = distant && reminderAhead ? cfg.steps.slice(0, 1) : cfg.steps;

  if (stepsSent < steps.length) {
    const step = steps[stepsSent];
    if (silence >= step.delay_hours * 3600000 && gapOk) {
      return { ...base, action: { kind: "step", index: stepsSent }, why: `etapa ${stepsSent + 1} (${step.delay_hours}h sem resposta)` };
    }
    const firstStepMs = steps[0] ? steps[0].delay_hours * 3600000 : Infinity;
    // Lembrete só quando a Bia ficou esperando o cliente: depois dos materiais
    // ou de uma pergunta (não depois de "qualquer coisa estou aqui 😊")
    const aiTexts = msgs.slice(lastInbound + 1, anchorIdx + 1).filter((m) => m.fromMe && !m.followup && !m.isMedia);
    const waiting = msgs[anchorIdx].isMedia === true || /\?/.test(aiTexts[aiTexts.length - 1]?.text || "");
    if (
      cfg.inactivity.enabled && !inactivitySent && stepsSent === 0 && waiting &&
      silence >= cfg.inactivity.minutes * 60000 &&
      silence < Math.min(INACTIVITY_MAX_SILENCE_MS, firstStepMs)
    ) {
      return { ...base, action: { kind: "inactivity" }, why: `inatividade (${cfg.inactivity.minutes} min sem resposta)` };
    }
    return { ...base, action: null, why: "nada devido ainda" };
  }

  // Etapas concluídas: lembretes antes da festa (60 e 30 dias antes, por exemplo)
  if (reminderPoints.length > 0) {
    const sentDays = new Set(after.map((m) => reactivationDaysOf(m.followup)).filter((d): d is number => d !== null));
    const stepsEndMs = stepMsgs.length > 0 ? stepMsgs[stepMsgs.length - 1].atMs : anchorMs;
    for (const p of reminderPoints) {
      if (sentDays.has(p.d)) continue;
      // Colado demais na última etapa (ex.: logo depois da despedida): pula
      if (p.at <= stepsEndMs + REMINDER_BUFFER_MS) continue;
      if (nowMs < p.at) return { ...base, action: null, why: `aguardando o lembrete de ${p.d} dias antes da festa`, nextDueMs: p.at };
      if (nowMs - p.at > REACTIVATION_STALE_MS) continue; // passou do dia há muito tempo
      if (!gapOk) return { ...base, action: null, why: "intervalo mínimo entre mensagens", nextDueMs: p.at };
      return { ...base, action: { kind: "reactivation", daysBefore: p.d }, why: `lembrete ${p.d} dias antes da festa` };
    }
  }

  // Nada mais a mandar: perdido automático depois da última mensagem automática
  if (cfg.auto_lost.enabled) {
    const autoMsgs = after.filter((m) => stepIndexOf(m.followup) !== null || reactivationDaysOf(m.followup) !== null);
    const since = autoMsgs.length > 0 ? autoMsgs[autoMsgs.length - 1].atMs : anchorMs;
    if (nowMs - since >= cfg.auto_lost.hours * 3600000) {
      return { ...base, action: { kind: "lost" }, why: `perdido (${cfg.auto_lost.hours}h depois da última mensagem)` };
    }
  }
  return { ...base, action: null, why: "jornada concluída" };
}

/** Rótulo gravado na mensagem automática (metadata.ai_followup) */
export function followupLabel(action: JourneyAction): string | null {
  if (action.kind === "inactivity") return "inatividade";
  if (action.kind === "step") return `etapa_${action.index + 1}`;
  if (action.kind === "reactivation") return `reativacao_${action.daysBefore}`;
  return null;
}

/** Horário de envio das mensagens automáticas (Brasília): 8h às 21h59 */
export function inSendWindowBR(nowMs: number, minHour = 8, maxHour = 22): boolean {
  const h = new Date(nowMs - 3 * 3600000).getUTCHours();
  return h >= minHour && h < maxHour;
}
