// Jornada de acompanhamento das conversas da Bia (IA) — Configurar IA →
// "Acompanhamento da Bia". Só roda para empresas com o módulo IA
// Conversacional ligado e só nas conversas que a Bia atende (bot_step
// ai_agent + bot_data.ai_agent = "on"), no número configurado na IA. Todas as
// outras conversas (bot fixo, outros números, outros buffets) seguem os
// follow-ups de sempre, sem mudança.

import { isAiConversationalEnabled } from "../_shared/ai-module.ts";
import { DEFAULT_AI_MODEL, estimateChatCostUsd, providerForModel } from "../_shared/ai-models.ts";
import { type ChatTurn, createLlmSession } from "../wapi-webhook/ai-llm.ts";
import { type AiFollowUpConfig, followupLabel, inSendWindowBR, type JourneyMessage, journeyOwns, nextJourneyAction, normalizeFollowUpConfig } from "../_shared/ai-followup.ts";
import { checkFollowUpText, followUpInstruction } from "../_shared/ai-followup-text.ts";
import type { MaterialKind } from "../_shared/material-claims.ts";
import { phoneVariantsBR } from "../_shared/ai-site-lead.ts";
import { findPromotion, promoCountdown } from "../_shared/promo.ts";
import { formatDateLong, formatSlotLabel } from "../_shared/whatsapp-format.ts";
import { freePartySlots, parsePartySlots } from "../_shared/party-availability.ts";
import { isClosedDay, parseClosedPeriods } from "../_shared/closed-periods.ts";
import { isConversationPaused } from "../_shared/bot-loop-guard.ts";
import { mergeConsecutiveTurns } from "../_shared/ai-turn.ts";

// deno-lint-ignore no-explicit-any
type Db = any;
type Json = Record<string, any>;

// Leads ainda em negociação (fechado, perdido, transferido etc. ficam de fora)
const OPEN_STATUSES = ["novo", "em_contato", "orcamento_enviado", "aguardando_resposta"];
// Cobre o maior prazo da tela (90 dias) + o perdido automático
const MAX_AGE_DAYS = 100;
const MAX_SENDS_PER_RUN = 5;
// Trava por conversa (coluna ai_journey_claimed_at): uma rodada por vez e nada
// de envio duplo quando duas execuções do cron se sobrepõem
const LOCK_MS = 30 * 60000;
const MATERIAL_WINDOW_MS = 30 * 86400000;
const MEDIA_KIND: Record<string, MaterialKind> = { image: "fotos", video: "video", document: "pacotes" };
const MEDIA_TEXT: Record<string, string> = { image: "[foto do espaço enviada]", video: "[vídeo enviado]", document: "[PDF de pacotes enviado]", audio: "[áudio]" };

const ymdBR = (ms: number) => new Date(ms - 3 * 3600000).toISOString().slice(0, 10);
const norm = (s: string | null | undefined) => String(s || "").trim().toLowerCase();

export interface AiTarget {
  settings: Json;
  instance: Json;
  companyName: string;
}

/** Instâncias (números) em que a Bia atende: empresa com o módulo ligado e IA ativa naquele número */
export async function loadAiJourneyTargets(supabase: Db): Promise<AiTarget[]> {
  const { data: allSettings } = await supabase.from("ai_agent_settings").select("*").eq("enabled", true);
  const out: AiTarget[] = [];
  for (const s of (allSettings || []) as Json[]) {
    if (!s.unit) continue;
    const { data: company } = await supabase.from("companies").select("name, settings").eq("id", s.company_id).maybeSingle();
    if (!isAiConversationalEnabled(company?.settings)) continue;
    const { data: instances } = await supabase.from("wapi_instances")
      .select("id, instance_id, instance_token, company_id, unit, provider, client_token")
      .eq("company_id", s.company_id);
    for (const inst of (instances || []) as Json[]) {
      if (norm(inst.unit) === norm(s.unit)) out.push({ settings: s, instance: inst, companyName: String(company?.name || "buffet") });
    }
  }
  return out;
}

export interface JourneyScope {
  cfg: AiFollowUpConfig;
  testVariants: string[] | null; // Modo de Teste da IA: só o número de teste
}

/**
 * Números em que a jornada da Bia está LIGADA (Configurar IA → Follow-up).
 * Só nesses números, e só nas conversas que a jornada cobre, os follow-ups
 * fixos pulam a conversa. Desligada = tudo como antes.
 */
export function journeyScopes(targets: AiTarget[]): Map<string, JourneyScope> {
  const out = new Map<string, JourneyScope>();
  for (const t of targets) {
    const cfg = normalizeFollowUpConfig(t.settings.followup_config);
    if (!cfg.enabled) continue;
    out.set(String(t.instance.id), {
      cfg,
      testVariants: t.settings.test_mode_enabled ? phoneVariantsBR(String(t.settings.test_mode_number || "")) : null,
    });
  }
  return out;
}

/** A jornada cobre esta conversa (pelo telefone)? */
export function journeyCovers(scope: JourneyScope | undefined, remoteJid: string): boolean {
  if (!scope) return false;
  if (!scope.testVariants) return true;
  const phone = String(remoteJid || "").replace(/@.*/, "");
  return phoneVariantsBR(phone).some((v) => scope.testVariants!.includes(v));
}

/** Mensagens da conversa para a jornada (sem o aviso do #reiniciar e sem o follow-up fixo antigo) */
async function loadJourneyMessages(supabase: Db, conv: Json): Promise<{ history: Json[]; msgs: JourneyMessage[]; historySince: string | null }> {
  const bd = (conv.bot_data || {}) as Json;
  // Depois de #reiniciar (número de teste) só vale a conversa nova
  const historySince = typeof bd.ai_history_since === "string" ? bd.ai_history_since : null;
  let q = supabase.from("wapi_messages")
    .select("from_me, content, message_type, timestamp, metadata")
    .eq("conversation_id", conv.id);
  if (historySince) q = q.gte("timestamp", historySince);
  const { data: rows, error } = await q.order("timestamp", { ascending: false }).limit(40);
  if (error) throw new Error(`mensagens da conversa ${conv.id}: ${error.message}`);
  const history = ((rows || []) as Json[]).reverse().filter((m) => {
    const content = String(m.content || "");
    if (content.startsWith("🧪")) return false; // aviso do modo de teste
    if (!m.from_me && content.trim().toLowerCase() === "#reiniciar") return false;
    return (m.metadata as Json | null)?.source !== "auto_reminder"; // follow-up fixo: nem âncora nem bloqueio
  });
  const msgs: JourneyMessage[] = history.map((m) => ({
    atMs: Date.parse(m.timestamp),
    fromMe: m.from_me === true,
    byAi: m.from_me === true ? (m.metadata as Json | null)?.source === "ai_agent" : undefined,
    isMedia: !!m.message_type && m.message_type !== "text",
    text: String(m.content || ""),
    followup: (m.metadata as Json | null)?.ai_followup || null,
  }));
  return { history, msgs, historySince };
}

/**
 * Para os follow-ups fixos: a jornada é dona desta conversa? Só então o fixo
 * pula. Robô desligado na conversa, equipe respondendo ou conversa parada
 * antes de ligar o acompanhamento continuam nos fixos, como antes.
 */
export async function journeyOwnsConversation(supabase: Db, scope: JourneyScope, conv: Json): Promise<boolean> {
  if (conv.bot_enabled !== true || !journeyCovers(scope, conv.remote_jid)) return false;
  const { msgs } = await loadJourneyMessages(supabase, conv);
  return journeyOwns(scope.cfg, msgs);
}

async function partyDateFreeSlots(supabase: Db, settings: Json, companyId: string, ymd: string): Promise<string[]> {
  const [{ data: units }, { data: events }, { data: pre }] = await Promise.all([
    supabase.from("company_units").select("name").eq("company_id", companyId).eq("is_active", true).eq("is_physical", true),
    supabase.from("company_events").select("event_date, start_time, end_time, status, unit").eq("company_id", companyId).eq("event_date", ymd),
    supabase.from("pre_reservations").select("event_date, unit").eq("company_id", companyId).eq("status", "ativa")
      .gt("reservation_expires_at", new Date().toISOString()).eq("event_date", ymd),
  ]);
  if (isClosedDay(ymd, parseClosedPeriods(settings.closed_periods))) return [];
  const slots = parsePartySlots(settings.party_slots);
  const unitNames = ((units || []) as Array<{ name: string }>).map((u) => u.name).filter(Boolean);
  const units_ = unitNames.length > 1 ? unitNames : [unitNames[0] || null];
  const free = new Set<string>();
  for (const unit of units_) {
    for (const f of freePartySlots({ from: ymd, to: ymd, slots, events: (events || []) as any[], preReservations: (pre || []) as any[], unit, physicalUnits: unitNames })) {
      free.add(f.slot.start);
    }
  }
  return [...free].sort().map(formatSlotLabel);
}

async function sendText(instance: Json, conv: Json, message: string): Promise<string | null> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) return null;
  const phone = String(conv.remote_jid).replace("@s.whatsapp.net", "").replace("@c.us", "").replace(/\D/g, "");
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);
  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/wapi-send`, {
      method: "POST",
      headers: { Authorization: `Bearer ${serviceRoleKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "send-text",
        phone,
        instanceId: instance.instance_id,
        instanceToken: instance.instance_token,
        conversationId: conv.id,
        companyId: instance.company_id,
        source: "bot",
        automation: true,
        messageSource: "ai_agent",
        message,
        delayTyping: 2,
      }),
      signal: controller.signal,
    });
    if (!response.ok) {
      console.error(`[ai-journey] send-text falhou (${response.status}): ${(await response.text()).slice(0, 300)}`);
      return null;
    }
    const parsed = await response.json().catch(() => null) as Json | null;
    if (parsed?.success === false || parsed?.error) {
      console.error("[ai-journey] send-text devolveu erro:", parsed);
      return null;
    }
    return typeof parsed?.messageId === "string" ? parsed.messageId : "";
  } catch (err) {
    console.error("[ai-journey] send-text erro/timeout:", err);
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

/** Marca a mensagem enviada como da jornada (é assim que a próxima rodada sabe o que já saiu) */
async function tagFollowUp(supabase: Db, convId: string, messageId: string, text: string, sinceIso: string, label: string): Promise<boolean> {
  let row: Json | null = null;
  if (messageId) {
    const { data } = await supabase.from("wapi_messages").select("id, metadata").eq("conversation_id", convId).eq("message_id", messageId).maybeSingle();
    row = data;
  }
  if (!row) {
    const { data } = await supabase.from("wapi_messages").select("id, metadata").eq("conversation_id", convId).eq("from_me", true)
      .gte("timestamp", sinceIso).eq("content", text).order("timestamp", { ascending: false }).limit(1);
    row = (data || [])[0] || null;
  }
  if (!row) return false;
  const { error } = await supabase.from("wapi_messages")
    .update({ metadata: { ...((row.metadata as Json) || {}), source: "ai_agent", ai_followup: label } }).eq("id", row.id);
  return !error;
}

/** Pega a conversa para esta rodada (atômico); false = outra execução está nela ou ela está bloqueada */
async function claim(supabase: Db, convId: string, nowMs: number): Promise<boolean> {
  const cutoff = new Date(nowMs - LOCK_MS).toISOString();
  const { data, error } = await supabase.from("wapi_conversations")
    .update({ ai_journey_claimed_at: new Date(nowMs).toISOString() })
    .eq("id", convId)
    .or(`ai_journey_claimed_at.is.null,ai_journey_claimed_at.lt.${cutoff}`)
    .select("id");
  if (error) {
    console.error(`[ai-journey] Trava indisponível (falta rodar o SQL?): ${error.message}`);
    return false;
  }
  return (data || []).length > 0;
}

/** Bloqueia a jornada nesta conversa por um tempo (falha repetida, mensagem sem marca) */
async function blockFor(supabase: Db, convId: string, ms: number): Promise<void> {
  await supabase.from("wapi_conversations")
    .update({ ai_journey_claimed_at: new Date(Date.now() + ms - LOCK_MS).toISOString() }).eq("id", convId);
}

async function markLost(supabase: Db, lead: Json, conv: Json, companyId: string, why: string): Promise<void> {
  const { data: moved, error } = await supabase.from("campaign_leads").update({ status: "perdido" })
    .eq("id", lead.id).in("status", OPEN_STATUSES).select("id");
  if (error) {
    console.error(`[ai-journey] Erro ao mover lead ${lead.id} para perdido:`, error.message);
    return;
  }
  if ((moved || []).length === 0) return; // status mudou no meio do caminho
  await supabase.from("lead_history").insert({
    lead_id: lead.id,
    company_id: companyId,
    user_id: null,
    user_name: "Bia (IA)",
    action: "Lead movido para perdido automaticamente",
    old_value: lead.status,
    new_value: "perdido",
  });
  if (lead.responsavel_id) {
    const { error: notifError } = await supabase.from("notifications").insert({
      user_id: lead.responsavel_id,
      company_id: companyId,
      type: "lead_lost",
      title: "Lead movido para Perdido",
      message: `O lead ${lead.name} foi movido automaticamente para Perdido: ${why}.`,
      data: { lead_id: lead.id, lead_name: lead.name, conversation_id: conv.id },
    });
    if (notifError) console.error("[ai-journey] Erro ao avisar o responsável:", notifError.message);
  }
  console.log(`[ai-journey] Lead ${lead.name} (${lead.id}) → perdido (${why})`);
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Uma rodada da jornada da Bia. Roda DEPOIS dos follow-ups fixos e para de
 * pegar conversas novas quando passa de `budgetMs`, para nunca atrasar o resto.
 */
export async function runAiJourney(
  supabase: Db,
  targets: AiTarget[],
  budgetMs = 90000,
): Promise<{ sent: number; lost: number; errors: string[] }> {
  const errors: string[] = [];
  let sent = 0;
  let lost = 0;
  const startedMs = Date.now();
  const openaiKey = Deno.env.get("OPENAI_API_KEY") || null;
  const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY") || null;

  for (const { settings, instance, companyName } of targets) {
    const cfg = normalizeFollowUpConfig(settings.followup_config);
    if (!cfg.enabled) continue;
    const scope: JourneyScope = { cfg, testVariants: settings.test_mode_enabled ? phoneVariantsBR(String(settings.test_mode_number || "")) : null };
    // Só conversas com atividade depois de ligar o acompanhamento (as anteriores nunca entram)
    const sinceMs = Math.max(Date.parse(cfg.since as string), Date.now() - MAX_AGE_DAYS * 86400000);
    const { data: convs, error } = await supabase.from("wapi_conversations")
      .select("id, remote_jid, lead_id, bot_data, bot_step, contact_name, last_message_at")
      .eq("instance_id", instance.id)
      .eq("bot_step", "ai_agent")
      .eq("bot_enabled", true)
      .eq("bot_data->>ai_agent", "on")
      .eq("last_message_from_me", true)
      .not("remote_jid", "like", "%@g.us%")
      .gte("last_message_at", new Date(sinceMs).toISOString())
      .order("last_message_at", { ascending: false })
      .limit(300);
    if (error) {
      errors.push(`conversas da IA (${instance.unit}): ${error.message}`);
      continue;
    }

    for (const conv of (convs || []) as Json[]) {
      if (sent >= MAX_SENDS_PER_RUN || Date.now() - startedMs > budgetMs) break;
      try {
        if (!journeyCovers(scope, conv.remote_jid) || !conv.lead_id) continue;
        const isTest = !!scope.testVariants;
        const nowMs = Date.now();
        const todayYmd = ymdBR(nowMs);
        const bd = (conv.bot_data || {}) as Json;
        // Materiais saindo agora: espera terminar
        if (bd.ai_materials_busy_until && Date.parse(bd.ai_materials_busy_until) > nowMs) continue;

        const { history, msgs, historySince } = await loadJourneyMessages(supabase, conv);
        const plan = nextJourneyAction(cfg, msgs, nowMs);
        if (!plan.action) continue;
        if (plan.action.kind !== "lost" && !inSendWindowBR(nowMs)) continue;

        // Só leads ainda em negociação
        const { data: lead } = await supabase.from("campaign_leads").select("id, name, status, responsavel_id").eq("id", conv.lead_id).maybeSingle();
        if (!lead || !OPEN_STATUSES.includes(lead.status)) continue;
        // Visita marcada: quem acompanha é a confirmação de visita
        const { data: visits } = await supabase.from("lead_visits").select("id").eq("lead_id", lead.id).gte("data_visita", todayYmd)
          .in("status_visita", ["agendada", "confirmada", "remarcada"]).limit(1);
        if ((visits || []).length > 0) continue;
        if (await isConversationPaused(supabase, conv.id)) continue;
        if (!(await claim(supabase, conv.id, nowMs))) continue;

        if (plan.action.kind === "lost") {
          await markLost(supabase, lead, conv, instance.company_id, `${plan.why} sem resposta do cliente`);
          lost++;
          continue;
        }

        const model = (isTest && settings.test_model) ? settings.test_model : (settings.model || DEFAULT_AI_MODEL);
        const turns: ChatTurn[] = history
          .map((m) => ({
            role: m.from_me ? "assistant" as const : "user" as const,
            content: m.message_type && m.message_type !== "text"
              ? `${MEDIA_TEXT[m.message_type] || "[arquivo]"}${m.content && !/^\[|^📄/.test(m.content) ? ` ${m.content}` : ""}`
              : String(m.content || ""),
          }))
          .filter((t) => t.content.trim());
        const previousAssistant = history.filter((m) => m.from_me).map((m) => String(m.content || ""));
        // Materiais: só os que o WhatsApp confirmou (mesma regra das respostas da Bia)
        const sentMaterials = new Set<MaterialKind>(
          Object.entries((bd.ai_materials_sent || {}) as Record<string, unknown>)
            .filter(([k, v]) => ["fotos", "video", "pacotes"].includes(k) && typeof v === "string" &&
              Date.parse(v) >= nowMs - MATERIAL_WINDOW_MS && (!historySince || v >= historySince))
            .map(([k]) => k as MaterialKind),
        );
        const partyYmd = typeof bd.data_festa === "string" && bd.data_festa >= todayYmd ? bd.data_festa : null;
        const promo = findPromotion(settings.extra_instructions, todayYmd);
        const instruction = followUpInstruction({
          kind: plan.action.kind,
          stepNumber: plan.action.kind === "step" ? plan.action.index + 1 : undefined,
          stepsTotal: cfg.steps.length,
          goal: plan.action.kind === "step" ? cfg.steps[plan.action.index].goal : undefined,
          silenceMs: nowMs - (plan.anchorMs as number),
          todayYmd,
          clientName: bd.nome || conv.contact_name || lead.name,
          birthdayName: bd.aniversariante || null,
          partyYmd,
          partyMonth: bd.mes || null,
          guests: bd.convidados || null,
          partyDateFree: partyYmd ? await partyDateFreeSlots(supabase, settings, instance.company_id, partyYmd) : null,
          promoLine: promo
            ? `PROMOÇÃO EM VIGOR (pode citar uma vez, se combinar com o objetivo): ${promo.title} — vai até ${formatDateLong(promo.endYmd)} (${promoCountdown(promo)}); regras nas informações do buffet.${promo.partyYear ? ` Só para festas em ${promo.partyYear}.` : ""}`
            : null,
          valuesAlreadyGiven: previousAssistant.some((t) => /R\$/.test(t)),
          materialsSent: [...sentMaterials],
        });
        const system = `Você é a assistente virtual do ${companyName} no WhatsApp, escrevendo uma mensagem de acompanhamento para um cliente que parou de responder. Português do Brasil, tom caloroso e natural, mensagens curtas como no WhatsApp, 1 a 3 emojis. Hoje é ${formatDateLong(todayYmd)} (${todayYmd}). Datas sempre por extenso ("sábado, 26 de dezembro").${settings.extra_instructions ? `\n\nINFORMAÇÕES DO BUFFET (fonte única de fatos; siga o jeito/personalidade descrito aqui):\n${settings.extra_instructions}` : ""}`;
        const session = createLlmSession({ model, system, history: mergeConsecutiveTurns(turns).merged, tools: [], openaiKey, anthropicKey });
        if (!session) {
          errors.push(`sem chave para ${model}`);
          continue;
        }
        session.addUserNote(instruction);
        let check: ReturnType<typeof checkFollowUpText> | null = null;
        for (let attempt = 0; attempt < 2; attempt++) {
          const step = await session.step();
          await supabase.from("ai_agent_usage").insert({
            company_id: instance.company_id,
            conversation_id: conv.id,
            lead_id: lead.id,
            provider: providerForModel(step.servedModel || model),
            model: step.servedModel || model,
            kind: "chat",
            input_tokens: step.usage.inputTokens,
            cached_input_tokens: step.usage.cachedInputTokens,
            cache_write_tokens: step.usage.cacheWriteTokens,
            output_tokens: step.usage.outputTokens,
            cost_usd: estimateChatCostUsd(step.servedModel || model, step.usage),
            is_test: isTest,
          });
          if (step.refused) break;
          check = checkFollowUpText(step.text, { previousAssistantTexts: previousAssistant, sentMaterials, todayYmd });
          if (check.ok) break;
          console.warn(`[ai-journey] Texto recusado (conv ${conv.id}): ${check.problem}`);
          session.addUserNote(`Sua mensagem NÃO foi enviada: ${check.problem}. Escreva de novo, corrigida, só o texto para o cliente.`);
        }
        if (!check?.ok) {
          errors.push(`conv ${conv.id}: mensagem da jornada não aprovada (${check?.problem || "recusa do modelo"})`);
          await blockFor(supabase, conv.id, 12 * 3600000); // tenta de novo só daqui a 12h
          continue;
        }

        if (sent > 0) await sleep(8000 + Math.floor(Math.random() * 7000)); // ritmo entre envios, como os follow-ups fixos

        // Último instante: o cliente (ou a equipe) falou enquanto a mensagem era escrita? Não manda.
        const { data: fresh } = await supabase.from("wapi_conversations")
          .select("last_message_at, last_message_from_me, bot_step, bot_enabled, bot_data").eq("id", conv.id).maybeSingle();
        if (!fresh || fresh.last_message_from_me !== true || fresh.bot_step !== "ai_agent" || fresh.bot_enabled !== true ||
          (fresh.bot_data as Json | null)?.ai_agent !== "on" || fresh.last_message_at !== conv.last_message_at) {
          console.log(`[ai-journey] Conversa ${conv.id} mudou enquanto a mensagem era escrita — não enviada`);
          continue;
        }
        const label = followupLabel(plan.action) as string;
        const sinceIso = new Date().toISOString();
        const messageId = await sendText(instance, conv, check.text);
        if (messageId === null) {
          errors.push(`conv ${conv.id}: envio falhou`);
          continue;
        }
        sent++;
        if (!(await tagFollowUp(supabase, conv.id, messageId, check.text, sinceIso, label))) {
          // Sem a marca, a próxima rodada não saberia que esta saiu: bloqueia a conversa
          console.error(`[ai-journey] Mensagem enviada mas não marcada como ${label} (conv ${conv.id}) — jornada pausada 7 dias nesta conversa`);
          await blockFor(supabase, conv.id, 7 * 86400000);
        }
        await supabase.from("lead_history").insert({
          lead_id: lead.id,
          company_id: instance.company_id,
          user_id: null,
          user_name: "Bia (IA)",
          action: label === "inatividade" ? "Lembrete da Bia (cliente parou de responder)" : `Follow-up da Bia #${label.replace("etapa_", "")}`,
          new_value: check.text.slice(0, 500),
        });
        console.log(`[ai-journey] ${plan.why} — enviado (conv ${conv.id}, ${instance.unit})`);
      } catch (err) {
        console.error(`[ai-journey] Erro na conversa ${conv.id}:`, err);
        errors.push(`conv ${conv.id}: ${String(err)}`);
      }
    }
  }
  return { sent, lost, errors };
}
