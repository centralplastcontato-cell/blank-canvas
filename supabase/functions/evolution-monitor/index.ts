// Monitor dos números da Evolution Go (a cada 5 min pelo cron, e na hora quando
// chega um evento de conexão no webhook).
//
// - Consulta GET /instance/status de cada número com provider 'evolution'
// - Caiu com sessão (LoggedIn): POST /instance/reconnect (até 3x). Sem sessão: só alerta (QR)
// - Avisa o dono no WhatsApp quando cai e quando volta, sem repetir. Sai pela
//   instância "celebrei-go" (secret EVOLUTION_ALERT_TOKEN); se ela/o servidor
//   estiver fora, sai por um número do Castelo que não é da Evolution (Z-API primeiro)
// - Depois que volta, reenvia (com limite) o que falhou durante a queda
import { createClient } from "npm:@supabase/supabase-js@2";
import { ALIVE_TIMEOUT_MS, evolutionCheckAlive, evolutionConnect, evolutionReconnect, evolutionSendMedia, evolutionSendText, evolutionStatus, extractEvolutionMessageId } from "../_shared/evolution.ts";
import { CELEBREI_GO_PAUSED, claimEvolutionLock, installEvolutionCallGuard, PAUSED_INSTANCE_ROW_IDS, recentConnectionEvent, releaseEvolutionLock } from "../_shared/evolution-guard.ts";
import {
  aliveCheckHealthy,
  classifyEvolutionStatus,
  decideInstanceHealth,
  decideServerHealth,
  type EvoState,
  type FailedRow,
  type HealthRow,
  instanceAlertText,
  isConfirmedDown,
  looksLikeDbExhausted,
  recoveriesInLastDay,
  pickResendable,
  reminderDue,
  reminderText,
  RESEND_WINDOW_MS,
  serverAlertText,
  skipLoggedOutCheck,
  SUSPECT_MIN_DOWN,
} from "../_shared/evolution-health.ts";

// deno-lint-ignore no-explicit-any
type SB = any;
// deno-lint-ignore no-explicit-any
type Json = Record<string, any>;

const OWNER_ALERT_PHONE = "5515981121710";
const CASTELO_COMPANY_ID = "a0000000-0000-0000-0000-000000000001";
const SERVER_KEY = "evolution:server";
const LOCK_HOLD_MS = 90_000;
const ZAPI_BASE_URL = "https://api.z-api.io/instances";
const WAPI_BASE_URL = "https://api.w-api.app/v1";

interface Inst {
  id: string;
  instance_id: string;
  instance_token: string;
  unit: string | null;
  company_id: string;
  status: string | null;
  phone_number: string | null;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const instKey = (id: string) => `instance:${id}`;

/** Número consultado no /user/check: o do próprio número (sempre existe) ou o do dono */
function aliveNumber(phone: string | null): string {
  const d = String(phone || "").replace(/\D/g, "");
  return d.length >= 12 ? d : OWNER_ALERT_PHONE;
}

/** Resposta crua (curta) para conferir o formato */
function rawSnippet(v: unknown): string {
  try {
    return (typeof v === "string" ? v : JSON.stringify(v ?? null)).slice(0, 400);
  } catch {
    return String(v).slice(0, 400);
  }
}

async function loadHealth(supabase: SB, keys: string[]): Promise<Record<string, Json>> {
  const { data } = await supabase.from("provider_health").select("*").in("key", keys);
  return Object.fromEntries(((data || []) as Json[]).map((r) => [r.key, r]));
}

async function saveHealth(supabase: SB, key: string, instanceId: string | null, patch: Json): Promise<void> {
  const { error } = await supabase.from("provider_health").upsert(
    { key, instance_id: instanceId, ...patch, updated_at: new Date().toISOString() },
    { onConflict: "key" },
  );
  if (error) console.error(`[evolution-monitor] Falha ao gravar ${key}:`, error.message);
}

/** Marca o alerta como enviado só se ninguém marcou antes (cron e webhook podem rodar juntos) */
async function claimAlert(supabase: SB, key: string, prevAlerted: string | null, next: string): Promise<boolean> {
  let q = supabase.from("provider_health").update({ alerted_state: next, alerted_at: new Date().toISOString() }).eq("key", key);
  q = prevAlerted === null ? q.is("alerted_state", null) : q.eq("alerted_state", prevAlerted);
  const { data } = await q.select("key");
  return Array.isArray(data) && data.length > 0;
}

/** Lembrete: só um processo envia (compare-and-set no horário do último aviso) */
async function claimReminder(supabase: SB, key: string, prevAlertedAt: string): Promise<boolean> {
  const { data } = await supabase.from("provider_health").update({ alerted_at: new Date().toISOString() })
    .eq("key", key).eq("alerted_at", prevAlertedAt).select("key");
  return Array.isArray(data) && data.length > 0;
}

// ─── Histórico de quedas (provider_incidents) ─────────────────────────────

async function openIncident(supabase: SB, key: string, instanceId: string | null, unit: string, cause: string, since: string): Promise<void> {
  const { data: open } = await supabase.from("provider_incidents").select("id").eq("key", key).is("ended_at", null).limit(1);
  if (open && open.length) return;
  const { error } = await supabase.from("provider_incidents").insert({ key, instance_id: instanceId, unit, cause, started_at: since });
  if (error) console.error(`[evolution-monitor] Falha ao abrir incidente ${key}:`, error.message);
}

async function closeIncident(supabase: SB, key: string): Promise<void> {
  const { error } = await supabase.from("provider_incidents").update({ ended_at: new Date().toISOString() }).eq("key", key).is("ended_at", null);
  if (error) console.error(`[evolution-monitor] Falha ao fechar incidente ${key}:`, error.message);
}

async function bumpReminder(supabase: SB, key: string): Promise<void> {
  const { data: open } = await supabase.from("provider_incidents").select("id, reminders").eq("key", key).is("ended_at", null).limit(1);
  if (open && open[0]) await supabase.from("provider_incidents").update({ reminders: (Number(open[0].reminders) || 0) + 1 }).eq("id", open[0].id);
}

// ─── Envio do alerta ──────────────────────────────────────────────────────

async function sendViaCelebreiGo(text: string): Promise<boolean> {
  // celebrei-go bloqueada (15/10): alertas só pela Z-API até segunda ordem
  if (CELEBREI_GO_PAUSED) return false;
  const token = Deno.env.get("EVOLUTION_ALERT_TOKEN");
  if (!token) {
    console.warn("[evolution-monitor] EVOLUTION_ALERT_TOKEN não configurado — usando o plano B");
    return false;
  }
  const res = await evolutionSendText(token, OWNER_ALERT_PHONE, text);
  if (!res.ok) console.warn("[evolution-monitor] celebrei-go não enviou o alerta:", res.error);
  return res.ok;
}

/** Plano B: um número do Castelo que não é da Evolution (Z-API primeiro) */
async function sendViaFallback(supabase: SB, text: string): Promise<boolean> {
  const { data: senders } = await supabase
    .from("wapi_instances")
    .select("id, instance_id, instance_token, client_token, provider, company_id, unit")
    .eq("company_id", CASTELO_COMPANY_ID)
    .eq("is_active", true)
    .eq("status", "connected")
    .neq("provider", "evolution");
  const sender = ((senders || []) as Json[]).sort((a, b) => (a.provider === "zapi" ? 0 : 1) - (b.provider === "zapi" ? 0 : 1))[0];
  if (!sender) {
    console.error("[evolution-monitor] Nenhum número fora da Evolution conectado para o plano B");
    return false;
  }
  try {
    let res: Response;
    if (sender.provider === "zapi") {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (sender.client_token) headers["Client-Token"] = sender.client_token;
      res = await fetch(`${ZAPI_BASE_URL}/${sender.instance_id}/token/${sender.instance_token}/send-text`, {
        method: "POST", headers, body: JSON.stringify({ phone: OWNER_ALERT_PHONE, message: text }),
      });
    } else {
      res = await fetch(`${WAPI_BASE_URL}/message/send-text?instanceId=${sender.instance_id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${sender.instance_token}` },
        body: JSON.stringify({ phone: OWNER_ALERT_PHONE, message: text }),
      });
    }
    if (!res.ok) return false;
    const data = await res.json().catch(() => ({}));
    const messageId = data?.zapiMessageId || data?.messageId || null;
    // Grava como aviso do sistema antes do eco do webhook (senão o webhook acha
    // que foi digitada no celular e tira a conversa do robô/IA)
    if (messageId) {
      const variants = [OWNER_ALERT_PHONE, OWNER_ALERT_PHONE.slice(0, 4) + OWNER_ALERT_PHONE.slice(5)].map((p) => `${p}@s.whatsapp.net`);
      const { data: conv } = await supabase.from("wapi_conversations").select("id").eq("instance_id", sender.id).in("remote_jid", variants).limit(1);
      if (conv && conv[0]) {
        await supabase.from("wapi_messages").upsert({
          conversation_id: conv[0].id, message_id: messageId, from_me: true, message_type: "text", content: text,
          status: "sent", timestamp: new Date().toISOString(), company_id: sender.company_id, metadata: { source: "system_alert" },
        }, { onConflict: "conversation_id,message_id", ignoreDuplicates: true });
      }
    }
    console.log(`[evolution-monitor] Alerta enviado pelo plano B (${sender.unit})`);
    return true;
  } catch (e) {
    console.error("[evolution-monitor] Plano B falhou:", e);
    return false;
  }
}

async function alertOwner(supabase: SB, text: string, serverDown: boolean): Promise<void> {
  if (!serverDown && await sendViaCelebreiGo(text)) return;
  await sendViaFallback(supabase, text);
}

/** Sininho/pop-up para a equipe da empresa do número */
async function notifyCompany(supabase: SB, inst: Inst, title: string, message: string, state: EvoState | "server_down"): Promise<void> {
  const { data: users } = await supabase.from("user_companies").select("user_id").eq("company_id", inst.company_id);
  if (!users || users.length === 0) return;
  await supabase.from("notifications").insert((users as Json[]).map((u) => ({
    user_id: u.user_id,
    company_id: inst.company_id,
    type: "instance_disconnected",
    title,
    message,
    data: { instance_id: inst.id, instance_name: inst.unit, provider: "evolution", state },
  })));
}

// ─── Reenvio do que falhou durante a queda ─────────────────────────────────

async function resendFailed(supabase: SB, inst: Inst): Promise<number> {
  const since = new Date(Date.now() - RESEND_WINDOW_MS).toISOString();
  const { data: convs } = await supabase.from("wapi_conversations").select("id, remote_jid").eq("instance_id", inst.id).gte("last_message_at", since);
  const convIds = ((convs || []) as Json[]).map((c) => c.id);
  if (convIds.length === 0) return 0;
  const jidByConv = Object.fromEntries(((convs || []) as Json[]).map((c) => [c.id, c.remote_jid]));
  const { data: failed } = await supabase.from("wapi_messages")
    .select("id, conversation_id, timestamp, status, metadata")
    .in("conversation_id", convIds).eq("from_me", true).eq("status", "error").gte("timestamp", since);
  if (!failed || failed.length === 0) return 0;
  const { data: okOut } = await supabase.from("wapi_messages")
    .select("conversation_id, timestamp")
    .in("conversation_id", [...new Set((failed as FailedRow[]).map((f) => f.conversation_id))])
    .eq("from_me", true).neq("status", "error").gte("timestamp", since);
  const newest: Record<string, string> = {};
  for (const m of (okOut || []) as Json[]) {
    if (!newest[m.conversation_id] || Date.parse(m.timestamp) > Date.parse(newest[m.conversation_id])) newest[m.conversation_id] = m.timestamp;
  }
  let resent = 0;
  for (const r of pickResendable(failed as FailedRow[], newest, Date.now())) {
    const rs = (r.metadata?.resend || {}) as Json;
    const to = String(jidByConv[r.conversation_id] || "");
    if (!to) continue;
    const res = rs.action === "send-text"
      ? await evolutionSendText(inst.instance_token, to, String(rs.message || ""))
      : await evolutionSendMedia(
        inst.instance_token, to,
        rs.action === "send-image" ? "image" : rs.action === "send-video" ? "video" : rs.action === "send-audio" ? "audio" : "document",
        String(rs.mediaUrl || ""),
        { caption: rs.caption || undefined, filename: rs.fileName || undefined },
      );
    const meta = { ...(r.metadata || {}), resent_at: new Date().toISOString(), resend_ok: res.ok, ...(res.ok ? {} : { resend_error: String(res.error || "").slice(0, 200) }) };
    const newId = res.ok ? extractEvolutionMessageId(res.data) : null;
    await supabase.from("wapi_messages").update({
      metadata: meta,
      ...(res.ok ? { status: "sent", ...(newId ? { message_id: newId } : {}) } : {}),
    }).eq("id", r.id);
    if (res.ok) resent++;
    await new Promise((ok) => setTimeout(ok, 1500));
  }
  if (resent) console.log(`[evolution-monitor] ${inst.unit}: ${resent} mensagem(ns) reenviada(s) depois da queda`);
  return resent;
}

async function countStuckSent(supabase: SB, inst: Inst, sinceIso: string): Promise<number> {
  const { data: convs } = await supabase.from("wapi_conversations").select("id").eq("instance_id", inst.id).gte("last_message_at", sinceIso);
  const ids = ((convs || []) as Json[]).map((c) => c.id);
  if (ids.length === 0) return 0;
  const { count } = await supabase.from("wapi_messages").select("id", { count: "exact", head: true })
    .in("conversation_id", ids).eq("from_me", true).eq("status", "sent").gte("timestamp", sinceIso)
    .lte("timestamp", new Date(Date.now() - 10 * 60 * 1000).toISOString());
  return count || 0;
}

// ─── Rodada ───────────────────────────────────────────────────────────────

// Tráfego real vale mais que o status: em 13/10 o /instance/status da
// Evolution disse "sem sessão" e depois 401 enquanto o VENDAS 2 recebia e
// enviava normalmente. Mensagem/confirmação chegando = número conectado.
const ACTIVITY_WINDOW_MS = 10 * 60 * 1000;
async function hasRecentTraffic(supabase: SB, inst: Inst): Promise<boolean> {
  const since = new Date(Date.now() - ACTIVITY_WINDOW_MS).toISOString();
  const { data } = await supabase.from("wapi_webhook_raw_events").select("id")
    .eq("instance_id", inst.instance_id).in("event_type", ["Message", "Receipt"]).gte("received_at", since).limit(1);
  return (data || []).length > 0;
}

async function run(supabase: SB, onlyInstanceId: string | null, reason: string): Promise<Json> {
  let q = supabase.from("wapi_instances")
    .select("id, instance_id, instance_token, unit, company_id, status, phone_number")
    .eq("provider", "evolution").eq("is_active", true);
  if (onlyInstanceId) q = q.eq("id", onlyInstanceId);
  const { data: instances } = await q;
  // Números pausados (bloqueados pelo WhatsApp): fora do monitor até segunda ordem
  const paused = ((instances || []) as Inst[]).filter((i) => PAUSED_INSTANCE_ROW_IDS.has(i.id));
  if (paused.length) console.log(`[evolution-monitor] Pausado(s), sem consultar: ${paused.map((i) => i.unit).join(", ")}`);
  const list = ((instances || []) as Inst[]).filter((i) => !PAUSED_INSTANCE_ROW_IDS.has(i.id));
  if (list.length === 0) return { checked: 0, paused: paused.map((i) => i.unit) };

  const nowIso = new Date().toISOString();
  const health = await loadHealth(supabase, [SERVER_KEY, ...list.map((i) => instKey(i.id))]);

  // 1) Status de todos (em paralelo)
  // A conexão do WhatsApp oscila e volta sozinha em poucos segundos
  // (Disconnected → Connected em 2–5 s): uma checagem só não confirma queda —
  // são precisas 2 seguidas (5+ min).
  // Deslogado já avisado: checa a cada 30 min (consultar reabre o ciclo de QR)
  const nowMs0 = Date.now();
  // Número fora e já avisado: sem chamar a Evolution (cada consulta pode
  // reiniciar o cliente e gastar conexões do banco dela, 14/10) — só a cada
  // 30 min. No meio-tempo, mensagem/confirmação chegando = voltou
  const waiting = list.filter((i) => skipLoggedOutCheck(health[instKey(i.id)] || null, nowMs0));
  const backByTraffic: Inst[] = [];
  for (const i of waiting) if (await hasRecentTraffic(supabase, i)) backByTraffic.push(i);
  const throttled = waiting.filter((i) => !backByTraffic.includes(i));
  const toCheck = list.filter((i) => !waiting.includes(i));
  if (throttled.length) console.log(`[evolution-monitor] Fora e já avisado(s), próxima consulta em até 30 min: ${throttled.map((i) => i.unit).join(", ")}`);
  // Junto com o status, a checagem "de verdade" (/user/check): o status diz se
  // o número está logado; o /user/check pega o servidor travado (12/10 23h45 o
  // status seguiu "logado" com tudo parado).
  // Proteções (VENDAS 1, 13/10 18:47 — uma chamada nossa durante a reconexão
  // automática abriu uma 2ª conexão e derrubou a sessão):
  //  - evento de conexão do número nos últimos 2 min → não chama nada agora
  //  - uma chamada por vez por número (trava)
  //  - /user/check só com o status "logado"; nada de re-checar em seguida
  const quiet: Inst[] = [];
  const checked = await Promise.all(toCheck.map(async (inst) => {
    const evt = await recentConnectionEvent(supabase, inst.instance_id);
    if (evt) {
      console.log(`[evolution-monitor] ${inst.unit}: evento ${evt.event} às ${evt.at} — sem chamadas por 2 min (a Evolution reconecta sozinha)`);
      quiet.push(inst);
      return null;
    }
    if (!await claimEvolutionLock(supabase, inst.id, LOCK_HOLD_MS)) {
      console.log(`[evolution-monitor] ${inst.unit}: outra checagem em andamento — pulando`);
      quiet.push(inst);
      return null;
    }
    const res = await evolutionStatus(inst.instance_token);
    const statusOnline = classifyEvolutionStatus(res) === "online";
    const alive = statusOnline
      ? await evolutionCheckAlive(inst.instance_token, aliveNumber(inst.phone_number))
      : { ok: false, ms: 0, status: undefined, data: null, error: "status não está online" };
    const aliveOk = statusOnline && aliveCheckHealthy(alive, ALIVE_TIMEOUT_MS);
    if (statusOnline && !aliveOk) console.log(`[evolution-monitor] ${inst.unit}: /user/check falhou (http ${alive.status ?? "-"}, ${alive.ms} ms): ${rawSnippet(alive.data ?? alive.error)}`);
    return { inst, res, alive, aliveOk };
  }));
  const results = checked.filter((r): r is NonNullable<typeof r> => r !== null);
  // Voltou pelo tráfego (sem consultar a Evolution)
  for (const inst of backByTraffic) {
    console.log(`[evolution-monitor] ${inst.unit}: tráfego chegando de novo — conectado (sem consultar a Evolution)`);
    results.push({
      inst,
      res: { ok: true, status: 200, data: { data: { Connected: true, LoggedIn: true } } },
      alive: { ok: true, ms: 0, status: 200, data: null },
      aliveOk: true,
    });
  }
  // Banco da Evolution esgotado ("too many clients", ou 401 num token que já
  // funcionava): reconectar só piora — aviso para reiniciar o serviço
  const dbExhausted = results.some(({ inst, res, alive }) => {
    const known = !!health[instKey(inst.id)] && health[instKey(inst.id)].state !== "unknown";
    return looksLikeDbExhausted(res, known) || looksLikeDbExhausted(alive, known);
  });
  if (dbExhausted) console.warn("[evolution-monitor] 🚨 Banco da Evolution parece esgotado (401/too many clients) — sem reconexões");
  // Servidor fora: nenhum número respondeu e a celebrei-go também não
  // celebrei-go pausada: não consultar (cada consulta numa instância deslogada vaza conexões no banco da Evolution)
  const alertToken = CELEBREI_GO_PAUSED ? undefined : Deno.env.get("EVOLUTION_ALERT_TOKEN");
  const allUnreachable = results.length > 0 && results.every((r) => !r.res.ok && (!r.res.status || r.res.status >= 500));
  let serverDown = false;
  let celebreiDown = false;
  if (!onlyInstanceId && alertToken) {
    const probe = await evolutionStatus(alertToken);
    const probeOnline = classifyEvolutionStatus(probe) === "online";
    celebreiDown = !probeOnline || !aliveCheckHealthy(await evolutionCheckAlive(alertToken, OWNER_ALERT_PHONE), ALIVE_TIMEOUT_MS);
    serverDown = allUnreachable && !probe.ok;
  } else if (allUnreachable && !onlyInstanceId && results.length >= 2) {
    // Sem a celebrei-go para confirmar: só com 2+ números sem resposta
    serverDown = true;
  }
  const serverRow = (health[SERVER_KEY] || null) as Json | null;
  const serverIncidentOpen = serverRow?.alerted_state === "down";

  // 2) Cada número: estado, reconexão, status na plataforma. Os avisos saem
  // depois, quando já se sabe se é queda de um número ou do servidor
  type Pending = { inst: Inst; key: string; prev: HealthRow | null; final: ReturnType<typeof decideInstanceHealth>; stateSince: string; downSince: string | null; resent: number };
  const pending: Pending[] = [];
  const summary: Json[] = [];
  for (const { inst, res, alive, aliveOk } of results) {
    const key = instKey(inst.id);
    const prevRow = health[key] || null;
    const prev = prevRow as HealthRow | null;
    let observed = classifyEvolutionStatus(res);
    // Status diz "logado", mas o WhatsApp não responde pela Evolution: travado
    if (observed === "online" && !aliveOk) observed = "unreachable";
    if (observed !== "online" && !serverDown && await hasRecentTraffic(supabase, inst)) {
      console.log(`[evolution-monitor] ${inst.unit}: status diz ${observed} (http ${res.status ?? "-"}), mas há tráfego nos últimos ${ACTIVITY_WINDOW_MS / 60000} min — conectado`);
      observed = "online";
    }
    const recoveryLog = recoveriesInLastDay((prevRow?.detail as Json | null)?.recoveries, Date.now());
    const d = decideInstanceHealth(prev, observed, { serverDown, dbExhausted, recoveriesToday: recoveryLog.length });
    // "Fora desde": troca entre estados de queda (sem sessão ↔ sem resposta) não reinicia a contagem
    const stillDown = !!prevRow && prevRow.state !== "online" && prevRow.state !== "unknown" && d.state !== "online";
    const stateSince = prevRow && (prevRow.state === d.state || stillDown) ? prevRow.state_since : nowIso;
    const downSince = d.state === "online" ? (prevRow && prevRow.state !== "online" ? prevRow.state_since : null) : stateSince;

    let reconnectResult: string | null = null;
    if (d.recover) {
      // Uma por queda, no máximo 3 por dia (cada uma abre conexões no banco da Evolution)
      const rc = d.recover === "connect"
        ? await evolutionConnect(inst.instance_token, `${Deno.env.get("SUPABASE_URL")}/functions/v1/wapi-webhook`)
        : await evolutionReconnect(inst.instance_token);
      reconnectResult = `${d.recover}: ${rc.ok ? "ok" : String(rc.error || "erro").slice(0, 120)}`;
      recoveryLog.push(nowIso);
      console.log(`[evolution-monitor] ${inst.unit}: ${reconnectResult} (${recoveryLog.length}/3 hoje)`);
      // Sem consultar de novo logo em seguida: a próxima checagem (5 min) confere
    }
    const final = observed === "online" && d.state !== "online" ? decideInstanceHealth(prev, "online") : d;
    const finalSince = final.state === d.state ? stateSince : nowIso;

    await saveHealth(supabase, key, inst.id, {
      state: final.state,
      state_since: finalSince,
      bad_checks: final.bad_checks,
      reconnect_attempts: final.state === "online" ? 0 : d.reconnect_attempts,
      last_check_at: nowIso,
      detail: {
        reason, reconnect: reconnectResult, recoveries: recoveryLog, db_exhausted: dbExhausted || undefined,
        http_status: res.status ?? null, error: res.ok ? null : String(res.error || "").slice(0, 200),
        alive: { ok: aliveOk, ms: alive.ms, http: alive.status ?? null, raw: rawSnippet(alive.data ?? alive.error) },
      },
    });

    // Status na plataforma (a hora da conexão só muda quando volta de verdade)
    if (final.state === "online" && inst.status !== "connected") {
      await supabase.from("wapi_instances").update({ status: "connected", connected_at: nowIso }).eq("id", inst.id);
    } else if ((final.state === "needs_qr" || (final.state === "reconnecting" && final.bad_checks >= 2)) && inst.status === "connected") {
      await supabase.from("wapi_instances").update({ status: "disconnected" }).eq("id", inst.id);
    }

    // Voltou: reenvia o que falhou na queda
    let resent = 0;
    if (final.state === "online") resent = await resendFailed(supabase, inst);

    pending.push({ inst, key, prev, final, stateSince: finalSince, downSince, resent });
    summary.push({ unit: inst.unit, state: final.state, alert: final.alert, reconnect: reconnectResult, resent });
  }

  // 3) Servidor (só na rodada completa): fora do ar, ou provável travamento
  // quando 2+ números (contando a celebrei-go) caem juntos
  const confirmedDown = pending.filter((p) => isConfirmedDown(p.final));
  const suspect = !serverDown && confirmedDown.length + (celebreiDown ? 1 : 0) >= SUSPECT_MIN_DOWN && confirmedDown.length >= 1;
  let serverIncident = serverIncidentOpen;
  if (!onlyInstanceId) {
    const prev = serverRow as HealthRow | null;
    const d = decideServerHealth(prev, serverDown || suspect || dbExhausted, { confirmNow: suspect && !dbExhausted });
    const earliestDown = confirmedDown.map((p) => p.stateSince).sort()[0] || nowIso;
    const since = d.state === "down" ? (prev?.state === "down" ? serverRow!.state_since : (suspect ? earliestDown : nowIso)) : (prev?.state === "online" ? serverRow?.state_since : nowIso);
    const downUnits = [...confirmedDown.map((p) => p.inst.unit || p.inst.instance_id), ...(celebreiDown ? ["celebrei-go"] : [])];
    const units = serverDown || dbExhausted ? list.map((i) => i.unit || i.instance_id) : downUnits;
    await saveHealth(supabase, SERVER_KEY, null, {
      state: d.state, state_since: since, bad_checks: d.bad_checks, last_check_at: nowIso,
      detail: { suspect, server_down: serverDown, db_exhausted: dbExhausted, celebrei_down: celebreiDown, down_units: downUnits },
    });
    if (d.alert && await claimAlert(supabase, SERVER_KEY, prev?.alerted_state ?? null, d.alert === "down" ? "down" : "online")) {
      const lastUnits = ((serverRow?.detail as Json | null)?.down_units as string[] | undefined) || units;
      await alertOwner(supabase, serverAlertText(d.alert, d.alert === "down" ? since : (serverRow?.state_since ?? null), d.alert === "down" ? units : lastUnits, { suspect: d.alert === "down" && suspect, dbExhausted: d.alert === "down" && dbExhausted }), true);
      if (d.alert === "down") {
        await openIncident(supabase, SERVER_KEY, null, units.join(", "), dbExhausted ? "banco_esgotado" : suspect ? "travamento" : "servidor_fora", since);
        for (const inst of list) await notifyCompany(supabase, inst, "🚨 Evolution Go com problema", `${inst.unit || "WhatsApp"} pode estar sem conexão: ${dbExhausted ? "o banco da Evolution está sem conexões livres" : suspect ? "provável travamento do servidor da Evolution" : "o servidor da Evolution não responde"}.`, "server_down");
      } else {
        await closeIncident(supabase, SERVER_KEY);
      }
    }
    serverIncident = d.state === "down" && (serverIncidentOpen || d.alert === "down");
    // Lembrete de hora em hora enquanto o servidor não normaliza
    if (d.state === "down" && !d.alert && reminderDue(serverRow, true, Date.now()) && await claimReminder(supabase, SERVER_KEY, serverRow!.alerted_at)) {
      await alertOwner(supabase, reminderText("server", "down", units.join(", "), serverRow!.state_since, Date.now()), true);
      await bumpReminder(supabase, SERVER_KEY);
    }
  }

  // 4) Avisos de cada número. Com o servidor em incidente, o aviso do servidor
  // cobre a queda (sem um aviso por número)
  for (const p of pending) {
    const { inst, key, prev, final } = p;
    if (final.alert === "down" && serverIncident) continue;
    if (final.alert && await claimAlert(supabase, key, prev?.alerted_state ?? null, final.alert === "down" ? final.state : "online")) {
      const stuck = final.alert === "up" && p.downSince ? await countStuckSent(supabase, inst, p.downSince) : 0;
      const text = instanceAlertText(final.alert, final.state, inst.unit || inst.instance_id, final.alert === "up" ? p.downSince : p.stateSince, { stuck, resent: p.resent });
      await alertOwner(supabase, text, serverDown);
      if (final.alert === "down") {
        await openIncident(supabase, key, inst.id, inst.unit || inst.instance_id, final.state, p.stateSince);
        await notifyCompany(supabase, inst,
          final.state === "needs_qr" ? "⚠️ WhatsApp desconectado — ler o QR" : "⚠️ WhatsApp sem conexão",
          final.state === "needs_qr"
            ? `${inst.unit || "WhatsApp"} perdeu a sessão. Reconecte lendo o QR Code em Configurações → Conexão.`
            : `${inst.unit || "WhatsApp"} está sem conexão e a reconexão automática não resolveu.`,
          final.state);
      } else {
        await closeIncident(supabase, key);
      }
      continue;
    }
    // Lembrete de hora em hora (só na rodada do cron; o do servidor cobre se ele estiver em incidente)
    const row = health[key] || null;
    if (!onlyInstanceId && !serverIncident && final.state !== "online" && reminderDue(row, true, Date.now()) && await claimReminder(supabase, key, row!.alerted_at)) {
      await alertOwner(supabase, reminderText("instance", final.state, inst.unit || inst.instance_id, row!.state_since, Date.now()), serverDown);
      await bumpReminder(supabase, key);
    }
  }
  for (const r of results) await releaseEvolutionLock(supabase, r.inst.id);

  // Deslogados sem checagem nesta rodada: só o lembrete de hora em hora
  for (const inst of throttled) {
    const key = instKey(inst.id);
    const row = health[key] || null;
    if (!serverIncident && reminderDue(row, true, Date.now()) && await claimReminder(supabase, key, row!.alerted_at)) {
      await alertOwner(supabase, reminderText("instance", "needs_qr", inst.unit || inst.instance_id, row!.state_since, Date.now()), serverDown);
      await bumpReminder(supabase, key);
    }
  }
  return { checked: results.length, quiet: quiet.map((i) => i.unit), throttled: throttled.map((i) => i.unit), serverDown, suspect: !onlyInstanceId && serverIncident, celebreiDown, reason, summary };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  installEvolutionCallGuard(supabase);
  try {
    const body = await req.json().catch(() => ({}));
    const onlyInstanceId = typeof body?.instance_row_id === "string" ? body.instance_row_id : null;
    const reason = typeof body?.reason === "string" ? body.reason.slice(0, 60) : "cron";
    const out = await run(supabase, onlyInstanceId, reason);
    console.log("[evolution-monitor]", JSON.stringify(out));
    return new Response(JSON.stringify(out), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("[evolution-monitor] erro:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
