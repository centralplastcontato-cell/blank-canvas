// "Retomar com a IA agora" (botão na conversa da Central): a IA volta para a
// conversa e escreve na hora, continuando de onde parou — inclusive as fotos,
// o vídeo e o PDF que não chegaram a sair. Regras em _shared/ai-resume.ts.
import { createClient } from "npm:@supabase/supabase-js@2";
import { checkCompanyAccess } from "../_shared/company-access.ts";
import { RESUME_TRIGGER_TEXT, resumeTooSoon } from "../_shared/ai-resume.ts";
import { AI_ACTOR, AI_ACTOR_HEADER } from "../wapi-webhook/ai-db-guard.ts";
import { maybeHandleWithAiAgent } from "../wapi-webhook/ai-agent.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

function waitUntil(promise: Promise<unknown>): void {
  const runtime = (globalThis as Record<string, unknown>).EdgeRuntime as { waitUntil?: (p: Promise<unknown>) => void } | undefined;
  if (runtime?.waitUntil) runtime.waitUntil(promise);
  else promise.catch((err) => console.error("[ai-resume] erro em segundo plano:", err));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
    const body = await req.json().catch(() => ({}));
    const conversationId = typeof body.conversation_id === "string" ? body.conversation_id : null;
    if (!conversationId) return json({ error: "conversation_id é obrigatório" }, 400);

    const { data: conv } = await admin
      .from("wapi_conversations")
      .select("id, remote_jid, bot_enabled, bot_step, bot_data, lead_id, created_at, contact_name, company_id, instance_id")
      .eq("id", conversationId)
      .maybeSingle();
    if (!conv) return json({ error: "Conversa não encontrada" }, 404);

    const access = await checkCompanyAccess(admin, req, conv.company_id);
    if (!access.ok) return json({ error: access.error }, access.status);

    const bd = (conv.bot_data || {}) as Record<string, unknown>;
    if (bd.ai_agent !== "on") return json({ error: "A IA não atendia esta conversa" }, 400);
    if (String(conv.remote_jid || "").endsWith("@g.us")) return json({ error: "Grupo não é atendido pela IA" }, 400);
    if (resumeTooSoon(bd.ai_resumed_at, Date.now())) return json({ error: "A IA já está retomando esta conversa" }, 409);

    const { data: instance } = await admin
      .from("wapi_instances")
      .select("id, instance_id, instance_token, unit, company_id, provider")
      .eq("id", conv.instance_id)
      .maybeSingle();
    if (!instance) return json({ error: "Número não encontrado" }, 404);

    // Marca já (antes de rodar) para barrar o clique duplo
    const resumedAt = new Date().toISOString();
    await admin.from("wapi_conversations").update({ bot_data: { ...bd, ai_resumed_at: resumedAt } }).eq("id", conv.id);
    const agentConv = { ...conv, bot_data: { ...bd, ai_resumed_at: resumedAt } };

    const { data: botSettings } = await admin.from("wapi_bot_settings").select("*").eq("instance_id", instance.id).maybeSingle();
    const aiDb = createClient(url, serviceKey, {
      global: { headers: { [AI_ACTOR_HEADER]: AI_ACTOR } },
      auth: { persistSession: false },
    });
    const phone = String(conv.remote_jid || "").replace("@s.whatsapp.net", "").replace("@c.us", "");

    // A resposta (com fotos, vídeo e PDF) pode levar mais de um minuto: segue em segundo plano
    waitUntil((async () => {
      const handled = await maybeHandleWithAiAgent(
        aiDb, instance, agentConv, RESUME_TRIGGER_TEXT, phone, conv.contact_name || null, botSettings, undefined, null, { resume: true },
      );
      console.log(`[ai-resume] conv ${conv.id}: ${handled ? "IA retomou" : "IA não retomou (desligada, modo de teste ou outra regra)"}`);
    })());

    return json({ ok: true });
  } catch (err) {
    console.error("[ai-resume] erro:", err);
    return json({ error: err instanceof Error ? err.message : String(err) }, 500);
  }
});
