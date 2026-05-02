// Temporary admin upload endpoint. Uses service role to upload a file to Storage.
// Protected by ADMIN_UPLOAD_TOKEN secret.
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-admin-token, x-bucket, x-path, x-content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const token = req.headers.get('x-admin-token');
  const expected = Deno.env.get('ADMIN_UPLOAD_TOKEN');
  if (!expected || token !== expected) {
    return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  const bucket = req.headers.get('x-bucket');
  const path = req.headers.get('x-path');
  const contentType = req.headers.get('x-content-type') || 'application/octet-stream';
  if (!bucket || !path) {
    return new Response(JSON.stringify({ error: 'missing x-bucket or x-path' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const bytes = new Uint8Array(await req.arrayBuffer());
  const { error } = await supabase.storage.from(bucket).upload(path, bytes, {
    contentType,
    upsert: true,
  });
  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
  const { data: pub } = supabase.storage.from(bucket).getPublicUrl(path);
  return new Response(JSON.stringify({ ok: true, public_url: pub.publicUrl }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
});
