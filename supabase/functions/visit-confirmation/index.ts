import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const WAPI_BASE_URL = "https://api.w-api.app/v1";

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

    // Fetch all enabled settings
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

        // Calculate the target window: visits happening in ~hoursBefore from now
        // We check visits within a 2-hour window to avoid missing any
        const targetTimeMin = new Date(nowSP.getTime() + (hoursBefore - 1) * 60 * 60 * 1000);
        const targetTimeMax = new Date(nowSP.getTime() + (hoursBefore + 1) * 60 * 60 * 1000);

        const targetDateMin = targetTimeMin.toISOString().split("T")[0];
        const targetDateMax = targetTimeMax.toISOString().split("T")[0];

        // Fetch upcoming visits (agendada status only - not cancelled, confirmed, etc.)
        const { data: visits, error: visitsError } = await supabase
          .from("lead_visits")
          .select("id, lead_id, data_visita, horario_visita, status_visita, company_id")
          .eq("company_id", companyId)
          .in("status_visita", ["agendada"]) // Only send for "agendada" visits
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

        // Check which visits already have confirmations sent
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

        // Get lead info
        const leadIds = [...new Set(visits.map((v: any) => v.lead_id))];
        const { data: leads } = await supabase
          .from("campaign_leads")
          .select("id, name, whatsapp, unit")
          .in("id", leadIds);
        const leadMap = new Map((leads || []).map((l: any) => [l.id, l]));

        // Get company name
        const { data: company } = await supabase
          .from("companies")
          .select("name")
          .eq("id", companyId)
          .single();
        const companyName = company?.name || "nosso buffet";

        // Get connected instances
        const { data: instances } = await supabase
          .from("wapi_instances")
          .select("id, instance_id, instance_token, unit, status")
          .eq("company_id", companyId)
          .eq("status", "connected");

        if (!instances || instances.length === 0) {
          console.log(`[visit-confirmation] No connected instances for company ${companyId}`);
          continue;
        }

        for (const visit of visits) {
          try {
            const existingConfs = confirmationMap.get(visit.id) || [];
            const lead = leadMap.get(visit.lead_id);
            if (!lead) continue;

            // Determine if we should send first or second message
            const firstSent = existingConfs.find((c: any) => c.message_type === "first" && c.status === "sent");
            const secondSent = existingConfs.find((c: any) => c.message_type === "second" && c.status === "sent");
            const hasResponse = existingConfs.some((c: any) => c.response_received);

            let messageToSend: string | null = null;
            let messageType = "first";

            if (!firstSent) {
              // Send first confirmation
              messageToSend = settings.confirmation_message;
              messageType = "first";
            } else if (
              settings.second_message_enabled &&
              !secondSent &&
              !hasResponse &&
              firstSent.sent_at
            ) {
              // Check if enough time has passed since first message
              const firstSentAt = new Date(firstSent.sent_at).getTime();
              const hoursAfter = (settings.second_message_hours_after || 6) * 60 * 60 * 1000;
              if (Date.now() - firstSentAt >= hoursAfter) {
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

            // DEDUP GUARD: Check if a confirmation message was already sent to this conversation recently
            // This prevents duplicates when the cron fires multiple times within the 2-hour window
            const dedup_cutoff = new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString();
            const { data: recentMsgs } = await supabase
              .from("wapi_messages")
              .select("metadata")
              .eq("conversation_id", conv.id)
              .eq("from_me", true)
              .gte("timestamp", dedup_cutoff)
              .limit(20);

            const alreadySentConfirmation = (recentMsgs || []).some((m: any) => {
              const meta = m.metadata as Record<string, unknown> | null;
              return meta?.source === "visit_confirmation";
            });

            if (alreadySentConfirmation) {
              console.log(`[visit-confirmation] ⚠️ Dedup: confirmation already sent to lead ${visit.lead_id} recently, skipping`);
              continue;
            }

            const instance = instances.find((i: any) => i.id === conv.instance_id);
            if (!instance) continue;

            // Interpolate message
            const firstName = resolveFirstName(lead.name);
            const message = interpolateMessage(messageToSend, {
              nome: firstName,
              data_visita: formatDateBR(visit.data_visita),
              hora_visita: visit.horario_visita || "horário a confirmar",
              nome_buffet: companyName,
            });

            // Send via W-API
            const phone = conv.remote_jid.replace("@s.whatsapp.net", "").replace("@c.us", "");

            const sendResponse = await fetch(
              `${WAPI_BASE_URL}/message/send-text?instanceId=${instance.instance_id}`,
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${instance.instance_token}`,
                },
                body: JSON.stringify({ phone, message }),
              }
            );

            let sentStatus = "sent";
            let sentMsgId: string | null = null;

            if (!sendResponse.ok) {
              const errText = await sendResponse.text();
              console.error(`[visit-confirmation] Send failed for ${phone}:`, errText);
              sentStatus = "failed";
            } else {
              try {
                const sendData = await sendResponse.json();
                sentMsgId = sendData?.result?.key?.id || sendData?.key?.id || null;
              } catch { /* ignore */ }
              console.log(`[visit-confirmation] ✅ Sent ${messageType} to ${phone} (lead: ${lead.name})`);
            }

            // Record in history
            await supabase.from("visit_confirmation_history").insert({
              visit_id: visit.id,
              company_id: companyId,
              message_type: messageType,
              sent_at: sentStatus === "sent" ? new Date().toISOString() : null,
              status: sentStatus,
            });

            // Save message in wapi_messages
            if (sentStatus === "sent") {
              await supabase.from("wapi_messages").insert({
                conversation_id: conv.id,
                content: message,
                from_me: true,
                message_type: "text",
                message_id: sentMsgId,
                status: "sent",
                timestamp: new Date().toISOString(),
                metadata: { source: "visit_confirmation", type: messageType, visit_id: visit.id },
                company_id: companyId,
              });

              // Update conversation
              await supabase.from("wapi_conversations").update({
                last_message_at: new Date().toISOString(),
                last_message_content: message.substring(0, 100),
                last_message_from_me: true,
              }).eq("id", conv.id);

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
