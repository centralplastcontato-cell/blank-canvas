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
  if (body.accept_terms !== true) return json({ error: "Aceite os Termos de Uso e a Política de Privacidade para continuar." }, 400);
  const termsVersion = String(body.terms_version || "").slice(0, 20);

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
        signup: { status: "cadastro", source: "site", created_at: new Date().toISOString(), owner_user_id: userId, unit: unitName,
          terms_accepted_at: new Date().toISOString(), terms_version: termsVersion },
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
  if (status !== "cadastro" && status !== "aguardando_aprovacao") return json({ ok: true, status });
  const firstTime = status === "cadastro";
  if (firstTime) {
    await patchSignup(supabase, companyId, { status: "aguardando_aprovacao", submitted_at: new Date().toISOString() });
    // O cartão do Hub mostra "Onboarding completo"
    await supabase.from("company_onboarding").update({ status: "completo" }).eq("company_id", companyId);
  }

  // WhatsApp já conectado: o buffet entra no ar sozinho (sem esperar a Celebrei).
  // Sem número ainda: fica esperando; chamar de novo depois de conectar liga.
  const inst = await signupInstance(supabase, companyId);
  const { count: busy } = await supabase.from("company_events").select("id", { count: "exact", head: true }).eq("company_id", companyId);
  if (inst && inst.status === "connected") {
    const err = await activateSignup(supabase, companyId, inst, null);
    if (err) return json({ error: err }, 500);
    await sendOwnerAlert(supabase, `🚀 *Celebrei — buffet no ar*\n\n*${company.name}* terminou o passo a passo e conectou o WhatsApp. A IA já foi ligada sozinha (${busy ?? 0} data(s) ocupada(s) na agenda).\n\n👉 Vale dar uma olhada em Hub → Empresas.`);
    await notifyCelebreiAdmins(supabase, { type: "self_signup_live", title: "Buffet no ar", message: `${company.name} terminou o passo a passo, conectou o WhatsApp e a IA foi ligada.`, company_id: companyId, data: { company_id: companyId } });
    return json({ ok: true, status: "aprovado", whatsapp_connected: true });
  }
  if (firstTime) {
    await sendOwnerAlert(supabase, `✅ *Celebrei — cadastro concluído*\n\n*${company.name}* terminou o passo a passo (IA respondida, ${busy ?? 0} data(s) ocupada(s) na agenda), mas ainda não conectou o WhatsApp. A IA liga sozinha quando ele conectar.`);
    await notifyCelebreiAdmins(supabase, { type: "self_signup_ready", title: "Cadastro concluído sem WhatsApp", message: `${company.name} terminou o passo a passo. A IA liga sozinha quando ele conectar o WhatsApp.`, company_id: companyId, data: { company_id: companyId } });
  }
  return json({ ok: true, status: "aguardando_aprovacao" });
}

const MONTH_NAMES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

/** Próximos 12 meses no formato do site ("Novembro/26"); igual a upcomingMonthOptions do site */
function upcomingMonthOptions(now: Date): string[] {
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const start = now.getDate() >= lastDay ? 1 : 0;
  return Array.from({ length: 12 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() + start + i, 1);
    return `${MONTH_NAMES[d.getMonth()]}/${String(d.getFullYear()).slice(-2)}`;
  });
}

// ─── Valores (passo a passo) ────────────────────────────────────────────────
// Tabela que a IA usa para responder preço (consultar_valor_pacote):
// company_packages + package_price_tiers, colunas Seg a Qui / Sexta / Sáb e Dom
// (feriado cai no valor do dia da semana).

const SIGNUP_DAY_TYPES = [
  { key: "seg_qui", label: "Seg a Qui" },
  { key: "sexta", label: "Sexta" },
  { key: "sab_dom", label: "Sáb e Dom" },
];
const DAY_KEYS = SIGNUP_DAY_TYPES.map((d) => d.key);

async function ownerOfSignup(supabase: SB, req: Request, companyId: string): Promise<Response | Json> {
  const userId = await userFromJwt(supabase, req);
  if (!userId) return json({ error: "Faça login de novo." }, 401);
  const { data: link } = await supabase.from("user_companies").select("role").eq("user_id", userId).eq("company_id", companyId).maybeSingle();
  if (!link || (link.role !== "owner" && link.role !== "admin")) return json({ error: "Só o dono do buffet pode mexer nos valores." }, 403);
  const { data: company } = await supabase.from("companies").select("settings").eq("id", companyId).maybeSingle();
  if (!company || !(company.settings as Json)?.signup) return json({ error: "Disponível só para buffets do cadastro pelo site." }, 400);
  return company.settings as Json;
}

async function pricesLoad(supabase: SB, req: Request, body: Json): Promise<Response> {
  const companyId = String(body.company_id || "");
  const settings = await ownerOfSignup(supabase, req, companyId);
  if (settings instanceof Response) return settings;
  const [{ data: pkgs }, { data: tiers }] = await Promise.all([
    supabase.from("company_packages").select("id, name").eq("company_id", companyId).eq("is_active", true).order("sort_order"),
    supabase.from("package_price_tiers").select("package_id, guest_count, day_type, price").eq("company_id", companyId),
  ]);
  return json({
    guest_tiers: Array.isArray(settings.guest_tiers) ? settings.guest_tiers : null,
    packages: ((pkgs || []) as Json[]).map((p) => ({
      id: p.id, name: p.name,
      prices: Object.fromEntries(((tiers || []) as Json[]).filter((t) => t.package_id === p.id && DAY_KEYS.includes(t.day_type))
        .map((t) => [`${t.guest_count}_${t.day_type}`, Number(t.price)])),
    })),
  });
}

async function pricesSave(supabase: SB, req: Request, body: Json): Promise<Response> {
  const companyId = String(body.company_id || "");
  const settings = await ownerOfSignup(supabase, req, companyId);
  if (settings instanceof Response) return settings;

  const tiers = Array.from(new Set(((body.guest_tiers || []) as unknown[]).map((n) => Math.round(Number(n)))))
    .filter((n) => n >= 5 && n <= 3000).sort((a, b) => a - b).slice(0, 12);
  const packages = ((body.packages || []) as Json[]).slice(0, 4)
    .map((p) => ({ id: typeof p.id === "string" ? p.id : null, name: String(p.name || "").trim().slice(0, 60), prices: (p.prices || {}) as Json }))
    .filter((p) => p.name);
  if (!tiers.length) return json({ error: "Coloque pelo menos uma faixa de convidados." }, 400);
  if (!packages.length) return json({ error: "Dê um nome para o pacote." }, 400);

  // Grade do buffet: faixas e as 3 colunas de dia
  const { error: sErr } = await supabase.from("companies")
    .update({ settings: { ...settings, guest_tiers: tiers, day_type_config: SIGNUP_DAY_TYPES } }).eq("id", companyId);
  if (sErr) return json({ error: `Não consegui salvar (${sErr.message}).` }, 500);

  const { data: existing } = await supabase.from("company_packages").select("id").eq("company_id", companyId);
  const mine = new Set(((existing || []) as Json[]).map((p) => p.id));
  const keep: string[] = [];
  for (let i = 0; i < packages.length; i++) {
    const p = packages[i];
    let id = p.id && mine.has(p.id) ? p.id : null;
    if (id) {
      await supabase.from("company_packages").update({ name: p.name, sort_order: i, is_active: true }).eq("id", id);
    } else {
      const { data: created, error } = await supabase.from("company_packages")
        .insert({ company_id: companyId, name: p.name, sort_order: i, is_active: true }).select("id").single();
      if (error) return json({ error: `Não consegui criar o pacote (${error.message}).` }, 500);
      id = created.id as string;
    }
    keep.push(id as string);
    await supabase.from("package_price_tiers").delete().eq("package_id", id);
    const rows = tiers.flatMap((g) => DAY_KEYS.map((d) => ({ g, d, v: Number(p.prices[`${g}_${d}`]) })))
      .filter((r) => r.v > 0 && r.v < 1_000_000)
      .map((r) => ({ company_id: companyId, package_id: id, guest_count: r.g, day_type: r.d, price: Math.round(r.v * 100) / 100 }));
    if (rows.length) {
      const { error } = await supabase.from("package_price_tiers").insert(rows);
      if (error) return json({ error: `Não consegui salvar os valores (${error.message}).` }, 500);
    }
  }
  // Pacotes tirados da lista deixam de valer para a IA
  const removed = [...mine].filter((id) => !keep.includes(id as string));
  if (removed.length) await supabase.from("company_packages").update({ is_active: false }).in("id", removed);
  return json({ ok: true, packages: keep });
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

  const inst = await signupInstance(supabase, companyId);
  if (!inst) return json({ error: "O buffet ainda não conectou o WhatsApp (ele conecta no fim do cadastro ou em Minha IA; a equipe também pode cadastrar em Hub → WhatsApp). Depois aprove." }, 400);
  const err = await activateSignup(supabase, companyId, inst, userId);
  if (err) return json({ error: err }, 500);
  return json({ ok: true, whatsapp_connected: inst.status === "connected" });
}

/** Número do buffet (a IA responde no número cuja unidade é a mesma da configuração dela) */
async function signupInstance(supabase: SB, companyId: string): Promise<Json | null> {
  const { data: insts } = await supabase.from("wapi_instances").select("unit, status").eq("company_id", companyId).eq("is_active", true);
  return ((insts || []) as Json[]).find((i) => i.unit) || null;
}

/**
 * Liga o buffet: módulos, materiais e site no número conectado e a IA ligada.
 * approvedBy null = ligado sozinho no fim do cadastro (número já conectado).
 * Devolve o erro, ou null.
 */
async function activateSignup(supabase: SB, companyId: string, inst: Json, approvedBy: string | null): Promise<string | null> {
  await supabase.from("company_onboarding").update({ status: "completo" }).eq("company_id", companyId);
  await patchSignup(supabase, companyId, { status: "aprovado", approved_at: new Date().toISOString(), approved_by: approvedBy || "automatico" }, (s) => ({
    ...s,
    enabled_modules: { ...(s.enabled_modules || {}), ...SIGNUP_MODULES, ia_conversacional: true },
  }));
  // A IA procura fotos, vídeo e PDF pela unidade do número: os enviados no cadastro passam para ela
  await supabase.from("sales_materials").update({ unit: inst.unit }).eq("company_id", companyId).neq("unit", inst.unit);
  // Site: o contato que vem pelas perguntas do site vai para o número conectado
  // Meses com ano (Novembro/26...) e troca automática todo mês, como no Castelo
  await supabase.from("lp_bot_settings").upsert(
    { company_id: companyId, month_options: upcomingMonthOptions(new Date()), auto_rotate_months: true },
    { onConflict: "company_id", ignoreDuplicates: true },
  );
  const { error: aiErr } = await supabase.from("ai_agent_settings")
    .update({ enabled: true, unit: inst.unit, activated_at: new Date().toISOString() }).eq("company_id", companyId);
  if (aiErr) return `Aprovado, mas não consegui ligar a IA (${aiErr.message}). Ligue em Configurar IA.`;

  const { data: users } = await supabase.from("user_companies").select("user_id").eq("company_id", companyId);
  if (users && users.length) {
    await supabase.from("notifications").insert((users as Json[]).map((u) => ({
      user_id: u.user_id, company_id: companyId, type: "self_signup_approved",
      title: "🎉 Seu buffet está no ar!",
      message: inst.status === "connected" ? "A IA já está atendendo o seu WhatsApp." : "Falta conectar o WhatsApp em Configurações → Minha IA para a IA começar a atender.",
      data: { company_id: companyId },
    })));
  }
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  try {
    const body = await req.json().catch(() => ({}));
    if (body.action === "signup") return await signup(supabase, req, body);
    if (body.action === "finish") return await finish(supabase, req, body);
    if (body.action === "approve") return await approve(supabase, req, body);
    if (body.action === "prices-load") return await pricesLoad(supabase, req, body);
    if (body.action === "prices-save") return await pricesSave(supabase, req, body);
    return json({ error: "Ação desconhecida." }, 400);
  } catch (e) {
    console.error("[self-signup] erro:", e);
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
