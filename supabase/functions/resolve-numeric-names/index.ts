import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const WAPI_BASE = 'https://api.w-api.app/v1';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  const url = new URL(req.url);
  const companyId = url.searchParams.get('company_id');
  const limit = parseInt(url.searchParams.get('limit') || '10', 10);
  const offset = parseInt(url.searchParams.get('offset') || '0', 10);
  if (!companyId) {
    return new Response(JSON.stringify({ error: 'company_id required' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400,
    });
  }

  const { data: convs, error } = await supabase
    .from('wapi_conversations')
    .select('id, contact_name, remote_jid, instance_id, wapi_instances(instance_id, instance_token, client_token, provider)')
    .eq('company_id', companyId)
    .or('contact_name.match.^[0-9]+$,contact_name.like.*@lid*')
    .range(offset, offset + limit - 1);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500,
    });
  }

  const results: any[] = [];
  let resolved = 0, failed = 0;

  for (const c of convs || []) {
    const inst: any = (c as any).wapi_instances;
    if (!inst) { failed++; results.push({ id: c.id, status: 'no-instance' }); continue; }
    const phone = String(c.remote_jid).replace(/@(s\.whatsapp\.net|c\.us|g\.us|lid)/g, '');
    let name: string | null = null;

    try {
      if (inst.provider === 'zapi') {
        const base = `https://api.z-api.io/instances/${inst.instance_id}/token/${inst.instance_token}`;
        const headers: Record<string, string> = inst.client_token ? { 'Client-Token': inst.client_token } : {};
        for (const u of [`${base}/contacts/${phone}`, `${base}/chats/${phone}`]) {
          try {
            const r = await fetch(u, { headers });
            if (r.ok) {
              const d = await r.json();
              name = d?.name || d?.short || d?.notify || d?.vname || d?.contactName || null;
              if (name) break;
            }
          } catch {}
        }
      } else {
        const urls = [
          `${WAPI_BASE}/contacts/contact-info?instanceId=${inst.instance_id}&phoneNumber=${phone}`,
          `${WAPI_BASE}/contacts/contact-info?instanceId=${inst.instance_id}&phone=${phone}`,
          `${WAPI_BASE}/contact/info?instanceId=${inst.instance_id}&phone=${phone}`,
        ];
        for (const u of urls) {
          try {
            const r = await fetch(u, { headers: { Authorization: `Bearer ${inst.instance_token}` } });
            if (!r.ok) continue;
            const d = await r.json();
            name = d?.name || d?.contact?.name || d?.pushname || d?.pushName
              || d?.verifiedName || d?.verifiedBizName || d?.shortName || d?.notify || null;
            if (name) break;
          } catch {}
        }
      }
    } catch {}

    const trimmed = (name || '').trim();
    if (trimmed && !/^[\d\s+()\-]+$/.test(trimmed)) {
      await supabase.from('wapi_conversations').update({ contact_name: trimmed }).eq('id', c.id);
      resolved++;
      results.push({ id: c.id, old: c.contact_name, new: trimmed, status: 'resolved' });
    } else {
      failed++;
      results.push({ id: c.id, old: c.contact_name, provider: inst.provider, status: 'no-name' });
    }
  }

  return new Response(JSON.stringify({ total: convs?.length || 0, resolved, failed, results }, null, 2), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
