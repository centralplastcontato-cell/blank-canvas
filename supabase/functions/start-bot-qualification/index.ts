// Manually starts the qualification bot flow for a given conversation.
// Sends the welcome message + the first configured question, sets bot_step
// to the first question step and re-enables the bot for that conversation.
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ACTIVE_STEPS_BLOCKED = new Set<string>([
  // any non-initial / non-final step means a flow is currently in progress
  // welcome / lp_sent / null are considered "not started yet" and can be (re)started without confirmation
]);

function replaceVariables(text: string, data: Record<string, string>): string {
  let result = String(text || '');
  for (const [key, value] of Object.entries(data)) {
    const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    result = result.replace(new RegExp(`\\{\\{\\s*${escaped}\\s*\\}\\}`, 'gi'), String(value ?? ''));
    result = result.replace(new RegExp(`\\{${escaped}\\}`, 'gi'), String(value ?? ''));
  }
  return result;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const body = await req.json().catch(() => ({}));
    const conversationId: string | undefined = body.conversation_id;
    const force: boolean = body.force === true;

    if (!conversationId) {
      return new Response(JSON.stringify({ error: 'conversation_id required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Load conversation
    const { data: conv, error: convErr } = await supabase
      .from('wapi_conversations')
      .select('id, company_id, instance_id, remote_jid, contact_name, contact_phone, bot_step, bot_data, bot_enabled, lead_id')
      .eq('id', conversationId)
      .maybeSingle();
    if (convErr || !conv) {
      console.error('[start-bot-qualification] conversation lookup failed', { conversationId, convErr });
      return new Response(JSON.stringify({ error: 'conversation not found', details: convErr?.message }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Block if already in an active flow (unless force=true)
    const currentStep = conv.bot_step;
    const isInactiveStep = !currentStep || currentStep === 'welcome' || currentStep === 'lp_sent' || currentStep === 'complete' || currentStep === 'complete_final';
    if (!isInactiveStep && !force) {
      return new Response(JSON.stringify({
        error: 'flow_in_progress',
        current_step: currentStep,
        message: `Lead já está no passo "${currentStep}". Confirme para reiniciar do zero.`,
      }), {
        status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Load instance
    const { data: instance, error: instErr } = await supabase
      .from('wapi_instances')
      .select('id, instance_id, instance_token, company_id, provider, status')
      .eq('id', conv.instance_id)
      .maybeSingle();
    if (instErr || !instance) {
      console.error('[start-bot-qualification] instance lookup failed', { instance_id: conv.instance_id, instErr });
      return new Response(JSON.stringify({ error: 'instance not found', details: instErr?.message }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Load bot settings + questions
    const { data: settings } = await supabase
      .from('wapi_bot_settings').select('*').eq('instance_id', instance.id).maybeSingle();
    const { data: questionsRows } = await supabase
      .from('wapi_bot_questions')
      .select('step, question_text, sort_order')
      .eq('instance_id', instance.id)
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    const firstQuestion = questionsRows?.[0];
    const firstStep = firstQuestion?.step || 'nome';
    const firstQuestionText = firstQuestion?.question_text || 'Qual o seu nome?';

    // Load company name for variable interpolation
    const { data: company } = await supabase
      .from('companies').select('name').eq('id', instance.company_id).maybeSingle();

    const botData: Record<string, string> = (conv.bot_data as Record<string, string>) || {};
    const vars: Record<string, string> = {
      ...botData,
      empresa: company?.name || '',
      buffet: company?.name || '',
      'nome-empresa': company?.name || '',
      'nome_empresa': company?.name || '',
      nome: botData.nome || conv.contact_name || '',
    };

    const welcomeTpl = settings?.welcome_message || 'Olá! 👋';
    const message = `${replaceVariables(welcomeTpl, vars)}\n\n${firstQuestionText}`;

    // Reset bot state to first step
    const resetData = { ...botData };
    delete (resetData as Record<string, unknown>)._inactive_reminded;
    delete (resetData as Record<string, unknown>)._claimed_step;
    delete (resetData as Record<string, unknown>)._claimed_at;

    await supabase.from('wapi_conversations').update({
      bot_step: firstStep,
      bot_enabled: true,
      bot_data: resetData,
    }).eq('id', conv.id);

    const phone = (conv.remote_jid || conv.contact_phone || '')
      .replace('@s.whatsapp.net', '')
      .replace('@c.us', '')
      .replace('@lid', '')
      .replace(/\D/g, '');

    if (!phone) {
      console.error('[start-bot-qualification] empty phone', { remote_jid: conv.remote_jid, contact_phone: conv.contact_phone });
      return new Response(JSON.stringify({ error: 'invalid_phone' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Send via wapi-send (handles both W-API and Z-API + loop guard)
    let sendRes: Response;
    try {
      sendRes = await fetch(`${supabaseUrl}/functions/v1/wapi-send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${serviceKey}`,
        },
        body: JSON.stringify({
          instance_id: instance.instance_id,
          instance_token: instance.instance_token,
          phone,
          message,
          conversation_id: conv.id,
          company_id: conv.company_id,
          automation: true,
          metadata: { source: 'manual_start_qualification' },
        }),
      });
    } catch (fetchErr) {
      console.error('[start-bot-qualification] wapi-send fetch threw:', fetchErr);
      return new Response(JSON.stringify({ error: 'send_failed', details: String(fetchErr) }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const sendData = await sendRes.json().catch(() => ({}));
    if (!sendRes.ok) {
      console.error('[start-bot-qualification] wapi-send returned non-ok', { status: sendRes.status, sendData });
      return new Response(JSON.stringify({ error: 'send_failed', status: sendRes.status, details: sendData }), {
        status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ success: true, step: firstStep, message }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('[start-bot-qualification] error:', e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
