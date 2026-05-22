import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};



function interpolateMessage(template: string, vars: Record<string, string>): string {
  let result = template;
  for (const [key, value] of Object.entries(vars)) {
    result = result.replace(new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, "g"), value);
  }
  return result;
}

function isOutsideSendWindow(start: number, end: number): boolean {
  const nowSP = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
  const h = nowSP.getHours();
  return h < start || h >= end;
}

function resolveFirstName(name: string | null): string {
  if (!name) return "cliente";
  const raw = name.trim().split(" ")[0];
  if (!raw || /^\+?\d{7,}$/.test(raw)) return "cliente";
  return raw;
}

function formatDateBR(dateStr: string): string {
  const [y, m, d] = dateStr.split("-");
  return `${d}/${m}/${y}`;
}

function resolveDiaVisita(visitDate: string, nowSP: Date): string {
  const todayStr = `${nowSP.getFullYear()}-${String(nowSP.getMonth() + 1).padStart(2, "0")}-${String(nowSP.getDate()).padStart(2, "0")}`;
  if (visitDate === todayStr) return "hoje";
  const tomorrow = new Date(nowSP);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, "0")}-${String(tomorrow.getDate()).padStart(2, "0")}`;
  if (visitDate === tomorrowStr) return "amanhã";
  return formatDateBR(visitDate);
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

    console.log("[visit-confirmation] Starting confirmation check...");

    const { data: allSettings, error: settingsError } = await supabase
      .from("visit_confirmation_settings")
      .select("*")
      .eq("is_enabled", true);

    if (settingsError) throw settingsError;
    if (!allSettings || allSettings.length === 0) {
      console.log("[visit-confirmation] No enabled settings found");
      return new Response(JSON.stringify({ success: true, count: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let totalSent = 0;
    const errors: string[] = [];

    const nowSP = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));

    for (const settings of allSettings) {
      try {
        if (isOutsideSendWindow(settings.send_window_start, settings.send_window_end)) {
          console.log(`[visit-confirmation] Outside send window for company ${settings.company_id}`);
          continue;
        }

        const companyId = settings.company_id;
        const hoursBefore = settings.hours_before_visit || 24;

        const targetTimeMin = new Date(nowSP.getTime() + (hoursBefore - 1) * 60 * 60 * 1000);
        const targetTimeMax = new Date(nowSP.getTime() + (hoursBefore + 1) * 60 * 60 * 1000);

        const targetDateMin = targetTimeMin.toISOString().split("T")[0];
        const targetDateMax = targetTimeMax.toISOString().split("T")[0];

        const { data: visits, error: visitsError } = await supabase
          .from("lead_visits")
          .select("id, lead_id, data_visita, horario_visita, status_visita, company_id")
          .eq("company_id", companyId)
          .in("status_visita", ["agendada"])
          .gte("data_visita", targetDateMin)
          .lte("data_visita", targetDateMax);

        if (visitsError) {
          console.error(`[visit-confirmation] Error fetching visits:`, visitsError);
          errors.push(`visits fetch: ${visitsError.message}`);
          continue;
        }

        if (!visits || visits.length === 0) {
          console.log(`[visit-confirmation] No upcoming visits for company ${companyId}`);
          continue;
        }

        console.log(`[visit-confirmation] Found ${visits.length} upcoming visits for company ${companyId}`);

        const visitIds = visits.map((v: any) => v.id);
        const { data: existingConfirmations } = await supabase
          .from("visit_confirmation_history")
          .select("visit_id, message_type, status, sent_at, response_received")
          .eq("company_id", companyId)
          .in("visit_id", visitIds);

        const confirmationMap = new Map<string, any[]>();
        for (const c of existingConfirmations || []) {
          if (!confirmationMap.has(c.visit_id)) confirmationMap.set(c.visit_id, []);
          confirmationMap.get(c.visit_id)!.push(c);
        }

        const leadIds = [...new Set(visits.map((v: any) => v.lead_id))];
        const { data: leads } = await supabase
          .from("campaign_leads")
          .select("id, name, whatsapp, unit")
          .in("id", leadIds);
        const leadMap = new Map((leads || []).map((l: any) => [l.id, l]));

        const { data: company } = await supabase
          .from("companies")
          .select("name")
          .eq("id", companyId)
          .single();
        const companyName = company?.name || "nosso buffet";

        const { data: instances } = await supabase
          .from("wapi_instances")
          .select("id, instance_id, instance_token, unit, status, provider")
          .eq("company_id", companyId)
          .eq("status", "connected");

        if (!instances || instances.length === 0) {
          console.log(`[visit-confirmation] No connected instances for company ${companyId}`);
          continue;
        }

        // Track visits where we just sent the first message in THIS run
        // to prevent sending the second message in the same execution
        const sentFirstInThisRun = new Set<string>();

        for (const visit of visits) {
          try {
            const existingConfs = confirmationMap.get(visit.id) || [];
            const lead = leadMap.get(visit.lead_id);
            if (!lead) continue;

            const firstSent = existingConfs.find((c: any) => c.message_type === "first" && c.status === "sent");
            const secondSent = existingConfs.find((c: any) => c.message_type === "second" && c.status === "sent");
            const hasResponse = existingConfs.some((c: any) => c.response_received);

            // Anti-burst: any attempt (sent OR failed) in the last 4h blocks new attempts of same type.
            // Reason: providers (W-API/Z-API) sometimes return errors (e.g. SESSION_UNVERIFIED)
            // even though the message was actually delivered to WhatsApp. Without this guard,
            // the cron would resend every 30min, spamming the client.
            const ANTI_BURST_MS = 4 * 60 * 60 * 1000;
            const now = Date.now();
            const recentAttempt = (type: string) => existingConfs.some((c: any) => {
              if (c.message_type !== type) return false;
              const t = new Date(c.created_at || c.sent_at || 0).getTime();
              return t > 0 && (now - t) < ANTI_BURST_MS;
            });

            let messageToSend: string | null = null;
            let messageType = "first";

            if (!firstSent && !recentAttempt("first")) {
              messageToSend = settings.confirmation_message;
              messageType = "first";
            } else if (
              settings.second_message_enabled &&
              !secondSent &&
              !hasResponse &&
              !recentAttempt("second") &&
              firstSent?.sent_at &&
              !sentFirstInThisRun.has(visit.id)
            ) {
              const firstSentAt = new Date(firstSent.sent_at).getTime();
              const hoursAfter = (settings.second_message_hours_after || 6) * 60 * 60 * 1000;
              if (now - firstSentAt >= hoursAfter) {
                messageToSend = settings.second_message_text;
                messageType = "second";
              }
            }


            if (!messageToSend) continue;

            // Find conversation for this lead
            const { data: conv } = await supabase
              .from("wapi_conversations")
              .select("id, remote_jid, instance_id")
              .eq("lead_id", visit.lead_id)
              .not("remote_jid", "like", "%@g.us%")
              .order("last_message_at", { ascending: false })
              .limit(1)
              .maybeSingle();

            if (!conv) {
              console.log(`[visit-confirmation] No conversation for lead ${visit.lead_id}`);
              continue;
            }

            // DEDUP GUARD: Check per message_type to avoid duplicates
            const dedup_cutoff = new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString();
            const { data: recentMsgs } = await supabase
              .from("wapi_messages")
              .select("metadata")
              .eq("conversation_id", conv.id)
              .eq("from_me", true)
              .gte("timestamp", dedup_cutoff)
              .limit(20);

            const alreadySentThisType = (recentMsgs || []).some((m: any) => {
              const meta = m.metadata as Record<string, unknown> | null;
              return meta?.source === "visit_confirmation" && meta?.type === messageType;
            });

            if (alreadySentThisType) {
              console.log(`[visit-confirmation] ⚠️ Dedup: ${messageType} already sent to lead ${visit.lead_id} recently, skipping`);
              continue;
            }

            const instance = instances.find((i: any) => i.id === conv.instance_id);
            if (!instance) continue;

            // Interpolate message with smart day reference
            const firstName = resolveFirstName(lead.name);
            const diaVisita = resolveDiaVisita(visit.data_visita, nowSP);
            const message = interpolateMessage(messageToSend, {
              nome: firstName,
              data_visita: formatDateBR(visit.data_visita),
              hora_visita: visit.horario_visita || "horário a confirmar",
              nome_buffet: companyName,
              dia_visita: diaVisita,
            });

            // Send via wapi-send (multi-provider: Z-API or W-API auto-detected)
            const phone = conv.remote_jid.replace("@s.whatsapp.net", "").replace("@c.us", "");

            let sentStatus = "sent";
            let sentMsgId: string | null = null;

            const { data: sendData, error: sendErr } = await supabase.functions.invoke("wapi-send", {
              body: {
                action: "send-text",
                instanceId: instance.instance_id,
                instanceToken: instance.instance_token,
                phone,
                message,
                conversationId: conv.id,
                source: "visit-confirmation",
                automation: true,
                metadata: { source: "visit_confirmation", type: messageType, visit_id: visit.id },
              },
            });

            if (sendErr || (sendData && sendData.error)) {
              const errMsg = sendErr?.message || sendData?.error || "unknown";
              console.error(`[visit-confirmation] Send failed for ${phone} (${instance.provider || 'wapi'}):`, errMsg);
              sentStatus = "failed";
            } else {
              sentMsgId = sendData?.message_id || sendData?.result?.key?.id || sendData?.key?.id || null;
              console.log(`[visit-confirmation] ✅ Sent ${messageType} to ${phone} via ${instance.provider || 'wapi'} (lead: ${lead.name})`);
            }

            // Record in history
            await supabase.from("visit_confirmation_history").insert({
              visit_id: visit.id,
              company_id: companyId,
              message_type: messageType,
              sent_at: sentStatus === "sent" ? new Date().toISOString() : null,
              status: sentStatus,
            });

            // wapi-send already persists the message in wapi_messages and updates the conversation
            if (sentStatus === "sent") {
              if (messageType === "first") {
                sentFirstInThisRun.add(visit.id);
              }
              totalSent++;
            }

            // Small delay between sends
            await new Promise((r) => setTimeout(r, Math.random() * 3000 + 2000));
          } catch (visitErr) {
            console.error(`[visit-confirmation] Error processing visit ${visit.id}:`, visitErr);
            errors.push(`visit ${visit.id}: ${String(visitErr)}`);
          }
        }
      } catch (companyErr) {
        console.error(`[visit-confirmation] Error for company ${settings.company_id}:`, companyErr);
        errors.push(`company ${settings.company_id}: ${String(companyErr)}`);
      }
    }

    console.log(`[visit-confirmation] Completed. Sent: ${totalSent}, Errors: ${errors.length}`);

    return new Response(
      JSON.stringify({ success: true, count: totalSent, errors: errors.length > 0 ? errors : undefined }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[visit-confirmation] Fatal error:", error);
    return new Response(
      JSON.stringify({ success: false, error: String(error) }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
