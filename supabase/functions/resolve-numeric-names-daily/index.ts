// Cron diário: percorre todas as empresas ativas e tenta resolver nomes
// de contatos numéricos / @lid via W-API/Z-API. Reaproveita a lógica de
// resolve-numeric-names invocando-a por company_id.
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  const url = new URL(req.url);
  const limitPerCompany = parseInt(url.searchParams.get('limit') || '50', 10);

  const { data: companies, error } = await supabase
    .from('companies')
    .select('id, name')
    .eq('is_active', true);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const base = Deno.env.get('SUPABASE_URL')!;
  const anon = Deno.env.get('SUPABASE_ANON_KEY') || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  const summary: any[] = [];
  let totalResolved = 0, totalFailed = 0;

  for (const c of companies || []) {
    try {
      const r = await fetch(
        `${base}/functions/v1/resolve-numeric-names?company_id=${c.id}&limit=${limitPerCompany}`,
        {
          headers: { Authorization: `Bearer ${anon}`, apikey: anon },
          signal: AbortSignal.timeout(120_000),
        }
      );
      const data = await r.json().catch(() => ({}));
      const resolved = data?.resolved ?? 0;
      const failed = data?.failed ?? 0;
      totalResolved += resolved;
      totalFailed += failed;
      summary.push({ company_id: c.id, company_name: c.name, resolved, failed });
    } catch (e) {
      summary.push({ company_id: c.id, company_name: c.name, error: String(e) });
    }
  }

  return new Response(
    JSON.stringify({
      ran_at: new Date().toISOString(),
      companies_processed: companies?.length || 0,
      total_resolved: totalResolved,
      total_failed: totalFailed,
      summary,
    }, null, 2),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
});
