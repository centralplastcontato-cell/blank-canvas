// Cadastro automático de buffet novo (setup simplificado, só IA).
//   - signup (público): cria a conta do dono, a empresa e o cadastro; avisa a Celebrei
//   - finish (dono): terminou o passo a passo → fica aguardando aprovação; avisa a Celebrei
//   - approve (admin da Celebrei): libera a IA da empresa
// Nada aqui cria número de WhatsApp: a Celebrei conecta o número na aprovação.
import { createClient } from "npm:@supabase/supabase-js@2";
import { notifyCelebreiAdmins, sendOwnerAlert } from "../_shared/owner-alert.ts";

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

// Mesmos subdomínios reservados do site automático (src/lib/siteBuilder.ts)
const RESERVED = new Set(["www", "evolution", "evolution-go", "api", "app", "admin", "hub", "teste", "mail", "email", "smtp", "ftp", "ns1", "ns2"]);

// Até 5 cadastros por hora por IP (proteção simples contra robô)
const attempts = new Map<string, number[]>();
function rateLimited(ip: string): boolean {
  const now = Date.now();
  const list = (attempts.get(ip) || []).filter((t) => now - t < 3600_000);
  if (list.length >= 5) return true;
  list.push(now);
  attempts.set(ip, list);
  return false;
}

export function slugify(name: string): string {
  return name.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40).replace(/-+$/g, "") || "buffet";
}

async function uniqueSlug(supabase: SB, name: string): Promise<string> {
  const base = slugify(name);
  for (let i = 1; i < 50; i++) {
    const slug = i === 1 ? base : `${base}-${i}`;
    if (RESERVED.has(slug)) continue;
    const { data } = await supabase.from("companies").select("id").eq("slug", slug).limit(1);
    if (!data || data.length === 0) return slug;
  }
  return `${base}-${crypto.randomUUID().slice(0, 6)}`;
}

/** Módulos que o buffet do cadastro automático já ganha (a IA só liga na aprovação) */
const SIGNUP_MODULES = { agenda: true, onboarding_checklist: true };

const onlyDigits = (v: unknown) => String(v || "").replace(/\D/g, "");

async function userFromJwt(supabase: SB, req: Request): Promise<string | null> {
  const jwt = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
  if (!jwt) return null;
  const { data: { user } } = await supabase.auth.getUser(jwt);
  return user?.id ?? null;
}

async function patchSignup(supabase: SB, companyId: string, patch: Json, extra: (settings: Json) => Json = (s) => s): Promise<Json> {
  const { data: c } = await supabase.from("companies").select("settings").eq("id", companyId).maybeSingle();
  const settings = (c?.settings || {}) as Json;
  const next = extra({ ...settings, signup: { ...(settings.signup || {}), ...patch } });
  const { error } = await supabase.from("companies").update({ settings: next }).eq("id", companyId);
  if (error) throw new Error(error.message);
  return next;
}

// ─── Cadastro ───────────────────────────────────────────────────────────────

async function signup(supabase: SB, req: Request, body: Json): Promise<Response> {
  const ip = (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() || "?";
  if (rateLimited(ip)) return json({ error: "Muitas tentativas. Tente de novo daqui a uma hora." }, 429);
  // Campo escondido do formulário: robô preenche, pessoa não
  if (body.website) return json({ error: "Cadastro inválido." }, 400);

  const buffetName = String(body.buffet_name || "").trim().slice(0, 80);
  const ownerName = String(body.owner_name || "").trim().slice(0, 80);
  const email = String(body.email || "").trim().toLowerCase();
  const password = String(body.password || "");
  const whatsapp = onlyDigits(body.whatsapp);
  const city = String(body.city || "").trim().slice(0, 60);
  const state = String(body.state || "").trim().toUpperCase().slice(0, 2);
  if (buffetName.length < 3) return json({ error: "Escreva o nome do buffet." }, 400);
  if (ownerName.length < 3) return json({ error: "Escreva o seu nome." }, 400);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return json({ error: "E-mail inválido." }, 400);
  if (password.length < 8) return json({ error: "A senha precisa ter pelo menos 8 caracteres." }, 400);
  if (whatsapp.length < 10 || whatsapp.length > 13) return json({ error: "WhatsApp inválido. Use DDD + número." }, 400);
  if (!city) return json({ error: "Escreva a cidade do buffet." }, 400);

  const { data: created, error: userErr } = await supabase.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { full_name: ownerName } });
  if (userErr || !created?.user) {
    const msg = String(userErr?.message || "");
    if (/already|registered|exists/i.test(msg)) return json({ error: "Já existe uma conta com esse e-mail. Entre com ela ou use outro e-mail." }, 409);
    return json({ error: `Não consegui criar a conta (${msg}).` }, 400);
  }
  const userId = created.user.id;
  let companyId: string | null = null;
  try {
    const slug = await uniqueSlug(supabase, buffetName);
    // Mesma regra do Hub ao criar empresa: filha da empresa principal
    const { data: roots } = await supabase.from("companies").select("id, name").is("parent_id", null).order("name").limit(1);
    const unitName = buffetName.slice(0, 40);
    const { data: company, error: cErr } = await supabase.from("companies").insert({
      name: buffetName,
      slug,
      is_active: true,
      parent_id: roots?.[0]?.id ?? null,
      settings: {
        signup: { status: "cadastro", source: "site", created_at: new Date().toISOString(), owner_user_id: userId, unit: unitName },
        // Agenda já ligada: é onde o dono vê as datas ocupadas, as festas e as visitas que a IA marcar
        enabled_modules: { ...SIGNUP_MODULES },
      },
    }).select("id").single();
    if (cErr) throw new Error(cErr.message);
    companyId = company.id as string;

    const steps = await Promise.all([
      supabase.from("profiles").insert({ user_id: userId, email, full_name: ownerName, is_active: true }),
      supabase.from("user_roles").insert({ user_id: userId, role: "gestor" }),
      supabase.from("user_companies").insert({ user_id: userId, company_id: companyId, role: "owner", is_default: true }),
      supabase.from("company_units").insert({ company_id: companyId, name: unitName, slug: slugify(unitName), sort_order: 1, is_active: true, color: "#7C3AED" }),
      supabase.from("company_onboarding").insert({
        id: crypto.randomUUID(), company_id: companyId, buffet_name: buffetName, contact_name: ownerName, contact_email: email,
        contact_phone: whatsapp, city, state: state || null, whatsapp_numbers: [whatsapp], status: "em_andamento", current_step: 1,
      }),
    ]);
    const failed = steps.find((s: { error: unknown }) => s.error);
    if (failed) throw new Error((failed.error as { message: string }).message);
  } catch (e) {
    // Desfaz o que deu para criar (a conta sem empresa não serve para nada)
    if (companyId) {
      await supabase.from("user_companies").delete().eq("company_id", companyId);
      await supabase.from("company_units").delete().eq("company_id", companyId);
      await supabase.from("company_onboarding").delete().eq("company_id", companyId);
      await supabase.from("companies").delete().eq("id", companyId);
    }
    await supabase.from("user_roles").delete().eq("user_id", userId);
    await supabase.from("profiles").delete().eq("user_id", userId);
    await supabase.auth.admin.deleteUser(userId);
    console.error("[self-signup] falhou:", e);
    return json({ error: "Não consegui terminar o cadastro. Tente de novo em instantes." }, 500);
  }

  const where = [city, state].filter(Boolean).join("/");
  await sendOwnerAlert(supabase, `🎉 *Celebrei — novo cadastro*\n\n*${buffetName}* (${where}) acabou de criar a conta.\nResponsável: ${ownerName} — WhatsApp ${whatsapp} — ${email}\n\nEle segue agora o passo a passo (IA, datas ocupadas e site). Aviso de novo quando terminar.`);
  await notifyCelebreiAdmins(supabase, { type: "self_signup", title: "Novo cadastro de buffet", message: `${buffetName} (${where}) criou a conta e está fazendo o passo a passo.`, company_id: companyId, data: { company_id: companyId } });
  return json({ ok: true, company_id: companyId });
}

// ─── Terminou o passo a passo ───────────────────────────────────────────────

async function finish(supabase: SB, req: Request, body: Json): Promise<Response> {
  const userId = await userFromJwt(supabase, req);
  if (!userId) return json({ error: "Faça login de novo." }, 401);
  const companyId = String(body.company_id || "");
  const { data: link } = await supabase.from("user_companies").select("role").eq("user_id", userId).eq("company_id", companyId).maybeSingle();
  if (!link || (link.role !== "owner" && link.role !== "admin")) return json({ error: "Só o dono do buffet pode concluir o cadastro." }, 403);
  if (body.agenda_ok !== true) return json({ error: "Confirme que a agenda está atualizada." }, 400);
  const { data: ai } = await supabase.from("ai_agent_settings").select("id").eq("company_id", companyId).maybeSingle();
  if (!ai) return json({ error: "Falta responder as perguntas da IA." }, 400);

  const { data: company } = await supabase.from("companies").select("name, slug, settings").eq("id", companyId).maybeSingle();
  if (!company) return json({ error: "Empresa não encontrada." }, 404);
  const status = (company.settings as Json)?.signup?.status;
  if (status !== "cadastro") return json({ ok: true, status });
  await patchSignup(supabase, companyId, { status: "aguardando_aprovacao", submitted_at: new Date().toISOString() });

  const { count: busy } = await supabase.from("company_events").select("id", { count: "exact", head: true }).eq("company_id", companyId);
  await sendOwnerAlert(supabase, `✅ *Celebrei — cadastro pronto para aprovar*\n\n*${company.name}* terminou o passo a passo (IA respondida, ${busy ?? 0} data(s) ocupada(s) na agenda).\n\n👉 Hub → Empresas: conecte o número de WhatsApp dele e clique em *Aprovar e ligar a IA*.`);
  await notifyCelebreiAdmins(supabase, { type: "self_signup_ready", title: "Cadastro pronto para aprovar", message: `${company.name} terminou o passo a passo. Conecte o WhatsApp e aprove no Hub.`, company_id: companyId, data: { company_id: companyId } });
  return json({ ok: true, status: "aguardando_aprovacao" });
}

// ─── Aprovação (Celebrei) ───────────────────────────────────────────────────

async function approve(supabase: SB, req: Request, body: Json): Promise<Response> {
  const userId = await userFromJwt(supabase, req);
  if (!userId) return json({ error: "Faça login de novo." }, 401);
  const { data: isAdmin } = await supabase.rpc("is_admin", { _user_id: userId });
  if (isAdmin !== true) return json({ error: "Só a Celebrei aprova cadastros." }, 403);
  const companyId = String(body.company_id || "");
  const { data: company } = await supabase.from("companies").select("name").eq("id", companyId).maybeSingle();
  if (!company) return json({ error: "Empresa não encontrada." }, 404);

  // A IA responde no número cuja unidade é a mesma da configuração dela
  const { data: insts } = await supabase.from("wapi_instances").select("unit, status").eq("company_id", companyId).eq("is_active", true);
  const inst = ((insts || []) as Json[]).find((i) => i.unit);
  if (!inst) return json({ error: "Conecte primeiro o número de WhatsApp do buffet (Hub → WhatsApp) e depois aprove." }, 400);

  await patchSignup(supabase, companyId, { status: "aprovado", approved_at: new Date().toISOString(), approved_by: userId }, (s) => ({
    ...s,
    enabled_modules: { ...(s.enabled_modules || {}), ...SIGNUP_MODULES, ia_conversacional: true },
  }));
  const { error: aiErr } = await supabase.from("ai_agent_settings")
    .update({ enabled: true, unit: inst.unit, activated_at: new Date().toISOString() }).eq("company_id", companyId);
  if (aiErr) return json({ error: `Aprovado, mas não consegui ligar a IA (${aiErr.message}). Ligue em Configurar IA.` }, 500);

  const { data: users } = await supabase.from("user_companies").select("user_id").eq("company_id", companyId);
  if (users && users.length) {
    await supabase.from("notifications").insert((users as Json[]).map((u) => ({
      user_id: u.user_id, company_id: companyId, type: "self_signup_approved",
      title: "🎉 Seu buffet está no ar!",
      message: inst.status === "connected" ? "A IA já está atendendo o seu WhatsApp." : "Falta ler o QR Code do WhatsApp em Configurações → Conexão para a IA começar a atender.",
      data: { company_id: companyId },
    })));
  }
  return json({ ok: true, whatsapp_connected: inst.status === "connected" });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  try {
    const body = await req.json().catch(() => ({}));
    if (body.action === "signup") return await signup(supabase, req, body);
    if (body.action === "finish") return await finish(supabase, req, body);
    if (body.action === "approve") return await approve(supabase, req, body);
    return json({ error: "Ação desconhecida." }, 400);
  } catch (e) {
    console.error("[self-signup] erro:", e);
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
