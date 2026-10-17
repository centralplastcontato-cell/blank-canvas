// Proteção das chamadas à Evolution Go (incidente VENDAS 1, 13/10 18:47):
// depois de um "Disconnected" a Evolution reconecta sozinha em ~3 s. Uma
// chamada nossa nesse meio-tempo (/instance/status, /user/check, reconnect)
// reabre o cliente e cria uma 2ª conexão do mesmo aparelho → "StreamReplaced"
// e a sessão cai, exigindo QR. Regras:
//   1) evento de conexão daquele número nos últimos 2 min → não chama nada
//   2) uma chamada por vez por número (trava em provider_health.lock_until)

import { setEvolutionCallGuard } from "./evolution.ts";

// deno-lint-ignore no-explicit-any
type SB = any;

export const EVENT_QUIET_MS = 2 * 60 * 1000;

// ATÉ SEGUNDA ORDEM (15/10): números bloqueados pelo WhatsApp. Consultar uma
// instância deslogada reinicia o ciclo de QR e cada ciclo vaza conexões no
// banco da Evolution (esgotou de novo em 14/10 19:28 e derrubou o VENDAS 1).
// Nada automático consulta a Evolution sobre eles (monitor nem tela de Conexão)
// e os alertas saem só pela Z-API.
// VENDAS 2 saiu da pausa em 15/10 (liberado pelo WhatsApp): respostas e
// monitor normais; os envios do sistema seguem pausados em system-send-pacing.ts.
export const PAUSED_INSTANCE_ROW_IDS = new Set<string>([]);
export const CELEBREI_GO_PAUSED = true; // 15 97400-0152 bloqueado: sem consultas e sem enviar alertas por ela

export const CONNECTION_EVENTS = [
  "Connected", "PairSuccess", "KeepAliveRestored",
  "Disconnected", "StreamReplaced", "ConnectFailure", "KeepAliveTimeout", "StreamError", "TemporaryBan",
  "LoggedOut", "ClientOutdated",
];

const ONLINE_EVENTS = new Set(["Connected", "PairSuccess", "KeepAliveRestored"]);
const LOGGED_OUT_EVENTS = new Set(["LoggedOut", "ClientOutdated"]);

export interface RecentEvent {
  event: string;
  at: string;
  /** O que o evento diz do número (sem perguntar à Evolution) */
  hint: "online" | "reconnecting" | "needs_qr";
}

/** Último evento de conexão do número nos últimos 2 min (null = pode chamar a Evolution) */
export async function recentConnectionEvent(supabase: SB, externalInstanceId: string, nowMs = Date.now()): Promise<RecentEvent | null> {
  const since = new Date(nowMs - EVENT_QUIET_MS).toISOString();
  const { data, error } = await supabase.from("wapi_webhook_raw_events").select("event_type, received_at")
    .eq("instance_id", externalInstanceId).in("event_type", CONNECTION_EVENTS).gte("received_at", since)
    .order("received_at", { ascending: false }).limit(1);
  if (error || !data || !data[0]) return null;
  const event = String(data[0].event_type);
  return { event, at: data[0].received_at, hint: eventHint(event) };
}

// ─── Queda vista só pelos eventos (16/10, VENDAS 1 e VENDAS 2) ─────────────
// Número deslogado fica num ciclo de QR que manda "LoggedOut" a cada ~2 min
// (e, no VENDAS 1, "Disconnected"/"LoggedOut" a cada poucos segundos por 4 h).
// Com isso a janela de 2 min sem chamadas nunca acabava: o monitor nunca
// consultava o número e o alerta não saía. A queda agora é lida dos próprios
// eventos, sem chamar a Evolution.

/** Eventos que mostram o número vivo (conectou ou está trocando mensagens) */
const ALIVE_EVENTS = [...ONLINE_EVENTS, "Message", "Receipt"];
/** Quanto tempo caindo e voltando sem nenhum sinal de vida até avisar (sem "LoggedOut") */
export const DOWN_STREAK_ALERT_MS = 10 * 60 * 1000;
const STREAK_LOOKBACK_MS = 24 * 3600 * 1000;

export interface DownStreak {
  /** Primeiro evento de queda depois do último sinal de vida */
  since: string;
  /** Veio "LoggedOut"/"ClientOutdated" nessa sequência: a sessão acabou, só o QR resolve */
  loggedOut: boolean;
}

/** Queda em andamento segundo os eventos (null = o último sinal foi de vida, ou não há queda) */
export async function currentDownStreak(supabase: SB, externalInstanceId: string, nowMs = Date.now()): Promise<DownStreak | null> {
  const lookback = new Date(nowMs - STREAK_LOOKBACK_MS).toISOString();
  const { data: alive } = await supabase.from("wapi_webhook_raw_events").select("received_at")
    .eq("instance_id", externalInstanceId).in("event_type", ALIVE_EVENTS).gte("received_at", lookback)
    .order("received_at", { ascending: false }).limit(1);
  const after = alive && alive[0] ? alive[0].received_at : lookback;
  const { data: first } = await supabase.from("wapi_webhook_raw_events").select("received_at")
    .eq("instance_id", externalInstanceId).in("event_type", DOWN_EVENTS).gt("received_at", after)
    .order("received_at", { ascending: true }).limit(1);
  if (!first || !first[0]) return null;
  const { data: lo } = await supabase.from("wapi_webhook_raw_events").select("received_at")
    .eq("instance_id", externalInstanceId).in("event_type", [...LOGGED_OUT_EVENTS]).gt("received_at", after).limit(1);
  return { since: first[0].received_at, loggedOut: !!(lo && lo[0]) };
}

/** A queda pelos eventos já justifica o alerta? (sessão encerrada: na hora; caindo e voltando: depois de 10 min) */
export function streakNeedsAlert(streak: DownStreak | null, nowMs: number): boolean {
  if (!streak) return false;
  return streak.loggedOut || nowMs - Date.parse(streak.since) >= DOWN_STREAK_ALERT_MS;
}

export function eventHint(event: string): RecentEvent["hint"] {
  if (ONLINE_EVENTS.has(event)) return "online";
  if (LOGGED_OUT_EVENTS.has(event)) return "needs_qr";
  return "reconnecting";
}

/**
 * Trava por número: só um processo conversa com a Evolution sobre ele por vez.
 * Devolve true se conseguiu a trava (vale por holdMs ou até soltar).
 */
// Travas pegas por este processo (quem tem a trava pode chamar a Evolution)
const heldHere = new Set<string>();

export async function claimEvolutionLock(supabase: SB, instanceRowId: string, holdMs: number): Promise<boolean> {
  const ok = await claimLockRow(supabase, instanceRowId, holdMs);
  if (ok) heldHere.add(instanceRowId);
  return ok;
}

async function claimLockRow(supabase: SB, instanceRowId: string, holdMs: number): Promise<boolean> {
  const key = `instance:${instanceRowId}`;
  const now = new Date();
  const until = new Date(now.getTime() + holdMs).toISOString();
  // Garante a linha (primeira vez)
  await supabase.from("provider_health").upsert({ key, instance_id: instanceRowId }, { onConflict: "key", ignoreDuplicates: true });
  const { data, error } = await supabase.from("provider_health").update({ lock_until: until })
    .eq("key", key).or(`lock_until.is.null,lock_until.lt."${now.toISOString()}"`).select("key");
  if (error) {
    // Sem a coluna (migração ainda não rodou): segue sem trava, como antes
    console.warn("[evolution-guard] Trava indisponível:", error.message);
    return true;
  }
  return Array.isArray(data) && data.length > 0;
}

export async function releaseEvolutionLock(supabase: SB, instanceRowId: string): Promise<void> {
  heldHere.delete(instanceRowId);
  await supabase.from("provider_health").update({ lock_until: null }).eq("key", `instance:${instanceRowId}`);
}

// ─── Trava de TODAS as chamadas (15/10, VENDAS 1 16:20 e 16:57) ────────────
// 1 s depois de um "Disconnected", uma chamada nossa ("No client found,
// attempting to start new instance") abriu uma 2ª conexão enquanto a própria
// Evolution reconectava → "StreamReplaced". Regra para qualquer chamada
// (envio, status, mídia, reação, connect): segura se
//   - o último aviso do número nos últimos 2 min foi de queda (sem "Connected"
//     nem mensagem chegando depois), ou
//   - outro processo está com a trava do número (monitor checando), ou
//   - o número está pausado.
// Envio segurado entra na fila de reenvio (sai quando o número estiver ok).

const DOWN_EVENTS = CONNECTION_EVENTS.filter((e) => !ONLINE_EVENTS.has(e));
const LIVE_EVENTS = [...CONNECTION_EVENTS, "Message", "Receipt"];

export async function evolutionHoldReason(supabase: SB, inst: { id: string; instance_id: string }, nowMs = Date.now()): Promise<string | null> {
  if (PAUSED_INSTANCE_ROW_IDS.has(inst.id)) return "número pausado";
  const since = new Date(nowMs - EVENT_QUIET_MS).toISOString();
  const [{ data: evts }, { data: lock }] = await Promise.all([
    supabase.from("wapi_webhook_raw_events").select("event_type, received_at")
      .eq("instance_id", inst.instance_id).in("event_type", LIVE_EVENTS).gte("received_at", since)
      .order("received_at", { ascending: false }).limit(1),
    heldHere.has(inst.id)
      ? Promise.resolve({ data: null })
      : supabase.from("provider_health").select("lock_until").eq("key", `instance:${inst.id}`).maybeSingle(),
  ]);
  const last = evts && evts[0];
  if (last && DOWN_EVENTS.includes(String(last.event_type))) {
    const secs = Math.max(0, Math.round((Date.parse(last.received_at) + EVENT_QUIET_MS - nowMs) / 1000));
    return `"${last.event_type}" há pouco — a Evolution está reconectando sozinha (libera em ${secs}s)`;
  }
  if (lock?.lock_until && Date.parse(lock.lock_until) > nowMs) return "monitor checando o número";
  return null;
}

/**
 * Instala a trava nas chamadas à Evolution desta requisição. O token aponta
 * para a instância (tokens fora da tabela — ex.: celebrei-go — passam).
 */
export function installEvolutionCallGuard(supabase: SB): void {
  const byToken = new Map<string, { id: string; instance_id: string } | null>();
  setEvolutionCallGuard(async (token: string) => {
    if (!byToken.has(token)) {
      const { data } = await supabase.from("wapi_instances").select("id, instance_id").eq("instance_token", token).eq("provider", "evolution").limit(1);
      byToken.set(token, (data && data[0]) || null);
    }
    const inst = byToken.get(token);
    return inst ? evolutionHoldReason(supabase, inst) : null;
  });
}
