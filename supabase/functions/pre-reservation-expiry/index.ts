import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const now = new Date();

    // 1. Auto-expire overdue pre-reservations
    const { data: expired } = await supabase
      .from("pre_reservations")
      .select("id, lead_id, company_id")
      .eq("status", "ativa")
      .lt("reservation_expires_at", now.toISOString());

    if (expired && expired.length > 0) {
      for (const pr of expired) {
        await supabase
          .from("pre_reservations")
          .update({ status: "expirada" })
          .eq("id", pr.id);

        if (pr.lead_id) {
          await supabase.from("lead_history").insert({
            lead_id: pr.lead_id,
            company_id: pr.company_id,
            action: "pre_reserva_expirada",
            details: "Pré-reserva expirou automaticamente",
          });
        }
      }
      console.log(`[pre-reservation-expiry] Expired ${expired.length} reservations`);
    }

    // 2. Send expiry notifications for active pre-reservations
    const { data: companies } = await supabase
      .from("pre_reservation_settings")
      .select("*")
      .eq("is_enabled", true);

    if (!companies || companies.length === 0) {
      return new Response(JSON.stringify({ success: true, message: "No companies with automation enabled" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let sentCount = 0;

    for (const settings of companies) {
      const hoursThreshold = settings.hours_before_expiry || 10;
      const thresholdDate = new Date(now.getTime() + hoursThreshold * 60 * 60 * 1000);

      // Find active pre-reservations expiring within threshold that haven't been notified
      const { data: upcoming } = await supabase
        .from("pre_reservations")
        .select("*")
        .eq("company_id", settings.company_id)
        .eq("status", "ativa")
        .lte("reservation_expires_at", thresholdDate.toISOString())
        .gt("reservation_expires_at", now.toISOString())
        .is("last_automation_sent_at", null);

      if (!upcoming || upcoming.length === 0) continue;

      // Get company name for fallback
      const { data: company } = await supabase
        .from("companies")
        .select("name")
        .eq("id", settings.company_id)
        .single();

      for (const pr of upcoming) {
        if (!pr.customer_phone) continue;

        // Resolve message template
        let message = settings.expiry_message || "";
        const eventDate = pr.event_date
          ? new Date(pr.event_date + "T12:00:00").toLocaleDateString("pt-BR")
          : "";
        const expiryDate = new Date(pr.reservation_expires_at).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });

        message = message
          .replace(/\{\{nome\}\}/gi, pr.customer_name || "")
          .replace(/\{\{data_festa\}\}/gi, eventDate)
          .replace(/\{\{data_validade\}\}/gi, expiryDate)
          .replace(/\{\{unidade\}\}/gi, pr.unit || company?.name || "");

        // Número da empresa: o da unidade da pré-reserva, senão o primeiro conectado
        const { data: instances } = await supabase
          .from("wapi_instances")
          .select("instance_id, instance_token, unit")
          .eq("company_id", settings.company_id)
          .eq("status", "connected");
        const instance = (instances || []).find((i) => pr.unit && i.unit === pr.unit) || (instances || [])[0];

        if (!instance) continue;

        // Envia pelo wapi-send no mesmo formato das outras rotinas (antes faltavam a
        // ação e o token da instância e a mensagem nunca saía)
        const digits = String(pr.customer_phone).replace(/\D/g, "");
        const phone = !digits.startsWith("55") && (digits.length === 10 || digits.length === 11) ? `55${digits}` : digits;
        const { data: sendData, error: sendErr } = await supabase.functions.invoke("wapi-send", {
          body: {
            action: "send-text",
            instanceId: instance.instance_id,
            instanceToken: instance.instance_token,
            phone,
            message,
            source: "pre-reservation-expiry",
            automation: true,
          },
        });
        const failed = !!(sendErr || sendData?.error);
        if (failed || sendData?.skipped) {
          console.warn(`[pre-reservation-expiry] Não enviado para a pré-reserva ${pr.id}:`, sendErr?.message || sendData?.error || sendData?.reason);
        }
        // Pulada (número em pausa): tenta na próxima rodada. Com erro, não tenta de novo:
        // às vezes o WhatsApp entrega mesmo dando erro, e o cliente receberia duas vezes.
        if (sendData?.skipped && !failed) continue;
        await supabase
          .from("pre_reservations")
          .update({ last_automation_sent_at: now.toISOString() })
          .eq("id", pr.id);

        if (!failed) {
          sentCount++;

          if (pr.lead_id) {
            await supabase.from("lead_history").insert({
              lead_id: pr.lead_id,
              company_id: pr.company_id,
              action: "prereserva_automacao_enviada",
              details: "Mensagem de vencimento de pré-reserva enviada automaticamente",
            });
          }
        }
      }
    }

    console.log(`[pre-reservation-expiry] Sent ${sentCount} notifications`);

    return new Response(
      JSON.stringify({ success: true, expired: expired?.length || 0, sent: sentCount }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[pre-reservation-expiry] Error:", err);
    const message = err instanceof Error ? err.message : "Erro interno";
    return new Response(
      JSON.stringify({ success: false, error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
