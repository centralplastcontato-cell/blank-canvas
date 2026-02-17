import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

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
  let action = url.searchParams.get('action') || 'list';

  // Also support action from POST body
  let body: Record<string, any> = {};
  if (req.method === 'POST') {
    try {
      body = await req.json();
      if (body.action) action = body.action;
    } catch { /* empty body */ }
  }

  try {
    // LIST all SCD domains
    if (action === 'list') {
      const res = await fetch(
        `${SCD_BASE}/accounts/${ACCOUNT}/upstreams/${UPSTREAM}/domains`,
        { headers: scdHeaders }
      );
      const text = await res.text();
      console.log('SCD list raw response status:', res.status, 'length:', text.length);
      let data: any;
      try { data = JSON.parse(text); } catch { data = { raw: text.substring(0, 500) }; }
      return new Response(JSON.stringify(data, null, 2), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // UPDATE metadata for a specific domain
    if (action === 'update') {
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

    // AUTO-SETUP: Find the SCD domain for a company and set metadata automatically
    if (action === 'auto-setup') {
      const { company_id } = body;
      if (!company_id) {
        return new Response(JSON.stringify({ error: 'company_id required' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseKey);

      // Get company data
      const { data: company, error: companyError } = await supabase
        .from('companies')
        .select('name, slug, logo_url, custom_domain, domain_canonical, settings')
        .eq('id', company_id)
        .single();

      if (companyError || !company) {
        return new Response(JSON.stringify({ error: 'Company not found', details: companyError }), {
          status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (!company.custom_domain) {
        return new Response(JSON.stringify({ error: 'Company has no custom_domain configured' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Check if we already have the scd_domain_uuid stored
      let scdDomainUuid = company.settings?.scd_domain_uuid;

      // If not, search for it in SCD
      if (!scdDomainUuid) {
        console.log(`Looking up SCD domain for: ${company.custom_domain}`);
        const listRes = await fetch(
          `${SCD_BASE}/accounts/${ACCOUNT}/upstreams/${UPSTREAM}/domains`,
          { headers: scdHeaders }
        );
        const listText = await listRes.text();
        console.log('SCD list raw:', listRes.status, listText.substring(0, 300));
        let domains: any;
        try { domains = JSON.parse(listText); } catch { 
          return new Response(JSON.stringify({ error: 'SCD returned invalid JSON', raw: listText.substring(0, 500) }), {
            status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Normalize domain for matching (remove www.)
        const canonical = (company.domain_canonical || company.custom_domain).replace(/^www\./, '').toLowerCase();

        const found = domains?.data?.find((d: any) => {
          const domainHost = (d.identifier || '').replace(/^www\./, '').toLowerCase();
          return domainHost === canonical || domainHost === `www.${canonical}`;
        });

        if (!found) {
          return new Response(JSON.stringify({ 
            error: 'Domain not found in SCD', 
            searched_for: canonical,
            available: domains?.data?.map((d: any) => d.identifier) 
          }), {
            status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        scdDomainUuid = found.uuid;

        // Store the uuid in company settings for future use
        const currentSettings = company.settings || {};
        await supabase
          .from('companies')
          .update({ settings: { ...currentSettings, scd_domain_uuid: scdDomainUuid } })
          .eq('id', company_id);

        console.log(`Stored scd_domain_uuid: ${scdDomainUuid} for company ${company_id}`);
      }

      // Now update the SCD domain metadata with company branding
      const metaPayload: Record<string, string> = {
        meta_title: company.name,
        meta_description: `${company.name} — Festas e eventos inesquecíveis!`,
      };

      if (company.logo_url) {
        metaPayload.meta_image_url = company.logo_url;
        metaPayload.meta_favicon_url = company.logo_url;
      }

      console.log(`Updating SCD metadata for ${scdDomainUuid}:`, metaPayload);

      const updateRes = await fetch(
        `${SCD_BASE}/accounts/${ACCOUNT}/upstreams/${UPSTREAM}/domains/${scdDomainUuid}`,
        { method: 'PATCH', headers: scdHeaders, body: JSON.stringify({ domain: metaPayload }) }
      );
      const updateText = await updateRes.text();
      console.log('SCD auto-setup response:', updateRes.status, updateText);
      let updateData: any = {};
      try { updateData = JSON.parse(updateText); } catch { updateData = { raw: updateText }; }

      return new Response(JSON.stringify({ 
        success: true, 
        scd_domain_uuid: scdDomainUuid,
        metadata_applied: metaPayload,
        scd_response: updateData 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Unknown action. Use: list, update, auto-setup' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('SCD error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
