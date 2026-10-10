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
import { evolutionReconnect, evolutionSendMedia, evolutionSendText, evolutionStatus, extractEvolutionMessageId } from "../_shared/evolution.ts";
import {
  classifyEvolutionStatus,
  decideInstanceHealth,
  decideServerHealth,
  type EvoState,
  type FailedRow,
  type HealthRow,
  instanceAlertText,
  pickResendable,
  RESEND_WINDOW_MS,
  serverAlertText,
} from "../_shared/evolution-health.ts";

// deno-lint-ignore no-explicit-any
type SB = any;
// deno-lint-ignore no-explicit-any
type Json = Record<string, any>;

const OWNER_ALERT_PHONE = "5515981121710";
const CASTELO_COMPANY_ID = "a0000000-0000-0000-0000-000000000001";
const SERVER_KEY = "evolution:server";
const ZAPI_BASE_URL = "https://api.z-api.io/instances";
const WAPI_BASE_URL = "https://api.w-api.app/v1";

interface Inst {
  id: string;
  instance_id: string;
  instance_token: string;
  unit: string | null;
  company_id: string;
  status: string | null;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const instKey = (id: string) => `instance:${id}`;

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

// ─── Envio do alerta ──────────────────────────────────────────────────────

async function sendViaCelebreiGo(text: string): Promise<boolean> {
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

async function run(supabase: SB, onlyInstanceId: string | null, reason: string): Promise<Json> {
  let q = supabase.from("wapi_instances")
    .select("id, instance_id, instance_token, unit, company_id, status")
    .eq("provider", "evolution").eq("is_active", true);
  if (onlyInstanceId) q = q.eq("id", onlyInstanceId);
  const { data: instances } = await q;
  const list = (instances || []) as Inst[];
  if (list.length === 0) return { checked: 0 };

  const nowIso = new Date().toISOString();
  const health = await loadHealth(supabase, [SERVER_KEY, ...list.map((i) => instKey(i.id))]);

  // 1) Status de todos (em paralelo)
  const results = await Promise.all(list.map(async (inst) => ({ inst, res: await evolutionStatus(inst.instance_token) })));
  // Servidor fora: nenhum número respondeu e a celebrei-go também não
  const allUnreachable = results.every((r) => !r.res.ok && (!r.res.status || r.res.status >= 500));
  let serverDown = false;
  if (allUnreachable && !onlyInstanceId) {
    const alertToken = Deno.env.get("EVOLUTION_ALERT_TOKEN");
    const probe = alertToken ? await evolutionStatus(alertToken) : { ok: false };
    serverDown = !probe.ok;
  }

  // 2) Servidor (só na rodada completa)
  if (!onlyInstanceId) {
    const prev = (health[SERVER_KEY] || null) as HealthRow | null;
    const d = decideServerHealth(prev, serverDown);
    const since = d.state === "down" ? (prev?.state === "down" ? health[SERVER_KEY].state_since : nowIso) : (prev?.state === "online" ? health[SERVER_KEY]?.state_since : nowIso);
    await saveHealth(supabase, SERVER_KEY, null, { state: d.state, state_since: since, bad_checks: d.bad_checks, last_check_at: nowIso });
    if (d.alert && await claimAlert(supabase, SERVER_KEY, prev?.alerted_state ?? null, d.alert === "down" ? "down" : "online")) {
      const units = list.map((i) => i.unit || i.instance_id);
      await alertOwner(supabase, serverAlertText(d.alert, d.alert === "down" ? since : (health[SERVER_KEY]?.state_since ?? null), units), true);
      if (d.alert === "down") {
        for (const inst of list) await notifyCompany(supabase, inst, "🚨 Servidor da Evolution Go fora do ar", `${inst.unit || "WhatsApp"} está sem conexão: o servidor da Evolution não responde.`, "server_down");
      }
    }
  }

  // 3) Cada número
  const summary: Json[] = [];
  for (const { inst, res } of results) {
    const key = instKey(inst.id);
    const prevRow = health[key] || null;
    const prev = prevRow as HealthRow | null;
    let observed = classifyEvolutionStatus(res);
    const d = decideInstanceHealth(prev, observed, { serverDown });
    const stateSince = prevRow && prevRow.state === d.state ? prevRow.state_since : nowIso;
    const downSince = d.state === "online" ? (prevRow && prevRow.state !== "online" ? prevRow.state_since : null) : stateSince;

    let reconnectResult: string | null = null;
    if (d.reconnect) {
      const rc = await evolutionReconnect(inst.instance_token);
      reconnectResult = rc.ok ? "ok" : String(rc.error || "erro");
      console.log(`[evolution-monitor] ${inst.unit}: reconnect #${d.reconnect_attempts} → ${reconnectResult}`);
      if (rc.ok) {
        await new Promise((ok) => setTimeout(ok, 5000));
        const after = classifyEvolutionStatus(await evolutionStatus(inst.instance_token));
        if (after === "online") observed = "online";
      }
    }
    const final = observed === "online" && d.state !== "online" ? decideInstanceHealth(prev, "online") : d;
    const finalSince = final.state === d.state ? stateSince : nowIso;

    await saveHealth(supabase, key, inst.id, {
      state: final.state,
      state_since: finalSince,
      bad_checks: final.bad_checks,
      reconnect_attempts: final.state === "online" ? 0 : d.reconnect_attempts,
      last_check_at: nowIso,
      detail: { reason, reconnect: reconnectResult, http_status: res.status ?? null, error: res.ok ? null : String(res.error || "").slice(0, 200) },
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

    if (final.alert && await claimAlert(supabase, key, prev?.alerted_state ?? null, final.alert === "down" ? final.state : "online")) {
      const stuck = final.alert === "up" && downSince ? await countStuckSent(supabase, inst, downSince) : 0;
      const text = instanceAlertText(final.alert, final.state, inst.unit || inst.instance_id, final.alert === "up" ? downSince : stateSince, { stuck, resent });
      await alertOwner(supabase, text, serverDown);
      if (final.alert === "down") {
        await notifyCompany(supabase, inst,
          final.state === "needs_qr" ? "⚠️ WhatsApp desconectado — ler o QR" : "⚠️ WhatsApp sem conexão",
          final.state === "needs_qr"
            ? `${inst.unit || "WhatsApp"} perdeu a sessão. Reconecte lendo o QR Code em Configurações → Conexão.`
            : `${inst.unit || "WhatsApp"} está sem conexão e a reconexão automática não resolveu.`,
          final.state);
      }
    }
    summary.push({ unit: inst.unit, state: final.state, alert: final.alert, reconnect: reconnectResult, resent });
  }
  return { checked: list.length, serverDown, reason, summary };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
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
