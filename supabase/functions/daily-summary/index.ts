import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// AI generation windows in BRT hours
const AI_WINDOWS = [12, 17, 22];

/** Given current BRT hour, return the most recent window that has passed, or null if none yet */
function getMostRecentWindow(brtHour: number): number | null {
  for (let i = AI_WINDOWS.length - 1; i >= 0; i--) {
    if (brtHour >= AI_WINDOWS[i]) return AI_WINDOWS[i];
  }
  return null;
}

/** Check if AI should be regenerated based on windows */
function shouldRegenerateAI(
  forceRefresh: boolean,
  existingAiSummary: string | null,
  aiGeneratedAt: string | null,
  brtNow: Date,
): boolean {
  if (forceRefresh) return true;

  const brtHour = brtNow.getUTCHours();
  const currentWindow = getMostRecentWindow(brtHour);

  // Before first window (before 12h BRT) — don't generate automatically
  if (currentWindow === null) return false;

  // No existing summary — generate if we're past the first window
  if (!existingAiSummary) return true;

  // Have existing summary — check if we've entered a new window since last generation
  if (!aiGeneratedAt) return true;

  const lastGenDate = new Date(aiGeneratedAt);
  const lastGenBrt = new Date(lastGenDate.getTime() + (-3) * 60 * 60 * 1000);
  const lastGenHour = lastGenBrt.getUTCHours();
  const lastGenWindow = getMostRecentWindow(lastGenHour);

  // Check if last gen was on a different day (BRT)
  const lastGenDay = lastGenBrt.toISOString().slice(0, 10);
  const currentDay = brtNow.toISOString().slice(0, 10);
  if (lastGenDay !== currentDay) return true;

  // Same day — regenerate only if we entered a newer window
  return currentWindow !== lastGenWindow;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Service role client for persisting summaries
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }

    const { company_id, date: requestedDate, force_refresh } = await req.json();
    if (!company_id) {
      return new Response(JSON.stringify({ error: "company_id required" }), { status: 400, headers: corsHeaders });
    }

    // Use São Paulo timezone (UTC-3) for "today"
    const BRT_OFFSET = -3;
    const now = new Date();
    const brtNow = new Date(now.getTime() + BRT_OFFSET * 60 * 60 * 1000);
    const todayStr = brtNow.toISOString().slice(0, 10); // YYYY-MM-DD

    // If a past date was requested WITHOUT force_refresh, fetch from saved history
    const isHistoricalDate = requestedDate && requestedDate !== todayStr;
    if (isHistoricalDate && !force_refresh) {
      const { data: saved, error: savedErr } = await supabase
        .from("daily_summaries")
        .select("metrics, ai_summary, timeline, incomplete_leads, user_note")
        .eq("company_id", company_id)
        .eq("summary_date", requestedDate)
        .maybeSingle();

      if (savedErr) {
        return new Response(JSON.stringify({ error: savedErr.message }), { status: 500, headers: corsHeaders });
      }

      if (!saved) {
        return new Response(JSON.stringify({
          metrics: { novos: 0, visitas: 0, orcamentos: 0, fechados: 0, querPensar: 0, querHumano: 0, taxaConversao: 0, followUp24h: 0, followUp48h: 0, followUp3: 0, followUp4: 0 },
          aiSummary: null,
          timeline: [],
          incompleteLeads: [],
          followUpLeads: [],
          isHistorical: true,
          noData: true,
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      return new Response(JSON.stringify({
        metrics: saved.metrics,
        aiSummary: saved.ai_summary,
        timeline: saved.timeline || [],
        incompleteLeads: saved.incomplete_leads || [],
        followUpLeads: [],
        userNote: saved.user_note || null,
        isHistorical: true,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // === Generate live summary (for today OR historical with force_refresh) ===
    const targetDateStr = isHistoricalDate ? requestedDate : todayStr;
    const targetDateParts = targetDateStr.split("-").map(Number);
    const targetStart = new Date(Date.UTC(targetDateParts[0], targetDateParts[1] - 1, targetDateParts[2], -BRT_OFFSET, 0, 0, 0));
    const targetEnd = new Date(targetStart.getTime() + 24 * 60 * 60 * 1000);
    const targetStartISO = targetStart.toISOString();
    const targetEndISO = targetEnd.toISOString();

    // Fetch leads created in target date range
    let leadsQuery = supabase
      .from("campaign_leads")
      .select("id, name, status, whatsapp, created_at")
      .eq("company_id", company_id)
      .gte("created_at", targetStartISO);
    if (isHistoricalDate) leadsQuery = leadsQuery.lt("created_at", targetEndISO);
    const { data: todayLeads } = await leadsQuery;

    const novos = (todayLeads || []).length;

    // Fetch ALL status change events in target date range
    let histQuery = supabase
      .from("lead_history")
      .select("lead_id, action, new_value, created_at")
      .eq("company_id", company_id)
      .gte("created_at", targetStartISO)
      .in("action", ["status_change", "Alteracao de status"]);
    if (isHistoricalDate) histQuery = histQuery.lt("created_at", targetEndISO);
    const { data: statusChanges } = await histQuery;

    // Count transitions by new_value
    const orcamentoLeadIds = new Set<string>();
    let fechados = 0;
    const activeLeadIds = new Set<string>();

    for (const ev of (statusChanges || [])) {
      const nv = (ev.new_value || "").toLowerCase().replace(/\s+/g, "_");
      if (nv === "orcamento_enviado" || nv === "orçamento_enviado") {
        orcamentoLeadIds.add(ev.lead_id);
      }
      if (nv === "fechado") fechados++;
      activeLeadIds.add(ev.lead_id);
    }

    // Also add today's leads to the active set
    for (const l of (todayLeads || [])) {
      activeLeadIds.add(l.id);
    }

    const allActiveIds = [...activeLeadIds];

    // Fetch conversations for active leads to get bot_data
    let conversations: any[] = [];
    if (allActiveIds.length > 0) {
      const { data: convs } = await supabase
        .from("wapi_conversations")
        .select("lead_id, bot_data, bot_step")
        .eq("company_id", company_id)
        .in("lead_id", allActiveIds);
      conversations = convs || [];
    }

    const completedBotSteps = ["complete_final", "flow_complete", "proximo_passo", "proximo_passo_reminded"];
    // Build convMap preferring conversations that have a bot_step (avoid null overwriting valid data)
    const convMap = new Map<string, any>();
    for (const c of conversations) {
      const existing = convMap.get(c.lead_id);
      if (!existing || (!existing.bot_step && c.bot_step) || (c.bot_step && c.last_message_at > (existing.last_message_at || ''))) {
        convMap.set(c.lead_id, c);
      }
    }

    for (const id of allActiveIds) {
      const conv = convMap.get(id);
      if (conv && completedBotSteps.includes(conv.bot_step)) {
        orcamentoLeadIds.add(id);
      }
    }

    if ((todayLeads || []).length > 0) {
      const todayLeadIdsNotActive = (todayLeads || [])
        .map((l: any) => l.id)
        .filter((id: string) => !convMap.has(id));
      if (todayLeadIdsNotActive.length > 0) {
        const { data: extraConvs } = await supabase
          .from("wapi_conversations")
          .select("lead_id, bot_data, bot_step")
          .eq("company_id", company_id)
          .in("lead_id", todayLeadIdsNotActive)
          .in("bot_step", completedBotSteps);
        for (const c of (extraConvs || [])) {
          orcamentoLeadIds.add(c.lead_id);
          convMap.set(c.lead_id, c);
        }
      }
    }

    const orcamentos = orcamentoLeadIds.size;

    // Mutually exclusive decision categories using Sets to avoid double counting
    const visitaIds = new Set<string>();
    const pensarIds = new Set<string>();
    const humanoIds = new Set<string>();

    for (const id of allActiveIds) {
      const conv = convMap.get(id);
      const lead = (todayLeads || []).find((l: any) => l.id === id);
      const leadStatus = lead?.status || "";

      // PRIORITY: CRM status em_contato = real action (visit scheduled), overrides bot data
      if (leadStatus === "em_contato") {
        visitaIds.add(id);
        continue;
      }

      // Then check proximo_passo from bot_data (mutually exclusive)
      const pp = (conv?.bot_data as any)?.proximo_passo;
      if (pp) {
        const ppNorm = String(pp).toLowerCase();
        if (pp === "1" || ppNorm.includes("agendar") || ppNorm.includes("visita")) {
          visitaIds.add(id);
          continue;
        }
        if (pp === "3" || ppNorm.includes("analisar") || ppNorm.includes("pensar")) {
          pensarIds.add(id);
          continue;
        }
        if (pp === "2" || ppNorm.includes("dúvida") || ppNorm.includes("duvida") || ppNorm.includes("humano")) {
          humanoIds.add(id);
          continue;
        }
      }
    }

    const visitas = visitaIds.size;
    const querPensar = pensarIds.size;
    const querHumano = humanoIds.size;

    const taxaConversao = novos > 0 ? Math.round((fechados / novos) * 100) : 0;

    const metrics: Record<string, any> = { novos, visitas, orcamentos, fechados, querPensar, querHumano, taxaConversao };

    const leads = todayLeads || [];
    const leadIds = leads.map((l: any) => l.id);

    // Fetch intelligence data for active leads
    let intelligenceData: any[] = [];
    const allIntelIds = [...new Set([...allActiveIds, ...leadIds])];
    if (allIntelIds.length > 0) {
      const { data: intel } = await supabase
        .from("lead_intelligence")
        .select("lead_id, score, temperature, abandonment_type")
        .in("lead_id", allIntelIds);
      intelligenceData = intel || [];
    }

    const intelMap = new Map(intelligenceData.map((i: any) => [i.lead_id, i]));

    // Fetch all history events in target date range for timeline
    let timelineQuery = supabase
      .from("lead_history")
      .select("lead_id, action, old_value, new_value, user_name, created_at")
      .eq("company_id", company_id)
      .gte("created_at", targetStartISO)
      .order("created_at", { ascending: true })
      .limit(100);
    if (isHistoricalDate) timelineQuery = timelineQuery.lt("created_at", targetEndISO);
    const { data: historyEvents } = await timelineQuery;

    const leadNameMap = new Map(leads.map((l: any) => [l.id, l.name]));
    const historyLeadIds = [...new Set((historyEvents || []).map((e: any) => e.lead_id))];
    let allLeadNames = new Map(leadNameMap);
    if (historyLeadIds.length > 0) {
      const missingIds = historyLeadIds.filter((id: string) => !allLeadNames.has(id));
      if (missingIds.length > 0) {
        const { data: extraLeads } = await supabase
          .from("campaign_leads")
          .select("id, name")
          .in("id", missingIds);
        (extraLeads || []).forEach((l: any) => allLeadNames.set(l.id, l.name));
      }
    }

    const BOT_STEP_LABELS: Record<string, string> = {
      welcome: "Boas-vindas", nome: "Pergunta do nome", tipo: "Tipo de evento",
      mes: "Mês da festa", dia: "Dia da festa", convidados: "Quantidade de convidados",
      unidade: "Unidade", next_step: "Próximo passo", complete_visit: "Agendou visita",
      complete_questions: "Tirar dúvidas", complete_analyze: "Vai pensar",
      complete_final: "Conversa finalizada", work_here: "Trabalhe conosco",
      proximo_passo: "Escolhendo próximo passo", proximo_passo_reminded: "Aguardando resposta",
      flow_complete: "Fluxo completo",
      lp_sent: "Recebeu link da LP",
    };

    const PROXIMO_PASSO_LABELS: Record<string, string> = {
      "1": "Agendar visita", "2": "Tirar dúvidas", "3": "Analisar com calma",
    };

    // Build synthetic lead_created events for today's leads
    const syntheticEvents = (todayLeads || []).map((l: any) => ({
      lead_id: l.id,
      action: "lead_created",
      old_value: null,
      new_value: null,
      user_name: null,
      created_at: l.created_at,
    }));

    // Merge history events with synthetic events and sort by time
    const allTimelineEvents = [...(historyEvents || []), ...syntheticEvents]
      .sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

    const timeline = allTimelineEvents.map((e: any, index: number) => {
      const conv = convMap.get(e.lead_id);
      const botStep = conv?.bot_step || null;
      const botStepLabel = botStep ? (BOT_STEP_LABELS[botStep] || botStep) : null;
      const proximoPasso = (conv?.bot_data as any)?.proximo_passo;
      const proximoPassoLabel = proximoPasso ? (PROXIMO_PASSO_LABELS[proximoPasso] || proximoPasso) : null;

      const eventDate = new Date(e.created_at);
      const brtTime = new Date(eventDate.getTime() + BRT_OFFSET * 60 * 60 * 1000);
      const timeStr = brtTime.toISOString().slice(11, 16);

      return {
        index: index + 1, time: timeStr,
        leadId: e.lead_id,
        leadName: allLeadNames.get(e.lead_id) || "Lead",
        action: e.action, oldValue: e.old_value, newValue: e.new_value,
        userName: e.user_name, botStep: botStepLabel, proximoPasso: proximoPassoLabel,
      };
    });

    // === AI Summary with window-based generation ===
    const openaiKey = Deno.env.get("OPENAI_API_KEY");
    let aiSummary: string | null = null;
    let aiGeneratedAt: string | null = null;

    // Fetch existing saved data for today (ai_summary, ai_generated_at, user_note)
    let existingSaved: any = null;
    try {
      const { data: existing } = await supabase
        .from("daily_summaries")
        .select("ai_summary, ai_generated_at, user_note")
        .eq("company_id", company_id)
        .eq("summary_date", targetDateStr)
        .maybeSingle();
      existingSaved = existing;
    } catch (_) {}

    const userNote = existingSaved?.user_note || null;
    const existingAiSummary = existingSaved?.ai_summary || null;
    const existingAiGeneratedAt = existingSaved?.ai_generated_at || null;

    // Pre-fetch ai_context for the AI prompt
    const { data: aiContextRows } = await supabaseAdmin
      .from("wapi_bot_settings")
      .select("ai_context")
      .eq("company_id", company_id);
    const customAiContext = (aiContextRows || [])
      .map((r: any) => r.ai_context)
      .filter(Boolean)
      .join("\n");

    const shouldGenerate = openaiKey && shouldRegenerateAI(
      !!force_refresh,
      existingAiSummary,
      existingAiGeneratedAt,
      brtNow,
    );

    if (shouldGenerate) {
      // === Compute 30-day benchmarks from historical daily_summaries ===
      const thirtyDaysAgo = new Date(brtNow.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      const { data: last30Summaries } = await supabase
        .from("daily_summaries")
        .select("metrics")
        .eq("company_id", company_id)
        .gte("summary_date", thirtyDaysAgo)
        .neq("summary_date", targetDateStr);

      let benchmarkBlock = "";
      if (last30Summaries && last30Summaries.length >= 3) {
        const days = last30Summaries.length;
        let totalNovos = 0, totalOrcamentos = 0, totalFechados = 0, totalVisitas = 0;
        for (const s of last30Summaries) {
          const m = s.metrics as any;
          if (!m) continue;
          totalNovos += m.novos || 0;
          totalOrcamentos += m.orcamentos || 0;
          totalFechados += m.fechados || 0;
          totalVisitas += m.visitas || 0;
        }
        const avgNovos = (totalNovos / days).toFixed(1);
        const avgOrcamentos = (totalOrcamentos / days).toFixed(1);
        const avgFechados = (totalFechados / days).toFixed(1);
        const avgVisitas = (totalVisitas / days).toFixed(1);
        const avgConversao = totalNovos > 0 ? ((totalFechados / totalNovos) * 100).toFixed(1) : "0";

        benchmarkBlock = `
BENCHMARKS DA EMPRESA (média dos últimos ${days} dias):
- Média diária: ${avgNovos} leads novos, ${avgOrcamentos} orçamentos, ${avgFechados} fechados, ${avgVisitas} visitas
- Taxa de conversão média: ${avgConversao}%
- Compare o dia atual com essas médias para dar contexto realista (acima/abaixo da média).
`;
      }

      const hotLeads = intelligenceData
        .filter((i: any) => i.temperature === "quente" || i.temperature === "pronto")
        .map((i: any) => `${allLeadNames.get(i.lead_id) || "Lead"} (score: ${i.score}, temp: ${i.temperature})`);

      const atRisk = intelligenceData
        .filter((i: any) => i.abandonment_type)
        .map((i: any) => `${allLeadNames.get(i.lead_id) || "Lead"} (${i.abandonment_type})`);

      const customContextBlock = customAiContext
        ? `\nCONTEXTO PERSONALIZADO DESTA EMPRESA:\n${customAiContext}\n`
        : "";

      const prompt = `Você é um consultor especialista no mercado de buffet de festas infantis.

CONTEXTO IMPORTANTE DO SETOR:
- O ciclo de venda de buffet infantil é naturalmente longo (dias a semanas). Os pais pesquisam vários buffets antes de decidir.
- É normal receber muitos leads e orçamentos com poucos fechamentos no mesmo dia. Isso NÃO é um problema.
- Uma taxa de conversão de 5-15% sobre o total de leads é considerada saudável neste mercado.
- O volume de leads novos e orçamentos enviados são indicadores positivos de demanda.
- "Quer pensar" NÃO é negativo — faz parte do processo natural de decisão dos pais.
- O foco deve ser em nutrir o relacionamento e agendar visitas, não pressionar.
- Evite tom alarmista. Analise com perspectiva realista do setor.
${benchmarkBlock}${customContextBlock}
Analise os dados do dia e gere um briefing curto e actionable em português brasileiro.

Dados do dia:
- ${novos} leads novos
- ${visitas} agendaram visita
- ${orcamentos} orçamentos enviados
- ${fechados} fechados
- ${querPensar} querem pensar (analisar com calma)
- ${querHumano} pediram atendimento humano
- Taxa de conversão: ${taxaConversao}%

Leads quentes/prontos: ${hotLeads.length > 0 ? hotLeads.join(", ") : "nenhum"}
Leads em risco: ${atRisk.length > 0 ? atRisk.join(", ") : "nenhum"}

Eventos do dia: ${timeline.length} eventos registrados

Gere um resumo de 3-5 parágrafos curtos com:
1. Visão geral do dia (tom positivo e realista, compare com a média da empresa se disponível)
2. Destaques positivos (valorize volume de leads e orçamentos)
3. Alertas e pontos de atenção (apenas se realmente relevantes)
4. Sugestões de próximos passos para o time (foco em nutrição e relacionamento)`;

      try {
        const aiResp = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: { Authorization: `Bearer ${openaiKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({ model: "gpt-4o-mini", messages: [{ role: "user", content: prompt }], max_tokens: 600, temperature: 0.7 }),
        });
        const aiData = await aiResp.json();
        aiSummary = aiData.choices?.[0]?.message?.content || null;
        aiGeneratedAt = new Date().toISOString();
      } catch (e) {
        console.error("AI summary error:", e);
        // Fall back to existing
        aiSummary = existingAiSummary;
        aiGeneratedAt = existingAiGeneratedAt;
      }
    } else {
      // Use cached summary
      aiSummary = existingAiSummary;
      aiGeneratedAt = existingAiGeneratedAt;
    }

    // Build incomplete leads list
    const completedOrPendingSteps = [
      "complete_final", "flow_complete",
      "complete_visit", "complete_questions", "complete_analyze",
      "proximo_passo", "proximo_passo_reminded",
    ];
    const incompleteLeads = (todayLeads || [])
      .map((lead: any) => {
        const conv = convMap.get(lead.id);
        const step = conv?.bot_step || null;
        if (!step) return null;
        if (completedOrPendingSteps.includes(step)) return null;
        const stepLabel = BOT_STEP_LABELS[step] || step;
        return {
          name: lead.name, whatsapp: lead.whatsapp, botStep: stepLabel,
          lastMessageAt: conv?.last_message_at || null,
          isReminded: step.includes("reminded"),
        };
      })
      .filter(Boolean);

    // === Follow-up tracking ===
    const FOLLOW_UP_ACTIONS = [
      "Follow-up automático enviado",
      "Follow-up #2 automático enviado",
      "Follow-up #3 automático enviado",
      "Follow-up #4 automático enviado",
    ];

    // Fetch bot settings to get real delay values per instance + ai_context
    const { data: botSettingsRows } = await supabaseAdmin
      .from("wapi_bot_settings")
      .select("instance_id, follow_up_delay_hours, follow_up_2_delay_hours, follow_up_3_delay_hours, follow_up_4_delay_hours, ai_context")
      .eq("company_id", company_id);




    const instanceDelayMap = new Map<string, { fu1: number; fu2: number; fu3: number; fu4: number }>();
    for (const bs of (botSettingsRows || [])) {
      instanceDelayMap.set(bs.instance_id, {
        fu1: bs.follow_up_delay_hours ?? 24,
        fu2: bs.follow_up_2_delay_hours ?? 48,
        fu3: bs.follow_up_3_delay_hours ?? 72,
        fu4: bs.follow_up_4_delay_hours ?? 96,
      });
    }

    // Collect unique delay labels across all instances
    const allFu1Values = new Set<number>();
    const allFu2Values = new Set<number>();
    const allFu3Values = new Set<number>();
    const allFu4Values = new Set<number>();
    for (const delays of instanceDelayMap.values()) {
      allFu1Values.add(delays.fu1);
      allFu2Values.add(delays.fu2);
      allFu3Values.add(delays.fu3);
      allFu4Values.add(delays.fu4);
    }
    // Fallback if no settings found
    if (allFu1Values.size === 0) allFu1Values.add(24);
    if (allFu2Values.size === 0) allFu2Values.add(48);
    if (allFu3Values.size === 0) allFu3Values.add(72);
    if (allFu4Values.size === 0) allFu4Values.add(96);

    // Build dynamic labels
    const fu1Label = [...allFu1Values].sort((a, b) => a - b).map(v => `${v}h`).join("/");
    const fu2Label = [...allFu2Values].sort((a, b) => a - b).map(v => `${v}h`).join("/");
    const fu3Label = [...allFu3Values].sort((a, b) => a - b).map(v => `${v}h`).join("/");
    const fu4Label = [...allFu4Values].sort((a, b) => a - b).map(v => `${v}h`).join("/");

    let followUpQuery = supabase
      .from("lead_history")
      .select("lead_id, action, created_at")
      .eq("company_id", company_id)
      .gte("created_at", targetStartISO)
      .in("action", FOLLOW_UP_ACTIONS);
    if (isHistoricalDate) followUpQuery = followUpQuery.lt("created_at", targetEndISO);
    const { data: followUpEvents } = await followUpQuery;

    let followUpLeads: any[] = [];
    let followUpFu1Count = 0;
    let followUpFu2Count = 0;
    let followUpFu3Count = 0;
    let followUpFu4Count = 0;

    if ((followUpEvents || []).length > 0) {
      const fuLeadIds = [...new Set((followUpEvents || []).map((e: any) => e.lead_id))];

      // Get lead names
      const fuLeadNamesMap = new Map(allLeadNames);
      const missingFuIds = fuLeadIds.filter((id: string) => !fuLeadNamesMap.has(id));
      if (missingFuIds.length > 0) {
        const { data: extraFuLeads } = await supabase
          .from("campaign_leads")
          .select("id, name, whatsapp")
          .in("id", missingFuIds);
        (extraFuLeads || []).forEach((l: any) => fuLeadNamesMap.set(l.id, l.name));
      }

      // Get lead whatsapp numbers
      const { data: fuLeadDetails } = await supabase
        .from("campaign_leads")
        .select("id, whatsapp")
        .in("id", fuLeadIds);
      const fuWhatsappMap = new Map((fuLeadDetails || []).map((l: any) => [l.id, l.whatsapp]));

      // Get instance for each lead
      const { data: fuConvs } = await supabase
        .from("wapi_conversations")
        .select("lead_id, instance_id")
        .eq("company_id", company_id)
        .in("lead_id", fuLeadIds);
      const fuInstanceMap = new Map((fuConvs || []).map((c: any) => [c.lead_id, c.instance_id]));

      for (const ev of (followUpEvents || [])) {
        const instanceId = fuInstanceMap.get(ev.lead_id);
        const delays = instanceDelayMap.get(instanceId) || { fu1: 24, fu2: 48, fu3: 72, fu4: 96 };
        
        let fuNumber = 1;
        let tipo = `${delays.fu1}h`;
        if (ev.action === "Follow-up automático enviado") {
          fuNumber = 1; tipo = `${delays.fu1}h`; followUpFu1Count++;
        } else if (ev.action === "Follow-up #2 automático enviado") {
          fuNumber = 2; tipo = `${delays.fu2}h`; followUpFu2Count++;
        } else if (ev.action === "Follow-up #3 automático enviado") {
          fuNumber = 3; tipo = `${delays.fu3}h`; followUpFu3Count++;
        } else if (ev.action === "Follow-up #4 automático enviado") {
          fuNumber = 4; tipo = `${delays.fu4}h`; followUpFu4Count++;
        }

        const eventDate = new Date(ev.created_at);
        const brtTime = new Date(eventDate.getTime() + BRT_OFFSET * 60 * 60 * 1000);
        const timeStr = brtTime.toISOString().slice(11, 16);

        followUpLeads.push({
          leadId: ev.lead_id,
          name: fuLeadNamesMap.get(ev.lead_id) || "Lead",
          whatsapp: fuWhatsappMap.get(ev.lead_id) || "",
          tipo,
          fuNumber,
          time: timeStr,
        });
      }
    }

    metrics.followUp24h = followUpFu1Count;
    metrics.followUp48h = followUpFu2Count;
    metrics.followUp3 = followUpFu3Count;
    metrics.followUp4 = followUpFu4Count;

    const followUpLabels = { fu1: fu1Label, fu2: fu2Label, fu3: fu3Label, fu4: fu4Label };
    const result = { metrics, aiSummary, timeline, incompleteLeads, followUpLeads, followUpLabels, userNote, isHistorical: isHistoricalDate || false };

    // Persist to daily_summaries using service role (upsert) — never overwrite user_note
    try {
      const upsertData: any = {
        company_id,
        summary_date: targetDateStr,
        metrics,
        ai_summary: aiSummary,
        timeline,
        incomplete_leads: incompleteLeads,
      };
      if (aiGeneratedAt) {
        upsertData.ai_generated_at = aiGeneratedAt;
      }

      await supabaseAdmin
        .from("daily_summaries")
        .upsert(upsertData, { onConflict: "company_id,summary_date" });
    } catch (e) {
      console.error("Failed to persist daily summary:", e);
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("daily-summary error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
