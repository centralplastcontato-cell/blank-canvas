// wapi-reinforce-webhooks
// Cron job que roda a cada 30 minutos e reforça proativamente a configuração de
// webhooks em todas as instâncias conectadas (Z-API e W-API).
//
// PROBLEMA RESOLVIDO:
//   Z-API perde notifySentByMe após reconexão. O sistema só reforçava de forma
//   reativa (quando um webhook chegava). Mas sem notifySentByMe, mensagens
//   enviadas pelo celular não geram webhook — deadlock. Este cron quebra o ciclo.
//
//   W-API também perde a configuração de webhook após reconexão. Este cron
//   reconecta o URL em todas as instâncias W-API conectadas.
//
// INVOCAÇÃO:
//   Via Supabase Cron: POST a cada 30 minutos.
//   Pode ser invocado manualmente a qualquer momento sem efeito colateral.

import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const WAPI_BASE_URL = "https://api.w-api.app/v1";
const ZAPI_BASE_URL = "https://api.z-api.io/instances";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// ─── Helpers Z-API ───────────────────────────────────────────────────────────

function zapiUrl(instanceId: string, token: string, path: string): string {
  return `${ZAPI_BASE_URL}/${instanceId}/token/${token}/${path}`;
}

async function zapiPut(
  instanceId: string,
  token: string,
  clientToken: string | null,
  path: string,
  body: unknown,
): Promise<boolean> {
  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (clientToken) headers["Client-Token"] = clientToken;
    const res = await fetch(zapiUrl(instanceId, token, path), {
      method: "PUT",
      headers,
      body: JSON.stringify(body),
    });
    return res.ok;
  } catch {
    return false;
  }
}

// Reforça webhook + notifySentByMe para uma instância Z-API.
// Usa a mesma estratégia que zapiConfigureWebhooks em wapi-send:
// primary = update-every-webhooks (registra todos os eventos de uma vez),
// depois reforça notifySentByMe via endpoints dedicados como double-insurance.
async function reinforceZapi(instance: Record<string, unknown>, webhookUrl: string): Promise<{
  ok: boolean;
  primaryOk: boolean;
  notifyOk: boolean;
}> {
  const instanceId = String(instance.instance_id);
  const token = String(instance.instance_token);
  const clientToken = instance.client_token ? String(instance.client_token) : null;

  // Primary: registra o webhook URL em todos os eventos ao mesmo tempo.
  // notifySentByMe=true faz o webhook "Ao receber" disparar também para
  // mensagens enviadas pelo celular do buffet (com conteúdo completo).
  const primaryOk = await zapiPut(instanceId, token, clientToken, "update-every-webhooks", {
    value: webhookUrl,
    notifySentByMe: true,
  });

  // Double-insurance: endpoint dedicado para notifySentByMe.
  // Alguns planos Z-API ignoram o flag dentro de update-every-webhooks.
  const notifyResults = await Promise.allSettled([
    zapiPut(instanceId, token, clientToken, "update-notify-sent-by-me", { notifySentByMe: true }),
    zapiPut(instanceId, token, clientToken, "update-notify-sent-by-me", { value: true }),
    zapiPut(instanceId, token, clientToken, "update-webhook-received", { value: webhookUrl, notifySentByMe: true }),
    zapiPut(instanceId, token, clientToken, "update-webhook-receive-all-notifications", { value: webhookUrl, notifySentByMe: true }),
  ]);

  const notifyOk = notifyResults.some(
    (r) => r.status === "fulfilled" && r.value === true,
  );

  if (!primaryOk) {
    // Fallback: endpoints por evento (comportamento Z-API antigo)
    const fallbackEndpoints = [
      "update-webhook-received",
      "update-webhook-message-sent",
      "update-webhook-delivery",
      "update-webhook-message-status",
      "update-webhook-receive-all-notifications",
      "update-webhook-connected",
      "update-webhook-disconnected",
    ];
    await Promise.allSettled(
      fallbackEndpoints.map((ep) =>
        zapiPut(instanceId, token, clientToken, ep, { value: webhookUrl })
      ),
    );
    // Fallback notifySentByMe
    await zapiPut(instanceId, token, clientToken, "update-notify-sent-by-me", { notifySentByMe: true });
  }

  return { ok: primaryOk || notifyOk, primaryOk, notifyOk };
}

// ─── Helpers W-API ───────────────────────────────────────────────────────────

// Tenta configurar o webhook em múltiplas variantes de endpoint para cobrir
// diferentes planos/versões da W-API. Retorna true se qualquer uma funcionar.
async function reinforceWapi(instance: Record<string, unknown>, webhookUrl: string): Promise<boolean> {
  const instanceId = String(instance.instance_id);
  const token = String(instance.instance_token);

  const config = {
    onConnect: webhookUrl,
    onDisconnect: webhookUrl,
    onMessageSent: webhookUrl,
    onMessageReceived: webhookUrl,
    onMessageStatus: webhookUrl,
  };

  const variants = [
    { url: `${WAPI_BASE_URL}/instance/webhooks?instanceId=${instanceId}`, method: "PUT", body: config },
    { url: `${WAPI_BASE_URL}/instance/webhooks?instanceId=${instanceId}`, method: "POST", body: config },
    { url: `${WAPI_BASE_URL}/instance/set-webhooks?instanceId=${instanceId}`, method: "POST", body: config },
    { url: `${WAPI_BASE_URL}/instance/webhook?instanceId=${instanceId}`, method: "PUT", body: config },
    { url: `${WAPI_BASE_URL}/instance/webhook?instanceId=${instanceId}`, method: "POST", body: config },
    { url: `${WAPI_BASE_URL}/instance/update-webhook?instanceId=${instanceId}`, method: "PUT", body: config },
    { url: `${WAPI_BASE_URL}/instance/update-webhook?instanceId=${instanceId}`, method: "POST", body: config },
  ];

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "apikey": token,
  };

  for (const variant of variants) {
    try {
      const res = await fetch(variant.url, {
        method: variant.method,
        headers,
        body: JSON.stringify(variant.body),
      });
      if (res.ok) return true;
      // 502/503/504 = instabilidade temporária, tenta próximo endpoint
      if (res.status === 502 || res.status === 503 || res.status === 504) continue;
      // 404 = endpoint não existe nesse plano, tenta próximo
      if (res.status === 404) continue;
    } catch {
      continue;
    }
  }

  return false;
}

// ─── Handler principal ────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const startedAt = Date.now();
  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

  const webhookUrl = `${SUPABASE_URL.replace(/\/$/, "")}/functions/v1/wapi-webhook`;

  // Busca todas as instâncias conectadas que têm credenciais válidas
  const { data: instances, error: fetchErr } = await supabase
    .from("wapi_instances")
    .select("id, instance_id, instance_token, client_token, provider, company_id, status")
    .eq("status", "connected")
    .not("instance_id", "is", null)
    .not("instance_token", "is", null);

  if (fetchErr) {
    console.error("[reinforce-webhooks] Erro ao buscar instâncias:", fetchErr.message);
    return new Response(
      JSON.stringify({ ok: false, error: fetchErr.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const allInstances = instances ?? [];
  console.log(`[reinforce-webhooks] Processando ${allInstances.length} instâncias conectadas`);

  const results: Array<{
    instance_id: string;
    provider: string;
    ok: boolean;
    detail?: string;
  }> = [];

  // Processa todas as instâncias em paralelo com limite de concorrência
  // (sem limitar muito pois são poucas instâncias em produção)
  await Promise.allSettled(
    allInstances.map(async (instance) => {
      const provider = String(instance.provider || "");
      const instanceId = String(instance.instance_id);

      if (provider === "zapi") {
        const result = await reinforceZapi(instance as Record<string, unknown>, webhookUrl);
        const entry = {
          instance_id: instanceId,
          provider: "zapi",
          ok: result.ok,
          detail: `primary=${result.primaryOk ? "OK" : "FAIL"} notify=${result.notifyOk ? "OK" : "FAIL"}`,
        };
        results.push(entry);
        console.log(`[reinforce-webhooks] Z-API ${instanceId}: ${entry.detail}`);
      } else if (provider === "wapi") {
        const ok = await reinforceWapi(instance as Record<string, unknown>, webhookUrl);
        const entry = { instance_id: instanceId, provider: "wapi", ok };
        results.push(entry);
        console.log(`[reinforce-webhooks] W-API ${instanceId}: ${ok ? "OK" : "FAIL"}`);
      } else {
        results.push({ instance_id: instanceId, provider, ok: false, detail: "unknown_provider" });
      }
    }),
  );

  const summary = {
    ok: true,
    webhook_url: webhookUrl,
    total: allInstances.length,
    success: results.filter((r) => r.ok).length,
    failed: results.filter((r) => !r.ok).length,
    duration_ms: Date.now() - startedAt,
    results,
  };

  console.log(
    `[reinforce-webhooks] Concluído: ${summary.success}/${summary.total} OK em ${summary.duration_ms}ms`,
  );

  return new Response(JSON.stringify(summary, null, 2), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
