import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface FollowUpSettings {
  follow_up_enabled: boolean;
  follow_up_delay_hours: number;
  follow_up_message: string | null;
  follow_up_2_enabled: boolean;
  follow_up_2_delay_hours: number;
  follow_up_2_message: string | null;
  next_step_reminder_enabled: boolean;
  next_step_reminder_delay_minutes: number;
  next_step_reminder_message: string | null;
  bot_inactive_followup_enabled: boolean;
  bot_inactive_followup_delay_minutes: number;
  bot_inactive_followup_message: string | null;
  instance_id: string;
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
      .select("instance_id, follow_up_enabled, follow_up_delay_hours, follow_up_message, follow_up_2_enabled, follow_up_2_delay_hours, follow_up_2_message, next_step_reminder_enabled, next_step_reminder_delay_minutes, next_step_reminder_message, bot_inactive_followup_enabled, bot_inactive_followup_delay_minutes, bot_inactive_followup_message")
      .or("follow_up_enabled.eq.true,follow_up_2_enabled.eq.true,next_step_reminder_enabled.eq.true,bot_inactive_followup_enabled.eq.true");

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

  const defaultReminderMsg = `Oi {nome} estou por aqui escolha uma das opções.\n\n*1* - Agendar visita\n*2* - Tirar dúvidas\n*3* - Analisar com calma`;
  const reminderTemplate = settings.next_step_reminder_message || defaultReminderMsg;

  for (const conv of stuckConversations) {
    try {
      const botData = (conv.bot_data || {}) as Record<string, string>;
      const firstName = (botData.nome || conv.contact_name || "").split(" ")[0];
      
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

  const leadIds = analysisChoices.map(c => c.lead_id);
  console.log(`[follow-up-check] Found ${leadIds.length} potential leads for follow-up #${followUpNumber}`);

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

  // For second follow-up: also check if lead replied after first follow-up
  if (followUpNumber === 2) {
    const { data: conversations } = await supabase
      .from("wapi_conversations")
      .select("lead_id, last_message_from_me")
      .in("lead_id", leadsNeedingFollowUp)
      .eq("last_message_from_me", false);

    // If the last message is from the contact, they replied - skip follow-up
    const repliedLeads = new Set((conversations || []).map(c => c.lead_id));
    leadsNeedingFollowUp = leadsNeedingFollowUp.filter(id => !repliedLeads.has(id));
    
    console.log(`[follow-up-check] After filtering replied leads: ${leadsNeedingFollowUp.length} leads need follow-up #2`);
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
      const firstName = lead.name.split(" ")[0];
      let personalizedMessage = message
        .replace(/\{nome\}/g, firstName)
        .replace(/\{unidade\}/g, lead.unit || "nossa unidade")
        .replace(/\{mes\}/g, lead.month || "")
        .replace(/\{convidados\}/g, lead.guests || "");

      // Append numbered options if not already present in the message
      const hasOptions = /\*1\*/.test(personalizedMessage) && /\*2\*/.test(personalizedMessage);
      if (!hasOptions) {
        personalizedMessage += `\n\n*1* - Agendar visita\n*2* - Tirar dúvidas\n*3* - Analisar com calma`;
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
        metadata: { source: "auto_reminder", type: followUpNumber === 1 ? "follow_up_1" : "follow_up_2" },
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
        action: historyAction,
        new_value: `Mensagem de acompanhamento #${followUpNumber} após ${delayHours}h`,
      });

      // Create notification for the team
      const { data: usersToNotify } = await supabase
        .from("user_permissions")
        .select("user_id")
        .or(`permission.eq.leads.unit.all,permission.eq.leads.unit.${(lead.unit || "all").toLowerCase()}`)
        .eq("granted", true);

      if (usersToNotify && usersToNotify.length > 0) {
        const notifications = usersToNotify.map((u) => ({
          user_id: u.user_id,
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
  } else {
    return `Olá, {nome}! 👋

Ainda não tivemos retorno sobre a festa no Castelo da Diversão! 🏰

Temos pacotes especiais e datas disponíveis para {mes}. Que tal agendar uma visita para conhecer nosso espaço? 

Estamos aqui para te ajudar! 😊`;
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
      const botData = (conv.bot_data || {}) as Record<string, unknown>;
      
      // Skip if already reminded (prevent duplicate reminders)
      if (botData._inactive_reminded) {
        console.log(`[follow-up-check] Skipping conv ${conv.id} - already reminded`);
        continue;
      }
      
      const firstName = (String(botData.nome || conv.contact_name || "")).split(" ")[0] || "cliente";
      
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
          tipo: `Você já é nosso cliente e tem uma festa agendada, ou gostaria de receber um orçamento? 🎉\n\nResponda com o *número*:\n\n*1* - Já sou cliente\n*2* - Quero um orçamento\n*3* - Trabalhe no Castelo`,
          mes: `Que legal! 🎉 E pra qual mês você tá pensando em fazer essa festa incrível?\n\n📅 Responda com o *número*:\n\n*1* - Fevereiro\n*2* - Março\n*3* - Abril\n*4* - Maio\n*5* - Junho\n*6* - Julho\n*7* - Agosto\n*8* - Setembro\n*9* - Outubro\n*10* - Novembro\n*11* - Dezembro`,
          dia: `Maravilha! Tem preferência de dia da semana? 🗓️\n\nResponda com o *número*:\n\n*1* - Segunda a Quinta\n*2* - Sexta\n*3* - Sábado\n*4* - Domingo`,
          convidados: `E quantos convidados você pretende chamar pra essa festa mágica? 🎈\n\n👥 Responda com o *número*:\n\n*1* - 50 pessoas\n*2* - 60 pessoas\n*3* - 70 pessoas\n*4* - 80 pessoas\n*5* - 90 pessoas\n*6* - 100 pessoas`,
          welcome: 'Para começar, me conta: qual é o seu nome? 👑',
          lp_sent: 'Oi {nome}, ainda estou por aqui! Escolha a opção que mais te agrada:\n\n*1* - Receber agora meu orçamento\n*2* - Falar com um atendente',
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
    .select("id, company_id, lead_id, contact_name, contact_phone, last_message_at")
    .eq("bot_step", "proximo_passo_reminded")
    .eq("last_message_from_me", true)
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
