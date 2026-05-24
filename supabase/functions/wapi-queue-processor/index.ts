// wapi-queue-processor
// Safety-first mode: post-reconnect queue sending is disabled.
// Any pending/approved item is auto-rejected so no cron/process race can burst-send.
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
  const stats = { rejected: 0 };

  try {
    const nowIso = new Date().toISOString();
    const { data, error } = await supabase
      .from('whatsapp_outbound_queue')
      .update({
        status: 'rejected',
        rejected_at: nowIso,
        last_error: 'auto_rejected_queue_processor_disabled',
      })
      .in('status', ['pending', 'approved'])
      .select('id');

    if (error) throw error;
    stats.rejected = data?.length ?? 0;

    return new Response(JSON.stringify({ ok: true, mode: 'auto_reject_only', stats }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[wapi-queue-processor] Fatal:', err);
    return new Response(JSON.stringify({ ok: false, error: String((err as Error)?.message ?? err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
