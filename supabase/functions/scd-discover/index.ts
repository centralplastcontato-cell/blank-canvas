import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const token = Deno.env.get('SCD_API_TOKEN');
  if (!token) {
    return new Response(JSON.stringify({ error: 'SCD_API_TOKEN not configured' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    // Debug: test with /me endpoint first
    const meRes = await fetch('https://app.saascustomdomains.com/api/v1/me', {
      headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' },
    });
    const meText = await meRes.text();
    console.log('ME response:', meRes.status, meText.substring(0, 500));

    // Step 1: Get accounts
    const accountsRes = await fetch('https://app.saascustomdomains.com/api/v1/accounts', {
      headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' },
    });
    const accountsText = await accountsRes.text();
    
    if (accountsRes.status !== 200) {
      return new Response(JSON.stringify({ 
        error: 'SCD API error', 
        status: accountsRes.status, 
        me_status: meRes.status,
        me_body: meText.substring(0, 300),
        accounts_body: accountsText.substring(0, 300),
        token_preview: token.substring(0, 4) + '...' + token.substring(token.length - 4)
      }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let accountsData;
    try { accountsData = JSON.parse(accountsText); } catch { 
      return new Response(JSON.stringify({ error: 'Non-JSON response', body: accountsText.substring(0, 500) }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Step 2: For each account, get upstreams
    const results: any[] = [];
    const accounts = accountsData.accounts || accountsData.data || (Array.isArray(accountsData) ? accountsData : [accountsData]);
    
    for (const account of accounts) {
      const accountId = account.uuid || account.id;
      if (!accountId) continue;

      const upstreamsRes = await fetch(
        `https://app.saascustomdomains.com/api/v1/accounts/${accountId}/upstreams`,
        { headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' } }
      );
      const upstreamsData = await upstreamsRes.json();
      const upstreams = upstreamsData.upstreams || upstreamsData.data || (Array.isArray(upstreamsData) ? upstreamsData : []);

      results.push({
        account_uuid: accountId,
        account_name: account.name || account.company_name,
        upstreams: upstreams.map((u: any) => ({
          upstream_uuid: u.uuid || u.id,
          upstream_name: u.name || u.host || u.domain,
          host: u.host,
        })),
      });
    }

    return new Response(JSON.stringify({ accounts: results, raw_accounts: accountsData }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
