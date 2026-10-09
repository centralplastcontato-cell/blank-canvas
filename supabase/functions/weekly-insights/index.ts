// Inteligência com IA (módulo "inteligencia_ia", ligado por empresa no Hub).
//
// 1. Lê as conversas que esfriaram (pararam há 3 a 14 dias, lead não fechado)
//    e grava em lead_insights o motivo de não ter fechado, o que o cliente
//    perguntou e o que travou. Cada conversa é lida uma vez só.
// 2. Toda segunda manda para o WhatsApp do dono (handoff_alert_phone da
//    Configurar IA) o resumo da semana anterior, saindo do número da própria
//    empresa — igual ao alerta de passagem.
//
// Chamadas:
// - Pela tela (usuário logado com acesso à empresa): analisa agora. Admin
//   pode pedir { send_summary: true } para receber o resumo de teste.
// - Pelo agendamento (chave pública): só roda na segunda de manhã e uma vez
//   por empresa por semana (weekly_insight_runs), então chamar de novo não
//   gasta nada nem manda mensagem repetida.
//
// Só grava em lead_insights, weekly_insight_runs e ai_agent_usage, com a
// trava de escrita da IA (nada de festas, contratos ou financeiro).

// deno-lint-ignore-file no-explicit-any

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { AI_ACTOR, AI_ACTOR_HEADER, guardAiDb } from "../wapi-webhook/ai-db-guard.ts";
import { estimateChatCostUsd, normalizeOpenAiUsage, openAiReasoningEffortWithTools, providerForModel } from "../_shared/ai-models.ts";
import {
  aggregateInsights,
  buildTranscript,
  formatWeeklySummary,
  INSIGHT_JSON_SCHEMA,
  INSIGHT_SYSTEM_PROMPT,
  isInsightsEnabled,
  isWeeklySendWindow,
  type LeadInsight,
  normalizeInsight,
  previousWeekBRT,
  quickInsight,
  type TranscriptMessage,
} from "../_shared/lead-insights.ts";

const MODEL = "gpt-5.4-mini";
const DAY = 24 * 60 * 60 * 1000;
const LOOKBACK_MS = 14 * DAY; // conversa que parou nos últimos 14 dias...
const QUIET_MS = 3 * DAY; // ...e está parada há pelo menos 3
const MAX_PER_RUN = 150;
const CONCURRENCY = 6;
const TIME_BUDGET_MS = 110_000;
const MESSAGES_PER_LEAD = 80;
const IDS_PER_REQUEST = 150;
const NOT_ANALYZED = ["fechado", "transferido", "trabalhe_conosco", "fornecedor", "outros"];
const EXCLUDED_LEADS = '("transferido","trabalhe_conosco","fornecedor","outros")';
const OPEN_STATUSES = ["novo", "em_contato", "orcamento_enviado", "aguardando_resposta", "cliente_retorno"];

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

// ---------------- Análise das conversas ----------------

interface Candidate {
  leadId: string;
  status: string;
  conversationId: string;
  lastMessageAt: string;
}

async function findCandidates(db: any, companyId: string, nowMs: number): Promise<Candidate[]> {
  const from = new Date(nowMs - LOOKBACK_MS).toISOString();
  const to = new Date(nowMs - QUIET_MS).toISOString();

  // Conversas que pararam na janela
  const convs: Array<{ id: string; lead_id: string; last_message_at: string }> = [];
  for (let page = 0; page < 5; page++) {
    const { data, error } = await db
      .from("wapi_conversations")
      .select("id, lead_id, last_message_at")
      .eq("company_id", companyId)
      .gte("last_message_at", from)
      .lte("last_message_at", to)
      .not("lead_id", "is", null)
      .eq("is_equipe", false)
      .eq("is_freelancer", false)
      .order("last_message_at", { ascending: false })
      .range(page * 1000, page * 1000 + 999);
    if (error) throw error;
    convs.push(...(data || []));
    if (!data || data.length < 1000) break;
  }
  const latest = new Map<string, { id: string; last_message_at: string }>();
  for (const c of convs) {
    const cur = latest.get(c.lead_id);
    if (!cur || cur.last_message_at < c.last_message_at) latest.set(c.lead_id, c);
  }
  const leadIds = [...latest.keys()];

  const active = new Set<string>(); // falou em outro número depois da janela
  const statusOf = new Map<string, string>();
  const analyzedUpTo = new Map<string, string>();
  for (const ids of chunk(leadIds, IDS_PER_REQUEST)) {
    const [recent, leads, done] = await Promise.all([
      db.from("wapi_conversations").select("lead_id").eq("company_id", companyId).in("lead_id", ids).gt("last_message_at", to),
      db.from("campaign_leads").select("id, status").eq("company_id", companyId).in("id", ids),
      db.from("lead_insights").select("lead_id, last_message_at").in("lead_id", ids),
    ]);
    if (recent.error) throw recent.error;
    if (leads.error) throw leads.error;
    if (done.error) throw done.error;
    for (const r of recent.data || []) active.add(r.lead_id);
    for (const l of leads.data || []) statusOf.set(l.id, l.status);
    for (const d of done.data || []) if (d.last_message_at) analyzedUpTo.set(d.lead_id, d.last_message_at);
  }

  return leadIds
    .filter((id) => {
      const status = statusOf.get(id);
      if (!status || NOT_ANALYZED.includes(status) || active.has(id)) return false;
      const done = analyzedUpTo.get(id);
      return !done || new Date(done).getTime() < new Date(latest.get(id)!.last_message_at).getTime();
    })
    .map((id) => ({ leadId: id, status: statusOf.get(id)!, conversationId: latest.get(id)!.id, lastMessageAt: latest.get(id)!.last_message_at }))
    .sort((a, b) => b.lastMessageAt.localeCompare(a.lastMessageAt));
}

async function classify(transcript: string, openaiKey: string): Promise<{ insight: LeadInsight | null; usage: ReturnType<typeof normalizeOpenAiUsage>; model: string }> {
  const body: Record<string, unknown> = {
    model: MODEL,
    messages: [
      { role: "system", content: INSIGHT_SYSTEM_PROMPT },
      { role: "user", content: `Conversa:\n${transcript}` },
    ],
    response_format: { type: "json_schema", json_schema: { name: "analise_lead", strict: true, schema: INSIGHT_JSON_SCHEMA } },
    max_completion_tokens: 800,
  };
  const effort = openAiReasoningEffortWithTools(MODEL);
  if (effort) body.reasoning_effort = effort;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 40_000);
  let res: Response;
  try {
    res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${openaiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
  if (!res.ok) throw new Error(`OpenAI ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const result = await res.json() as Record<string, any>;
  let parsed: unknown = null;
  try {
    parsed = JSON.parse(String(result?.choices?.[0]?.message?.content || ""));
  } catch {
    parsed = null;
  }
  return { insight: normalizeInsight(parsed), usage: normalizeOpenAiUsage(result.usage), model: String(result.model || MODEL) };
}

interface AnalyzeResult {
  analyzed: number;
  quick: number;
  skipped: number;
  failed: number;
  pending: number;
}

async function analyzeCompany(db: any, companyId: string, deadline: number): Promise<AnalyzeResult> {
  const openaiKey = Deno.env.get("OPENAI_API_KEY") || "";
  const queue = (await findCandidates(db, companyId, Date.now())).slice(0, MAX_PER_RUN);
  const result: AnalyzeResult = { analyzed: 0, quick: 0, skipped: 0, failed: 0, pending: 0 };

  const save = async (c: Candidate, insight: LeadInsight, model: string | null) => {
    const { error } = await db.from("lead_insights").upsert({
      company_id: companyId,
      lead_id: c.leadId,
      conversation_id: c.conversationId,
      last_message_at: c.lastMessageAt,
      lead_status: c.status,
      motivo: insight.motivo,
      detalhe: insight.detalhe,
      perguntas: insight.perguntas,
      objecoes: insight.objecoes,
      model,
      analyzed_at: new Date().toISOString(),
    }, { onConflict: "lead_id" });
    if (error) throw error;
  };

  const work = async (c: Candidate) => {
    const { data, error } = await db
      .from("wapi_messages")
      .select("from_me, content, message_type, timestamp")
      .eq("conversation_id", c.conversationId)
      .order("timestamp", { ascending: false })
      .limit(MESSAGES_PER_LEAD);
    if (error) throw error;
    const messages = (data || []) as TranscriptMessage[];
    const quick = quickInsight(messages);
    if (quick === "skip") {
      result.skipped++;
      return;
    }
    if (quick) {
      await save(c, quick, null);
      result.quick++;
      return;
    }
    if (!openaiKey) throw new Error("OPENAI_API_KEY ausente");
    const { insight, usage, model } = await classify(buildTranscript(messages), openaiKey);
    await db.from("ai_agent_usage").insert({
      company_id: companyId,
      conversation_id: null, // não conta como conversa atendida pela IA
      lead_id: c.leadId,
      provider: providerForModel(model),
      model,
      kind: "insights",
      input_tokens: usage.inputTokens,
      cached_input_tokens: usage.cachedInputTokens,
      cache_write_tokens: usage.cacheWriteTokens,
      output_tokens: usage.outputTokens,
      cost_usd: estimateChatCostUsd(model, usage),
      is_test: false,
    });
    if (!insight) throw new Error("resposta fora do formato");
    await save(c, insight, model);
    result.analyzed++;
  };

  let next = 0;
  const worker = async () => {
    while (next < queue.length && Date.now() < deadline) {
      const c = queue[next++];
      try {
        await work(c);
      } catch (err) {
        result.failed++;
        console.error(`[weekly-insights] lead ${c.leadId}:`, err instanceof Error ? err.message : err);
      }
    }
  };
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  result.pending = queue.length - next;
  return result;
}

// ---------------- Resumo da semana ----------------

async function headCount(query: any): Promise<number> {
  const { count, error } = await query;
  if (error) throw error;
  return count || 0;
}

async function buildSummary(db: any, company: { id: string; name: string }, now: Date): Promise<string> {
  const w = previousWeekBRT(now);
  const leadsBase = () =>
    db.from("campaign_leads").select("id", { count: "exact", head: true })
      .eq("company_id", company.id)
      .gte("created_at", w.startIso)
      .lte("created_at", w.endIso)
      .not("status", "in", EXCLUDED_LEADS);
  const [allLeads, jobLeads, returned, sales, visitsRes, waitingRes, insightsRes] = await Promise.all([
    headCount(leadsBase()),
    headCount(leadsBase().ilike("unit", "trabalhe conosco")),
    headCount(
      db.from("campaign_leads").select("id", { count: "exact", head: true })
        .eq("company_id", company.id)
        .gte("last_return_at", w.startIso)
        .lte("last_return_at", w.endIso)
        .not("status", "in", EXCLUDED_LEADS),
    ),
    headCount(
      db.from("company_events").select("id", { count: "exact", head: true })
        .eq("company_id", company.id)
        .neq("status", "cancelado")
        .or(
          `and(data_fechamento_venda.gte.${w.start},data_fechamento_venda.lte.${w.end}),` +
          `and(data_fechamento_venda.is.null,created_at.gte."${w.startIso}",created_at.lte."${w.endIso}")`,
        ),
    ),
    db.from("lead_visits").select("status_visita").eq("company_id", company.id).gte("data_visita", w.start).lte("data_visita", w.end).limit(2000),
    db.from("wapi_conversations").select("lead_id, is_closed")
      .eq("company_id", company.id)
      .eq("last_message_from_me", false)
      .gte("last_message_at", new Date(now.getTime() - 7 * DAY).toISOString())
      .lte("last_message_at", new Date(now.getTime() - 30 * 60 * 1000).toISOString())
      .not("lead_id", "is", null)
      .eq("is_equipe", false)
      .eq("is_freelancer", false)
      .limit(1000),
    db.from("lead_insights").select("motivo, perguntas, objecoes")
      .eq("company_id", company.id)
      .gte("analyzed_at", new Date(now.getTime() - 7 * DAY).toISOString())
      .limit(2000),
  ]);
  if (visitsRes.error) throw visitsRes.error;
  if (waitingRes.error) throw waitingRes.error;
  if (insightsRes.error) throw insightsRes.error;

  const visits = (visitsRes.data || []) as Array<{ status_visita: string }>;
  const waitingIds = [...new Set(((waitingRes.data || []) as Array<{ lead_id: string; is_closed: boolean | null }>)
    .filter((c) => !c.is_closed).map((c) => c.lead_id))];
  let waitingNow = 0;
  for (const ids of chunk(waitingIds, IDS_PER_REQUEST)) {
    waitingNow += await headCount(
      db.from("campaign_leads").select("id", { count: "exact", head: true }).in("id", ids).in("status", OPEN_STATUSES),
    );
  }
  const insights = insightsRes.data || [];
  const agg = aggregateInsights(insights);

  return formatWeeklySummary({
    companyName: company.name,
    weekStart: w.start,
    weekEnd: w.end,
    leads: Math.max(0, allLeads - jobLeads),
    returned,
    visitsRealized: visits.filter((v) => v.status_visita === "realizada").length,
    visitsNoShow: visits.filter((v) => v.status_visita === "nao_compareceu").length,
    visitsNoAnswer: visits.filter((v) => ["agendada", "confirmada", "remarcada"].includes(v.status_visita)).length,
    sales,
    waitingNow,
    analyzed: insights.length,
    reasons: agg.reasons,
    questions: agg.questions,
    objections: agg.objections,
  });
}

// ---------------- Envio pelo WhatsApp da própria empresa ----------------

const WAPI_BASE_URL = "https://api.w-api.app/v1";
const ZAPI_BASE_URL = "https://api.z-api.io/instances";

async function sendSummary(db: any, companyId: string, text: string): Promise<{ sent: boolean; error?: string }> {
  const { data: settings } = await db.from("ai_agent_settings").select("unit, handoff_alert_phone").eq("company_id", companyId).maybeSingle();
  let phone = String(settings?.handoff_alert_phone || "").replace(/\D/g, "");
  if (phone.length < 10) return { sent: false, error: "sem telefone do dono na Configurar IA" };
  if (!phone.startsWith("55")) phone = `55${phone}`;

  const { data: instances } = await db
    .from("wapi_instances")
    .select("instance_id, instance_token, client_token, provider, unit")
    .eq("company_id", companyId)
    .eq("is_active", true)
    .eq("status", "connected");
  // Prefere o número da IA (o mesmo do alerta de passagem), depois Z-API
  const sender = ((instances || []) as any[]).sort((a, b) =>
    ((a.unit === settings?.unit ? 0 : 1) - (b.unit === settings?.unit ? 0 : 1)) ||
    ((a.provider === "zapi" ? 0 : 1) - (b.provider === "zapi" ? 0 : 1))
  )[0];
  if (!sender) return { sent: false, error: "nenhum número conectado" };

  try {
    let res: Response;
    if (sender.provider === "zapi") {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (sender.client_token) headers["Client-Token"] = sender.client_token;
      res = await fetch(`${ZAPI_BASE_URL}/${sender.instance_id}/token/${sender.instance_token}/send-text`, {
        method: "POST",
        headers,
        body: JSON.stringify({ phone, message: text }),
      });
    } else {
      res = await fetch(`${WAPI_BASE_URL}/message/send-text?instanceId=${sender.instance_id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${sender.instance_token}` },
        body: JSON.stringify({ phone, message: text }),
      });
    }
    if (!res.ok) return { sent: false, error: (await res.text()).slice(0, 300) };
    return { sent: true };
  } catch (err) {
    return { sent: false, error: String(err) };
  }
}

// ---------------- Entrada ----------------

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const url = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const auth = createClient(url, serviceKey);
  const db = guardAiDb(createClient(url, serviceKey, { global: { headers: { [AI_ACTOR_HEADER]: AI_ACTOR } } }));
  const startedAt = Date.now();

  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const jwt = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
  const { data: { user } } = jwt ? await auth.auth.getUser(jwt) : { data: { user: null } };

  try {
    // ---- Pela tela: analisar agora ----
    if (user) {
      const companyId = typeof body.company_id === "string" ? body.company_id : "";
      if (!companyId) return json({ error: "company_id é obrigatório" }, 400);
      const [{ data: isAdmin }, { data: hasAccess }] = await Promise.all([
        auth.rpc("is_admin", { _user_id: user.id }),
        auth.rpc("user_has_company_access", { _user_id: user.id, _company_id: companyId }),
      ]);
      if (isAdmin !== true && hasAccess !== true) return json({ error: "Sem acesso a esta empresa" }, 403);
      const { data: company } = await db.from("companies").select("id, name, settings").eq("id", companyId).maybeSingle();
      if (!company || !isInsightsEnabled(company.settings)) return json({ error: "Módulo Inteligência com IA desligado para esta empresa" }, 403);

      const result = await analyzeCompany(db, companyId, startedAt + TIME_BUDGET_MS);
      let summary: { text: string; sent: boolean; error?: string } | null = null;
      if (body.send_summary === true && isAdmin === true) {
        const text = await buildSummary(db, company, new Date());
        summary = { text, ...(await sendSummary(db, companyId, text)) };
      }
      return json({ ...result, summary });
    }

    // ---- Pelo agendamento: resumo de segunda, uma vez por semana ----
    const now = new Date();
    if (!isWeeklySendWindow(now)) return json({ ok: true, skipped: "fora do horário" });
    const week = previousWeekBRT(now);
    const { data: companies, error } = await db.from("companies").select("id, name, settings").eq("is_active", true);
    if (error) throw error;
    for (const company of (companies || []).filter((c: any) => isInsightsEnabled(c.settings))) {
      const { error: claimError } = await db.from("weekly_insight_runs").insert({ company_id: company.id, week_start: week.start });
      if (claimError) continue; // já rodou esta semana
      try {
        const result = await analyzeCompany(db, company.id, startedAt + TIME_BUDGET_MS);
        const text = await buildSummary(db, company, now);
        const sent = await sendSummary(db, company.id, text);
        await db.from("weekly_insight_runs").update({
          finished_at: new Date().toISOString(),
          analyzed: result.analyzed + result.quick,
          summary_sent: sent.sent,
          summary_text: text,
          error: sent.error || null,
        }).eq("company_id", company.id).eq("week_start", week.start);
      } catch (err) {
        await db.from("weekly_insight_runs").update({ finished_at: new Date().toISOString(), error: String(err).slice(0, 500) })
          .eq("company_id", company.id).eq("week_start", week.start);
      }
    }
    return json({ ok: true });
  } catch (err) {
    console.error("[weekly-insights]", err);
    return json({ error: "Erro na análise" }, 500);
  }
});
