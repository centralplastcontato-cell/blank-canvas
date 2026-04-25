import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get body - optional company_id filter
    let targetCompanyId: string | null = null;
    try {
      const body = await req.json();
      targetCompanyId = body?.company_id || null;
    } catch { /* no body */ }

    // Get active companies
    let companiesQuery = supabase.from("companies").select("id").eq("is_active", true);
    if (targetCompanyId) {
      companiesQuery = companiesQuery.eq("id", targetCompanyId);
    }
    const { data: companies } = await companiesQuery;
    if (!companies?.length) {
      return new Response(JSON.stringify({ ok: true, processed: 0 }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const MAX_ALERTS = 5;
    const now = new Date();
    const results: Record<string, number> = {};

    for (const company of companies) {
      const companyId = company.id;
      const alerts: Array<{ alert_type: string; alert_message: string; severity: string; related_filter: any; priority: number }> = [];

      // ===================== ALERTA 1: NEGOCIAÇÕES PARADAS =====================
      const tenDaysAgo = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString();
      const { data: stalledLeads } = await supabase
        .from("campaign_leads")
        .select("id, status")
        .eq("company_id", companyId)
        .in("status", ["visita_agendada", "orcamento_enviado", "em_negociacao"])
        .not("status", "in", "(fechado,perdido)");

      if (stalledLeads?.length) {
        // Check conversations for last_message_at
        const leadIds = stalledLeads.map(l => l.id);
        const { data: convs } = await supabase
          .from("wapi_conversations")
          .select("lead_id, last_message_at")
          .in("lead_id", leadIds.slice(0, 500));

        const convMap = new Map(convs?.map(c => [c.lead_id, c.last_message_at]) || []);
        const stalledCount = stalledLeads.filter(l => {
          const lastMsg = convMap.get(l.id);
          return !lastMsg || new Date(lastMsg) < new Date(tenDaysAgo);
        }).length;

        if (stalledCount > 10) {
          alerts.push({
            alert_type: "negociacoes_paradas",
            alert_message: `⚠️ Existem ${stalledCount} negociações paradas há mais de 10 dias.`,
            severity: "warning",
            related_filter: { action: "navigate", path: "/inteligencia", tab: "negociacoes" },
            priority: 1,
          });
        }
      }

      // ===================== ALERTA 2: ORÇAMENTOS SEM RESPOSTA =====================
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const { data: budgetLeads } = await supabase
        .from("campaign_leads")
        .select("id")
        .eq("company_id", companyId)
        .eq("status", "orcamento_enviado");

      if (budgetLeads?.length) {
        const budgetIds = budgetLeads.map(l => l.id);
        const { data: budgetConvs } = await supabase
          .from("wapi_conversations")
          .select("lead_id, last_message_at, last_message_from_me")
          .in("lead_id", budgetIds.slice(0, 500));

        const budgetConvMap = new Map(budgetConvs?.map(c => [c.lead_id, c]) || []);
        const noReplyCount = budgetLeads.filter(l => {
          const conv = budgetConvMap.get(l.id);
          if (!conv) return true;
          return conv.last_message_from_me === true && new Date(conv.last_message_at) < new Date(sevenDaysAgo);
        }).length;

        if (noReplyCount > 8) {
          alerts.push({
            alert_type: "orcamentos_sem_resposta",
            alert_message: `⚠️ Existem ${noReplyCount} orçamentos enviados sem resposta.`,
            severity: "warning",
            related_filter: { action: "navigate", path: "/admin", filter: { status: "orcamento_enviado" } },
            priority: 3,
          });
        }
      }

      // ===================== ALERTA 3: CONVERSÃO CAIU =====================
      const sevenDaysAgoDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const fourteenDaysAgoDate = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString();

      const [{ count: closedThisWeek }, { count: totalThisWeek }, { count: closedLastWeek }, { count: totalLastWeek }] = await Promise.all([
        supabase.from("campaign_leads").select("id", { count: "exact", head: true }).eq("company_id", companyId).eq("status", "fechado").gte("created_at", sevenDaysAgoDate),
        supabase.from("campaign_leads").select("id", { count: "exact", head: true }).eq("company_id", companyId).gte("created_at", sevenDaysAgoDate),
        supabase.from("campaign_leads").select("id", { count: "exact", head: true }).eq("company_id", companyId).eq("status", "fechado").gte("created_at", fourteenDaysAgoDate).lt("created_at", sevenDaysAgoDate),
        supabase.from("campaign_leads").select("id", { count: "exact", head: true }).eq("company_id", companyId).gte("created_at", fourteenDaysAgoDate).lt("created_at", sevenDaysAgoDate),
      ]);

      const convThisWeek = (totalThisWeek || 0) > 0 ? (closedThisWeek || 0) / (totalThisWeek || 1) : 0;
      const convLastWeek = (totalLastWeek || 0) > 0 ? (closedLastWeek || 0) / (totalLastWeek || 1) : 0;

      if (convLastWeek > 0 && convThisWeek < convLastWeek * 0.7 && (totalThisWeek || 0) >= 5) {
        alerts.push({
          alert_type: "conversao_caiu",
          alert_message: "⚠️ A taxa de conversão caiu esta semana.",
          severity: "critical",
          related_filter: { action: "navigate", path: "/inteligencia", tab: "relatorios" },
          priority: 2,
        });
      }

      // ===================== ALERTA 4: POUCOS LEADS =====================
      const thirtyDaysAgoDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const { count: leadsThisWeek } = await supabase
        .from("campaign_leads").select("id", { count: "exact", head: true })
        .eq("company_id", companyId).gte("created_at", sevenDaysAgoDate);

      const { count: leadsLast30 } = await supabase
        .from("campaign_leads").select("id", { count: "exact", head: true })
        .eq("company_id", companyId).gte("created_at", thirtyDaysAgoDate);

      const weeklyAvg30 = ((leadsLast30 || 0) / 30) * 7;
      if (weeklyAvg30 >= 5 && (leadsThisWeek || 0) < weeklyAvg30 * 0.6) {
        alerts.push({
          alert_type: "poucos_leads",
          alert_message: "⚠️ O número de leads recebidos caiu esta semana.",
          severity: "warning",
          related_filter: { action: "navigate", path: "/inteligencia", tab: "relatorios" },
          priority: 4,
        });
      }

      // ===================== ALERTA 5: MÊS COM BAIXA OCUPAÇÃO =====================
      const { data: events } = await supabase
        .from("company_events")
        .select("event_date, status")
        .eq("company_id", companyId)
        .neq("status", "cancelado")
        .gte("event_date", now.toISOString().split("T")[0]);

      // Check next 3 months
      const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
      for (let i = 0; i < 3; i++) {
        const targetMonth = new Date(now.getFullYear(), now.getMonth() + i, 1);
        const monthKey = `${targetMonth.getFullYear()}-${String(targetMonth.getMonth() + 1).padStart(2, "0")}`;
        const weekendsInMonth = countWeekendDays(targetMonth.getFullYear(), targetMonth.getMonth());
        const eventsInMonth = (events || []).filter(e => e.event_date.startsWith(monthKey)).length;
        const occupancy = weekendsInMonth > 0 ? eventsInMonth / weekendsInMonth : 1;

        if (occupancy < 0.3 && weekendsInMonth >= 4) {
          const monthLabel = monthNames[targetMonth.getMonth()];
          alerts.push({
            alert_type: "baixa_ocupacao",
            alert_message: `⚠️ O mês de ${monthLabel} está com baixa ocupação.`,
            severity: "warning",
            related_filter: { action: "navigate", path: "/agenda", month: monthKey },
            priority: 5,
          });
          break; // Only one month alert
        }
      }

      // ===================== ALERTA 6: VOLUME DE REATIVAÇÕES ALTO =====================
      const { data: reactivationLogs } = await supabase
        .from("reactivation_execution_log")
        .select("total_sent, executed_at")
        .eq("company_id", companyId)
        .gte("executed_at", sevenDaysAgoDate)
        .order("executed_at", { ascending: false });

      if (reactivationLogs?.length) {
        const totalReactivations24h = reactivationLogs
          .filter(l => new Date(l.executed_at) > new Date(now.getTime() - 24 * 60 * 60 * 1000))
          .reduce((sum, l) => sum + (l.total_sent || 0), 0);

        // Get the company's daily limit
        const { data: reactivationSettings } = await supabase
          .from("automation_reactivation_settings")
          .select("max_daily_sends")
          .eq("company_id", companyId)
          .maybeSingle();

        const dailyLimit = reactivationSettings?.max_daily_sends || 30;

        if (totalReactivations24h >= dailyLimit * 0.8) {
          const isOver = totalReactivations24h >= dailyLimit;
          alerts.push({
            alert_type: "reativacao_volume_alto",
            alert_message: isOver
              ? `🚨 Limite diário de reativações atingido: ${totalReactivations24h}/${dailyLimit} mensagens nas últimas 24h.`
              : `⚠️ Volume de reativações próximo do limite: ${totalReactivations24h}/${dailyLimit} mensagens nas últimas 24h.`,
            severity: isOver ? "critical" : "warning",
            related_filter: { action: "navigate", path: "/configuracoes", tab: "automacoes" },
            priority: isOver ? 1 : 3,
          });
        }
      }

      // ===================== ALERTA 7: TAREFAS ATRASADAS =====================
      const todayStr = now.toISOString().split("T")[0];
      const { data: overdueTasks } = await supabase
        .from("company_tasks")
        .select("id")
        .eq("company_id", companyId)
        .eq("completed", false)
        .lt("due_date", todayStr);

      const overdueTaskCount = overdueTasks?.length || 0;
      if (overdueTaskCount > 0) {
        alerts.push({
          alert_type: "tarefas_atrasadas",
          alert_message: `⚠️ Você tem ${overdueTaskCount} tarefa${overdueTaskCount > 1 ? "s" : ""} atrasada${overdueTaskCount > 1 ? "s" : ""}.`,
          severity: overdueTaskCount >= 5 ? "critical" : "warning",
          related_filter: { action: "navigate", path: "/agenda", tab: "tarefas" },
          priority: 4,
        });
      }

      // Sort by priority, take top MAX_ALERTS
      alerts.sort((a, b) => a.priority - b.priority);
      const topAlerts = alerts.slice(0, MAX_ALERTS);

      // Resolve old alerts for this company
      await supabase
        .from("alerts_system")
        .update({ resolved: true, resolved_at: now.toISOString() })
        .eq("company_id", companyId)
        .eq("resolved", false);

      // Insert new alerts (dedup via hash)
      for (const alert of topAlerts) {
        const hash = `${alert.alert_type}_${now.toISOString().split("T")[0]}`;
        await supabase.from("alerts_system").upsert({
          company_id: companyId,
          alert_type: alert.alert_type,
          alert_message: alert.alert_message,
          severity: alert.severity,
          related_filter: alert.related_filter,
          alert_hash: hash,
          resolved: false,
        }, { onConflict: "company_id,alert_hash,resolved" });
      }

      results[companyId] = topAlerts.length;
    }

    return new Response(JSON.stringify({ ok: true, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("smart-alerts error:", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function countWeekendDays(year: number, month: number): number {
  let count = 0;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  for (let d = 1; d <= daysInMonth; d++) {
    const day = new Date(year, month, d).getDay();
    if (day === 0 || day === 6) count++;
  }
  return count;
}
