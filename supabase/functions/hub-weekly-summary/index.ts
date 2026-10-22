// Resumo da semana do Hub, escrito pela IA.
//
// Chamado pelo Painel do Hub (botão "Gerar resumo"), só por admin. Junta os
// números dos últimos 7 dias (hub_dashboard_metrics + hub_health, calculados
// no banco com o acesso de quem pediu) e os motivos de não fechar
// (lead_insights), pede o texto à IA e grava em hub_weekly_summaries.
// Se já existe um resumo dos últimos 10 minutos, devolve esse (sem gastar IA).
//
// Só grava em hub_weekly_summaries e ai_agent_usage.

// deno-lint-ignore-file no-explicit-any

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { estimateChatCostUsd, normalizeOpenAiUsage, openAiReasoningEffortWithTools, providerForModel } from "../_shared/ai-models.ts";
import { buildHubSummaryFacts, HUB_SUMMARY_SYSTEM_PROMPT } from "../_shared/hub-summary.ts";

const MODEL = "gpt-5.4-mini";
const DAY = 24 * 60 * 60 * 1000;
const REUSE_MS = 10 * 60 * 1000;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const url = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const openaiKey = Deno.env.get("OPENAI_API_KEY");
  const db = createClient(url, serviceKey);

  const jwt = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
  const { data: { user } } = jwt ? await db.auth.getUser(jwt) : { data: { user: null } };
  if (!user) return json({ error: "Faça login" }, 401);
  const { data: isAdmin } = await db.rpc("is_admin", { _user_id: user.id });
  if (isAdmin !== true) return json({ error: "Só o administrador do Hub" }, 403);

  try {
    const { data: recent } = await db
      .from("hub_weekly_summaries")
      .select("*")
      .gte("created_at", new Date(Date.now() - REUSE_MS).toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (recent) return json({ summary: recent, reused: true });

    if (!openaiKey) throw new Error("OPENAI_API_KEY ausente");

    const now = new Date();
    const periodTo = now.toISOString();
    const periodFrom = new Date(now.getTime() - 7 * DAY).toISOString();
    const brt = new Date(now.getTime() - 3 * 60 * 60 * 1000); // relógio de Brasília
    const todayStart = new Date(Date.UTC(brt.getUTCFullYear(), brt.getUTCMonth(), brt.getUTCDate(), 3)); // meia-noite de Brasília

    // Números com o acesso de quem pediu (as funções do banco checam auth.uid())
    const asUser = createClient(url, anonKey, { global: { headers: { Authorization: `Bearer ${jwt}` } } });
    const [dashboardRes, healthRes, insightsRes] = await Promise.all([
      asUser.rpc("hub_dashboard_metrics", { p_from: periodFrom, p_to: periodTo, p_today_start: todayStart.toISOString() }),
      asUser.rpc("hub_health"),
      db.from("lead_insights").select("company_id, motivo").gte("analyzed_at", periodFrom).limit(2000),
    ]);
    if (dashboardRes.error) throw dashboardRes.error;
    if (healthRes.error) throw healthRes.error;

    const facts = buildHubSummaryFacts({
      dashboard: dashboardRes.data,
      health: (healthRes.data as any[]) || [],
      insights: (insightsRes.data as any[]) || [],
      periodFrom,
      periodTo,
    });

    const body: Record<string, unknown> = {
      model: MODEL,
      messages: [
        { role: "system", content: HUB_SUMMARY_SYSTEM_PROMPT },
        { role: "user", content: `Números da semana (JSON):\n${JSON.stringify(facts)}` },
      ],
      max_completion_tokens: 900,
    };
    const effort = openAiReasoningEffortWithTools(MODEL);
    if (effort) body.reasoning_effort = effort;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 45_000);
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
    const content = String(result?.choices?.[0]?.message?.content || "").trim();
    if (!content) throw new Error("IA não devolveu texto");
    const model = String(result.model || MODEL);
    const usage = normalizeOpenAiUsage(result.usage);

    // Consumo de IA fica na empresa principal da rede (ai_agent_usage exige empresa)
    const { data: parent } = await db.from("companies").select("id").is("parent_id", null).order("created_at").limit(1).maybeSingle();
    if (parent?.id) {
      await db.from("ai_agent_usage").insert({
        company_id: parent.id,
        conversation_id: null,
        lead_id: null,
        provider: providerForModel(model),
        model,
        kind: "hub_summary",
        input_tokens: usage.inputTokens,
        cached_input_tokens: usage.cachedInputTokens,
        cache_write_tokens: usage.cacheWriteTokens,
        output_tokens: usage.outputTokens,
        cost_usd: estimateChatCostUsd(model, usage),
        is_test: false,
      });
    }

    const { data: saved, error: saveError } = await db
      .from("hub_weekly_summaries")
      .insert({ created_by: user.id, period_from: periodFrom, period_to: periodTo, content, facts, model })
      .select("*")
      .single();
    if (saveError) throw saveError;

    return json({ summary: saved, reused: false });
  } catch (err) {
    console.error("[hub-weekly-summary]", err);
    return json({ error: "Não foi possível gerar o resumo agora" }, 500);
  }
});
