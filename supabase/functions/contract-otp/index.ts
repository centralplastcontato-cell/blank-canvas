import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { token, action } = await req.json();
    if (!token || !action) return json({ success: false, error: "Missing token or action" }, 400);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sb = createClient(supabaseUrl, serviceKey);

    if (action === "send-otp") {
      // Get signature record
      const { data: sig, error: sigErr } = await sb
        .from("contract_signatures")
        .select("id, signer_phone, status, company_id, otp_attempts")
        .eq("token", token)
        .single();

      if (sigErr || !sig) return json({ success: false, error: "Token inválido." });
      if (sig.status === "signed") return json({ success: false, error: "Contrato já assinado." });
      if (sig.status === "expired") return json({ success: false, error: "Token expirado." });

      if (!sig.signer_phone) return json({ success: false, error: "Telefone do signatário não encontrado." });

      // Generate 6-digit OTP
      const otp = String(Math.floor(100000 + Math.random() * 900000));

      // Save OTP
      await sb.from("contract_signatures").update({
        otp_code: otp,
        otp_sent_at: new Date().toISOString(),
        otp_attempts: 0,
        status: "otp_sent",
      }).eq("id", sig.id);

      // Get connected WhatsApp instance for this company
      const { data: instances } = await sb
        .from("wapi_instances")
        .select("instance_id, instance_token")
        .eq("company_id", sig.company_id)
        .eq("status", "connected")
        .limit(1);

      const instance = instances?.[0];
      if (!instance) return json({ success: false, error: "Nenhuma instância WhatsApp conectada." });

      // Send OTP via wapi-send
      const phone = sig.signer_phone.replace(/\D/g, "");
      const message = `🔐 *Código de verificação*\n\nSeu código para assinar o contrato é:\n\n*${otp}*\n\nEste código expira em 10 minutos.\n\n_Não compartilhe este código com ninguém._`;

      const { error: sendErr } = await sb.functions.invoke("wapi-send", {
        body: {
          instanceId: instance.instance_id,
          instanceToken: instance.instance_token,
          phone,
          message,
        },
      });

      if (sendErr) {
        console.error("OTP send error:", sendErr);
        return json({ success: false, error: "Erro ao enviar código via WhatsApp." });
      }

      // Mask phone for response
      const masked = phone.slice(0, 4) + "****" + phone.slice(-2);
      return json({ success: true, maskedPhone: masked });

    } else if (action === "verify-otp") {
      // Verification is handled by the RPC submit_contract_signature
      // This endpoint just validates the OTP code without finalizing
      const { otp } = await req.json().catch(() => ({ otp: undefined }));
      return json({ success: false, error: "Use the submit_contract_signature RPC instead." });

    } else {
      return json({ success: false, error: "Invalid action." }, 400);
    }
  } catch (e: any) {
    console.error("contract-otp error:", e);
    return json({ success: false, error: e.message || "Erro interno." }, 500);
  }
});
