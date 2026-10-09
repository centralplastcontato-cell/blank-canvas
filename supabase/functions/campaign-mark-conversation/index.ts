// Marks a wapi_conversation as paused due to a campaign send.
// Called by CampaignSendDialog after each successful send when pause_bot_on_reply=true.
// When the lead later replies, the webhook detects bot_data.campaign_pending_reply
// and triggers the auto reply + notifications.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { checkCompanyAccess } from '../_shared/company-access.ts';
import { markConversationForCampaign } from '../_shared/campaign-mark.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

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

    // Só quem tem acesso à empresa do número (antes a chave pública bastava para desligar o robô
    // de qualquer conversa), e a campanha precisa ser da mesma empresa.
    const access = await checkCompanyAccess(supabase, req, instance.company_id);
    if (!access.ok) {
      return new Response(
        JSON.stringify({ error: access.error }),
        { status: access.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    const { data: campaignRow } = await supabase
      .from('campaigns')
      .select('company_id')
      .eq('id', campaign_id)
      .maybeSingle();
    if (!campaignRow || campaignRow.company_id !== instance.company_id) {
      return new Response(
        JSON.stringify({ error: 'Campanha não é desta empresa' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const result = await markConversationForCampaign(supabase, {
      campaignId: campaign_id,
      phone,
      instanceRowId: instance.id,
      leadName: lead_name,
      soft: isSoft,
    });

    if (!result.marked) {
      console.log(`[campaign-mark-conversation] No conversation found yet for phone ${phone}, will be marked on next webhook event`);
      return new Response(
        JSON.stringify({ success: true, marked: false, reason: 'conversation_not_found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[campaign-mark-conversation] Marked conv ${result.conversationId} for campaign ${campaign_id}`);

    return new Response(
      JSON.stringify({ success: true, marked: true, conversation_id: result.conversationId }),
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
