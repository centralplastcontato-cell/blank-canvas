import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body = await req.json().catch(() => ({}));
    const targetCompanyId = body.company_id;

    // Determine reviewed month (previous month)
    const now = new Date();
    const reviewMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const reviewMonthStr = reviewMonth.toISOString().split("T")[0];
    const monthStart = reviewMonth.toISOString();
    const monthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59).toISOString();

    // Previous-previous month for comparison
    const prevPrevMonth = new Date(reviewMonth.getFullYear(), reviewMonth.getMonth() - 1, 1);
    const prevStart = prevPrevMonth.toISOString();
    const prevEnd = new Date(reviewMonth.getFullYear(), reviewMonth.getMonth(), 0, 23, 59, 59).toISOString();

    // Get companies to process
    let companiesQuery = supabase.from("companies").select("id, name").eq("is_active", true).not("parent_id", "is", null);
    if (targetCompanyId) {
      companiesQuery = companiesQuery.eq("id", targetCompanyId);
    }
    const { data: companies, error: compError } = await companiesQuery;
    if (compError) throw compError;

    const results: any[] = [];

    for (const company of companies || []) {
      try {
        // Get units for this company
        const { data: units } = await supabase
          .from("company_units")
          .select("name, slug")
          .eq("company_id", company.id)
          .eq("is_active", true)
          .order("sort_order");

        const unitList = units || [];
        const hasMultipleUnits = unitList.length > 1;

        if (hasMultipleUnits) {
          // Generate per-unit reviews
          for (const unit of unitList) {
            await processUnitReview(supabase, company, unit.name, unit.slug, reviewMonthStr, monthStart, monthEnd, prevStart, prevEnd, reviewMonth, targetCompanyId, results);
          }
        } else {
          // Single unit or no units — generate one consolidated review
          await processUnitReview(supabase, company, null, null, reviewMonthStr, monthStart, monthEnd, prevStart, prevEnd, reviewMonth, targetCompanyId, results);
        }
      } catch (err) {
        console.error(`Error processing ${company.name}:`, err);
        results.push({ company: company.name, status: "error", error: String(err) });
      }
    }

    return new Response(JSON.stringify({ success: true, processed: results.length, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("monthly-review error:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function processUnitReview(
  supabase: any,
  company: { id: string; name: string },
  unitName: string | null,
  unitSlug: string | null,
  reviewMonthStr: string,
  monthStart: string,
  monthEnd: string,
  prevStart: string,
  prevEnd: string,
  reviewMonth: Date,
  targetCompanyId: string | null,
  results: any[]
) {
  const label = unitName ? `${company.name} — ${unitName}` : company.name;

  try {
    // Check if already generated
    let existingQuery = supabase
      .from("monthly_reviews")
      .select("id")
      .eq("company_id", company.id)
      .eq("review_month", reviewMonthStr);

    if (unitSlug) {
      existingQuery = existingQuery.eq("unit_slug", unitSlug);
    } else {
      existingQuery = existingQuery.is("unit_slug", null);
    }

    const { data: existing } = await existingQuery.maybeSingle();

    if (existing && !targetCompanyId) {
      return; // Skip if already exists (unless forced)
    }

    const metrics = await gatherMetrics(supabase, company.id, monthStart, monthEnd, unitName);
    const previousMetrics = await gatherMetrics(supabase, company.id, prevStart, prevEnd, unitName);

    const displayName = unitName ? `${company.name} — ${unitName}` : company.name;
    const aiSummary = await generateAISummary(displayName, metrics, previousMetrics, reviewMonth);
    const aiContext = generateAIContext(displayName, metrics);

    const upsertData: any = {
      company_id: company.id,
      review_month: reviewMonthStr,
      unit_slug: unitSlug,
      metrics,
      previous_metrics: previousMetrics,
      ai_summary: aiSummary,
      ai_context_generated: aiContext,
      dismissed_by: [],
    };

    // Delete existing then insert (functional index doesn't support onConflict)
    let deleteQuery = supabase
      .from("monthly_reviews")
      .delete()
      .eq("company_id", company.id)
      .eq("review_month", reviewMonthStr);
    if (unitSlug) {
      deleteQuery = deleteQuery.eq("unit_slug", unitSlug);
    } else {
      deleteQuery = deleteQuery.is("unit_slug", null);
    }
    await deleteQuery;

    const { error: upsertError } = await supabase
      .from("monthly_reviews")
      .insert(upsertData);

    if (upsertError) {
      console.error(`Error upserting review for ${label}:`, upsertError);
      return;
    }

    // Update ai_context in bot settings (only for consolidated or single-unit)
    if (!unitSlug) {
      await supabase
        .from("wapi_bot_settings")
        .update({ ai_context: aiContext } as any)
        .eq("company_id", company.id);
    }

    results.push({ company: label, unit: unitSlug, status: "ok" });
  } catch (err) {
    console.error(`Error processing ${label}:`, err);
    results.push({ company: label, unit: unitSlug, status: "error", error: String(err) });
  }
}

async function gatherMetrics(supabase: any, companyId: string, start: string, end: string, unitName: string | null = null) {
  // Build unit filter helper
  const applyUnitFilter = (query: any, column = "unit") => {
    if (unitName) {
      query = query.or(`${column}.eq.${unitName},${column}.eq.As duas`);
    }
    return query;
  };

  // Leads
  let leadsBaseQuery = () => {
    let q = supabase
      .from("campaign_leads")
      .select("*", { count: "exact", head: true })
      .eq("company_id", companyId)
      .gte("created_at", start)
      .lte("created_at", end);
    if (unitName) q = q.or(`unit.eq.${unitName},unit.eq.As duas`);
    return q;
  };

  const { count: totalLeads } = await leadsBaseQuery();

  const { count: closedLeads } = await (() => {
    let q = supabase
      .from("campaign_leads")
      .select("*", { count: "exact", head: true })
      .eq("company_id", companyId)
      .eq("status", "fechado")
      .gte("created_at", start)
      .lte("created_at", end);
    if (unitName) q = q.or(`unit.eq.${unitName},unit.eq.As duas`);
    return q;
  })();

  const { count: lostLeads } = await (() => {
    let q = supabase
      .from("campaign_leads")
      .select("*", { count: "exact", head: true })
      .eq("company_id", companyId)
      .eq("status", "perdido")
      .gte("created_at", start)
      .lte("created_at", end);
    if (unitName) q = q.or(`unit.eq.${unitName},unit.eq.As duas`);
    return q;
  })();

  const { count: visitLeads } = await (() => {
    let q = supabase
      .from("campaign_leads")
      .select("*", { count: "exact", head: true })
      .eq("company_id", companyId)
      .eq("status", "em_contato")
      .gte("created_at", start)
      .lte("created_at", end);
    if (unitName) q = q.or(`unit.eq.${unitName},unit.eq.As duas`);
    return q;
  })();

  // Events
  let eventsQuery = supabase
    .from("company_events")
    .select("*", { count: "exact", head: true })
    .eq("company_id", companyId)
    .gte("event_date", start.split("T")[0])
    .lte("event_date", end.split("T")[0]);
  if (unitName) eventsQuery = eventsQuery.or(`unit.eq.${unitName},unit.eq.As duas`);

  const { count: totalEvents } = await eventsQuery;

  // Revenue
  let revenueQuery = supabase
    .from("company_events")
    .select("total_value")
    .eq("company_id", companyId)
    .gte("event_date", start.split("T")[0])
    .lte("event_date", end.split("T")[0])
    .not("total_value", "is", null);
  if (unitName) revenueQuery = revenueQuery.or(`unit.eq.${unitName},unit.eq.As duas`);

  const { data: revenueData } = await revenueQuery;

  const totalRevenue = (revenueData || []).reduce((sum: number, e: any) => sum + (e.total_value || 0), 0);
  const avgTicket = revenueData && revenueData.length > 0 ? totalRevenue / revenueData.length : 0;

  // Conversations — no unit filter (conversations don't have unit field typically)
  const { count: totalConversations } = await supabase
    .from("wapi_conversations")
    .select("*", { count: "exact", head: true })
    .eq("company_id", companyId)
    .gte("created_at", start)
    .lte("created_at", end);

  // Lead sources
  let unitDataQuery = supabase
    .from("campaign_leads")
    .select("unit")
    .eq("company_id", companyId)
    .gte("created_at", start)
    .lte("created_at", end);
  if (unitName) unitDataQuery = unitDataQuery.or(`unit.eq.${unitName},unit.eq.As duas`);

  const { data: unitData } = await unitDataQuery;

  const unitCounts: Record<string, number> = {};
  (unitData || []).forEach((l: any) => {
    const u = l.unit || "Sem unidade";
    unitCounts[u] = (unitCounts[u] || 0) + 1;
  });

  const conversionRate = totalLeads && totalLeads > 0
    ? ((closedLeads || 0) / totalLeads * 100).toFixed(1)
    : "0";

  return {
    total_leads: totalLeads || 0,
    closed_leads: closedLeads || 0,
    lost_leads: lostLeads || 0,
    visit_leads: visitLeads || 0,
    conversion_rate: parseFloat(conversionRate),
    total_events: totalEvents || 0,
    total_revenue: totalRevenue,
    avg_ticket: Math.round(avgTicket),
    total_conversations: totalConversations || 0,
    leads_by_unit: unitCounts,
  };
}

async function generateAISummary(
  companyName: string,
  metrics: any,
  previousMetrics: any,
  reviewMonth: Date
): Promise<string> {
  const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
  if (!OPENAI_API_KEY) {
    return generateFallbackSummary(companyName, metrics, previousMetrics, reviewMonth);
  }

  const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
  const monthName = monthNames[reviewMonth.getMonth()];
  const year = reviewMonth.getFullYear();

  const prompt = `Você é um consultor de negócios especializado em buffets infantis. Gere um resumo mensal executivo para "${companyName}" referente a ${monthName}/${year}.

MÉTRICAS DO MÊS:
- Leads recebidos: ${metrics.total_leads}
- Vendas fechadas: ${metrics.closed_leads}
- Leads perdidos: ${metrics.lost_leads}
- Visitas realizadas: ${metrics.visit_leads}
- Taxa de conversão: ${metrics.conversion_rate}%
- Festas no mês: ${metrics.total_events}
- Faturamento: R$${metrics.total_revenue.toLocaleString("pt-BR")}
- Ticket médio: R$${metrics.avg_ticket.toLocaleString("pt-BR")}
- Conversas WhatsApp: ${metrics.total_conversations}

MÉTRICAS DO MÊS ANTERIOR (para comparação):
- Leads: ${previousMetrics.total_leads}
- Vendas: ${previousMetrics.closed_leads}
- Conversão: ${previousMetrics.conversion_rate}%
- Faturamento: R$${previousMetrics.total_revenue.toLocaleString("pt-BR")}
- Ticket médio: R$${previousMetrics.avg_ticket.toLocaleString("pt-BR")}

Regras:
1. Máximo 6 parágrafos curtos
2. Comece com um resumo geral do mês
3. Compare com o mês anterior usando porcentagens de crescimento/queda
4. Destaque pontos positivos
5. Identifique áreas de melhoria com sugestões práticas
6. Termine com uma frase motivacional
7. Use emojis moderadamente
8. Considere que conversão de 5-15% é saudável para buffets infantis
9. Linguagem profissional mas acessível`;

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "Você é um consultor especializado em buffets infantis. Responda em português brasileiro." },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!response.ok) {
      console.error("AI gateway error:", response.status);
      return generateFallbackSummary(companyName, metrics, previousMetrics, reviewMonth);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || generateFallbackSummary(companyName, metrics, previousMetrics, reviewMonth);
  } catch (err) {
    console.error("AI error:", err);
    return generateFallbackSummary(companyName, metrics, previousMetrics, reviewMonth);
  }
}

function generateFallbackSummary(companyName: string, metrics: any, previousMetrics: any, reviewMonth: Date): string {
  const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
  const monthName = monthNames[reviewMonth.getMonth()];

  const leadsDiff = previousMetrics.total_leads > 0
    ? ((metrics.total_leads - previousMetrics.total_leads) / previousMetrics.total_leads * 100).toFixed(0)
    : "N/A";

  return `📊 **Resumo de ${monthName} — ${companyName}**

O mês de ${monthName} registrou ${metrics.total_leads} leads e ${metrics.closed_leads} vendas fechadas, com taxa de conversão de ${metrics.conversion_rate}%.

${previousMetrics.total_leads > 0 ? `Comparado ao mês anterior, os leads ${Number(leadsDiff) >= 0 ? 'cresceram' : 'caíram'} ${Math.abs(Number(leadsDiff))}%.` : ''}

Faturamento total: R$${metrics.total_revenue.toLocaleString("pt-BR")} | Ticket médio: R$${metrics.avg_ticket.toLocaleString("pt-BR")}

${metrics.total_events} festas realizadas no período.`;
}

function generateAIContext(companyName: string, metrics: any): string {
  const parts: string[] = [];

  parts.push(`Buffet: ${companyName}.`);

  if (metrics.total_leads > 0) {
    parts.push(`No último mês recebemos ${metrics.total_leads} leads e fechamos ${metrics.closed_leads} vendas.`);
    parts.push(`Nossa taxa de conversão atual é de ${metrics.conversion_rate}%.`);
  }

  if (metrics.avg_ticket > 0) {
    parts.push(`Nosso ticket médio é R$${metrics.avg_ticket.toLocaleString("pt-BR")}.`);
  }

  if (metrics.total_events > 0) {
    parts.push(`Atendemos ${metrics.total_events} festas no último mês.`);
  }

  if (metrics.total_revenue > 0) {
    parts.push(`Faturamento mensal: R$${metrics.total_revenue.toLocaleString("pt-BR")}.`);
  }

  return parts.join(" ");
}
