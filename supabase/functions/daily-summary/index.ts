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

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }

    const { company_id } = await req.json();
    if (!company_id) {
      return new Response(JSON.stringify({ error: "company_id required" }), { status: 400, headers: corsHeaders });
    }

    // Use São Paulo timezone (UTC-3) for "today"
    const BRT_OFFSET = -3;
    const now = new Date();
    const brtNow = new Date(now.getTime() + BRT_OFFSET * 60 * 60 * 1000);
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
    let orcamentos = 0;
    let visitas = 0;
    let fechados = 0;
    const activeLeadIds = new Set<string>();

    for (const ev of (statusChanges || [])) {
      const nv = (ev.new_value || "").toLowerCase().replace(/\s+/g, "_");
      if (nv === "orcamento_enviado" || nv === "orçamento_enviado") orcamentos++;
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

    // Fetch intelligence for active leads
    let intelligenceData: any[] = [];
    if (allActiveIds.length > 0) {
      const { data: intel } = await supabase
        .from("lead_intelligence")
        .select("lead_id, score, temperature, abandonment_type")
        .in("lead_id", allActiveIds);
      intelligenceData = intel || [];
    }

    // Count "vão pensar" and "querem humano" from bot_data
    const convMap = new Map(conversations.map((c: any) => [c.lead_id, c]));
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

    const metrics = {
      novos,
      visitas,
      orcamentos,
      fechados,
      querPensar,
      querHumano,
      taxaConversao,
    };

    const leads = todayLeads || [];
    const leadIds = leads.map((l: any) => l.id);
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

    // Build enriched timeline with bot step info
    const BOT_STEP_LABELS: Record<string, string> = {
      welcome: "Boas-vindas",
      nome: "Pergunta do nome",
      tipo: "Tipo de evento",
      mes: "Mês da festa",
      dia: "Dia da festa",
      convidados: "Quantidade de convidados",
      unidade: "Unidade",
      next_step: "Próximo passo",
      complete_visit: "Agendou visita",
      complete_questions: "Tirar dúvidas",
      complete_analyze: "Vai pensar",
      complete_final: "Conversa finalizada",
      work_here: "Trabalhe conosco",
    };

    const PROXIMO_PASSO_LABELS: Record<string, string> = {
      "1": "Agendar visita",
      "2": "Tirar dúvidas",
      "3": "Analisar com calma",
    };

    const timeline = (historyEvents || []).map((e: any, index: number) => {
      const conv = convMap.get(e.lead_id);
      const botStep = conv?.bot_step || null;
      const botStepLabel = botStep ? (BOT_STEP_LABELS[botStep] || botStep) : null;
      const proximoPasso = (conv?.bot_data as any)?.proximo_passo;
      const proximoPassoLabel = proximoPasso ? (PROXIMO_PASSO_LABELS[proximoPasso] || proximoPasso) : null;

      // Convert time to BRT
      const eventDate = new Date(e.created_at);
      const brtTime = new Date(eventDate.getTime() + BRT_OFFSET * 60 * 60 * 1000);
      const timeStr = brtTime.toISOString().slice(11, 16); // HH:MM

      return {
        index: index + 1,
        time: timeStr,
        leadName: allLeadNames.get(e.lead_id) || "Lead",
        action: e.action,
        oldValue: e.old_value,
        newValue: e.new_value,
        userName: e.user_name,
        botStep: botStepLabel,
        proximoPasso: proximoPassoLabel,
      };
    });

    // Generate AI summary
    const openaiKey = Deno.env.get("OPENAI_API_KEY");
    let aiSummary = null;

    if (openaiKey) {
      // Build context for AI
      const hotLeads = intelligenceData
        .filter((i: any) => i.temperature === "quente" || i.temperature === "pronto")
        .map((i: any) => {
          const name = allLeadNames.get(i.lead_id) || "Lead";
          return `${name} (score: ${i.score}, temp: ${i.temperature})`;
        });

      const atRisk = intelligenceData
        .filter((i: any) => i.abandonment_type)
        .map((i: any) => {
          const name = allLeadNames.get(i.lead_id) || "Lead";
          return `${name} (${i.abandonment_type})`;
        });

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
          headers: {
            Authorization: `Bearer ${openaiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            messages: [{ role: "user", content: prompt }],
            max_tokens: 600,
            temperature: 0.7,
          }),
        });
        const aiData = await aiResp.json();
        aiSummary = aiData.choices?.[0]?.message?.content || null;
      } catch (e) {
        console.error("AI summary error:", e);
      }
    }

    return new Response(JSON.stringify({ metrics, aiSummary, timeline }), {
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
