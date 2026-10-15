// Ritmo dos envios que o SISTEMA inicia nos números da Evolution (15/10, depois
// do bloqueio do VENDAS 2): follow-ups, jornada da IA, reativação, campanhas,
// confirmações de visita e avisos de pré-reserva.
//   - uma mensagem a cada 60–180 s (aleatório) por número
//   - teto por dia por número (VENDAS 2: 40/dia nas 2 semanas depois do bloqueio)
//   - só das 9h às 20h (horário de Brasília)
// Respostas a quem mandou mensagem (IA, robô, equipe) não passam por aqui e
// seguem no intervalo normal (8–15 s). Números da Z-API ficam como estavam.
//
// O estado fica em provider_health, chave "pacing:<wapi_instances.id>":
// lock_until = quando o próximo envio do sistema pode sair; detail = {day, count}.

// deno-lint-ignore no-explicit-any
type SB = any;

export const SYSTEM_SEND_MIN_S = 60;
export const SYSTEM_SEND_MAX_S = 180;
export const SYSTEM_SEND_START_HOUR_BR = 9;
export const SYSTEM_SEND_END_HOUR_BR = 20;
export const SYSTEM_DAILY_CAP_DEFAULT = 80; // VENDAS 1 e demais números da Evolution

const VENDAS_2 = "3f39419e-e7f5-4c3b-8ebd-1703e6c7a0c7";
/** Tetos especiais por número, com validade (vale o primeiro ainda válido; depois volta ao padrão) */
export const SYSTEM_DAILY_CAPS: Array<{ instanceRowId: string; cap: number; untilIso: string }> = [
  // VENDAS 2 saiu do bloqueio em 15/10: sobe aos poucos — 20/dia até 18/10,
  // 40/dia até 22/10, depois o padrão
  { instanceRowId: VENDAS_2, cap: 20, untilIso: "2026-10-19T03:00:00Z" },
  { instanceRowId: VENDAS_2, cap: 40, untilIso: "2026-10-23T03:00:00Z" },
];

const BR_OFFSET_MS = 3 * 3600 * 1000; // Brasília, sem horário de verão

export function systemDailyCap(instanceRowId: string, nowMs: number): number {
  const special = SYSTEM_DAILY_CAPS.find((c) => c.instanceRowId === instanceRowId && nowMs < Date.parse(c.untilIso));
  return special ? special.cap : SYSTEM_DAILY_CAP_DEFAULT;
}

/** Dia em Brasília (AAAA-MM-DD): o contador do teto zera à meia-noite */
export function brDayKey(nowMs: number): string {
  return new Date(nowMs - BR_OFFSET_MS).toISOString().slice(0, 10);
}

export function inSystemSendWindow(nowMs: number): boolean {
  const h = new Date(nowMs - BR_OFFSET_MS).getUTCHours();
  return h >= SYSTEM_SEND_START_HOUR_BR && h < SYSTEM_SEND_END_HOUR_BR;
}

export interface PacingState {
  nextAt: string | null;
  day: string | null;
  count: number;
}

export type PacingDecision =
  | { ok: true; nextAt: string; day: string; count: number }
  | { ok: false; reason: string };

/** Pode sair agora um envio do sistema por este número? (rand ∈ [0,1) sorteia o intervalo seguinte) */
export function decideSystemSend(state: PacingState, cap: number, nowMs: number, rand: number): PacingDecision {
  if (!inSystemSendWindow(nowMs)) return { ok: false, reason: `fora do horário (${SYSTEM_SEND_START_HOUR_BR}h–${SYSTEM_SEND_END_HOUR_BR}h)` };
  if (cap <= 0) return { ok: false, reason: "envios do sistema pausados neste número" };
  const day = brDayKey(nowMs);
  const count = state.day === day ? state.count : 0;
  if (count >= cap) return { ok: false, reason: `limite do dia (${cap})` };
  if (state.nextAt && Date.parse(state.nextAt) > nowMs) {
    return { ok: false, reason: `intervalo entre envios (libera em ${Math.ceil((Date.parse(state.nextAt) - nowMs) / 1000)}s)` };
  }
  const gapS = SYSTEM_SEND_MIN_S + Math.floor(rand * (SYSTEM_SEND_MAX_S - SYSTEM_SEND_MIN_S + 1));
  return { ok: true, nextAt: new Date(nowMs + gapS * 1000).toISOString(), day, count: count + 1 };
}

export interface PacedInstance {
  id: string;
  provider?: string | null;
  unit?: string | null;
}

export type SystemSendSlot = { ok: true; paced: boolean } | { ok: false; reason: string };

const pacingKey = (instanceRowId: string) => `pacing:${instanceRowId}`;

function readState(row: { lock_until?: string | null; detail?: Record<string, unknown> | null } | null): PacingState {
  const d = (row?.detail || {}) as Record<string, unknown>;
  return { nextAt: row?.lock_until ?? null, day: typeof d.day === "string" ? d.day : null, count: Number(d.count) || 0 };
}

/** Só consulta (não gasta a vez): para não escrever/gerar a mensagem à toa */
export async function peekSystemSend(supabase: SB, inst: PacedInstance, nowMs = Date.now()): Promise<SystemSendSlot> {
  if (inst.provider !== "evolution") return { ok: true, paced: false };
  const { data, error } = await supabase.from("provider_health").select("lock_until, detail").eq("key", pacingKey(inst.id)).maybeSingle();
  if (error) return { ok: false, reason: `ritmo indisponível (${error.message})` };
  const d = decideSystemSend(readState(data), systemDailyCap(inst.id, nowMs), nowMs, 0);
  return d.ok ? { ok: true, paced: true } : { ok: false, reason: d.reason };
}

/**
 * Pega a vez de UM envio do sistema por este número (chamar logo antes de
 * enviar). Se não der, o envio fica para a próxima rodada. Na dúvida (erro no
 * banco), não envia.
 */
export async function claimSystemSendSlot(supabase: SB, inst: PacedInstance, nowMs = Date.now()): Promise<SystemSendSlot> {
  if (inst.provider !== "evolution") return { ok: true, paced: false };
  const key = pacingKey(inst.id);
  await supabase.from("provider_health").upsert({ key, instance_id: inst.id }, { onConflict: "key", ignoreDuplicates: true });
  const { data: row, error } = await supabase.from("provider_health").select("lock_until, detail").eq("key", key).maybeSingle();
  if (error) return { ok: false, reason: `ritmo indisponível (${error.message})` };
  const d = decideSystemSend(readState(row), systemDailyCap(inst.id, nowMs), nowMs, Math.random());
  if (!d.ok) return { ok: false, reason: d.reason };
  // Só um processo leva a vez: a condição em lock_until falha para quem chegar depois
  const nowIso = new Date(nowMs).toISOString();
  const { data: won, error: upErr } = await supabase.from("provider_health")
    .update({ lock_until: d.nextAt, detail: { ...(row?.detail || {}), day: d.day, count: d.count, last_at: nowIso }, updated_at: nowIso })
    .eq("key", key).or(`lock_until.is.null,lock_until.lte."${nowIso}"`).select("key");
  if (upErr) return { ok: false, reason: `ritmo indisponível (${upErr.message})` };
  if (!Array.isArray(won) || won.length === 0) return { ok: false, reason: "outro envio do sistema acabou de sair por este número" };
  console.log(`[system-pacing] ${inst.unit || inst.id}: envio ${d.count}/${systemDailyCap(inst.id, nowMs)} do dia; próximo a partir de ${d.nextAt}`);
  return { ok: true, paced: true };
}
