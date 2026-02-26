import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function resolveFirstName(
  botData: Record<string, unknown>,
  contactName: string | null,
  leadName?: string | null
): string {
  // Priority: bot_data.nome > lead.name > contact_name
  const raw = String(botData?.nome || leadName || contactName || "")
    .trim()
    .split(" ")[0];
  // If empty, only digits (7+), or starts with +, it's not a valid name
  if (!raw || /^\+?\d{7,}$/.test(raw)) {
    return "cliente";
  }
  return raw;
}

interface FollowUpSettings {
  follow_up_enabled: boolean;
  follow_up_delay_hours: number;
  follow_up_message: string | null;
  follow_up_2_enabled: boolean;
  follow_up_2_delay_hours: number;
  follow_up_2_message: string | null;
  follow_up_3_enabled: boolean;
  follow_up_3_delay_hours: number;
  follow_up_3_message: string | null;
  follow_up_4_enabled: boolean;
  follow_up_4_delay_hours: number;
  follow_up_4_message: string | null;
  auto_lost_enabled: boolean;
  auto_lost_delay_hours: number;
  next_step_reminder_enabled: boolean;
  next_step_reminder_delay_minutes: number;
  next_step_reminder_message: string | null;
  bot_inactive_followup_enabled: boolean;
  bot_inactive_followup_delay_minutes: number;
  bot_inactive_followup_message: string | null;
  instance_id: string;
  test_mode_enabled?: boolean;
  test_mode_number?: string | null;
}

// Helper: checks if a conversation phone should be skipped due to test mode
function shouldSkipTestMode(
  testModeEnabled: boolean | undefined,
  testModeNumber: string | null | undefined,
  remoteJid: string
): boolean {
  if (!testModeEnabled || !testModeNumber) return false;
  const testNum = testModeNumber.replace(/\D/g, '');
  const convPhone = remoteJid.replace('@s.whatsapp.net', '').replace('@c.us', '').replace(/\D/g, '');
  // Compare last digits to handle country code variations
  const shortTest = testNum.replace(/^55/, '').replace(/^0+/, '');
  if (convPhone.includes(shortTest)) return false; // this IS the test number, don't skip
  return true; // skip — not the test number
}

interface LeadForFollowUp {
  lead_id: string;
  lead_name: string;
  lead_whatsapp: string;
  lead_unit: string | null;
  lead_month: string | null;
  lead_guests: string | null;
  choice_time: string;
  conversation_id: string | null;
  instance_id: string | null;
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

    console.log("[follow-up-check] Starting follow-up check...");

    // Fetch all bot settings with any follow-up enabled
    const { data: allSettings, error: settingsError } = await supabase
      .from("wapi_bot_settings")
      .select("instance_id, test_mode_enabled, test_mode_number, follow_up_enabled, follow_up_delay_hours, follow_up_message, follow_up_2_enabled, follow_up_2_delay_hours, follow_up_2_message, follow_up_3_enabled, follow_up_3_delay_hours, follow_up_3_message, follow_up_4_enabled, follow_up_4_delay_hours, follow_up_4_message, auto_lost_enabled, auto_lost_delay_hours, next_step_reminder_enabled, next_step_reminder_delay_minutes, next_step_reminder_message, bot_inactive_followup_enabled, bot_inactive_followup_delay_minutes, bot_inactive_followup_message")
      .or("follow_up_enabled.eq.true,follow_up_2_enabled.eq.true,follow_up_3_enabled.eq.true,follow_up_4_enabled.eq.true,next_step_reminder_enabled.eq.true,bot_inactive_followup_enabled.eq.true,auto_lost_enabled.eq.true");

    if (settingsError) {
      console.error("[follow-up-check] Error fetching settings:", settingsError);
      throw settingsError;
    }

    if (!allSettings || allSettings.length === 0) {
      console.log("[follow-up-check] Follow-up is disabled for all instances");
      return new Response(
        JSON.stringify({ success: true, message: "Follow-up disabled", count: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let totalSuccessCount = 0;
    const allErrors: string[] = [];

    // Process flow builder timer timeouts (global, not per-instance)
    const timerResult = await processFlowTimerTimeouts({ supabase });
    totalSuccessCount += timerResult.successCount;
    allErrors.push(...timerResult.errors);

    // Process stale proximo_passo_reminded alerts (global, runs once)
    await processStaleRemindedAlerts({ supabase });

    // Process stuck bot recovery (global, before per-instance follow-ups)
    const stuckBotResult = await processStuckBotRecovery({ supabase });
    totalSuccessCount += stuckBotResult.successCount;
    allErrors.push(...stuckBotResult.errors);

    // Process each instance with follow-up enabled
    for (const settings of allSettings) {
      // Process bot inactive follow-up (leads who stopped responding during bot flow)
      if (settings.bot_inactive_followup_enabled) {
        const result = await processBotInactiveFollowUp({
          supabase,
          settings,
        });
        totalSuccessCount += result.successCount;
        allErrors.push(...result.errors);
      }

      // Process next-step reminder (10 min default)
      if (settings.next_step_reminder_enabled) {
        const result = await processNextStepReminder({
          supabase,
          settings,
        });
        totalSuccessCount += result.successCount;
        allErrors.push(...result.errors);
      }

      // Process first follow-up
      if (settings.follow_up_enabled) {
        const result = await processFollowUp({
          supabase,
          settings,
          followUpNumber: 1,
          delayHours: settings.follow_up_delay_hours || 24,
          message: settings.follow_up_message || getDefaultFollowUpMessage(1),
          historyAction: "Follow-up automático enviado",
          checkPreviousAction: null,
        });
        totalSuccessCount += result.successCount;
        allErrors.push(...result.errors);
      }

      // Process second follow-up
      if (settings.follow_up_2_enabled) {
        const result = await processFollowUp({
          supabase,
          settings,
          followUpNumber: 2,
          delayHours: settings.follow_up_2_delay_hours || 48,
          message: settings.follow_up_2_message || getDefaultFollowUpMessage(2),
          historyAction: "Follow-up #2 automático enviado",
          checkPreviousAction: "Follow-up automático enviado",
        });
        totalSuccessCount += result.successCount;
        allErrors.push(...result.errors);
      }

      // Process third follow-up
      if (settings.follow_up_3_enabled) {
        const result = await processFollowUp({
          supabase,
          settings,
          followUpNumber: 3,
          delayHours: settings.follow_up_3_delay_hours || 72,
          message: settings.follow_up_3_message || getDefaultFollowUpMessage(3),
          historyAction: "Follow-up #3 automático enviado",
          checkPreviousAction: "Follow-up #2 automático enviado",
        });
        totalSuccessCount += result.successCount;
        allErrors.push(...result.errors);
      }

      // Process fourth follow-up
      if (settings.follow_up_4_enabled) {
        const result = await processFollowUp({
          supabase,
          settings,
          followUpNumber: 4,
          delayHours: settings.follow_up_4_delay_hours || 96,
          message: settings.follow_up_4_message || getDefaultFollowUpMessage(4),
          historyAction: "Follow-up #4 automático enviado",
          checkPreviousAction: "Follow-up #3 automático enviado",
        });
        totalSuccessCount += result.successCount;
        allErrors.push(...result.errors);
      }

      // Process auto-lost after 4th follow-up
      if (settings.auto_lost_enabled) {
        const result = await processAutoLost({
          supabase,
          settings,
        });
        totalSuccessCount += result.successCount;
        allErrors.push(...result.errors);
      }
    }

    console.log(`[follow-up-check] Completed. Sent ${totalSuccessCount} follow-ups, ${allErrors.length} errors`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Sent ${totalSuccessCount} follow-up messages`,
        count: totalSuccessCount,
        errors: allErrors.length > 0 ? allErrors : undefined,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[follow-up-check] Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: String(error) }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});

// ============= NEXT STEP REMINDER (sends reminder when lead doesn't respond to proximo_passo question) =============

interface NextStepReminderParams {
  supabase: ReturnType<typeof createClient>;
  settings: FollowUpSettings;
}

async function processNextStepReminder({
  supabase,
  settings,
}: NextStepReminderParams): Promise<{ successCount: number; errors: string[] }> {
  const errors: string[] = [];
  let successCount = 0;
  const delayMinutes = settings.next_step_reminder_delay_minutes || 10;

  console.log(`[follow-up-check] Processing next-step reminder for instance ${settings.instance_id} with ${delayMinutes}min delay`);

  const now = new Date();
  const cutoffTime = new Date(now.getTime() - delayMinutes * 60 * 1000);
  const maxWindow = new Date(now.getTime() - 24 * 60 * 60 * 1000); // max 24h window

  // Find conversations stuck at proximo_passo step where last message is older than delay
  const { data: stuckConversations, error: convError } = await supabase
    .from("wapi_conversations")
    .select("id, remote_jid, instance_id, lead_id, bot_data, contact_name")
    .eq("instance_id", settings.instance_id)
    .eq("bot_step", "proximo_passo")
    .eq("last_message_from_me", true)
    .not("remote_jid", "like", "%@g.us%")
    .lte("last_message_at", cutoffTime.toISOString())
    .gte("last_message_at", maxWindow.toISOString());

  if (convError) {
    console.error(`[follow-up-check] Error fetching stuck conversations:`, convError);
    return { successCount: 0, errors: [String(convError)] };
  }

  if (!stuckConversations || stuckConversations.length === 0) {
    console.log(`[follow-up-check] No conversations need next-step reminder for instance ${settings.instance_id}`);
    return { successCount: 0, errors: [] };
  }

  console.log(`[follow-up-check] Found ${stuckConversations.length} conversations needing next-step reminder`);

  // Get instance credentials
  const { data: instance } = await supabase
    .from("wapi_instances")
    .select("instance_id, instance_token, company_id")
    .eq("id", settings.instance_id)
    .single();

  if (!instance) {
    console.error(`[follow-up-check] No instance found for ${settings.instance_id}`);
    return { successCount: 0, errors: [`Instance not found: ${settings.instance_id}`] };
  }

  const defaultReminderMsg = `Oi {nome} estou por aqui escolha uma das opções.\n\n1️⃣ - Agendar visita\n2️⃣ - Tirar dúvidas\n3️⃣ - Analisar com calma`;
  const reminderTemplate = settings.next_step_reminder_message || defaultReminderMsg;

  for (const conv of stuckConversations) {
    try {
      // Test mode guard: skip if not the test number
      if (shouldSkipTestMode(settings.test_mode_enabled, settings.test_mode_number, conv.remote_jid)) {
        console.log(`[follow-up-check] 🧪 Test mode active — skipping next-step reminder for ${conv.remote_jid}`);
        continue;
      }

      const botData = (conv.bot_data || {}) as Record<string, string>;
      const firstName = resolveFirstName(botData as Record<string, unknown>, conv.contact_name);
      
      const personalizedMessage = reminderTemplate
        .replace(/\{nome\}/g, firstName);

      const phone = conv.remote_jid.replace("@s.whatsapp.net", "").replace("@c.us", "");

      const wapiResponse = await fetch(
        `https://api.w-api.app/v1/message/send-text?instanceId=${instance.instance_id}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${instance.instance_token}`,
          },
          body: JSON.stringify({ phone, message: personalizedMessage }),
        }
      );

      if (!wapiResponse.ok) {
        const errorText = await wapiResponse.text();
        console.error(`[follow-up-check] Failed to send reminder to ${phone}:`, errorText);
        errors.push(`Failed reminder to ${phone}: ${errorText}`);
        continue;
      }

      console.log(`[follow-up-check] Next-step reminder sent to ${phone}`);

      // Extract message_id from W-API response to prevent duplicate inserts by webhook
      let sentMsgId: string | null = null;
      try {
        const wapiData = await wapiResponse.json();
        sentMsgId = wapiData?.result?.key?.id || wapiData?.key?.id || wapiData?.messageId || wapiData?.data?.messageId || wapiData?.id || null;
        console.log(`[follow-up-check] W-API response messageId: ${sentMsgId}`);
      } catch { /* ignore parse errors */ }

      // Save message
      await supabase.from("wapi_messages").insert({
        conversation_id: conv.id,
        content: personalizedMessage,
        from_me: true,
        message_type: "text",
        message_id: sentMsgId,
        status: "sent",
        timestamp: new Date().toISOString(),
        metadata: { source: "auto_reminder", type: "next_step_reminder" },
        company_id: instance.company_id,
      });

      // Update conversation: change step to proximo_passo_reminded so we don't resend
      await supabase
        .from("wapi_conversations")
        .update({
          bot_step: "proximo_passo_reminded",
          bot_enabled: true,
          last_message_at: new Date().toISOString(),
          last_message_content: personalizedMessage.substring(0, 100),
          last_message_from_me: true,
        })
        .eq("id", conv.id);

      successCount++;
    } catch (err) {
      console.error(`[follow-up-check] Error processing reminder for conv ${conv.id}:`, err);
      errors.push(`Error with conv ${conv.id}: ${String(err)}`);
    }
  }

  return { successCount, errors };
}

// ============= FOLLOW-UP AFTER "ANALISAR COM CALMA" =============

interface ProcessFollowUpParams {
  supabase: ReturnType<typeof createClient>;
  settings: FollowUpSettings;
  followUpNumber: number;
  delayHours: number;
  message: string;
  historyAction: string;
  checkPreviousAction: string | null;
}

async function processFollowUp({
  supabase,
  settings,
  followUpNumber,
  delayHours,
  message,
  historyAction,
  checkPreviousAction,
}: ProcessFollowUpParams): Promise<{ successCount: number; errors: string[] }> {
  const errors: string[] = [];
  let successCount = 0;

  const now = new Date();
  const minTime = new Date(now.getTime() - 72 * 60 * 60 * 1000); // 72 hours ago (max window)
  const maxTime = new Date(now.getTime() - delayHours * 60 * 60 * 1000); // configured delay

  console.log(`[follow-up-check] Processing follow-up #${followUpNumber} for instance ${settings.instance_id} with ${delayHours}h delay`);

  // Get leads that chose "Analisar" within the time window
  const { data: analysisChoices, error: choicesError } = await supabase
    .from("lead_history")
    .select("lead_id, created_at")
    .eq("action", "Próximo passo escolhido")
    .or("new_value.ilike.%Analisar%,new_value.eq.3")
    .gte("created_at", minTime.toISOString())
    .lte("created_at", maxTime.toISOString());

  if (choicesError) {
    console.error(`[follow-up-check] Error fetching analysis choices:`, choicesError);
    return { successCount: 0, errors: [String(choicesError)] };
  }

  if (!analysisChoices || analysisChoices.length === 0) {
    console.log(`[follow-up-check] No leads need follow-up #${followUpNumber} for instance ${settings.instance_id}`);
    return { successCount: 0, errors: [] };
  }

  const allLeadIds = analysisChoices.map(c => c.lead_id);
  console.log(`[follow-up-check] Found ${allLeadIds.length} potential leads for follow-up #${followUpNumber}`);

  // Filter only leads that have a conversation in THIS instance
  const { data: instanceConversations } = await supabase
    .from("wapi_conversations")
    .select("lead_id")
    .in("lead_id", allLeadIds)
    .eq("instance_id", settings.instance_id)
    .not("remote_jid", "like", "%@g.us%");

  const leadsInThisInstance = new Set(
    (instanceConversations || []).map((c: { lead_id: string }) => c.lead_id)
  );
  const leadIds = allLeadIds.filter((id: string) => leadsInThisInstance.has(id));

  console.log(`[follow-up-check] ${leadIds.length} of ${allLeadIds.length} leads belong to instance ${settings.instance_id}`);

  // Check which leads already received this specific follow-up
  const { data: existingFollowUps, error: followUpError } = await supabase
    .from("lead_history")
    .select("lead_id")
    .in("lead_id", leadIds)
    .eq("action", historyAction);

  if (followUpError) {
    console.error("[follow-up-check] Error checking existing follow-ups:", followUpError);
    return { successCount: 0, errors: [String(followUpError)] };
  }

  const alreadyFollowedUp = new Set((existingFollowUps || []).map(f => f.lead_id));
  let leadsNeedingFollowUp = leadIds.filter(id => !alreadyFollowedUp.has(id));

  // For second follow-up: only process leads that received the first follow-up
  if (checkPreviousAction) {
    const { data: previousFollowUps, error: prevError } = await supabase
      .from("lead_history")
      .select("lead_id")
      .in("lead_id", leadsNeedingFollowUp)
      .eq("action", checkPreviousAction);

    if (prevError) {
      console.error("[follow-up-check] Error checking previous follow-ups:", prevError);
      return { successCount: 0, errors: [String(prevError)] };
    }

    const receivedPrevious = new Set((previousFollowUps || []).map(f => f.lead_id));
    leadsNeedingFollowUp = leadsNeedingFollowUp.filter(id => receivedPrevious.has(id));
  }

  // Check if lead replied (last message is from contact) - skip follow-up if they did
  {
    const { data: conversations } = await supabase
      .from("wapi_conversations")
      .select("lead_id, last_message_from_me")
      .in("lead_id", leadsNeedingFollowUp)
      .eq("last_message_from_me", false);

    // If the last message is from the contact, they replied - skip follow-up
    const repliedLeads = new Set((conversations || []).map(c => c.lead_id));
    leadsNeedingFollowUp = leadsNeedingFollowUp.filter(id => !repliedLeads.has(id));
    
    console.log(`[follow-up-check] After filtering replied leads: ${leadsNeedingFollowUp.length} leads need follow-up #${followUpNumber}`);
  }

  if (leadsNeedingFollowUp.length === 0) {
    console.log(`[follow-up-check] All potential leads already received follow-up #${followUpNumber} or replied`);
    return { successCount: 0, errors: [] };
  }

  console.log(`[follow-up-check] ${leadsNeedingFollowUp.length} leads need follow-up #${followUpNumber}`);

  // Get lead details and conversation info
  const { data: leads, error: leadsError } = await supabase
    .from("campaign_leads")
    .select("id, name, whatsapp, unit, month, guests")
    .in("id", leadsNeedingFollowUp)
    .eq("status", "aguardando_resposta");

  if (leadsError) {
    console.error("[follow-up-check] Error fetching leads:", leadsError);
    return { successCount: 0, errors: [String(leadsError)] };
  }

  if (!leads || leads.length === 0) {
    console.log("[follow-up-check] No leads in aguardando_resposta status need follow-up");
    return { successCount: 0, errors: [] };
  }

  for (const lead of leads) {
    try {
      // Test mode guard: find conversation phone and check
      if (settings.test_mode_enabled && settings.test_mode_number) {
        const { data: testConv } = await supabase
          .from("wapi_conversations")
          .select("remote_jid")
          .eq("lead_id", lead.id)
          .eq("instance_id", settings.instance_id)
          .single();
        if (testConv && shouldSkipTestMode(settings.test_mode_enabled, settings.test_mode_number, testConv.remote_jid)) {
          console.log(`[follow-up-check] 🧪 Test mode active — skipping follow-up #${followUpNumber} for ${lead.name}`);
          continue;
        }
      }

      console.log(`[follow-up-check] Processing lead: ${lead.name} (${lead.id}) for follow-up #${followUpNumber}`);

      // Find the conversation for this lead that belongs to this instance
      const { data: conversation } = await supabase
        .from("wapi_conversations")
        .select("id, instance_id, remote_jid")
        .eq("lead_id", lead.id)
        .eq("instance_id", settings.instance_id)
        .single();

      if (!conversation) {
        console.log(`[follow-up-check] No conversation found for lead ${lead.id} in instance ${settings.instance_id}`);
        continue;
      }

      // Get instance credentials
      const { data: instance } = await supabase
        .from("wapi_instances")
        .select("instance_id, instance_token, company_id")
        .eq("id", conversation.instance_id)
        .single();

      if (!instance) {
        console.log(`[follow-up-check] No instance found for conversation ${conversation.id}`);
        continue;
      }

      // Compose follow-up message with variable replacements
      const firstName = resolveFirstName({} as Record<string, unknown>, null, lead.name);
      let personalizedMessage = message
        .replace(/\{nome\}/g, firstName)
        .replace(/\{unidade\}/g, lead.unit || "nossa unidade")
        .replace(/\{mes\}/g, lead.month || "")
        .replace(/\{convidados\}/g, lead.guests || "");

      // Append numbered options if not already present in the message
      const hasOptions = /1️⃣/.test(personalizedMessage) || /\*1\*/.test(personalizedMessage);
      if (!hasOptions) {
        personalizedMessage += `\n\n1️⃣ - Agendar visita\n2️⃣ - Tirar dúvidas\n3️⃣ - Analisar com calma`;
      }

      // Send the message via W-API
      const wapiResponse = await fetch(
        `https://api.w-api.app/v1/message/send-text?instanceId=${instance.instance_id}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${instance.instance_token}`,
          },
          body: JSON.stringify({
            phone: conversation.remote_jid.replace("@s.whatsapp.net", ""),
            message: personalizedMessage,
          }),
        }
      );

      if (!wapiResponse.ok) {
        const errorText = await wapiResponse.text();
        console.error(`[follow-up-check] Failed to send message to ${lead.name}:`, errorText);
        errors.push(`Failed to send to ${lead.name}: ${errorText}`);
        continue;
      }

      console.log(`[follow-up-check] Follow-up #${followUpNumber} sent successfully to ${lead.name}`);

      // Extract message_id from W-API response to prevent duplicate inserts by webhook
      let sentMsgId: string | null = null;
      try {
        const wapiData = await wapiResponse.json();
        sentMsgId = wapiData?.result?.key?.id || wapiData?.key?.id || wapiData?.messageId || wapiData?.data?.messageId || wapiData?.id || null;
        console.log(`[follow-up-check] W-API follow-up response messageId: ${sentMsgId}`);
      } catch { /* ignore parse errors */ }

      // Save the message to the database
      await supabase.from("wapi_messages").insert({
        conversation_id: conversation.id,
        content: personalizedMessage,
        from_me: true,
        message_type: "text",
        message_id: sentMsgId,
        status: "sent",
        timestamp: new Date().toISOString(),
        metadata: { source: "auto_reminder", type: `follow_up_${followUpNumber}` },
        company_id: instance.company_id,
      });

      // Update conversation: reactivate bot but keep step as complete_final
      // The webhook already handles complete_final responses by treating them as proximo_passo
      // We do NOT set bot_step to 'proximo_passo' to avoid processNextStepReminder sending a duplicate
      await supabase
        .from("wapi_conversations")
        .update({
          last_message_at: new Date().toISOString(),
          last_message_content: personalizedMessage.substring(0, 100),
          last_message_from_me: true,
          bot_enabled: true,
        })
        .eq("id", conversation.id);

      // Record follow-up in history
      await supabase.from("lead_history").insert({
        lead_id: lead.id,
        company_id: instance.company_id,
        action: historyAction,
        new_value: `Mensagem de acompanhamento #${followUpNumber} após ${delayHours}h`,
      });

      // Create notification for the team (scoped to company)
      const unitLower = (lead.unit || "all").toLowerCase();
      const unitPermission = `leads.unit.${unitLower}`;
      
      // Get users that belong to this company
      const { data: companyUsers } = await supabase
        .from("user_companies")
        .select("user_id")
        .eq("company_id", instance.company_id);
      
      const companyUserIds = companyUsers?.map((u: any) => u.user_id) || [];
      
      let usersToNotify: { user_id: string }[] = [];
      if (companyUserIds.length > 0) {
        const { data: perms } = await supabase
          .from("user_permissions")
          .select("user_id")
          .or(`permission.eq.leads.unit.all,permission.eq.${unitPermission}`)
          .eq("granted", true)
          .in("user_id", companyUserIds);
        
        const { data: adminRoles } = await supabase
          .from("user_roles")
          .select("user_id")
          .eq("role", "admin")
          .in("user_id", companyUserIds);
        
        const ids = new Set<string>();
        perms?.forEach((p: any) => ids.add(p.user_id));
        adminRoles?.forEach((r: any) => ids.add(r.user_id));
        usersToNotify = Array.from(ids).map(id => ({ user_id: id }));
      }

      if (usersToNotify.length > 0) {
        const notifications = usersToNotify.map((u) => ({
          user_id: u.user_id,
          company_id: instance.company_id,
          type: "follow_up_sent",
          title: `📬 Follow-up #${followUpNumber} enviado: ${lead.name}`,
          message: `Mensagem de acompanhamento automático #${followUpNumber} enviada para ${firstName}`,
          data: { lead_id: lead.id, lead_name: lead.name, follow_up_number: followUpNumber },
        }));

        await supabase.from("notifications").insert(notifications);
      }

      successCount++;
    } catch (leadError) {
      console.error(`[follow-up-check] Error processing lead ${lead.id}:`, leadError);
      errors.push(`Error with ${lead.name}: ${String(leadError)}`);
    }
  }

  return { successCount, errors };
}

function getDefaultFollowUpMessage(number: number): string {
  if (number === 1) {
    return `Olá, {nome}! 👋

Passando para saber se teve a chance de analisar as informações que enviamos sobre o Castelo da Diversão! 🏰

Estamos à disposição para esclarecer qualquer dúvida ou agendar uma visita para conhecer pessoalmente nossos espaços. 

Podemos te ajudar? 😊`;
  } else if (number === 2) {
    return `Olá, {nome}! 👋

Ainda não tivemos retorno sobre a festa no Castelo da Diversão! 🏰

Temos pacotes especiais e datas disponíveis para {mes}. Que tal agendar uma visita para conhecer nosso espaço? 

Estamos aqui para te ajudar! 😊`;
  } else if (number === 3) {
    return `Oi, {nome}! 😊

Sei que a decisão de uma festa leva tempo, mas quero garantir que você não perca as melhores datas para {mes}! 📅

Posso te ajudar com alguma dúvida ou enviar mais informações sobre nossos pacotes?`;
  } else {
    return `{nome}, última chamada! 🎉

As datas para {mes} estão quase esgotadas! Se ainda estiver pensando na festa, esse é o momento ideal para garantir.

Posso reservar um horário para você conhecer nosso espaço? 🏰`;
  }
}

// ============= BOT INACTIVE FOLLOW-UP (leads who stopped responding during bot flow) =============

interface BotInactiveFollowUpParams {
  supabase: ReturnType<typeof createClient>;
  settings: FollowUpSettings;
}

async function processBotInactiveFollowUp({
  supabase,
  settings,
}: BotInactiveFollowUpParams): Promise<{ successCount: number; errors: string[] }> {
  const errors: string[] = [];
  let successCount = 0;
  const delayMinutes = settings.bot_inactive_followup_delay_minutes || 30;

  console.log(`[follow-up-check] Processing bot-inactive follow-up for instance ${settings.instance_id} with ${delayMinutes}min delay`);

  const now = new Date();
  const cutoffTime = new Date(now.getTime() - delayMinutes * 60 * 1000);
  const maxWindow = new Date(now.getTime() - 24 * 60 * 60 * 1000); // max 24h window

  // Bot steps where a lead can be "stuck" (bot sent question, lead never replied)
  const activeBotSteps = ["nome", "tipo", "mes", "dia", "convidados", "welcome", "lp_sent"];

  // Find conversations stuck at active bot steps where last message is from bot and older than delay
  const { data: stuckConversations, error: convError } = await supabase
    .from("wapi_conversations")
    .select("id, remote_jid, instance_id, lead_id, bot_data, contact_name, bot_step")
    .eq("instance_id", settings.instance_id)
    .eq("bot_enabled", true)
    .eq("last_message_from_me", true)
    .not("remote_jid", "like", "%@g.us%")
    .in("bot_step", activeBotSteps)
    .lte("last_message_at", cutoffTime.toISOString())
    .gte("last_message_at", maxWindow.toISOString());

  if (convError) {
    console.error(`[follow-up-check] Error fetching stuck bot conversations:`, convError);
    return { successCount: 0, errors: [String(convError)] };
  }

  if (!stuckConversations || stuckConversations.length === 0) {
    console.log(`[follow-up-check] No conversations need bot-inactive follow-up for instance ${settings.instance_id}`);
    return { successCount: 0, errors: [] };
  }

  console.log(`[follow-up-check] Found ${stuckConversations.length} conversations needing bot-inactive follow-up`);

  // Get instance credentials
  const { data: instance } = await supabase
    .from("wapi_instances")
    .select("instance_id, instance_token, company_id")
    .eq("id", settings.instance_id)
    .single();

  if (!instance) {
    console.error(`[follow-up-check] No instance found for ${settings.instance_id}`);
    return { successCount: 0, errors: [`Instance not found: ${settings.instance_id}`] };
  }

  const defaultMsg = `Oi {nome}, notei que você não conseguiu concluir. Estou por aqui caso precise de ajuda! 😊

Podemos continuar de onde paramos?`;
  const messageTemplate = settings.bot_inactive_followup_message || defaultMsg;

  // Pre-fetch bot questions for this instance to re-ask the current step question
  const { data: botQuestions } = await supabase
    .from("wapi_bot_questions")
    .select("step, question_text")
    .eq("instance_id", settings.instance_id)
    .eq("is_active", true);

  // Map step to question text for quick lookup
  const stepQuestionMap: Record<string, string> = {};
  if (botQuestions) {
    for (const q of botQuestions) {
      stepQuestionMap[q.step] = q.question_text;
    }
  }

  for (const conv of stuckConversations) {
    try {
      // Test mode guard: skip if not the test number
      if (shouldSkipTestMode(settings.test_mode_enabled, settings.test_mode_number, conv.remote_jid)) {
        console.log(`[follow-up-check] 🧪 Test mode active — skipping bot-inactive follow-up for ${conv.remote_jid}`);
        continue;
      }

      const botData = (conv.bot_data || {}) as Record<string, unknown>;
      
      // Skip if already reminded (prevent duplicate reminders)
      if (botData._inactive_reminded) {
        console.log(`[follow-up-check] Skipping conv ${conv.id} - already reminded`);
        continue;
      }
      
      // Try to fetch lead name as additional fallback
      let leadName: string | null = null;
      if (conv.lead_id) {
        const { data: lead } = await supabase
          .from('campaign_leads')
          .select('name')
          .eq('id', conv.lead_id)
          .single();
        leadName = lead?.name || null;
      }
      const firstName = resolveFirstName(botData, conv.contact_name, leadName);
      
      let personalizedMessage = messageTemplate.replace(/\{nome\}/g, firstName);

      // Append the original question the lead didn't answer (from DB or DEFAULT_QUESTIONS fallback)
      const currentStep = conv.bot_step as string;
      const stepQuestion = stepQuestionMap[currentStep];
      if (stepQuestion) {
        const personalizedQuestion = stepQuestion.replace(/\{nome\}/g, firstName);
        personalizedMessage += `\n\n${personalizedQuestion}`;
      } else {
        // Fallback: use default question for this step
        const DEFAULT_QUESTIONS_MAP: Record<string, string> = {
          nome: 'Para começar, me conta: qual é o seu nome? 👑',
          tipo: `Você já é nosso cliente e tem uma festa agendada, ou gostaria de receber um orçamento? 🎉\n\nResponda com o *número*:\n\n1️⃣ Já sou cliente\n2️⃣ Quero um orçamento\n3️⃣ Trabalhe Conosco`,
          mes: `Que legal! 🎉 E pra qual mês você tá pensando em fazer essa festa incrível?\n\n📅 Responda com o *número*:\n\n2️⃣ Fevereiro\n3️⃣ Março\n4️⃣ Abril\n5️⃣ Maio\n6️⃣ Junho\n7️⃣ Julho\n8️⃣ Agosto\n9️⃣ Setembro\n🔟 Outubro\n1️⃣1️⃣ Novembro\n1️⃣2️⃣ Dezembro`,
          dia: `Maravilha! Tem preferência de dia da semana? 🗓️\n\nResponda com o *número*:\n\n1️⃣ Segunda a Quinta\n2️⃣ Sexta\n3️⃣ Sábado\n4️⃣ Domingo`,
          convidados: `E quantos convidados você pretende chamar pra essa festa mágica? 🎈\n\n👥 Responda com o *número*:\n\n1️⃣ 50 pessoas\n2️⃣ 60 pessoas\n3️⃣ 70 pessoas\n4️⃣ 80 pessoas\n5️⃣ 90 pessoas\n6️⃣ 100 pessoas`,
          welcome: 'Para começar, me conta: qual é o seu nome? 👑',
          lp_sent: 'Oi {nome}, ainda estou por aqui! Escolha a opção que mais te agrada:\n\n1️⃣ - Receber agora meu orçamento\n2️⃣ - Falar com um atendente',
        };
        const fallbackQuestion = DEFAULT_QUESTIONS_MAP[currentStep];
        if (fallbackQuestion) {
          const personalizedQuestion = fallbackQuestion.replace(/\{nome\}/g, firstName);
          personalizedMessage += `\n\n${personalizedQuestion}`;
        }
      }
      const phone = conv.remote_jid.replace("@s.whatsapp.net", "").replace("@c.us", "");

      const wapiResponse = await fetch(
        `https://api.w-api.app/v1/message/send-text?instanceId=${instance.instance_id}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${instance.instance_token}`,
          },
          body: JSON.stringify({ phone, message: personalizedMessage }),
        }
      );

      if (!wapiResponse.ok) {
        const errorText = await wapiResponse.text();
        console.error(`[follow-up-check] Failed to send bot-inactive follow-up to ${phone}:`, errorText);
        errors.push(`Failed bot-inactive follow-up to ${phone}: ${errorText}`);
        continue;
      }

      console.log(`[follow-up-check] Bot-inactive follow-up sent to ${phone} (was stuck at step: ${conv.bot_step})`);

      // Extract message_id from W-API response to prevent duplicate inserts by webhook
      let sentMsgId: string | null = null;
      try {
        const wapiData = await wapiResponse.json();
        sentMsgId = wapiData?.result?.key?.id || wapiData?.key?.id || wapiData?.messageId || wapiData?.data?.messageId || wapiData?.id || null;
        console.log(`[follow-up-check] W-API bot-inactive response messageId: ${sentMsgId}`);
      } catch { /* ignore parse errors */ }

      // Save message
      await supabase.from("wapi_messages").insert({
        conversation_id: conv.id,
        content: personalizedMessage,
        from_me: true,
        message_type: "text",
        message_id: sentMsgId,
        status: "sent",
        timestamp: new Date().toISOString(),
        metadata: { source: "auto_reminder", type: "bot_inactive" },
        company_id: instance.company_id,
      });

      // Always keep bot enabled so it can process the lead's reply
      // Mark _inactive_reminded in bot_data to prevent duplicate reminders
      const updatedBotData = { ...botData, _inactive_reminded: true };
      await supabase
        .from("wapi_conversations")
        .update({
          bot_step: conv.bot_step, // keep current step so bot re-processes the answer
          bot_enabled: true, // always reactivate
          bot_data: updatedBotData,
          last_message_at: new Date().toISOString(),
          last_message_content: personalizedMessage.substring(0, 100),
          last_message_from_me: true,
        })
        .eq("id", conv.id);

      successCount++;
    } catch (err) {
      console.error(`[follow-up-check] Error processing bot-inactive follow-up for conv ${conv.id}:`, err);
      errors.push(`Error with conv ${conv.id}: ${String(err)}`);
    }
  }

  return { successCount, errors };
}

// ============= AUTO-LOST AFTER 4TH FOLLOW-UP =============

interface ProcessAutoLostParams {
  supabase: ReturnType<typeof createClient>;
  settings: FollowUpSettings;
}

async function processAutoLost({
  supabase,
  settings,
}: ProcessAutoLostParams): Promise<{ successCount: number; errors: string[] }> {
  const errors: string[] = [];
  let successCount = 0;
  const delayHours = settings.auto_lost_delay_hours || 48;

  console.log(`[follow-up-check] Processing auto-lost for instance ${settings.instance_id} with ${delayHours}h delay after 4th follow-up`);

  const now = new Date();
  const cutoffTime = new Date(now.getTime() - delayHours * 60 * 60 * 1000);

  // Find leads that received the 4th follow-up before the cutoff
  const { data: fourthFollowUps, error: histError } = await supabase
    .from("lead_history")
    .select("lead_id, created_at")
    .eq("action", "Follow-up #4 automático enviado")
    .lte("created_at", cutoffTime.toISOString());

  if (histError) {
    console.error(`[follow-up-check] Error fetching 4th follow-up history:`, histError);
    return { successCount: 0, errors: [String(histError)] };
  }

  if (!fourthFollowUps || fourthFollowUps.length === 0) {
    console.log(`[follow-up-check] No leads eligible for auto-lost for instance ${settings.instance_id}`);
    return { successCount: 0, errors: [] };
  }

  const leadIds = fourthFollowUps.map(f => f.lead_id);

  // Check which leads already have been auto-lost
  const { data: alreadyLost } = await supabase
    .from("lead_history")
    .select("lead_id")
    .in("lead_id", leadIds)
    .eq("action", "Lead movido para perdido automaticamente");

  const alreadyLostSet = new Set((alreadyLost || []).map(l => l.lead_id));
  const eligibleLeadIds = leadIds.filter(id => !alreadyLostSet.has(id));

  if (eligibleLeadIds.length === 0) {
    console.log(`[follow-up-check] All leads already processed for auto-lost`);
    return { successCount: 0, errors: [] };
  }

  // Get leads that are still in aguardando_resposta
  const { data: activeLeads, error: leadsError } = await supabase
    .from("campaign_leads")
    .select("id, name, whatsapp, responsavel_id")
    .in("id", eligibleLeadIds)
    .eq("status", "aguardando_resposta");

  if (leadsError) {
    console.error(`[follow-up-check] Error fetching active leads:`, leadsError);
    return { successCount: 0, errors: [String(leadsError)] };
  }

  if (!activeLeads || activeLeads.length === 0) {
    console.log(`[follow-up-check] No active leads in aguardando_resposta for auto-lost`);
    return { successCount: 0, errors: [] };
  }

  // Filter: only leads whose conversation belongs to this instance AND last_message_from_me = true (no reply)
  const activeLeadIds = activeLeads.map(l => l.id);
  const { data: conversations } = await supabase
    .from("wapi_conversations")
    .select("lead_id")
    .in("lead_id", activeLeadIds)
    .eq("instance_id", settings.instance_id)
    .eq("last_message_from_me", true)
    .not("remote_jid", "like", "%@g.us%");

  const leadsInInstance = new Set((conversations || []).map((c: { lead_id: string }) => c.lead_id));
  const leadsToMark = activeLeads.filter(l => leadsInInstance.has(l.id));

  console.log(`[follow-up-check] ${leadsToMark.length} leads will be marked as perdido (auto-lost)`);

  for (const lead of leadsToMark) {
    try {
      // Test mode guard
      if (shouldSkipTestMode(settings.test_mode_enabled, settings.test_mode_number, lead.whatsapp)) {
        console.log(`[follow-up-check] 🧪 Test mode — skipping auto-lost for ${lead.whatsapp}`);
        continue;
      }

      // Update lead status to perdido
      const { error: updateError } = await supabase
        .from("campaign_leads")
        .update({ status: "perdido" })
        .eq("id", lead.id);

      if (updateError) {
        console.error(`[follow-up-check] Error updating lead ${lead.id} to perdido:`, updateError);
        errors.push(`Error updating lead ${lead.id}: ${String(updateError)}`);
        continue;
      }

      // Register in lead_history
      await supabase.from("lead_history").insert({
        lead_id: lead.id,
        user_id: null,
        user_name: "Sistema",
        action: "Lead movido para perdido automaticamente",
        old_value: "aguardando_resposta",
        new_value: "perdido",
      });

      // Send notification to responsavel if exists
      if (lead.responsavel_id) {
        // Get instance company_id for notification
        const { data: instance } = await supabase
          .from("wapi_instances")
          .select("company_id")
          .eq("id", settings.instance_id)
          .single();

        if (instance) {
          await supabase.from("notifications").insert({
            user_id: lead.responsavel_id,
            company_id: instance.company_id,
            type: "lead_lost",
            title: "Lead movido para Perdido",
            message: `O lead ${lead.name} foi movido automaticamente para Perdido após não responder ao 4º follow-up.`,
            metadata: { lead_id: lead.id, lead_name: lead.name },
          });
        }
      }

      console.log(`[follow-up-check] ✅ Lead ${lead.name} (${lead.id}) marked as perdido (auto-lost)`);
      successCount++;
    } catch (err) {
      console.error(`[follow-up-check] Error processing auto-lost for lead ${lead.id}:`, err);
      errors.push(`Error with lead ${lead.id}: ${String(err)}`);
    }
  }

  return { successCount, errors };
}

// ============= FLOW BUILDER TIMER TIMEOUT (checks expired timer nodes and triggers timeout path) =============

const WAPI_BASE_URL = 'https://api.w-api.app/v1';

interface FlowTimerParams {
  supabase: ReturnType<typeof createClient>;
}

async function processFlowTimerTimeouts({
  supabase,
}: FlowTimerParams): Promise<{ successCount: number; errors: string[] }> {
  const errors: string[] = [];
  let successCount = 0;

  console.log(`[follow-up-check] Processing flow builder timer timeouts...`);

  // Find all flow_lead_state records that are waiting for reply
  const { data: waitingStates, error: statesError } = await supabase
    .from('flow_lead_state')
    .select('id, conversation_id, flow_id, current_node_id, last_sent_at, collected_data')
    .eq('waiting_for_reply', true)
    .not('current_node_id', 'is', null)
    .not('last_sent_at', 'is', null);

  if (statesError) {
    console.error(`[follow-up-check] Error fetching waiting states:`, statesError);
    return { successCount: 0, errors: [String(statesError)] };
  }

  if (!waitingStates || waitingStates.length === 0) {
    console.log(`[follow-up-check] No flow timer states waiting`);
    return { successCount: 0, errors: [] };
  }

  console.log(`[follow-up-check] Found ${waitingStates.length} waiting flow states to check`);

  for (const state of waitingStates) {
    try {
      // Get the current node to check if it's a timer
      const { data: currentNode } = await supabase
        .from('flow_nodes')
        .select('id, node_type, action_config, message_template, flow_id')
        .eq('id', state.current_node_id)
        .single();

      if (!currentNode || currentNode.node_type !== 'timer') {
        continue; // Not a timer node, skip
      }

      const timeoutMinutes = ((currentNode.action_config as Record<string, unknown>)?.timeout_minutes as number) || 10;
      const lastSentAt = new Date(state.last_sent_at!);
      const now = new Date();
      const elapsedMinutes = (now.getTime() - lastSentAt.getTime()) / (60 * 1000);

      if (elapsedMinutes < timeoutMinutes) {
        continue; // Timer hasn't expired yet
      }

      console.log(`[follow-up-check] ⏱️ Timer expired for state ${state.id} (${elapsedMinutes.toFixed(1)}min > ${timeoutMinutes}min)`);

      // Get the timeout option and edge
      const { data: nodeOptions } = await supabase
        .from('flow_node_options')
        .select('id, value')
        .eq('node_id', currentNode.id);

      const timeoutOption = nodeOptions?.find((o: any) => o.value === 'timeout');
      if (!timeoutOption) {
        console.log(`[follow-up-check] No timeout option found for timer node ${currentNode.id}`);
        continue;
      }

      const { data: timeoutEdge } = await supabase
        .from('flow_edges')
        .select('id, target_node_id')
        .eq('source_node_id', currentNode.id)
        .eq('source_option_id', timeoutOption.id)
        .single();

      if (!timeoutEdge) {
        console.log(`[follow-up-check] No timeout edge found for timer node ${currentNode.id}`);
        // Mark as no longer waiting to avoid re-checking
        await supabase.from('flow_lead_state').update({
          waiting_for_reply: false,
        }).eq('id', state.id);
        continue;
      }

      // Get conversation and instance info
      const { data: conv } = await supabase
        .from('wapi_conversations')
        .select('id, remote_jid, instance_id, company_id, contact_name, bot_data')
        .eq('id', state.conversation_id)
        .single();

      if (!conv) {
        console.log(`[follow-up-check] Conversation not found for state ${state.id}`);
        continue;
      }

      // Test mode guard for flow timer timeouts
      {
        const { data: tmSettings } = await supabase
          .from('wapi_bot_settings')
          .select('test_mode_enabled, test_mode_number')
          .eq('instance_id', conv.instance_id)
          .single();
        if (shouldSkipTestMode(tmSettings?.test_mode_enabled, tmSettings?.test_mode_number, conv.remote_jid)) {
          console.log(`[follow-up-check] 🧪 Test mode active — skipping flow timer timeout for ${conv.remote_jid}`);
          continue;
        }
      }

      const { data: instance } = await supabase
        .from('wapi_instances')
        .select('id, instance_id, instance_token, unit, company_id')
        .eq('id', conv.instance_id)
        .single();

      if (!instance) {
        console.log(`[follow-up-check] Instance not found for conversation ${conv.id}`);
        continue;
      }

      // Get target node
      const { data: targetNode } = await supabase
        .from('flow_nodes')
        .select('id, node_type, title, message_template, action_type, action_config, extract_field')
        .eq('id', timeoutEdge.target_node_id)
        .single();

      if (!targetNode) {
        console.log(`[follow-up-check] Target node not found for timeout edge`);
        continue;
      }

      const phone = conv.remote_jid.replace('@s.whatsapp.net', '').replace('@c.us', '');
      const collectedData = (state.collected_data || {}) as Record<string, string>;
      const firstName = collectedData.customer_name || collectedData.nome || 
        (conv.contact_name || '').split(' ')[0] || 'cliente';

      // Helper to replace variables in messages
      const replaceVars = (template: string) => {
        return template
          .replace(/\{nome\}/g, firstName)
          .replace(/\{customer_name\}/g, collectedData.customer_name || firstName)
          .replace(/\{event_date\}/g, collectedData.event_date || '')
          .replace(/\{guest_count\}/g, collectedData.guest_count || '')
          .replace(/\{child_name\}/g, collectedData.child_name || '')
          .replace(/\{child_age\}/g, collectedData.child_age || '');
      };

      // Send target node message if it has one
      if (targetNode.message_template) {
        const msg = replaceVars(targetNode.message_template);
        const res = await fetch(`${WAPI_BASE_URL}/message/send-text?instanceId=${instance.instance_id}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${instance.instance_token}` },
          body: JSON.stringify({ phone, message: msg, delayTyping: 1 }),
        });

        if (res.ok) {
          const r = await res.json();
          const msgId = r.messageId || r.data?.messageId || r.id || null;

          await supabase.from('wapi_messages').insert({
            conversation_id: conv.id, message_id: msgId, from_me: true,
            message_type: 'text', content: msg, status: 'sent',
            timestamp: new Date().toISOString(), company_id: instance.company_id,
          });

          await supabase.from('wapi_conversations').update({
            last_message_at: new Date().toISOString(),
            last_message_content: msg.substring(0, 100),
            last_message_from_me: true,
          }).eq('id', conv.id);
        } else {
          const errText = await res.text();
          console.error(`[follow-up-check] Failed to send timer timeout message: ${errText}`);
        }
      }

      // Update flow state to target node
      await supabase.from('flow_lead_state').update({
        current_node_id: targetNode.id,
        waiting_for_reply: targetNode.node_type === 'question' || targetNode.node_type === 'timer',
        last_sent_at: new Date().toISOString(),
      }).eq('id', state.id);

      // Update conversation bot_step
      const newBotStep = targetNode.node_type === 'end' ? 'flow_complete' : `flow_node_${targetNode.id}`;
      await supabase.from('wapi_conversations').update({
        bot_step: newBotStep,
        bot_enabled: targetNode.node_type !== 'end',
      }).eq('id', conv.id);

      // Handle handoff action on target node
      if (targetNode.node_type === 'action' && targetNode.action_type === 'handoff') {
        await supabase.from('wapi_conversations').update({
          bot_enabled: false,
          bot_step: 'flow_handoff',
        }).eq('id', conv.id);
        
        await supabase.from('flow_lead_state').update({
          waiting_for_reply: false,
        }).eq('id', state.id);
      }

      // Handle end node
      if (targetNode.node_type === 'end') {
        await supabase.from('flow_lead_state').update({
          waiting_for_reply: false,
        }).eq('id', state.id);
      }

      console.log(`[follow-up-check] ⏱️ Timer timeout processed: state ${state.id} → node ${targetNode.title} (${targetNode.node_type})`);
      successCount++;
    } catch (err) {
      console.error(`[follow-up-check] Error processing timer timeout for state ${state.id}:`, err);
      errors.push(`Timer error state ${state.id}: ${String(err)}`);
    }
  }

  return { successCount, errors };
}

// ============= STALE REMINDED ALERTS (notify when lead stuck at proximo_passo_reminded for 2h+) =============

async function processStaleRemindedAlerts({
  supabase,
}: { supabase: ReturnType<typeof createClient> }): Promise<void> {
  const STALE_HOURS = 2;
  const cutoff = new Date(Date.now() - STALE_HOURS * 60 * 60 * 1000).toISOString();

  // Find conversations stuck at proximo_passo_reminded for 2h+ with no reply
  const { data: staleConvs, error } = await supabase
    .from("wapi_conversations")
    .select("id, company_id, lead_id, contact_name, contact_phone, last_message_at, instance_id, remote_jid")
    .eq("bot_step", "proximo_passo_reminded")
    .eq("last_message_from_me", true)
    .not("remote_jid", "like", "%@g.us%")
    .lte("last_message_at", cutoff);

  if (error || !staleConvs || staleConvs.length === 0) {
    if (error) console.error("[follow-up-check] Error fetching stale reminded convs:", error);
    return;
  }

  console.log(`[follow-up-check] Found ${staleConvs.length} leads stale at proximo_passo_reminded (2h+)`);

  // Check which leads already have this alert (avoid duplicates)
  const leadIds = staleConvs.map(c => c.lead_id).filter(Boolean);
  if (leadIds.length === 0) return;

  const { data: existingAlerts } = await supabase
    .from("lead_history")
    .select("lead_id")
    .in("lead_id", leadIds)
    .eq("action", "alerta_reminded_2h");

  const alreadyAlerted = new Set((existingAlerts || []).map(a => a.lead_id));
  const newStale = staleConvs.filter(c => c.lead_id && !alreadyAlerted.has(c.lead_id));

  if (newStale.length === 0) return;

  console.log(`[follow-up-check] Creating alerts for ${newStale.length} new stale leads`);

  for (const conv of newStale) {
    // Test mode guard
    {
      const { data: tmSettings } = await supabase
        .from('wapi_bot_settings')
        .select('test_mode_enabled, test_mode_number')
        .eq('instance_id', conv.instance_id)
        .single();
      if (shouldSkipTestMode(tmSettings?.test_mode_enabled, tmSettings?.test_mode_number, conv.remote_jid)) {
        console.log(`[follow-up-check] 🧪 Test mode active — skipping stale alert for ${conv.remote_jid}`);
        continue;
      }
    }

    const leadName = conv.contact_name || "Lead";

    // Record in lead_history to prevent duplicate alerts
    await supabase.from("lead_history").insert({
      lead_id: conv.lead_id,
      company_id: conv.company_id,
      action: "alerta_reminded_2h",
      new_value: `Sem resposta há mais de ${STALE_HOURS}h após lembrete`,
    });

    // Notify all company users
    const { data: companyUsers } = await supabase
      .from("user_companies")
      .select("user_id")
      .eq("company_id", conv.company_id);

    if (companyUsers) {
      const notifications = companyUsers.map(u => ({
        user_id: u.user_id,
        company_id: conv.company_id,
        type: "stale_reminded",
        title: "⏰ Lead sem resposta após lembrete",
        message: `${leadName} está há mais de ${STALE_HOURS}h sem responder após o lembrete de próximo passo.`,
        data: {
          lead_id: conv.lead_id,
          lead_name: leadName,
          phone: conv.contact_phone,
          stale_since: conv.last_message_at,
        },
      }));

      await supabase.from("notifications").insert(notifications);
    }

    console.log(`[follow-up-check] ⏰ Stale alert created for ${leadName} (lead ${conv.lead_id})`);
  }
}

// ============= STUCK BOT RECOVERY (reprocesses conversations where webhook timed out) =============

// --- Validation functions (copied from wapi-webhook since edge functions can't share code) ---

const RECOVERY_MONTH_OPTIONS = [
  { num: 1, value: 'Fevereiro' }, { num: 2, value: 'Março' }, { num: 3, value: 'Abril' },
  { num: 4, value: 'Maio' }, { num: 5, value: 'Junho' }, { num: 6, value: 'Julho' },
  { num: 7, value: 'Agosto' }, { num: 8, value: 'Setembro' }, { num: 9, value: 'Outubro' },
  { num: 10, value: 'Novembro' }, { num: 11, value: 'Dezembro' },
];

const RECOVERY_DAY_OPTIONS = [
  { num: 1, value: 'Segunda a Quinta' }, { num: 2, value: 'Sexta' },
  { num: 3, value: 'Sábado' }, { num: 4, value: 'Domingo' },
];

const RECOVERY_DEFAULT_GUEST_OPTIONS = [
  { num: 1, value: '50 pessoas' }, { num: 2, value: '60 pessoas' },
  { num: 3, value: '70 pessoas' }, { num: 4, value: '80 pessoas' },
  { num: 5, value: '90 pessoas' }, { num: 6, value: '100 pessoas' },
];

const RECOVERY_TIPO_OPTIONS = [
  { num: 1, value: 'Já sou cliente' }, { num: 2, value: 'Quero um orçamento' },
  { num: 3, value: 'Trabalhe Conosco' },
];

const RECOVERY_PROXIMO_PASSO_OPTIONS = [
  { num: 1, value: 'Agendar visita' }, { num: 2, value: 'Tirar dúvidas' },
  { num: 3, value: 'Analisar com calma' },
];

function recoveryNumToKeycap(n: number): string {
  if (n === 10) return '🔟';
  return String(n).split('').map(d => `${d}\uFE0F\u20E3`).join('');
}

function recoveryBuildMenuText(options: { num: number; value: string }[]): string {
  return options.map(opt => `${recoveryNumToKeycap(opt.num)} - ${opt.value}`).join('\n');
}

function recoveryExtractOptionsFromQuestion(questionText: string): { num: number; value: string }[] | null {
  const lines = questionText.split('\n');
  const options: { num: number; value: string }[] = [];
  for (const line of lines) {
    const match = line.match(/^\*?(\d+)\*?\s*[-\.]\s*(.+)$/);
    if (match) {
      options.push({ num: parseInt(match[1]), value: match[2].trim() });
    }
  }
  return options.length > 0 ? options : null;
}

function recoveryValidateName(input: string): { valid: boolean; value?: string; error?: string } {
  let name = input.trim();
  const namePatterns = [
    /^(?:(?:o\s+)?meu\s+nome\s+(?:é|e)\s+)(.+)/i,
    /^(?:me\s+chamo\s+)(.+)/i,
    /^(?:(?:eu\s+)?sou\s+(?:o|a)\s+)(.+)/i,
    /^(?:pode\s+me\s+chamar\s+(?:de\s+)?)(.+)/i,
    /^(?:é\s+)(.+)/i,
    /^(?:nome:?\s+)(.+)/i,
  ];
  for (const pattern of namePatterns) {
    const match = name.match(pattern);
    if (match && match[1]) { name = match[1].trim(); break; }
  }
  if (name.length < 2) return { valid: false, error: 'Hmm, não consegui entender seu nome 🤔\n\nPor favor, digite seu nome:' };
  if (!/^[\p{L}\s'-]+$/u.test(name)) return { valid: false, error: 'Por favor, digite apenas seu nome (sem números ou símbolos):' };
  const words = name.split(/\s+/).filter(w => w.length > 0);
  if (words.length > 5) return { valid: false, error: 'Hmm, parece uma frase 🤔\n\nPor favor, digite apenas seu *nome*:' };
  const nonNameWords = ['que','tem','como','quero','queria','gostaria','preciso','vi','vou','estou','tenho','pode','posso','sobre','instagram','facebook','whatsapp','site','promoção','promocao','preço','preco','valor','orçamento','orcamento','festa','evento','buffet','aniversário','aniversario','obrigado','obrigada','por favor','bom dia','boa tarde','boa noite','olá','ola','oi','hey','hello'];
  const lowerName = name.toLowerCase();
  const hasNonNameWord = nonNameWords.some(w => new RegExp(`\\b${w}\\b`, 'i').test(lowerName));
  if (hasNonNameWord) return { valid: false, error: 'Hmm, não consegui entender seu nome 🤔\n\nPor favor, digite apenas seu *nome*:' };
  name = name.replace(/\b\w/g, (c) => c.toUpperCase());
  return { valid: true, value: name };
}

function recoveryValidateMenuChoice(input: string, options: { num: number; value: string }[]): { valid: boolean; value?: string; error?: string } {
  const normalized = input.trim();
  const numMatch = normalized.match(/^(\d+)/);
  if (numMatch) {
    const num = parseInt(numMatch[1]);
    const option = options.find(opt => opt.num === num);
    if (option) return { valid: true, value: option.value };
  }
  const lower = normalized.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, '').trim();
  if (lower.length >= 3) {
    for (const opt of options) {
      const optLower = opt.value.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, '').trim();
      if (optLower === lower || optLower.includes(lower) || lower.includes(optLower)) {
        return { valid: true, value: opt.value };
      }
    }
    const keywordMap: Record<string, string[]> = {
      'cliente': ['cliente', 'ja sou', 'já sou', 'sou cliente'],
      'orçamento': ['orcamento', 'orçamento', 'quero um', 'preço', 'preco', 'valor', 'quanto custa'],
      'trabalhe': ['trabalhe', 'trabalhar', 'emprego', 'vaga', 'curriculo', 'currículo'],
      'visita': ['visita', 'agendar', 'conhecer'],
      'dúvidas': ['duvida', 'dúvida', 'duvidas', 'dúvidas', 'pergunta', 'saber mais'],
      'analisar': ['analisar', 'pensar', 'calma', 'depois', 'mais tarde'],
    };
    for (const opt of options) {
      const optLower = opt.value.toLowerCase();
      for (const [keyword, variations] of Object.entries(keywordMap)) {
        if (optLower.includes(keyword)) {
          for (const variation of variations) {
            if (lower.includes(variation)) return { valid: true, value: opt.value };
          }
        }
      }
    }
  }
  const validNumbers = options.map(opt => opt.num).join(', ');
  return { valid: false, error: `Por favor, responda apenas com o *número* da opção desejada (${validNumbers}) 👇\n\n${recoveryBuildMenuText(options)}` };
}

function recoveryValidateAnswer(step: string, input: string, questionText?: string): { valid: boolean; value?: string; error?: string } {
  switch (step) {
    case 'nome': return recoveryValidateName(input);
    case 'tipo': {
      const co = questionText ? recoveryExtractOptionsFromQuestion(questionText) : null;
      return recoveryValidateMenuChoice(input, co || RECOVERY_TIPO_OPTIONS);
    }
    case 'mes': {
      const co = questionText ? recoveryExtractOptionsFromQuestion(questionText) : null;
      return recoveryValidateMenuChoice(input, co || RECOVERY_MONTH_OPTIONS);
    }
    case 'dia': {
      const co = questionText ? recoveryExtractOptionsFromQuestion(questionText) : null;
      return recoveryValidateMenuChoice(input, co || RECOVERY_DAY_OPTIONS);
    }
    case 'convidados': {
      const co = questionText ? recoveryExtractOptionsFromQuestion(questionText) : null;
      return recoveryValidateMenuChoice(input, co || RECOVERY_DEFAULT_GUEST_OPTIONS);
    }
    case 'proximo_passo': case 'proximo_passo_reminded': {
      const co = questionText ? recoveryExtractOptionsFromQuestion(questionText) : null;
      return recoveryValidateMenuChoice(input, co || RECOVERY_PROXIMO_PASSO_OPTIONS);
    }
    default: return { valid: true, value: input.trim() };
  }
}

function recoveryReplaceVariables(text: string, data: Record<string, string>): string {
  let result = text;
  for (const [key, value] of Object.entries(data)) {
    const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    // Support {{key}}, {{ key }}, and {key}
    result = result.replace(new RegExp(`\\{\\{\\s*${escaped}\\s*\\}\\}`, 'gi'), value);
    result = result.replace(new RegExp(`\\{${escaped}\\}`, 'gi'), value);
  }
  return result;
}

// --- Main recovery function ---

async function processStuckBotRecovery({
  supabase,
}: { supabase: ReturnType<typeof createClient> }): Promise<{ successCount: number; errors: string[] }> {
  const errors: string[] = [];
  let successCount = 0;

  const now = new Date();
  const twoMinutesAgo = new Date(now.getTime() - 2 * 60 * 1000).toISOString();
  const thirtyMinutesAgo = new Date(now.getTime() - 30 * 60 * 1000).toISOString();

  console.log(`[follow-up-check] 🔄 Processing stuck bot recovery...`);

  // Find conversations where lead responded but bot never advanced
  const activeBotSteps = ['nome', 'tipo', 'mes', 'dia', 'convidados', 'welcome'];
  const { data: stuckConversations, error: convError } = await supabase
    .from('wapi_conversations')
    .select('id, remote_jid, instance_id, lead_id, bot_data, bot_step, contact_name')
    .eq('bot_enabled', true)
    .eq('last_message_from_me', false)  // Lead responded
    .not('remote_jid', 'like', '%@g.us%')
    .in('bot_step', activeBotSteps)
    .lt('last_message_at', twoMinutesAgo)   // At least 2 min ago
    .gt('last_message_at', thirtyMinutesAgo); // Within 30 min window

  if (convError) {
    console.error(`[follow-up-check] Error fetching stuck bot conversations:`, convError);
    return { successCount: 0, errors: [String(convError)] };
  }

  if (!stuckConversations || stuckConversations.length === 0) {
    console.log(`[follow-up-check] 🔄 No stuck bot conversations found`);
    return { successCount: 0, errors: [] };
  }

  console.log(`[follow-up-check] 🔄 Found ${stuckConversations.length} stuck bot conversations to recover`);

  for (const conv of stuckConversations) {
    try {
      // Test mode guard: fetch settings for this instance and skip if not test number
      {
        const { data: tmSettings } = await supabase
          .from('wapi_bot_settings')
          .select('test_mode_enabled, test_mode_number')
          .eq('instance_id', conv.instance_id)
          .single();
        if (shouldSkipTestMode(tmSettings?.test_mode_enabled, tmSettings?.test_mode_number, conv.remote_jid)) {
          console.log(`[follow-up-check] 🧪 Test mode active — skipping stuck bot recovery for ${conv.remote_jid}`);
          continue;
        }
      }

      const botData = (conv.bot_data || {}) as Record<string, string>;

      // Skip if already recovered (prevent loops)
      if ((botData as Record<string, unknown>)._recovery_attempted) {
        console.log(`[follow-up-check] 🔄 Skipping conv ${conv.id} - already recovered`);
        continue;
      }

      // Get last message from lead
      const { data: lastMsg } = await supabase
        .from('wapi_messages')
        .select('content, timestamp')
        .eq('conversation_id', conv.id)
        .eq('from_me', false)
        .order('timestamp', { ascending: false })
        .limit(1)
        .single();

      if (!lastMsg?.content) {
        console.log(`[follow-up-check] 🔄 No lead message found for conv ${conv.id}`);
        continue;
      }

      const content = lastMsg.content.trim();
      console.log(`[follow-up-check] 🔄 Recovering conv ${conv.id}, step: ${conv.bot_step}, answer: "${content.substring(0, 50)}"`);

      // Get instance info
      const { data: instance } = await supabase
        .from('wapi_instances')
        .select('id, instance_id, instance_token, unit, company_id')
        .eq('id', conv.instance_id)
        .single();

      if (!instance) {
        console.log(`[follow-up-check] 🔄 Instance not found for conv ${conv.id}`);
        continue;
      }

      // Fetch company name for variable injection
      let companyName = '';
      if (instance.company_id) {
        const { data: companyRow } = await supabase
          .from('companies')
          .select('name')
          .eq('id', instance.company_id)
          .single();
        companyName = companyRow?.name || '';
      }
      if (!companyName) {
        console.log(`[follow-up-check] 🔄 Warning: no company name found for instance ${instance.id}`);
      }

      // Get bot questions for this instance
      const { data: botQuestionsData } = await supabase
        .from('wapi_bot_questions')
        .select('step, question_text, confirmation_text, sort_order')
        .eq('instance_id', instance.id)
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      // Build questions chain
      const questions: Record<string, { question: string; confirmation: string | null; next: string }> = {};
      if (botQuestionsData && botQuestionsData.length > 0) {
        for (let i = 0; i < botQuestionsData.length; i++) {
          const q = botQuestionsData[i];
          const nextStep = i < botQuestionsData.length - 1 ? botQuestionsData[i + 1].step : 'complete';
          questions[q.step] = { question: q.question_text, confirmation: q.confirmation_text || null, next: nextStep };
        }
      } else {
        // Default questions
        questions['nome'] = { question: 'Para começar, me conta: qual é o seu nome? 👑', confirmation: 'Muito prazer, {nome}! 👑✨', next: 'tipo' };
        questions['tipo'] = { question: `Você já é nosso cliente e tem uma festa agendada, ou gostaria de receber um orçamento? 🎉\n\nResponda com o *número*:\n\n${recoveryBuildMenuText(RECOVERY_TIPO_OPTIONS)}`, confirmation: null, next: 'mes' };
        questions['mes'] = { question: `Que legal! 🎉 E pra qual mês você tá pensando em fazer essa festa incrível?\n\n📅 Responda com o *número*:\n\n${recoveryBuildMenuText(RECOVERY_MONTH_OPTIONS)}`, confirmation: '{mes}, ótima escolha! 🎊', next: 'dia' };
        questions['dia'] = { question: `Maravilha! Tem preferência de dia da semana? 🗓️\n\nResponda com o *número*:\n\n${recoveryBuildMenuText(RECOVERY_DAY_OPTIONS)}`, confirmation: 'Anotado!', next: 'convidados' };
        questions['convidados'] = { question: `E quantos convidados você pretende chamar pra essa festa mágica? 🎈\n\n👥 Responda com o *número*:\n\n${recoveryBuildMenuText(RECOVERY_DEFAULT_GUEST_OPTIONS)}`, confirmation: null, next: 'complete' };
      }

      const step = conv.bot_step || 'welcome';
      const updated = { ...botData };
      delete (updated as Record<string, unknown>)._inactive_reminded;

      // Inject company aliases into variable map
      if (companyName) {
        updated['empresa'] = companyName;
        updated['buffet'] = companyName;
        updated['nome_empresa'] = companyName;
        updated['nome-empresa'] = companyName;
      }

      // Get bot settings for messages
      const { data: settings } = await supabase
        .from('wapi_bot_settings')
        .select('*')
        .eq('instance_id', instance.id)
        .single();

      // Handle welcome step - the lead's first message, need to send welcome + first question
      if (step === 'welcome') {
        const questionSteps = Object.keys(questions);
        const firstStep = questionSteps[0] || 'nome';
        const firstQ = questions[firstStep];
        const rawWelcome = settings?.welcome_message || 'Olá! 👋';
        const renderedWelcome = recoveryReplaceVariables(rawWelcome, updated);
        // Avoid duplicating name question if welcome already contains it
        const firstQuestion = firstQ?.question || 'Para começar, me conta: qual é o seu nome? 👑';
        const welcomeAlreadyAsksName = /qual\s+(?:é\s+)?(?:o\s+)?seu\s+nome/i.test(rawWelcome);
        const welcomeMsg = welcomeAlreadyAsksName ? renderedWelcome : renderedWelcome + '\n\n' + firstQuestion;

        const phone = conv.remote_jid.replace('@s.whatsapp.net', '').replace('@c.us', '');
        const res = await fetch(`https://api.w-api.app/v1/message/send-text?instanceId=${instance.instance_id}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${instance.instance_token}` },
          body: JSON.stringify({ phone, message: welcomeMsg, delayTyping: 1 }),
        });

        let msgId: string | null = null;
        if (res.ok) {
          const r = await res.json();
          msgId = r.messageId || r.data?.messageId || null;
        }

        if (msgId) {
          await supabase.from('wapi_messages').insert({
            conversation_id: conv.id, message_id: msgId, from_me: true,
            message_type: 'text', content: welcomeMsg, status: 'sent',
            timestamp: new Date().toISOString(), company_id: instance.company_id,
            metadata: { source: 'stuck_bot_recovery' },
          });
        }

        const recoveryData = { ...updated, _recovery_attempted: true };
        await supabase.from('wapi_conversations').update({
          bot_step: firstStep, bot_data: recoveryData, bot_enabled: true,
          last_message_at: new Date().toISOString(),
          last_message_content: welcomeMsg.substring(0, 100),
          last_message_from_me: true,
        }).eq('id', conv.id);

        console.log(`[follow-up-check] 🔄 Recovered welcome step for conv ${conv.id}`);
        successCount++;
        continue;
      }

      // For active qualification steps, validate the answer
      const currentQuestionText = questions[step]?.question;
      const validation = recoveryValidateAnswer(step, content, currentQuestionText);

      if (!validation.valid) {
        // Invalid answer - re-send the question with error
        const errorMsg = validation.error || 'Não entendi sua resposta. Por favor, tente novamente.';
        const phone = conv.remote_jid.replace('@s.whatsapp.net', '').replace('@c.us', '');
        
        const res = await fetch(`https://api.w-api.app/v1/message/send-text?instanceId=${instance.instance_id}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${instance.instance_token}` },
          body: JSON.stringify({ phone, message: errorMsg, delayTyping: 1 }),
        });

        let msgId: string | null = null;
        if (res.ok) { const r = await res.json(); msgId = r.messageId || r.data?.messageId || null; }
        
        if (msgId) {
          await supabase.from('wapi_messages').insert({
            conversation_id: conv.id, message_id: msgId, from_me: true,
            message_type: 'text', content: errorMsg, status: 'sent',
            timestamp: new Date().toISOString(), company_id: instance.company_id,
            metadata: { source: 'stuck_bot_recovery' },
          });
        }

        const recoveryData = { ...updated, _recovery_attempted: true };
        await supabase.from('wapi_conversations').update({
          bot_step: step, bot_data: recoveryData, bot_enabled: true,
          last_message_at: new Date().toISOString(),
          last_message_content: errorMsg.substring(0, 100),
          last_message_from_me: true,
        }).eq('id', conv.id);

        console.log(`[follow-up-check] 🔄 Invalid answer for conv ${conv.id}, re-sent question`);
        successCount++;
        continue;
      }

      // Valid answer - save and advance
      updated[step] = validation.value || content;

      // Special handling for tipo step
      if (step === 'tipo') {
        const isAlreadyClient = validation.value === 'Já sou cliente' || content.trim() === '1';
        const wantsWork = validation.value === 'Trabalhe Conosco' || content.trim() === '3';

        if (isAlreadyClient) {
          const defaultTransfer = `Entendido, {nome}! 🏰\n\nVou transferir sua conversa para nossa equipe comercial.\n\nAguarde um momento! 👑`;
          const transferMsg = recoveryReplaceVariables(settings?.transfer_message || defaultTransfer, updated);
          const phone = conv.remote_jid.replace('@s.whatsapp.net', '').replace('@c.us', '');

          const res = await fetch(`https://api.w-api.app/v1/message/send-text?instanceId=${instance.instance_id}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${instance.instance_token}` },
            body: JSON.stringify({ phone, message: transferMsg, delayTyping: 1 }),
          });
          let msgId: string | null = null;
          if (res.ok) { const r = await res.json(); msgId = r.messageId || r.data?.messageId || null; }
          if (msgId) {
            await supabase.from('wapi_messages').insert({
              conversation_id: conv.id, message_id: msgId, from_me: true,
              message_type: 'text', content: transferMsg, status: 'sent',
              timestamp: new Date().toISOString(), company_id: instance.company_id,
              metadata: { source: 'stuck_bot_recovery' },
            });
          }
          await supabase.from('wapi_conversations').update({
            bot_step: 'transferred', bot_data: updated, bot_enabled: false,
            last_message_at: new Date().toISOString(),
            last_message_content: transferMsg.substring(0, 100),
            last_message_from_me: true,
          }).eq('id', conv.id);

          console.log(`[follow-up-check] 🔄 Recovered conv ${conv.id} - client transfer`);
          successCount++;
          continue;
        }

        if (wantsWork) {
          const defaultWork = `Que legal que você quer fazer parte do nosso time! 💼✨\n\nEnvie seu currículo aqui nesta conversa!\n\nObrigado pelo interesse! 😊`;
          const workMsg = recoveryReplaceVariables(settings?.work_here_response || defaultWork, updated);
          const phone = conv.remote_jid.replace('@s.whatsapp.net', '').replace('@c.us', '');

          const res = await fetch(`https://api.w-api.app/v1/message/send-text?instanceId=${instance.instance_id}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${instance.instance_token}` },
            body: JSON.stringify({ phone, message: workMsg, delayTyping: 1 }),
          });
          let msgId: string | null = null;
          if (res.ok) { const r = await res.json(); msgId = r.messageId || r.data?.messageId || null; }
          if (msgId) {
            await supabase.from('wapi_messages').insert({
              conversation_id: conv.id, message_id: msgId, from_me: true,
              message_type: 'text', content: workMsg, status: 'sent',
              timestamp: new Date().toISOString(), company_id: instance.company_id,
              metadata: { source: 'stuck_bot_recovery' },
            });
          }

          // Create RH lead
          const leadName = updated.nome || conv.contact_name || conv.remote_jid;
          const n = conv.remote_jid.replace('@s.whatsapp.net', '').replace('@c.us', '').replace(/\D/g, '');
          const { data: newLead } = await supabase.from('campaign_leads').insert({
            name: leadName, whatsapp: n, unit: 'Trabalhe Conosco',
            campaign_id: 'whatsapp-bot-rh', campaign_name: 'WhatsApp (Bot) - RH',
            status: 'trabalhe_conosco', company_id: instance.company_id,
          }).select('id').single();

          if (newLead) {
            await supabase.from('wapi_conversations').update({ lead_id: newLead.id }).eq('id', conv.id);
          }

          await supabase.from('wapi_conversations').update({
            bot_step: 'work_interest', bot_data: updated, bot_enabled: false,
            last_message_at: new Date().toISOString(),
            last_message_content: workMsg.substring(0, 100),
            last_message_from_me: true,
          }).eq('id', conv.id);

          console.log(`[follow-up-check] 🔄 Recovered conv ${conv.id} - work interest`);
          successCount++;
          continue;
        }
        // Option 2 (quote) - continue normal flow below
      }

      // Update contact_name when bot collects the lead's real name
      if (step === 'nome' && validation.value) {
        await supabase.from('wapi_conversations').update({ contact_name: validation.value }).eq('id', conv.id);
      }

      const currentQ = questions[step];
      const nextStepKey = currentQ?.next || 'complete';

      if (nextStepKey === 'complete') {
        // Qualification complete - create/update lead + send completion message
        const defaultCompletion = `Perfeito, {nome}! 🏰✨\n\nAnotei tudo aqui:\n\n📅 Mês: {mes}\n🗓️ Dia: {dia}\n👥 Convidados: {convidados}`;
        const completionMsg = recoveryReplaceVariables(settings?.completion_message || defaultCompletion, updated);
        const phone = conv.remote_jid.replace('@s.whatsapp.net', '').replace('@c.us', '');
        const n = phone.replace(/\D/g, '');

        // Send completion message
        const res = await fetch(`https://api.w-api.app/v1/message/send-text?instanceId=${instance.instance_id}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${instance.instance_token}` },
          body: JSON.stringify({ phone, message: completionMsg, delayTyping: 1 }),
        });
        let msgId: string | null = null;
        if (res.ok) { const r = await res.json(); msgId = r.messageId || r.data?.messageId || null; }
        if (msgId) {
          await supabase.from('wapi_messages').insert({
            conversation_id: conv.id, message_id: msgId, from_me: true,
            message_type: 'text', content: completionMsg, status: 'sent',
            timestamp: new Date().toISOString(), company_id: instance.company_id,
            metadata: { source: 'stuck_bot_recovery' },
          });
        }

        // Create or update lead
        if (conv.lead_id) {
          await supabase.from('campaign_leads').update({
            name: updated.nome || conv.contact_name || phone,
            month: updated.mes || null,
            day_preference: updated.dia || null,
            guests: updated.convidados || null,
          }).eq('id', conv.lead_id);
        } else {
          const { data: newLead } = await supabase.from('campaign_leads').insert({
            name: updated.nome || conv.contact_name || phone,
            whatsapp: n,
            unit: instance.unit,
            campaign_id: 'whatsapp-bot',
            campaign_name: 'WhatsApp (Bot)',
            status: 'novo',
            month: updated.mes || null,
            day_preference: updated.dia || null,
            guests: updated.convidados || null,
            company_id: instance.company_id,
          }).select('id').single();
          if (newLead) {
            await supabase.from('wapi_conversations').update({ lead_id: newLead.id }).eq('id', conv.id);
          }
        }

        // Update conversation to sending_materials step
        const recoveryData = { ...updated, _recovery_attempted: true };
        await supabase.from('wapi_conversations').update({
          bot_step: 'sending_materials', bot_data: recoveryData, bot_enabled: true,
          last_message_at: new Date().toISOString(),
          last_message_content: completionMsg.substring(0, 100),
          last_message_from_me: true,
        }).eq('id', conv.id);

        // ===== SEND MATERIALS (photos, videos, PDFs) =====
        await recoverySendMaterials(supabase, instance, conv, updated, settings);

        // Now send the next step question after materials
        const defaultNextStepQuestion = `E agora, como você gostaria de continuar? 🤔\n\nResponda com o *número*:\n\n${recoveryBuildMenuText(RECOVERY_PROXIMO_PASSO_OPTIONS)}`;
        const nextStepQuestion = settings?.next_step_question || defaultNextStepQuestion;

        // Wait a bit then send next step question
        const nsMsgDelay = (settings?.message_delay_seconds || 5) * 1000;
        await new Promise(r => setTimeout(r, nsMsgDelay));
        
        const res2 = await fetch(`https://api.w-api.app/v1/message/send-text?instanceId=${instance.instance_id}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${instance.instance_token}` },
          body: JSON.stringify({ phone, message: nextStepQuestion, delayTyping: 2 }),
        });
        let msgId2: string | null = null;
        if (res2.ok) { const r = await res2.json(); msgId2 = r.messageId || r.data?.messageId || null; }
        if (msgId2) {
          await supabase.from('wapi_messages').insert({
            conversation_id: conv.id, message_id: msgId2, from_me: true,
            message_type: 'text', content: nextStepQuestion, status: 'sent',
            timestamp: new Date().toISOString(), company_id: instance.company_id,
            metadata: { source: 'stuck_bot_recovery' },
          });
        }

        await supabase.from('wapi_conversations').update({
          bot_step: 'proximo_passo',
          last_message_at: new Date().toISOString(),
          last_message_content: nextStepQuestion.substring(0, 100),
          last_message_from_me: true,
        }).eq('id', conv.id);

        console.log(`[follow-up-check] 🔄 Recovered conv ${conv.id} - qualification complete, materials sent, next step question sent`);
        successCount++;
        continue;
      }

      // Normal step progression - send confirmation + next question
      const nextQ = questions[nextStepKey];
      let confirmation = currentQ?.confirmation || '';
      if (confirmation) confirmation = recoveryReplaceVariables(confirmation, updated);
      const nextQuestionMsg = confirmation
        ? `${confirmation}\n\n${nextQ?.question || ''}`
        : (nextQ?.question || '');

      const phone = conv.remote_jid.replace('@s.whatsapp.net', '').replace('@c.us', '');
      const res = await fetch(`https://api.w-api.app/v1/message/send-text?instanceId=${instance.instance_id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${instance.instance_token}` },
        body: JSON.stringify({ phone, message: nextQuestionMsg, delayTyping: 1 }),
      });
      let msgId: string | null = null;
      if (res.ok) { const r = await res.json(); msgId = r.messageId || r.data?.messageId || null; }
      if (msgId) {
        await supabase.from('wapi_messages').insert({
          conversation_id: conv.id, message_id: msgId, from_me: true,
          message_type: 'text', content: nextQuestionMsg, status: 'sent',
          timestamp: new Date().toISOString(), company_id: instance.company_id,
          metadata: { source: 'stuck_bot_recovery' },
        });
      }

      const recoveryData = { ...updated, _recovery_attempted: true };
      await supabase.from('wapi_conversations').update({
        bot_step: nextStepKey, bot_data: recoveryData, bot_enabled: true,
        last_message_at: new Date().toISOString(),
        last_message_content: nextQuestionMsg.substring(0, 100),
        last_message_from_me: true,
      }).eq('id', conv.id);

      console.log(`[follow-up-check] 🔄 Recovered conv ${conv.id}: ${step} → ${nextStepKey}`);
      successCount++;
    } catch (err) {
      console.error(`[follow-up-check] 🔄 Error recovering conv ${conv.id}:`, err);
      errors.push(`Recovery error conv ${conv.id}: ${String(err)}`);
    }
  }

  return { successCount, errors };
}

// ============= RECOVERY: SEND MATERIALS (photos, videos, PDFs) =============

async function recoverySendMaterials(
  supabase: ReturnType<typeof createClient>,
  instance: { id: string; instance_id: string; instance_token: string; unit: string | null; company_id: string },
  conv: { id: string; remote_jid: string },
  botData: Record<string, string>,
  settings: Record<string, unknown> | null
) {
  if (settings?.auto_send_materials === false) {
    console.log('[Recovery Materials] Auto-send is disabled');
    return;
  }

  const unit = instance.unit;
  const month = botData.mes || '';
  const guestsStr = botData.convidados || '';
  const phone = conv.remote_jid.replace('@s.whatsapp.net', '').replace('@c.us', '');

  if (!unit) {
    console.log('[Recovery Materials] No unit configured, skipping');
    return;
  }

  const sendPhotos = settings?.auto_send_photos !== false;
  const sendPresentationVideo = settings?.auto_send_presentation_video !== false;
  const sendPromoVideo = settings?.auto_send_promo_video !== false;
  const sendPdf = settings?.auto_send_pdf !== false;
  const messageDelay = ((settings?.message_delay_seconds as number) || 5) * 1000;
  const photosIntro = (settings?.auto_send_photos_intro as string) || '✨ Conheça nosso espaço incrível! 🏰🎉';
  const pdfIntro = (settings?.auto_send_pdf_intro as string) || '📋 Oi {nome}! Segue o pacote completo para {convidados} na unidade {unidade}. Qualquer dúvida é só chamar! 💜';

  await new Promise(r => setTimeout(r, messageDelay));

  // Fetch captions
  const { data: captions } = await supabase
    .from('sales_material_captions')
    .select('caption_type, caption_text')
    .eq('is_active', true);

  const captionMap: Record<string, string> = {};
  captions?.forEach((c: { caption_type: string; caption_text: string }) => { captionMap[c.caption_type] = c.caption_text; });

  // Fetch materials
  const { data: materials, error: matError } = await supabase
    .from('sales_materials')
    .select('*')
    .eq('unit', unit)
    .eq('is_active', true)
    .order('type', { ascending: true })
    .order('sort_order', { ascending: true });

  if (matError || !materials?.length) {
    console.log(`[Recovery Materials] No materials found for unit ${unit}`);
    return;
  }

  console.log(`[Recovery Materials] Found ${materials.length} materials for ${unit}`);

  const photoCollections = materials.filter((m: any) => m.type === 'photo_collection');
  const presentationVideos = materials.filter((m: any) => m.type === 'video' && m.name?.toLowerCase().includes('apresentação'));
  const promoVideos = materials.filter((m: any) => m.type === 'video' && (m.name?.toLowerCase().includes('promo') || m.name?.toLowerCase().includes('carnaval')));
  const pdfPackages = materials.filter((m: any) => m.type === 'pdf_package');

  const guestMatch = guestsStr.match(/(\d+)/);
  const guestCount = guestMatch ? parseInt(guestMatch[1]) : null;
  // Promo video is now controlled solely by the auto_send_promo_video flag

  // Helper functions
  const sendImage = async (url: string, caption: string) => {
    try {
      const imgRes = await fetch(url);
      if (!imgRes.ok) return null;
      const buf = await imgRes.arrayBuffer();
      const bytes = new Uint8Array(buf);
      let bin = '';
      for (let i = 0; i < bytes.length; i += 32768) {
        const chunk = bytes.subarray(i, Math.min(i + 32768, bytes.length));
        bin += String.fromCharCode.apply(null, Array.from(chunk));
      }
      const ct = imgRes.headers.get('content-type') || 'image/jpeg';
      const base64 = `data:${ct};base64,${btoa(bin)}`;
      const res = await fetch(`${WAPI_BASE_URL}/message/send-image?instanceId=${instance.instance_id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${instance.instance_token}` },
        body: JSON.stringify({ phone, image: base64, caption })
      });
      if (!res.ok) return null;
      const r = await res.json();
      return r.messageId || null;
    } catch (e) { console.error('[Recovery Materials] Error sending image:', e); return null; }
  };

  const sendVideo = async (url: string, caption: string) => {
    try {
      const res = await fetch(`${WAPI_BASE_URL}/message/send-video?instanceId=${instance.instance_id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${instance.instance_token}` },
        body: JSON.stringify({ phone, video: url, caption })
      });
      if (!res.ok) return null;
      const r = await res.json();
      return r.messageId || null;
    } catch (e) { console.error('[Recovery Materials] Error sending video:', e); return null; }
  };

  const sendDocument = async (url: string, fileName: string) => {
    try {
      const ext = url.split('.').pop()?.split('?')[0] || 'pdf';
      const res = await fetch(`${WAPI_BASE_URL}/message/send-document?instanceId=${instance.instance_id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${instance.instance_token}` },
        body: JSON.stringify({ phone, document: url, fileName, extension: ext })
      });
      if (!res.ok) return null;
      const r = await res.json();
      return r.messageId || null;
    } catch (e) { console.error('[Recovery Materials] Error sending document:', e); return null; }
  };

  const sendText = async (message: string) => {
    try {
      const res = await fetch(`${WAPI_BASE_URL}/message/send-text?instanceId=${instance.instance_id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${instance.instance_token}` },
        body: JSON.stringify({ phone, message, delayTyping: 1 })
      });
      if (!res.ok) return null;
      const r = await res.json();
      return r.messageId || null;
    } catch (e) { console.error('[Recovery Materials] Error sending text:', e); return null; }
  };

  const saveMessage = async (msgId: string, type: string, content: string, mediaUrl?: string) => {
    await supabase.from('wapi_messages').insert({
      conversation_id: conv.id, message_id: msgId, from_me: true,
      message_type: type, content, media_url: mediaUrl || null,
      status: 'sent', timestamp: new Date().toISOString(),
      company_id: instance.company_id,
      metadata: { source: 'stuck_bot_recovery' },
    });
  };

  // 1. PHOTOS
  if (sendPhotos && photoCollections.length > 0) {
    const collection = photoCollections[0] as any;
    const photos = collection.photo_urls || [];
    if (photos.length > 0) {
      console.log(`[Recovery Materials] Sending ${photos.length} photos`);
      const introText = photosIntro.replace(/\{unidade\}/gi, unit);
      const introMsgId = await sendText(introText);
      if (introMsgId) await saveMessage(introMsgId, 'text', introText);
      await new Promise(r => setTimeout(r, messageDelay / 2));
      for (let i = 0; i < photos.length; i++) {
        const msgId = await sendImage(photos[i], '');
        if (msgId) await saveMessage(msgId, 'image', '📷', photos[i]);
        if (i < photos.length - 1) await new Promise(r => setTimeout(r, 2000));
      }
      console.log(`[Recovery Materials] Photos sent`);
      await new Promise(r => setTimeout(r, messageDelay));
    }
  }

  // 2. PRESENTATION VIDEO
  if (sendPresentationVideo && presentationVideos.length > 0) {
    const video = presentationVideos[0] as any;
    console.log(`[Recovery Materials] Sending presentation video: ${video.name}`);
    const videoCaption = captionMap['video'] || `🎬 Conheça a unidade ${unit}! ✨`;
    const caption = videoCaption.replace(/\{unidade\}/gi, unit);
    const msgId = await sendVideo(video.file_url, caption);
    if (msgId) await saveMessage(msgId, 'video', caption, video.file_url);
    await new Promise(r => setTimeout(r, messageDelay));
  }

  // 3. PDF PACKAGE
  if (sendPdf && guestCount && pdfPackages.length > 0) {
    let matchingPdf = pdfPackages.find((p: any) => p.guest_count === guestCount) as any;
    if (!matchingPdf) {
      const sorted = pdfPackages.filter((p: any) => p.guest_count).sort((a: any, b: any) => (a.guest_count || 0) - (b.guest_count || 0));
      matchingPdf = sorted.find((p: any) => (p.guest_count || 0) >= guestCount) || sorted[sorted.length - 1];
    }
    if (matchingPdf) {
      console.log(`[Recovery Materials] Sending PDF: ${matchingPdf.name} for ${guestCount} guests`);
      const firstName = (botData.nome || '').split(' ')[0] || 'você';
      const pdfIntroText = pdfIntro
        .replace(/\{nome\}/gi, firstName)
        .replace(/\{convidados\}/gi, guestsStr)
        .replace(/\{unidade\}/gi, unit);
      const introMsgId = await sendText(pdfIntroText);
      if (introMsgId) await saveMessage(introMsgId, 'text', pdfIntroText);
      await new Promise(r => setTimeout(r, messageDelay / 4));
      const fileExt = matchingPdf.file_url.split('?')[0].split('.').pop()?.toLowerCase() || '';
      const isPkgImage = ['jpg', 'jpeg', 'png', 'webp'].includes(fileExt);
      if (isPkgImage) {
        const caption = matchingPdf.name || 'Pacote';
        const msgId = await sendImage(matchingPdf.file_url, caption);
        if (msgId) await saveMessage(msgId, 'image', caption, matchingPdf.file_url);
      } else {
        const fileName = matchingPdf.name?.replace(/[^a-zA-Z0-9\s-]/g, '').replace(/\s+/g, ' ').trim() + '.pdf' || `Pacote ${guestCount} pessoas.pdf`;
        const msgId = await sendDocument(matchingPdf.file_url, fileName);
        if (msgId) await saveMessage(msgId, 'document', fileName, matchingPdf.file_url);
      }
      await new Promise(r => setTimeout(r, messageDelay));
    }
  }

  // 4. PROMO VIDEO
  if (sendPromoVideo && promoVideos.length > 0) {
    const promoVideo = promoVideos[0] as any;
    console.log(`[Recovery Materials] Sending promo video: ${promoVideo.name}`);
    const promoCaption = captionMap['video_promo'] || captionMap['video'] || `🎬 Confira nosso vídeo! ✨`;
    const caption = promoCaption.replace(/\{unidade\}/gi, unit);
    const msgId = await sendVideo(promoVideo.file_url, caption);
    if (msgId) await saveMessage(msgId, 'video', caption, promoVideo.file_url);
    await new Promise(r => setTimeout(r, messageDelay * 1.5));
  }

  await supabase.from('wapi_conversations').update({
    last_message_at: new Date().toISOString(),
    last_message_content: '📄 Materiais enviados (recovery)',
    last_message_from_me: true,
  }).eq('id', conv.id);

  console.log(`[Recovery Materials] Auto-send complete for ${phone}`);
}
