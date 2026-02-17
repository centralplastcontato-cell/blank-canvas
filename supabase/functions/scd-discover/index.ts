import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SCD_BASE = 'https://app.saascustomdomains.com/api/v1';
const ACCOUNT = 'acc_403f707d';
const UPSTREAM = 'upstream_6d66d8ea';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const token = Deno.env.get('SCD_API_TOKEN');
  if (!token) {
    return new Response(JSON.stringify({ error: 'SCD_API_TOKEN not configured' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const scdHeaders = {
    'Authorization': `Bearer ${token}`,
    'Accept': 'application/json',
    'Content-Type': 'application/json',
  };

  const url = new URL(req.url);
  const action = url.searchParams.get('action') || 'list';

  try {
    if (action === 'list') {
      const res = await fetch(
        `${SCD_BASE}/accounts/${ACCOUNT}/upstreams/${UPSTREAM}/domains`,
        { headers: scdHeaders }
      );
      const data = await res.json();
      return new Response(JSON.stringify(data, null, 2), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'update' && req.method === 'POST') {
      const body = await req.json();
      const { domain_uuid, meta_title, meta_description, meta_image_url, meta_favicon_url } = body;

      if (!domain_uuid) {
        return new Response(JSON.stringify({ error: 'domain_uuid required' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const payload: Record<string, string> = {};
      if (meta_title) payload.meta_title = meta_title;
      if (meta_description) payload.meta_description = meta_description;
      if (meta_image_url) payload.meta_image_url = meta_image_url;
      if (meta_favicon_url) payload.meta_favicon_url = meta_favicon_url;

      const res = await fetch(
        `${SCD_BASE}/accounts/${ACCOUNT}/upstreams/${UPSTREAM}/domains/${domain_uuid}`,
        { method: 'PATCH', headers: scdHeaders, body: JSON.stringify({ domain: payload }) }
      );
      const data = await res.text();
      console.log('SCD update response:', res.status, data);

      return new Response(data, {
        status: res.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Unknown action' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
