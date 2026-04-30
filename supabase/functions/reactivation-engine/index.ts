import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { isConversationPaused } from "../_shared/bot-loop-guard.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Month name mapping (Portuguese)
const MONTH_NAMES: Record<number, string> = {
  1: "Janeiro", 2: "Fevereiro", 3: "Março", 4: "Abril",
  5: "Maio", 6: "Junho", 7: "Julho", 8: "Agosto",
  9: "Setembro", 10: "Outubro", 11: "Novembro", 12: "Dezembro",
};

function parseMonthName(raw: string): number | null {
  if (!raw) return null;
  const normalized = raw.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  for (const [num, name] of Object.entries(MONTH_NAMES)) {
    const n = name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    if (normalized.includes(n) || n.includes(normalized)) return parseInt(num);
  }
  const numMatch = raw.match(/(\d{1,2})/);
  if (numMatch) {
    const m = parseInt(numMatch[1]);
    if (m >= 1 && m <= 12) return m;
  }
  return null;
}

function resolveFirstName(name: string | null): string {
  if (!name) return "cliente";
  const raw = name.trim().split(" ")[0];
  if (!raw || /^\+?\d{7,}$/.test(raw)) return "cliente";
  return raw;
}

function interpolateMessage(template: string, vars: Record<string, string>): string {
  let result = template;
  for (const [key, value] of Object.entries(vars)) {
    result = result.replace(new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, "g"), value);
  }
  return result;
}

function randomDelay(minSec: number, maxSec: number): Promise<void> {
  const ms = Math.floor(Math.random() * (maxSec - minSec + 1) + minSec) * 1000;
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isOutsideSendWindow(start: number, end: number): boolean {
  const nowSP = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
  return nowSP.getHours() < start || nowSP.getHours() >= end;
}

function getCurrentMonthSP(): number {
  return new Date(new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" })).getMonth() + 1;
}

function monthsUntilParty(currentMonth: number, partyMonth: number): number {
  if (partyMonth >= currentMonth) return partyMonth - currentMonth;
  return 12 - currentMonth + partyMonth;
}

interface ReactivationSettings {
  id: string;
  company_id: string;
  is_enabled: boolean;
  send_window_start: number;
  send_window_end: number;
  safety_interval_min_seconds: number;
  safety_interval_max_seconds: number;
  trigger_three_months_enabled: boolean;
  trigger_two_months_enabled: boolean;
  trigger_one_month_enabled: boolean;
  message_three_months: string;
  message_two_months: string;
  message_one_month: string;
  require_party_date: boolean;
  require_human_interaction: boolean;
  eligible_statuses: string[];
  exclude_closed: boolean;
  exclude_lost: boolean;
  exclude_existing_event: boolean;
  min_days_without_reply: number;
  max_messages_per_lead: number;
  interactive_options_enabled: boolean;
  capture_window_hours: number;
  pause_days_on_analyzing: number;
  option_1_label: string;
  option_2_label: string;
  option_3_label: string;
  max_daily_sends: number;
  max_per_execution: number;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    console.log("[reactivation-engine] Starting reactivation check...");

    const { data: allSettings, error: settingsError } = await supabase
      .from("automation_reactivation_settings")
      .select("*")
      .eq("is_enabled", true);

    if (settingsError) throw settingsError;
    if (!allSettings || allSettings.length === 0) {
      console.log("[reactivation-engine] No enabled reactivation settings found");
      return new Response(JSON.stringify({ success: true, count: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let totalSent = 0;
    let totalSkipped = 0;
    const errors: string[] = [];
    const currentMonth = getCurrentMonthSP();

    // ── GUARD 3: Global execution cap (across all companies) ──
    const HARD_EXECUTION_CAP = 100; // absolute safety net

    for (const settings of allSettings as ReactivationSettings[]) {
      // ── GUARD 3 check: stop processing if global cap reached ──
      if (totalSent >= HARD_EXECUTION_CAP) {
        console.log(`[reactivation-engine] 🛑 HARD execution cap (${HARD_EXECUTION_CAP}) reached. Stopping.`);
        break;
      }

      const maxPerExecution = settings.max_per_execution || 50;
      if (totalSent >= maxPerExecution) {
        console.log(`[reactivation-engine] 🛑 Execution cap (${maxPerExecution}) reached. Stopping.`);
        break;
      }

      try {
        if (isOutsideSendWindow(settings.send_window_start, settings.send_window_end)) {
          console.log(`[reactivation-engine] Outside send window for company ${settings.company_id}`);
          continue;
        }

        // ── GUARD 1: Circuit Breaker – 24h daily limit per company ──
        const maxDaily = settings.max_daily_sends || 30;
        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

        const { count: dailySentCount } = await supabase
          .from("lead_reactivation_history")
          .select("id", { count: "exact", head: true })
          .eq("company_id", settings.company_id)
          .eq("status", "sent")
          .gte("sent_at", twentyFourHoursAgo);

        if ((dailySentCount || 0) >= maxDaily) {
          console.log(`[reactivation-engine] 🔴 Circuit breaker: company ${settings.company_id} already sent ${dailySentCount}/${maxDaily} in 24h. SKIPPING.`);
          totalSkipped++;
          continue;
        }

        const remainingDaily = maxDaily - (dailySentCount || 0);

        // Determine stages
        const stages: { stage: string; monthsBefore: number; message: string }[] = [];
        if (settings.trigger_three_months_enabled && settings.message_three_months) {
          stages.push({ stage: "3_months_before", monthsBefore: 3, message: settings.message_three_months });
        }
        if (settings.trigger_two_months_enabled && settings.message_two_months) {
          stages.push({ stage: "2_months_before", monthsBefore: 2, message: settings.message_two_months });
        }
        if (settings.trigger_one_month_enabled && settings.message_one_month) {
          stages.push({ stage: "1_month_before", monthsBefore: 1, message: settings.message_one_month });
        }

        if (stages.length === 0) continue;

        const statusFilter = settings.eligible_statuses || ['novo', 'em_contato', 'orcamento_enviado', 'aguardando_resposta'];
        const excludeStatuses: string[] = [];
        if (settings.exclude_closed) excludeStatuses.push('fechado');
        if (settings.exclude_lost) excludeStatuses.push('perdido');

        let leadsQuery = supabase
          .from("campaign_leads")
          .select("id, name, whatsapp, month, status, unit")
          .eq("company_id", settings.company_id)
          .in("status", statusFilter);

        if (settings.require_party_date) {
          leadsQuery = leadsQuery.not("month", "is", null);
        }

        const { data: leads, error: leadsError } = await leadsQuery.limit(1000);

        if (leadsError) {
          errors.push(`leads fetch: ${leadsError.message}`);
          continue;
        }
        if (!leads || leads.length === 0) continue;

        const filteredLeads = leads.filter(l => !excludeStatuses.includes(l.status));
        const leadIds = filteredLeads.map(l => l.id);

        // Batch fetch: existing history
        const { data: existingHistory } = await supabase
          .from("lead_reactivation_history")
          .select("lead_id, reactivation_stage, status")
          .eq("company_id", settings.company_id)
          .in("lead_id", leadIds)
          .in("status", ["sent", "pending"]);

        const historyMap = new Map<string, Set<string>>();
        const sentCountMap = new Map<string, number>();
        for (const h of (existingHistory || [])) {
          if (!historyMap.has(h.lead_id)) historyMap.set(h.lead_id, new Set());
          historyMap.get(h.lead_id)!.add(h.reactivation_stage);
          if (h.status === 'sent') {
            sentCountMap.set(h.lead_id, (sentCountMap.get(h.lead_id) || 0) + 1);
          }
        }

        // ── GUARD 2: Lead-level rate limit – batch fetch last sent_at per lead ──
        const { data: recentLeadSends } = await supabase
          .from("lead_reactivation_history")
          .select("lead_id, sent_at")
          .eq("company_id", settings.company_id)
          .eq("status", "sent")
          .in("lead_id", leadIds)
          .gte("sent_at", twentyFourHoursAgo);

        const recentlySentLeads = new Set((recentLeadSends || []).map(r => r.lead_id));

        // Exclude leads with events
        let leadsWithEvents = new Set<string>();
        if (settings.exclude_existing_event) {
          const { data: events } = await supabase
            .from("company_events")
            .select("lead_id")
            .eq("company_id", settings.company_id)
            .not("lead_id", "is", null)
            .neq("status", "cancelado");
          leadsWithEvents = new Set((events || []).map(e => e.lead_id).filter(Boolean));
        }

        // Human takeover check
        let humanTakeoverLeads = new Set<string>();
        if (settings.require_human_interaction) {
          const { data: convs } = await supabase
            .from("wapi_conversations")
            .select("lead_id")
            .eq("bot_step", "human_takeover")
            .in("lead_id", leadIds)
            .not("lead_id", "is", null);
          humanTakeoverLeads = new Set((convs || []).map(c => c.lead_id).filter(Boolean));
        }

        // Min days without reply — check ANY conversation activity (not just lead replies)
        // Previously only checked last_message_from_me=false, which missed cases where
        // the bot replied after the lead (flipping the flag to true within minutes)
        const minDaysCutoff = new Date(Date.now() - settings.min_days_without_reply * 24 * 60 * 60 * 1000).toISOString();
        const { data: recentConvs } = await supabase
          .from("wapi_conversations")
          .select("lead_id")
          .in("lead_id", leadIds)
          .gte("last_message_at", minDaysCutoff);
        const recentlyActiveLeads = new Set((recentConvs || []).map(c => c.lead_id).filter(Boolean));

        const { data: company } = await supabase
          .from("companies")
          .select("name")
          .eq("id", settings.company_id)
          .single();
        const companyName = company?.name || "nosso buffet";

        const { data: instances } = await supabase
          .from("wapi_instances")
          .select("id, instance_id, instance_token, unit, status")
          .eq("company_id", settings.company_id)
          .eq("status", "connected");

        if (!instances || instances.length === 0) continue;

        let companySentThisCycle = 0;

        for (const lead of filteredLeads) {
          // ── GUARD 3: Execution cap check ──
          if (totalSent >= maxPerExecution || totalSent >= HARD_EXECUTION_CAP) break;
          // ── GUARD 1: Remaining daily check ──
          if (companySentThisCycle >= remainingDaily) {
            console.log(`[reactivation-engine] 🔴 Daily limit reached mid-cycle for company ${settings.company_id}`);
            break;
          }

          try {
            const totalSentForLead = sentCountMap.get(lead.id) || 0;
            if (totalSentForLead >= settings.max_messages_per_lead) { totalSkipped++; continue; }
            if (leadsWithEvents.has(lead.id)) { totalSkipped++; continue; }
            if (settings.require_human_interaction && !humanTakeoverLeads.has(lead.id)) { totalSkipped++; continue; }
            if (recentlyActiveLeads.has(lead.id)) { totalSkipped++; continue; }

            // ── GUARD 2: Lead rate limit – skip if sent anything in last 24h ──
            if (recentlySentLeads.has(lead.id)) {
              totalSkipped++;
              continue;
            }

            const partyMonth = parseMonthName(lead.month || "");
            if (!partyMonth) { totalSkipped++; continue; }

            const monthsUntil = monthsUntilParty(currentMonth, partyMonth);

            for (const stage of stages) {
              if (monthsUntil !== stage.monthsBefore) continue;

              const leadStages = historyMap.get(lead.id);
              if (leadStages?.has(stage.stage)) continue;

              // Per-lead dedup check
              const { data: existingRecord } = await supabase
                .from("lead_reactivation_history")
                .select("id")
                .eq("lead_id", lead.id)
                .eq("reactivation_stage", stage.stage)
                .limit(1)
                .maybeSingle();

              if (existingRecord) continue;

              // Reserve slot
              const { error: reserveErr } = await supabase.from("lead_reactivation_history").insert({
                company_id: settings.company_id,
                lead_id: lead.id,
                conversation_id: null as unknown as string,
                reactivation_type: "month_proximity",
                reactivation_stage: stage.stage,
                message_sent: "",
                sent_at: null,
                status: "pending",
                failure_reason: null,
                is_interactive: settings.interactive_options_enabled,
              });

              if (reserveErr) {
                console.log(`[reactivation-engine] ⏭️ Slot already reserved for ${stage.stage} lead ${lead.id}`);
                continue;
              }

              // Find conversation
              const { data: conv } = await supabase
                .from("wapi_conversations")
                .select("id, remote_jid, instance_id, contact_name, bot_data")
                .eq("lead_id", lead.id)
                .not("remote_jid", "like", "%@g.us%")
                .order("last_message_at", { ascending: false })
                .limit(1)
                .maybeSingle();

              if (!conv) {
                await supabase.from("lead_reactivation_history")
                  .delete().eq("lead_id", lead.id).eq("reactivation_stage", stage.stage).eq("status", "pending");
                continue;
              }

              const instance = instances.find(i => i.id === conv.instance_id);
              if (!instance) {
                await supabase.from("lead_reactivation_history")
                  .delete().eq("lead_id", lead.id).eq("reactivation_stage", stage.stage).eq("status", "pending");
                continue;
              }

              // Build message
              const firstName = resolveFirstName(lead.name);
              const partyMonthName = MONTH_NAMES[partyMonth] || lead.month || "";

              let message = interpolateMessage(stage.message, {
                nome: lead.name || "cliente",
                primeiro_nome: firstName,
                mes_festa: partyMonthName,
                buffet: companyName,
                telefone: lead.whatsapp || "",
              });

              const isInteractive = settings.interactive_options_enabled;
              if (isInteractive) {
                message += "\n\nMe responde com o número da opção 👇\n\n";
                message += `1️⃣ ${settings.option_1_label || 'Ainda tenho interesse na festa'}\n`;
                message += `2️⃣ ${settings.option_2_label || 'Quero ver os valores'}\n`;
                message += `3️⃣ ${settings.option_3_label || 'Ainda estou analisando'}`;
              }

              // Send
              const phone = conv.remote_jid.replace("@s.whatsapp.net", "").replace("@c.us", "");

              if (await isConversationPaused(supabase, conv.id)) {
                console.warn(`[reactivation-engine] ⏸ Skipping reactivation for ${phone} — conversation ${conv.id} paused (loop guard)`);
                continue;
              }

              const sendResponse = await fetch(
                `https://api.w-api.app/v1/message/send-text?instanceId=${instance.instance_id}`,
                {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${instance.instance_token}`,
                  },
                  body: JSON.stringify({ phone, message }),
                }
              );

              let sentMsgId: string | null = null;
              let sendStatus: "sent" | "failed" = "sent";
              let failureReason: string | null = null;

              if (!sendResponse.ok) {
                const errText = await sendResponse.text();
                console.error(`[reactivation-engine] Send failed for ${phone}:`, errText);
                sendStatus = "failed";
                failureReason = errText.substring(0, 500);
              } else {
                try {
                  const sendData = await sendResponse.json();
                  sentMsgId = sendData?.result?.key?.id || sendData?.key?.id || sendData?.messageId || null;
                } catch { /* ignore */ }
                console.log(`[reactivation-engine] ✅ Sent ${stage.stage} to ${phone} (lead: ${lead.name})`);
              }

              // Update history record
              await supabase.from("lead_reactivation_history")
                .update({
                  conversation_id: conv.id,
                  message_sent: message,
                  sent_at: sendStatus === "sent" ? new Date().toISOString() : null,
                  status: sendStatus,
                  failure_reason: failureReason,
                })
                .eq("lead_id", lead.id)
                .eq("reactivation_stage", stage.stage)
                .eq("status", "pending");

              if (sendStatus === "sent") {
                await supabase.from("wapi_messages").insert({
                  conversation_id: conv.id,
                  content: message,
                  from_me: true,
                  message_type: "text",
                  message_id: sentMsgId,
                  status: "sent",
                  timestamp: new Date().toISOString(),
                  metadata: { source: "reactivation_engine", stage: stage.stage, interactive: isInteractive },
                  company_id: settings.company_id,
                });

                await supabase.from("wapi_conversations").update({
                  last_message_at: new Date().toISOString(),
                  last_message_content: message.substring(0, 100),
                  last_message_from_me: true,
                }).eq("id", conv.id);

                await supabase.from("lead_history").insert({
                  lead_id: lead.id,
                  action: `Reativação: ${stage.stage.replace(/_/g, ' ')}`,
                  new_value: message.substring(0, 200),
                  user_name: "Sistema (Reativação Inteligente)",
                });

                totalSent++;
                companySentThisCycle++;
              }

              await randomDelay(settings.safety_interval_min_seconds, settings.safety_interval_max_seconds);
              break; // one stage per lead per cycle
            }
          } catch (leadErr) {
            console.error(`[reactivation-engine] Error processing lead ${lead.id}:`, leadErr);
            errors.push(`lead ${lead.id}: ${String(leadErr)}`);
          }
        }

        // ── GUARD 4: Execution log for this company ──
        await supabase.from("reactivation_execution_log").insert({
          company_id: settings.company_id,
          total_sent: companySentThisCycle,
          total_skipped: totalSkipped,
          total_errors: errors.length,
          details: { stages: stages.map(s => s.stage), daily_sent_before: dailySentCount || 0 },
        });

        // ── GUARD 5: Anomaly notification if volume is high ──
        if (companySentThisCycle > 10) {
          const { data: companyUsers } = await supabase
            .from("user_companies")
            .select("user_id")
            .eq("company_id", settings.company_id);

          for (const u of (companyUsers || [])) {
            await supabase.from("notifications").insert({
              user_id: u.user_id,
              company_id: settings.company_id,
              type: "reactivation_volume_alert",
              title: "⚠️ Volume alto de reativações",
              message: `O motor de reativação enviou ${companySentThisCycle} mensagens nesta execução. Verifique se está dentro do esperado.`,
              data: { sent: companySentThisCycle, skipped: totalSkipped },
            });
          }
          console.log(`[reactivation-engine] ⚠️ Anomaly alert: ${companySentThisCycle} msgs sent for company ${settings.company_id}`);
        }
      } catch (companyErr) {
        console.error(`[reactivation-engine] Error processing company ${settings.company_id}:`, companyErr);
        errors.push(`company ${settings.company_id}: ${String(companyErr)}`);
      }
    }

    console.log(`[reactivation-engine] Completed. Sent: ${totalSent}, Skipped: ${totalSkipped}, Errors: ${errors.length}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Sent ${totalSent} reactivation messages`,
        count: totalSent,
        skipped: totalSkipped,
        errors: errors.length > 0 ? errors : undefined,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[reactivation-engine] Fatal error:", error);
    return new Response(
      JSON.stringify({ success: false, error: String(error) }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
