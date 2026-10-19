// "Conectar meu WhatsApp" dos buffets do cadastro pelo site (Evolution Go).
// Ações (dono do buffet ou admin da Celebrei):
//   state  — situação do número (sem chamar a Evolution)
//   start  — cria a instância "celebrei-*" (chave global) e liga o cliente
//   qr     — QR Code atual (token da própria instância) + confere se pareou
//   pair   — código de 8 letras para quem está no celular do buffet
//   check  — só confere se pareou (pelos eventos, sem chamar a Evolution)
//   cancel — desistiu: apaga a instância que não pareou
//   remove — só admin da Celebrei: desconecta e apaga o número (ex.: teste)
import { createClient } from "npm:@supabase/supabase-js@2";
import { evolutionRequest, EVOLUTION_WEBHOOK_EVENTS } from "../_shared/evolution.ts";
import { createManagedInstance, deleteManagedInstance, EvolutionAdminError, managedNameFor } from "../_shared/evolution-admin.ts";
import { PENDING_SELECT, type ProvisionRow, settle } from "../_shared/whatsapp-provision.ts";

// deno-lint-ignore no-explicit-any
type SB = any;
// deno-lint-ignore no-explicit-any
type Json = Record<string, any>;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const webhookUrl = () => `${Deno.env.get("SUPABASE_URL")}/functions/v1/wapi-webhook`;
const SUBSCRIBE = [...EVOLUTION_WEBHOOK_EVENTS, "QRCODE"];

async function authorize(supabase: SB, req: Request, companyId: string): Promise<{ userId: string; isAdmin: boolean } | Response> {
  const jwt = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
  const { data: { user } } = jwt ? await supabase.auth.getUser(jwt) : { data: { user: null } };
  if (!user) return json({ error: "Faça login de novo." }, 401);
  const { data: isAdmin } = await supabase.rpc("is_admin", { _user_id: user.id });
  if (isAdmin === true) return { userId: user.id, isAdmin: true };
  const { data: link } = await supabase.from("user_companies").select("role").eq("user_id", user.id).eq("company_id", companyId).maybeSingle();
  if (!link || (link.role !== "owner" && link.role !== "admin")) return json({ error: "Só o dono do buffet pode conectar o WhatsApp." }, 403);
  return { userId: user.id, isAdmin: false };
}

async function managedRow(supabase: SB, companyId: string): Promise<(ProvisionRow & { phone_number: string | null; instance_token: string }) | null> {
  const { data } = await supabase.from("wapi_instances").select(`${PENDING_SELECT}, phone_number, instance_token`)
    .eq("company_id", companyId).eq("managed_by_celebrei", true).limit(1);
  return (data && data[0]) || null;
}

function view(row: { status: string | null; is_active: boolean; phone_number?: string | null } | null) {
  if (!row) return { status: "none" };
  if (row.is_active && row.status !== "not_connected" && row.status !== "pending_qr") return { status: "connected", phone: row.phone_number || null };
  if (row.status === "pending_qr") return { status: "pending" };
  return { status: "none" };
}

async function start(supabase: SB, companyId: string, userId: string): Promise<Response> {
  const existing = await managedRow(supabase, companyId);
  if (existing && view(existing).status !== "none") return json(view(existing));
  // Buffet que já tem número próprio (cadastrado pela equipe) não ganha outro
  const { data: others } = await supabase.from("wapi_instances").select("id").eq("company_id", companyId).eq("is_active", true).eq("managed_by_celebrei", false).limit(1);
  if (others && others.length) return json({ error: "Este buffet já tem um número de WhatsApp conectado." }, 400);
  const { data: company } = await supabase.from("companies").select("name, slug, settings").eq("id", companyId).maybeSingle();
  if (!company) return json({ error: "Empresa não encontrada." }, 404);
  const signup = ((company.settings || {}) as Json).signup as Json | undefined;
  if (!signup) return json({ error: "A conexão automática é só para buffets do cadastro pelo site. Fale com a equipe Celebrei." }, 400);

  const name = managedNameFor(company.slug || company.name);
  const token = `${crypto.randomUUID()}${crypto.randomUUID()}`.replace(/-/g, "");
  const instanceId = await createManagedInstance(name, token);
  const now = new Date().toISOString();
  const fields = {
    instance_id: instanceId, instance_token: token, evolution_name: name, managed_by_celebrei: true, provider: "evolution",
    is_active: false, status: "pending_qr", phone_number: null, connected_at: null, updated_at: now,
    unit: String(signup.unit || company.name).slice(0, 40),
  };
  const { error } = existing
    ? await supabase.from("wapi_instances").update(fields).eq("id", existing.id)
    : await supabase.from("wapi_instances").insert({ ...fields, company_id: companyId, user_id: signup.owner_user_id || userId });
  const row = await managedRow(supabase, companyId);
  if (error || !row) {
    console.error("[whatsapp-connect] não salvei o registro:", error?.message);
    // Sem registro não há como apagar pela regra: avisa para a equipe resolver
    return json({ error: `Não consegui salvar o número (${error?.message || "sem registro"}). Avise a equipe Celebrei.` }, 500);
  }
  const conn = await evolutionRequest(token, "/instance/connect", "POST", { webhookUrl: webhookUrl(), subscribe: SUBSCRIBE, immediate: true }, 30000);
  if (!conn.ok) {
    console.error(`[whatsapp-connect] ${name}: connect falhou:`, conn.error);
    await settle(supabase, row, { force: true }).catch((e) => console.error("[whatsapp-connect] limpeza:", e));
    return json({ error: "O servidor do WhatsApp não respondeu. Tente de novo em alguns minutos." }, 502);
  }
  console.log(`[whatsapp-connect] ${name} criada para ${companyId}, esperando QR`);
  return json({ status: "pending" });
}

async function pending(supabase: SB, companyId: string): Promise<ProvisionRow & { instance_token: string } | Response> {
  const row = await managedRow(supabase, companyId);
  if (!row) return json({ status: "none" });
  if (row.status !== "pending_qr") return json(view(row));
  const s = await settle(supabase, row);
  if (s === "connected") return json(view(await managedRow(supabase, companyId)));
  if (s === "expired") return json({ status: "expired" });
  return row;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  try {
    const body = await req.json().catch(() => ({}));
    const companyId = String(body.company_id || "");
    if (!companyId) return json({ error: "Empresa não informada." }, 400);
    const auth = await authorize(supabase, req, companyId);
    if (auth instanceof Response) return auth;

    switch (body.action) {
      case "state":
        return json(view(await managedRow(supabase, companyId)));
      case "start":
        return await start(supabase, companyId, auth.userId);
      case "check": {
        const row = await pending(supabase, companyId);
        return row instanceof Response ? row : json({ status: "pending" });
      }
      case "qr": {
        const row = await pending(supabase, companyId);
        if (row instanceof Response) return row;
        const r = await evolutionRequest(row.instance_token, "/instance/qr", "GET", undefined, 15000);
        const qr = String(((r.data as Json)?.data as Json)?.qrcode || "");
        return json({ status: "pending", qrcode: qr.startsWith("data:image") ? qr : null });
      }
      case "pair": {
        const phone = String(body.phone || "").replace(/\D/g, "");
        const full = phone.startsWith("55") ? phone : `55${phone}`;
        if (full.length < 12 || full.length > 13) return json({ error: "Confira o número com DDD." }, 400);
        const row = await pending(supabase, companyId);
        if (row instanceof Response) return row;
        const r = await evolutionRequest(row.instance_token, "/instance/pair", "POST", { phone: full, subscribe: SUBSCRIBE }, 30000);
        const code = String(((r.data as Json)?.data as Json)?.PairingCode || "");
        if (!r.ok || !code) return json({ error: "Não consegui gerar o código. Tente de novo ou use o QR Code." }, 502);
        return json({ status: "pending", code });
      }
      case "cancel": {
        const row = await managedRow(supabase, companyId);
        if (!row || row.status !== "pending_qr") return json(view(row));
        const s = await settle(supabase, row, { force: true });
        return json(s === "connected" ? view(await managedRow(supabase, companyId)) : { status: "none" });
      }
      case "remove": {
        if (!auth.isAdmin) return json({ error: "Só a equipe Celebrei pode remover o número." }, 403);
        const row = await managedRow(supabase, companyId);
        if (!row) return json({ status: "none" });
        // Desliga antes: o "LoggedOut" que vem do logout não vira alerta de queda
        await supabase.from("wapi_instances").update({ is_active: false, status: "not_connected" }).eq("id", row.id);
        await deleteManagedInstance(row, { allowPaired: true, instanceToken: row.instance_token });
        console.log(`[whatsapp-connect] ${row.evolution_name} removida por admin (${auth.userId})`);
        return json({ status: "none" });
      }
      default:
        return json({ error: "Ação desconhecida." }, 400);
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[whatsapp-connect] erro:", msg);
    if (e instanceof EvolutionAdminError && /limite/.test(msg)) {
      const { data: admins } = await supabase.from("user_roles").select("user_id").eq("role", "admin");
      const ids = [...new Set(((admins || []) as Json[]).map((a) => a.user_id))];
      if (ids.length) {
        await supabase.from("notifications").insert(ids.map((user_id) => ({
          user_id, type: "self_signup_whatsapp", title: "⚠️ Sem vaga na Evolution para novo buffet",
          message: `Um buffet tentou conectar o WhatsApp, mas o servidor da Evolution chegou ao limite de números (${msg}).`, data: {},
        })));
      }
      return json({ error: "No momento não há vaga para conectar novos números. A equipe Celebrei já foi avisada e conecta para você." }, 503);
    }
    return json({ error: e instanceof EvolutionAdminError ? `Não consegui preparar o WhatsApp (${msg}).` : msg }, 500);
  }
});
