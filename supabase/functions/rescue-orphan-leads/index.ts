import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  // One-shot rescue operation - hardcoded user for audit trail
  const userId = "f7dd4924-1b2f-4ff4-b63b-50043cd9eb6d";

  const COMPANY_ID = "a0000000-0000-0000-0000-000000000001";
  const TARGET_UNIT = "Trujillo";

  // Find orphan leads: unit = 'Castelo da Diversão' AND no wapi_conversation
  const { data: orphans, error: fetchErr } = await supabase
    .from("campaign_leads")
    .select("id, name, whatsapp, month, day_of_month, guests")
    .eq("company_id", COMPANY_ID)
    .eq("unit", "Castelo da Diversão");

  if (fetchErr) {
    return new Response(
      JSON.stringify({ error: "Failed to fetch leads", details: fetchErr }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Filter out leads that already have conversations
  const leadIds = (orphans || []).map((l) => l.id);
  const { data: existingConvs } = await supabase
    .from("wapi_conversations")
    .select("lead_id")
    .in("lead_id", leadIds);

  const convoLeadIds = new Set((existingConvs || []).map((c) => c.lead_id));
  const trueOrphans = (orphans || []).filter((l) => !convoLeadIds.has(l.id));

  const results: { id: string; name: string; status: string; error?: string }[] = [];
  console.log(`[rescue] Processing ${trueOrphans.length} true orphans`);

  for (const lead of trueOrphans) {
    try {
      console.log(`[rescue] Processing lead ${lead.name} (${lead.id})`);
      // Update unit to Trujillo
      const { error: updateErr } = await supabase
        .from("campaign_leads")
        .update({ unit: TARGET_UNIT })
        .eq("id", lead.id);

      if (updateErr) throw updateErr;

      // Send welcome message via wapi-send
      const cleanPhone = lead.whatsapp.replace(/\D/g, "");
      const phoneWithCountry = cleanPhone.startsWith("55")
        ? cleanPhone
        : `55${cleanPhone}`;

      const dateStr = `${lead.day_of_month || ""}/${lead.month || ""}`;
      const message = `Olá! 👋🏼✨\n\nVim pelo site do *Castelo da Diversão* e gostaria de saber mais!\n\n📋 *Dados:*\n👤 Nome: ${lead.name}\n📍 Unidade: ${TARGET_UNIT}\n📅 Data: ${dateStr}\n👥 Convidados: ${lead.guests || ""}\n\nVou dar continuidade no seu atendimento!! 🚀\n\nEscolha a opção que mais te agrada 👇\n\n1️⃣ - 📩 Receber agora o orçamento\n2️⃣ - 💬 Falar com um atendente`;

      const sendResp = await fetch(`${supabaseUrl}/functions/v1/wapi-send`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${serviceRoleKey}`,
        },
        body: JSON.stringify({
          action: "send-text",
          phone: phoneWithCountry,
          message,
          unit: TARGET_UNIT,
          lpMode: true,
        }),
      });

      const sendStatus = sendResp.ok ? "sent" : "send_failed";
      console.log(`[rescue] Lead ${lead.name}: wapi-send ${sendStatus}`);

      // Log in lead_history using correct columns
      await supabase.from("lead_history").insert({
        lead_id: lead.id,
        action: "rescue_orphan",
        old_value: "Castelo da Diversão",
        new_value: TARGET_UNIT,
        user_id: userId,
      });

      results.push({ id: lead.id, name: lead.name, status: sendStatus });
    } catch (err: any) {
      console.error(`[rescue] Error for ${lead.name}:`, err);
      results.push({
        id: lead.id,
        name: lead.name,
        status: "error",
        error: err.message || String(err),
      });
    }
  }

  return new Response(
    JSON.stringify({
      total_orphans_found: trueOrphans.length,
      results,
    }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
