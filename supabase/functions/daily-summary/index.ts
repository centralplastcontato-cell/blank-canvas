import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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

    const { company_id, date: requestedDate } = await req.json();
    if (!company_id) {
      return new Response(JSON.stringify({ error: "company_id required" }), { status: 400, headers: corsHeaders });
    }

    // Use São Paulo timezone (UTC-3) for "today"
    const BRT_OFFSET = -3;
    const now = new Date();
    const brtNow = new Date(now.getTime() + BRT_OFFSET * 60 * 60 * 1000);
    const todayStr = brtNow.toISOString().slice(0, 10); // YYYY-MM-DD

    // If a past date was requested, fetch from saved history
    if (requestedDate && requestedDate !== todayStr) {
      const { data: saved, error: savedErr } = await supabase
        .from("daily_summaries")
        .select("metrics, ai_summary, timeline, incomplete_leads")
        .eq("company_id", company_id)
        .eq("summary_date", requestedDate)
        .maybeSingle();

      if (savedErr) {
        return new Response(JSON.stringify({ error: savedErr.message }), { status: 500, headers: corsHeaders });
      }

      if (!saved) {
        return new Response(JSON.stringify({
          metrics: { novos: 0, visitas: 0, orcamentos: 0, fechados: 0, querPensar: 0, querHumano: 0, taxaConversao: 0 },
          aiSummary: null,
          timeline: [],
          incompleteLeads: [],
          isHistorical: true,
          noData: true,
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      return new Response(JSON.stringify({
        metrics: saved.metrics,
        aiSummary: saved.ai_summary,
        timeline: saved.timeline || [],
        incompleteLeads: saved.incomplete_leads || [],
        isHistorical: true,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // === Generate live summary for today ===
    const todayStart = new Date(Date.UTC(brtNow.getUTCFullYear(), brtNow.getUTCMonth(), brtNow.getUTCDate(), -BRT_OFFSET, 0, 0, 0));
    const todayISO = todayStart.toISOString();

    // Fetch leads created today (for "novos" metric only)
    const { data: todayLeads } = await supabase
      .from("campaign_leads")
      .select("id, name, status, whatsapp, created_at")
      .eq("company_id", company_id)
      .gte("created_at", todayISO);

    const novos = (todayLeads || []).length;

    // Fetch ALL status change events today (not just for today's leads)
    const { data: statusChanges } = await supabase
      .from("lead_history")
      .select("lead_id, action, new_value, created_at")
      .eq("company_id", company_id)
      .gte("created_at", todayISO)
      .in("action", ["status_change", "Alteracao de status"]);

    // Count transitions by new_value
    const orcamentoLeadIds = new Set<string>();
    let visitas = 0;
    let fechados = 0;
    const activeLeadIds = new Set<string>();

    for (const ev of (statusChanges || [])) {
      const nv = (ev.new_value || "").toLowerCase().replace(/\s+/g, "_");
      if (nv === "orcamento_enviado" || nv === "orçamento_enviado") {
        orcamentoLeadIds.add(ev.lead_id);
      }
      if (nv === "em_contato") visitas++;
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

    const completedBotSteps = ["complete_final", "flow_complete"];
    const convMap = new Map(conversations.map((c: any) => [c.lead_id, c]));

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

    let querPensar = 0;
    let querHumano = 0;
    for (const id of allActiveIds) {
      const conv = convMap.get(id);
      if (!conv?.bot_data) continue;
      const pp = (conv.bot_data as any)?.proximo_passo;
      if (pp === "3") querPensar++;
      if (pp === "2") querHumano++;
    }

    const taxaConversao = novos > 0 ? Math.round((fechados / novos) * 100) : 0;

    const metrics = { novos, visitas, orcamentos, fechados, querPensar, querHumano, taxaConversao };

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

    // Fetch all history events today for timeline
    const { data: historyEvents } = await supabase
      .from("lead_history")
      .select("lead_id, action, old_value, new_value, user_name, created_at")
      .eq("company_id", company_id)
      .gte("created_at", todayISO)
      .order("created_at", { ascending: true })
      .limit(100);

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
      proximo_passo: "Aguardando decisão", proximo_passo_reminded: "Lembrete enviado",
      flow_complete: "Fluxo completo",
    };

    const PROXIMO_PASSO_LABELS: Record<string, string> = {
      "1": "Agendar visita", "2": "Tirar dúvidas", "3": "Analisar com calma",
    };

    const timeline = (historyEvents || []).map((e: any, index: number) => {
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

    // Generate AI summary
    const openaiKey = Deno.env.get("OPENAI_API_KEY");
    let aiSummary = null;

    if (openaiKey) {
      const hotLeads = intelligenceData
        .filter((i: any) => i.temperature === "quente" || i.temperature === "pronto")
        .map((i: any) => `${allLeadNames.get(i.lead_id) || "Lead"} (score: ${i.score}, temp: ${i.temperature})`);

      const atRisk = intelligenceData
        .filter((i: any) => i.abandonment_type)
        .map((i: any) => `${allLeadNames.get(i.lead_id) || "Lead"} (${i.abandonment_type})`);

      const prompt = `Você é um assistente de vendas de buffet infantil. Analise os dados do dia e gere um briefing curto e actionable em português brasileiro.

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
1. Visão geral do dia
2. Destaques positivos
3. Alertas e pontos de atenção
4. Sugestões de próximos passos para o time`;

      try {
        const aiResp = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: { Authorization: `Bearer ${openaiKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({ model: "gpt-4o-mini", messages: [{ role: "user", content: prompt }], max_tokens: 600, temperature: 0.7 }),
        });
        const aiData = await aiResp.json();
        aiSummary = aiData.choices?.[0]?.message?.content || null;
      } catch (e) {
        console.error("AI summary error:", e);
      }
    }

    // Build incomplete leads list
    const completedSteps = ["complete_final", "flow_complete"];
    const incompleteLeads = (todayLeads || [])
      .map((lead: any) => {
        const conv = convMap.get(lead.id);
        const step = conv?.bot_step || null;
        if (step && completedSteps.includes(step)) return null;
        const stepLabel = step ? (BOT_STEP_LABELS[step] || step) : "Sem interação";
        return {
          name: lead.name, whatsapp: lead.whatsapp, botStep: stepLabel,
          lastMessageAt: conv?.last_message_at || null,
          isReminded: step ? step.includes("reminded") : false,
        };
      })
      .filter(Boolean);

    const result = { metrics, aiSummary, timeline, incompleteLeads };

    // Persist to daily_summaries using service role (upsert)
    try {
      await supabaseAdmin
        .from("daily_summaries")
        .upsert({
          company_id,
          summary_date: todayStr,
          metrics,
          ai_summary: aiSummary,
          timeline,
          incomplete_leads: incompleteLeads,
        }, { onConflict: "company_id,summary_date" });
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
