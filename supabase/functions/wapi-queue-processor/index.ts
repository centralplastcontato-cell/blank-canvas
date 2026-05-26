// wapi-queue-processor
// DISABLED — no-op. Does not read or modify whatsapp_outbound_queue.
// Queue sending via this processor is deactivated; wapi-webhook handles all outbound logic directly.

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  return new Response(
    JSON.stringify({
      ok: true,
      mode: 'disabled',
      message: 'Queue processor desativado. Nenhum item modificado.',
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  );
});
