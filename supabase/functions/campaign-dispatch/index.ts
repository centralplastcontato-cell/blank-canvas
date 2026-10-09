// Envio das campanhas pelo servidor (parte 3 da reforma das Campanhas, out/2026).
//
// Chamada pelo agendamento a cada 2 minutos. Em cada chamada, cada empresa manda no
// máximo UMA mensagem, e só se chegou a hora dela (ritmo guardado no banco). Por isso
// não precisa de chave: chamar a mais não manda mensagem a mais.
//
// Regras (decisão do dono): até 30 por dia por empresa, de segunda a sábado das 9h às
// 19h, uma a cada ~20 min com tempo variado. Quem pediu para sair, telefone repetido e
// inválido são pulados no banco (campaign_dispatch_claim).

// deno-lint-ignore-file no-explicit-any
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import {
  brtDayStart,
  DAILY_LIMIT,
  isSendWindow,
  nextSendAfterSend,
  nextWindowStart,
  phoneVariants,
  renderCampaignMessage,
  spreadStart,
} from "../_shared/campaign-schedule.ts";
import { markConversationForCampaign } from "../_shared/campaign-mark.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/** Quanto tempo a empresa fica segurada enquanto a mensagem sai */
const LOCK_MINUTES = 10;
/** Erros seguidos que pausam as campanhas da empresa (para não queimar a lista) */
const MAX_CONSECUTIVE_ERRORS = 3;
/** WhatsApp desconectado: tenta de novo depois disso */
const RETRY_DISCONNECTED_MINUTES = 30;

interface Claim {
  company_id: string;
  campaign_id: string | null;
  recipient_id: string | null;
  phone: string | null;
  lead_name: string | null;
  variation_index: number | null;
  sent_today: number;
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

const minutesFrom = (d: Date, minutes: number) => new Date(d.getTime() + minutes * 60 * 1000);

async function setNext(db: any, companyId: string, at: Date, extra: Record<string, unknown> = {}) {
  await db
    .from("campaign_dispatch_state")
    .update({ next_send_at: at.toISOString(), updated_at: new Date().toISOString(), ...extra })
    .eq("company_id", companyId);
}

async function backToPending(db: any, recipientId: string) {
  await db.from("campaign_recipients").update({ status: "pending", claimed_at: null }).eq("id", recipientId).eq("status", "sending");
}

async function markError(db: any, recipientId: string, campaignId: string, message: string) {
  await db.from("campaign_recipients").update({ status: "error", error_message: message.slice(0, 300) }).eq("id", recipientId);
  await db.rpc("campaign_refresh_counts", { p_campaign_id: campaignId });
}

/** Por qual número sai: no "disparo inteligente", pelo número onde a pessoa já conversou */
async function resolveInstance(db: any, campaign: any, phone: string) {
  const { data } = await db
    .from("wapi_instances")
    .select("id, instance_id, instance_token")
    .eq("company_id", campaign.company_id)
    .eq("status", "connected")
    .eq("is_active", true);
  const connected = (data || []) as Array<{ id: string; instance_id: string; instance_token: string }>;
  if (connected.length === 0) return null;

  if (campaign.send_mode === "smart") {
    const jids = phoneVariants(phone).flatMap((v) => [`${v}@s.whatsapp.net`, `${v}@c.us`]);
    const { data: convs } = await db
      .from("wapi_conversations")
      .select("instance_id")
      .in("instance_id", connected.map((i) => i.id))
      .in("remote_jid", jids)
      .order("last_message_at", { ascending: false })
      .limit(1);
    const hit = convs?.[0] && connected.find((i) => i.id === convs[0].instance_id);
    if (hit) return hit;
    return connected.find((i) => i.instance_id === campaign.send_instance_id) || connected[0];
  }
  // Um número só: se ele estiver desconectado, espera (não troca de número sozinho)
  return connected.find((i) => i.instance_id === campaign.send_instance_id) || null;
}

/** attempted: a mensagem já pode ter saído (aí nunca volta para a fila) */
async function handleClaim(db: any, url: string, serviceKey: string, claim: Claim, ctx: { attempted: boolean }) {
  const now = new Date();
  const company = claim.company_id;

  // Limite do dia: volta no próximo dia de envio
  if (!claim.recipient_id || !claim.campaign_id) {
    await setNext(db, company, spreadStart(nextWindowStart(now), Math.random()));
    return { company, outcome: "limite do dia" };
  }
  const recipientId = claim.recipient_id;

  const [{ data: campaign }, { data: companyRow }] = await Promise.all([
    db
      .from("campaigns")
      .select("id, company_id, status, message_variations, image_url, pause_bot_on_reply, send_mode, send_instance_id")
      .eq("id", claim.campaign_id)
      .maybeSingle(),
    db.from("companies").select("name").eq("id", company).maybeSingle(),
  ]);

  // Pausaram enquanto a pessoa era separada
  if (!campaign || campaign.status !== "sending") {
    await backToPending(db, recipientId);
    await setNext(db, company, now);
    return { company, outcome: "campanha pausada" };
  }

  const instance = await resolveInstance(db, campaign, claim.phone || "");
  if (!instance) {
    await backToPending(db, recipientId);
    await db.from("campaigns").update({ last_error: "Nenhum WhatsApp conectado para enviar. Tentando de novo em 30 min." }).eq("id", campaign.id);
    await setNext(db, company, minutesFrom(now, RETRY_DISCONNECTED_MINUTES));
    return { company, outcome: "whatsapp desconectado" };
  }

  const variations = Array.isArray(campaign.message_variations) ? campaign.message_variations : [];
  const variation = variations[claim.variation_index ?? 0] || variations[0];
  const text = renderCampaignMessage(variation?.text || "", claim.lead_name || "", companyRow?.name || "");
  if (!text.trim() && !campaign.image_url) {
    await markError(db, recipientId, campaign.id, "Campanha sem mensagem");
    await setNext(db, company, now);
    return { company, outcome: "sem mensagem" };
  }

  const base = {
    instanceId: instance.instance_id,
    instanceToken: instance.instance_token,
    phone: claim.phone,
    source: "campaign",
    automation: true,
  };
  const payload = campaign.image_url
    ? { ...base, action: "send-image", mediaUrl: campaign.image_url, caption: text }
    : { ...base, action: "send-text", message: text };

  ctx.attempted = true;
  const res = await fetch(`${url}/functions/v1/wapi-send`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${serviceKey}` },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(60_000),
  });
  let data: any = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }

  // O servidor do WhatsApp segurou a mensagem
  if (res.ok && data?.skipped) {
    if (data.reason === "reconnect_quarantine_auto_reject") {
      // Número acabou de reconectar: espera a quarentena acabar e tenta a mesma pessoa
      await backToPending(db, recipientId);
      const until = data.until ? new Date(data.until) : minutesFrom(now, 15);
      await setNext(db, company, minutesFrom(until, 1));
      return { company, outcome: "quarentena" };
    }
    // Outro motivo (ex.: conversa pausada): não manda para esta pessoa
    await markError(db, recipientId, campaign.id, `Não enviado (${data.reason || "bloqueado"})`);
    await setNext(db, company, now);
    return { company, outcome: "pulado" };
  }

  if (!res.ok) {
    const message = String(data?.error || `Erro ${res.status} no envio`);
    await markError(db, recipientId, campaign.id, message);
    const { data: state } = await db.from("campaign_dispatch_state").select("consecutive_errors").eq("company_id", company).maybeSingle();
    const errors = (state?.consecutive_errors || 0) + 1;
    if (errors >= MAX_CONSECUTIVE_ERRORS) {
      // Algo está errado com o número: pausa em vez de queimar a lista inteira
      await db
        .from("campaigns")
        .update({ status: "draft", last_error: `Pausada depois de ${errors} erros seguidos. Último: ${message}`.slice(0, 500) })
        .eq("company_id", company)
        .eq("status", "sending")
        .eq("server_send", true);
      await setNext(db, company, nextSendAfterSend(now, Math.random()), { consecutive_errors: 0 });
    } else {
      await setNext(db, company, nextSendAfterSend(now, Math.random()), { consecutive_errors: errors });
    }
    return { company, outcome: "erro", error: message };
  }

  // Saiu. Grava primeiro, para nunca mandar de novo a mesma pessoa.
  const sentAt = new Date();
  await db.from("campaign_recipients").update({ status: "sent", sent_at: sentAt.toISOString(), error_message: null }).eq("id", recipientId);
  await setNext(db, company, nextSendAfterSend(sentAt, Math.random()), {
    consecutive_errors: 0,
    last_sent_at: sentAt.toISOString(),
  });
  try {
    await db.rpc("campaign_refresh_counts", { p_campaign_id: campaign.id });
    await db.from("campaigns").update({ last_error: null }).eq("id", campaign.id);
    // Para o webhook reconhecer a resposta (e, se a campanha pede, pausar o robô)
    await markConversationForCampaign(db, {
      campaignId: campaign.id,
      phone: claim.phone || "",
      instanceRowId: instance.id,
      leadName: claim.lead_name,
      soft: !campaign.pause_bot_on_reply,
    });
  } catch (err) {
    console.error("[campaign-dispatch] depois do envio:", err);
  }
  return { company, outcome: "enviada" };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const now = new Date();
  if (!isSendWindow(now)) return json({ ok: true, skipped: "fora do horário" });

  const url = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const db = createClient(url, serviceKey);

  try {
    const { data: claims, error } = await db.rpc("campaign_dispatch_claim", {
      p_daily_limit: DAILY_LIMIT,
      p_day_start: brtDayStart(now).toISOString(),
      p_lock_minutes: LOCK_MINUTES,
    });
    if (error) throw error;

    const results = [];
    for (const claim of (claims || []) as Claim[]) {
      const ctx = { attempted: false };
      try {
        results.push(await handleClaim(db, url, serviceKey, claim, ctx));
      } catch (err) {
        // Antes do envio: devolve a pessoa para a fila. Se a mensagem pode ter saído,
        // deixa como está: depois de 30 min vira "Envio não confirmado", sem mandar de novo.
        console.error("[campaign-dispatch]", claim.company_id, err);
        if (claim.recipient_id && !ctx.attempted) await backToPending(db, claim.recipient_id);
        results.push({ company: claim.company_id, outcome: "falha", error: String(err).slice(0, 200) });
      }
    }
    return json({ ok: true, results });
  } catch (err) {
    console.error("[campaign-dispatch]", err);
    return json({ error: "Erro no envio das campanhas" }, 500);
  }
});
