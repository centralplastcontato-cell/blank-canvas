// Marks a wapi_conversation as paused due to a campaign send.
// Called by CampaignSendDialog after each successful send when pause_bot_on_reply=true.
// When the lead later replies, the webhook detects bot_data.campaign_pending_reply
// and triggers the auto reply + notifications.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function normalizePhone(p: string): string {
  return (p || '').replace(/\D/g, '');
}

function phoneVariants(p: string): string[] {
  const n = normalizePhone(p);
  const variants = new Set<string>();
  if (n) {
    variants.add(n);
    variants.add(n.replace(/^55/, ''));
    if (!n.startsWith('55')) variants.add(`55${n}`);
  }
  return [...variants].filter(Boolean);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const body = await req.json();
    const { campaign_id, phone, instance_id, lead_name, soft } = body || {};
    const isSoft = soft === true;

    if (!campaign_id || !phone || !instance_id) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: campaign_id, phone, instance_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Resolve internal instance row
    const { data: instance } = await supabase
      .from('wapi_instances')
      .select('id, company_id')
      .eq('instance_id', instance_id)
      .maybeSingle();

    if (!instance) {
      return new Response(
        JSON.stringify({ error: 'Instance not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Find the conversation by remote_jid (try common formats)
    const variants = phoneVariants(phone);
    const possibleJids = variants.flatMap((v) => [
      `${v}@s.whatsapp.net`,
      `${v}@c.us`,
    ]);

    const { data: conv } = await supabase
      .from('wapi_conversations')
      .select('id, bot_data, lead_id')
      .eq('instance_id', instance.id)
      .in('remote_jid', possibleJids)
      .order('last_message_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!conv) {
      console.log(`[campaign-mark-conversation] No conversation found yet for phone ${phone}, will be marked on next webhook event`);
      return new Response(
        JSON.stringify({ success: true, marked: false, reason: 'conversation_not_found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const existingBotData = (conv.bot_data as Record<string, unknown>) || {};
    const newBotData = {
      ...existingBotData,
      campaign_pending_reply: campaign_id,
      campaign_lead_name: lead_name || null,
      campaign_marked_at: new Date().toISOString(),
      campaign_soft: isSoft,
    };

    // Soft mode: apenas marca para detecção da resposta, sem desligar o bot.
    const updatePayload: Record<string, unknown> = { bot_data: newBotData };
    if (!isSoft) {
      updatePayload.bot_enabled = false;
      updatePayload.bot_step = 'human_takeover';
    }

    await supabase
      .from('wapi_conversations')
      .update(updatePayload)
      .eq('id', conv.id);

    console.log(`[campaign-mark-conversation] Marked conv ${conv.id} for campaign ${campaign_id}`);

    return new Response(
      JSON.stringify({ success: true, marked: true, conversation_id: conv.id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    console.error('[campaign-mark-conversation] Error:', err);
    return new Response(
      JSON.stringify({ error: err.message || String(err) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
