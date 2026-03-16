import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, "");
}

function getPhoneVariants(phone: string): string[] {
  const clean = normalizePhone(phone);
  const variants = new Set<string>();
  variants.add(clean);
  
  // With/without country code 55
  if (clean.startsWith("55") && clean.length >= 12) {
    variants.add(clean.slice(2)); // without 55
  } else {
    variants.add("55" + clean); // with 55
  }
  
  // Handle 9th digit variations for Brazilian mobile
  const withoutCountry = clean.startsWith("55") ? clean.slice(2) : clean;
  if (withoutCountry.length === 11 && withoutCountry[2] === "9") {
    // Has 9th digit, create variant without it
    const without9 = withoutCountry.slice(0, 2) + withoutCountry.slice(3);
    variants.add(without9);
    variants.add("55" + without9);
  } else if (withoutCountry.length === 10) {
    // Missing 9th digit, create variant with it
    const with9 = withoutCountry.slice(0, 2) + "9" + withoutCountry.slice(2);
    variants.add(with9);
    variants.add("55" + with9);
  }
  
  return Array.from(variants);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  const body = await req.json().catch(() => ({}));
  const dryRun = body.dry_run !== false; // Default: dry run (just report, don't fix)
  const targetCompanyId = body.company_id || null; // Optional: filter by company

  // 1. Get all active child companies
  let companiesQuery = supabase
    .from("companies")
    .select("id, name")
    .eq("is_active", true)
    .not("parent_id", "is", null);

  if (targetCompanyId) {
    companiesQuery = companiesQuery.eq("id", targetCompanyId);
  }

  const { data: companies, error: compErr } = await companiesQuery;
  if (compErr || !companies) {
    return new Response(JSON.stringify({ error: "Failed to fetch companies", details: compErr }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const report: Array<{
    company_name: string;
    company_id: string;
    orphan_conversations: number;
    matched: number;
    unmatched: number;
    matches: Array<{ conv_id: string; contact_name: string; contact_phone: string; lead_name: string; lead_status: string; lead_id: string }>;
    unmatched_list: Array<{ conv_id: string; contact_name: string; contact_phone: string }>;
  }> = [];

  let totalFixed = 0;

  for (const company of companies) {
    console.log(`[link-orphans] Processing ${company.name}...`);

    // Get orphan conversations (no lead_id, not groups)
    // Use raw filter to ensure NULL check works correctly
    const { data: orphans } = await supabase
      .from("wapi_conversations")
      .select("id, contact_phone, contact_name, remote_jid, instance_key")
      .eq("company_id", company.id)
      .is("lead_id", null)
      .not("remote_jid", "like", "%@g.us");

    console.log(`[link-orphans] ${company.name}: found ${orphans?.length ?? 0} orphan conversations`);

    if (!orphans || orphans.length === 0) {
      report.push({
        company_name: company.name,
        company_id: company.id,
        orphan_conversations: 0,
        matched: 0,
        unmatched: 0,
        matches: [],
        unmatched_list: [],
      });
      continue;
    }

    // Get all leads for this company
    const { data: leads } = await supabase
      .from("campaign_leads")
      .select("id, name, whatsapp, status, unit")
      .eq("company_id", company.id);

    if (!leads || leads.length === 0) continue;

    // Build phone -> leads map
    const phoneToLeads = new Map<string, typeof leads>();
    for (const lead of leads) {
      for (const variant of getPhoneVariants(lead.whatsapp)) {
        const existing = phoneToLeads.get(variant) || [];
        existing.push(lead);
        phoneToLeads.set(variant, existing);
      }
    }

    const matches: typeof report[0]["matches"] = [];
    const unmatchedList: typeof report[0]["unmatched_list"] = [];

    for (const conv of orphans) {
      const phone = conv.contact_phone || conv.remote_jid?.split("@")[0] || "";
      const variants = getPhoneVariants(phone);
      
      let bestLead: typeof leads[0] | null = null;
      
      for (const variant of variants) {
        const candidates = phoneToLeads.get(variant);
        if (candidates && candidates.length > 0) {
          // Pick best: prefer matching unit, then most recent
          bestLead = candidates[0];
          break;
        }
      }

      if (bestLead) {
        matches.push({
          conv_id: conv.id,
          contact_name: conv.contact_name || "",
          contact_phone: phone,
          lead_name: bestLead.name,
          lead_status: bestLead.status,
          lead_id: bestLead.id,
        });

        if (!dryRun) {
          const { error: updateErr } = await supabase
            .from("wapi_conversations")
            .update({ lead_id: bestLead.id })
            .eq("id", conv.id);

          if (updateErr) {
            console.error(`[link-orphans] Failed to update conv ${conv.id}:`, updateErr);
          } else {
            totalFixed++;
          }
        }
      } else {
        unmatchedList.push({
          conv_id: conv.id,
          contact_name: conv.contact_name || "",
          contact_phone: phone,
        });
      }
    }

    report.push({
      company_name: company.name,
      company_id: company.id,
      orphan_conversations: orphans.length,
      matched: matches.length,
      unmatched: unmatchedList.length,
      matches,
      unmatched_list: unmatchedList,
    });
  }

  return new Response(
    JSON.stringify({
      dry_run: dryRun,
      total_fixed: dryRun ? 0 : totalFixed,
      summary: report.map(r => ({
        company: r.company_name,
        orphans: r.orphan_conversations,
        matched: r.matched,
        unmatched: r.unmatched,
      })),
      details: report,
    }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
