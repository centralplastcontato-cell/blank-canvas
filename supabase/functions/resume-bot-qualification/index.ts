// Resumes the bot flow from the current/inferred step by re-sending the
// question for that step. Useful when recovery fails or the bot got stuck.
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const STEP_ORDER = ['nome', 'tipo', 'mes', 'dia', 'convidados', 'proximo_passo'];

function inferStep(botData: Record<string, unknown>): string {
  if (!botData.nome) return 'nome';
  if (!botData.tipo) return 'tipo';
  if (!botData.mes) return 'mes';
  if (!botData.dia) return 'dia';
  if (!botData.convidados) return 'convidados';
  if (!botData.proximo_passo) return 'proximo_passo';
  return 'nome';
}

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
    const overrideStep: string | undefined = body.step;

    if (!conversationId) {
      return new Response(JSON.stringify({ error: 'conversation_id required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: conv, error: convErr } = await supabase
      .from('wapi_conversations')
      .select('id, company_id, instance_id, remote_jid, contact_name, bot_step, bot_data, lead_id')
      .eq('id', conversationId)
      .single();
    if (convErr || !conv) {
      return new Response(JSON.stringify({ error: 'conversation not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: instance, error: instErr } = await supabase
      .from('wapi_instances')
      .select('id, instance_id, instance_token, company_id, provider')
      .eq('id', conv.instance_id)
      .single();
    if (instErr || !instance) {
      return new Response(JSON.stringify({ error: 'instance not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const botData = (conv.bot_data as Record<string, unknown>) || {};

    // Decide the step to resume on:
    // 1. explicit override
    // 2. current bot_step (if it's a valid question step)
    // 3. inferred from bot_data
    let step = overrideStep
      || (conv.bot_step && STEP_ORDER.includes(conv.bot_step) ? conv.bot_step : null)
      || inferStep(botData);

    // Load configured questions
    const { data: questionsRows } = await supabase
      .from('wapi_bot_questions')
      .select('step, question_text, sort_order')
      .eq('instance_id', instance.id)
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    const questionMap = new Map<string, string>();
    (questionsRows || []).forEach((q) => questionMap.set(q.step, q.question_text));

    let questionText = questionMap.get(step) || '';
    if (!questionText) {
      // Fallback: pick first available question
      const firstAvail = questionsRows?.[0];
      if (firstAvail) {
        step = firstAvail.step;
        questionText = firstAvail.question_text;
      } else {
        return new Response(JSON.stringify({ error: 'no questions configured' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    const { data: company } = await supabase
      .from('companies').select('name').eq('id', instance.company_id).single();

    const vars: Record<string, string> = {
      ...(botData as Record<string, string>),
      empresa: company?.name || '',
      buffet: company?.name || '',
      'nome-empresa': company?.name || '',
      'nome_empresa': company?.name || '',
      nome: (botData.nome as string) || conv.contact_name || '',
    };

    const message = replaceVariables(questionText, vars);

    // Clear stuck flags + re-enable bot, set bot_step to the resumed step
    const resetData = { ...botData };
    delete (resetData as Record<string, unknown>)._inactive_reminded;
    delete (resetData as Record<string, unknown>)._claimed_step;
    delete (resetData as Record<string, unknown>)._claimed_at;
    delete (resetData as Record<string, unknown>)._recovery_attempted;

    await supabase.from('wapi_conversations').update({
      bot_step: step,
      bot_enabled: true,
      bot_data: resetData,
    }).eq('id', conv.id);

    const sendRes = await fetch(`${supabaseUrl}/functions/v1/wapi-send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${serviceKey}`,
      },
      body: JSON.stringify({
        instance_id: instance.instance_id,
        instance_token: instance.instance_token,
        phone: conv.remote_jid.replace('@s.whatsapp.net', '').replace('@c.us', '').replace(/\D/g, ''),
        message,
        conversation_id: conv.id,
        company_id: conv.company_id,
        automation: true,
        metadata: { source: 'manual_resume_qualification', step },
      }),
    });

    const sendData = await sendRes.json().catch(() => ({}));
    if (!sendRes.ok) {
      return new Response(JSON.stringify({ error: 'send_failed', details: sendData }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ success: true, step, message }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('[resume-bot-qualification] error:', e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
