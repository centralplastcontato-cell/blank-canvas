// Site automático do buffet (tela "Meu site"): o que o navegador do dono não
// pode fazer sozinho.
//   - upload-photo: guarda uma foto do site no bucket "landing-pages"
//   - publish: põe <slug>.hubcelebrei.com.br no projeto da Vercel e publica
//   - set-domain / domain-status / remove-domain: domínio próprio do buffet
// Só o dono/admin da empresa (ou admin da Celebrei). A chave da Vercel fica no
// secret VERCEL_API_TOKEN e nunca volta para o navegador.
import { createClient } from "npm:@supabase/supabase-js@2";

// deno-lint-ignore no-explicit-any
type SB = any;
// deno-lint-ignore no-explicit-any
type Json = Record<string, any>;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SITE_BASE_DOMAIN = "hubcelebrei.com.br";
const VERCEL_API = "https://api.vercel.com";
const VERCEL_PROJECT_ID = "prj_ItkRicpP1rFkmHLb6Z2xR7ewDkfJ"; // projeto "celebrei" (Hub e sites dos buffets)
const RESERVED = new Set(["www", "evolution", "evolution-go", "api", "app", "admin", "hub", "teste", "mail", "email", "smtp", "ftp", "ns1", "ns2"]);
const MAX_PHOTO_BYTES = 4 * 1024 * 1024;
// Domínios que já são da Celebrei ou de outros buffets fixos no código
const BLOCKED_DOMAINS = [SITE_BASE_DOMAIN, "castelodadiversao.com.br", "castelodadiversao.online", "buffetmegamagic.com.br", "buffetplanetadivertido.online", "aventurakids.online", "espacocarrossel.online"];

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

function validSlug(slug: string | null | undefined): slug is string {
  return !!slug && /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(slug) && !RESERVED.has(slug);
}

function normalizeDomain(input: unknown): string | null {
  const d = String(input || "").trim().toLowerCase()
    .replace(/^https?:\/\//, "").replace(/\/.*$/, "").replace(/^www\./, "").replace(/:\d+$/, "");
  if (!/^(?=.{4,253}$)([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/.test(d)) return null;
  if (BLOCKED_DOMAINS.some((b) => d === b || d.endsWith(`.${b}`))) return null;
  return d;
}

async function vercel(path: string, init: RequestInit = {}): Promise<{ status: number; body: Json | null }> {
  const token = Deno.env.get("VERCEL_API_TOKEN");
  if (!token) return { status: 0, body: { error: { message: "VERCEL_API_TOKEN não configurado" } } };
  const res = await fetch(VERCEL_API + path, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...(init.headers || {}) },
  });
  return { status: res.status, body: await res.json().catch(() => null) };
}

/** Põe o domínio no projeto (já existir no projeto conta como ok) */
async function addVercelDomain(name: string): Promise<{ ok: boolean; error?: string }> {
  const r = await vercel(`/v10/projects/${VERCEL_PROJECT_ID}/domains`, { method: "POST", body: JSON.stringify({ name }) });
  if (r.status === 200 || r.status === 201) return { ok: true };
  const code = r.body?.error?.code;
  if (code === "domain_already_in_use" || code === "domain_already_exists") {
    // Já está neste projeto? Então tudo certo
    const cur = await vercel(`/v9/projects/${VERCEL_PROJECT_ID}/domains/${name}`);
    if (cur.status === 200) return { ok: true };
  }
  return { ok: false, error: String(r.body?.error?.message || `Vercel respondeu ${r.status}`) };
}

async function removeVercelDomain(name: string): Promise<void> {
  await vercel(`/v9/projects/${VERCEL_PROJECT_ID}/domains/${name}`, { method: "DELETE" });
}

/** Como está o DNS do domínio do buffet (o que falta o dono configurar) */
async function domainStatus(domain: string): Promise<Json> {
  const [apex, www, proj] = await Promise.all([
    vercel(`/v6/domains/${domain}/config`),
    vercel(`/v6/domains/www.${domain}/config`),
    vercel(`/v9/projects/${VERCEL_PROJECT_ID}/domains/${domain}`),
  ]);
  const apexOk = apex.status === 200 && apex.body?.misconfigured === false;
  const wwwOk = www.status === 200 && www.body?.misconfigured === false;
  return {
    domain,
    ready: apexOk && wwwOk,
    apex_ok: apexOk,
    www_ok: wwwOk,
    // Verificação de dono (quando o domínio já foi usado em outra conta da Vercel)
    verification: proj.body?.verified === false ? proj.body?.verification || null : null,
    records: [
      { type: "A", name: "@", value: "76.76.21.21", ok: apexOk },
      { type: "CNAME", name: "www", value: "cname.vercel-dns.com", ok: wwwOk },
    ],
  };
}

async function requireCompanyAdmin(supabase: SB, req: Request, companyId: string): Promise<string | Response> {
  const jwt = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
  if (!jwt) return json({ error: "Faça login de novo." }, 401);
  const { data: { user } } = await supabase.auth.getUser(jwt);
  if (!user) return json({ error: "Faça login de novo." }, 401);
  const { data: isAdmin } = await supabase.rpc("is_admin", { _user_id: user.id });
  if (isAdmin === true) return user.id;
  const { data: link } = await supabase.from("user_companies").select("role").eq("user_id", user.id).eq("company_id", companyId).maybeSingle();
  if (link && (link.role === "owner" || link.role === "admin")) return user.id;
  return json({ error: "Só o dono ou um administrador da empresa pode mexer no site." }, 403);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  try {
    const body = await req.json().catch(() => ({}));
    const action = String(body.action || "");
    const companyId = String(body.company_id || "");
    if (!/^[0-9a-f-]{36}$/i.test(companyId)) return json({ error: "Empresa inválida." }, 400);
    const auth = await requireCompanyAdmin(supabase, req, companyId);
    if (auth instanceof Response) return auth;

    const { data: company } = await supabase.from("companies").select("id, name, slug, custom_domain, domain_canonical, is_active").eq("id", companyId).maybeSingle();
    if (!company) return json({ error: "Empresa não encontrada." }, 404);

    // ── Foto do site ─────────────────────────────────────────────────────
    if (action === "upload-photo") {
      const b64 = String(body.base64 || "").replace(/^data:[^,]+,/, "");
      const type = String(body.content_type || "image/jpeg");
      if (!/^image\/(jpeg|png|webp)$/.test(type)) return json({ error: "Envie uma foto JPG, PNG ou WEBP." }, 400);
      let bytes: Uint8Array;
      try {
        bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
      } catch {
        return json({ error: "Não consegui ler a foto." }, 400);
      }
      if (bytes.length === 0 || bytes.length > MAX_PHOTO_BYTES) return json({ error: "A foto precisa ter até 4 MB." }, 400);
      const ext = type === "image/png" ? "png" : type === "image/webp" ? "webp" : "jpg";
      const path = `site/${companyId}/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from("landing-pages").upload(path, bytes, { contentType: type, upsert: false });
      if (error) return json({ error: `Não consegui guardar a foto (${error.message}).` }, 500);
      const { data } = supabase.storage.from("landing-pages").getPublicUrl(path);
      return json({ url: data.publicUrl });
    }

    // ── Publicar (endereço <slug>.hubcelebrei.com.br) ────────────────────
    if (action === "publish") {
      if (!validSlug(company.slug)) return json({ error: `O identificador da empresa ("${company.slug}") não serve como endereço. Fale com a Celebrei.` }, 400);
      const host = `${company.slug}.${SITE_BASE_DOMAIN}`;
      const add = await addVercelDomain(host);
      if (!add.ok) return json({ error: `Não consegui ativar o endereço ${host}: ${add.error}` }, 502);
      const { error } = await supabase.from("company_landing_pages").update({ is_published: true }).eq("company_id", companyId);
      if (error) return json({ error: `Não consegui publicar (${error.message}).` }, 500);
      return json({ ok: true, url: `https://${host}` });
    }

    // ── Domínio próprio ──────────────────────────────────────────────────
    if (action === "set-domain") {
      const domain = normalizeDomain(body.domain);
      if (!domain) return json({ error: "Domínio inválido. Escreva só o endereço, por exemplo: meubuffet.com.br" }, 400);
      const { data: other } = await supabase.from("companies").select("id").eq("domain_canonical", domain).neq("id", companyId).limit(1);
      if (other && other.length) return json({ error: "Esse domínio já está cadastrado em outra empresa." }, 409);
      for (const name of [domain, `www.${domain}`]) {
        const add = await addVercelDomain(name);
        if (!add.ok) return json({ error: `Não consegui cadastrar ${name}: ${add.error}` }, 502);
      }
      const prev = company.domain_canonical as string | null;
      const { error } = await supabase.from("companies").update({ custom_domain: domain, domain_canonical: domain }).eq("id", companyId);
      if (error) return json({ error: `Não consegui salvar o domínio (${error.message}).` }, 500);
      // Domínio antigo (trocou): sai da Vercel, se não for de outro buffet
      if (prev && prev !== domain && !BLOCKED_DOMAINS.includes(prev)) {
        await removeVercelDomain(prev);
        await removeVercelDomain(`www.${prev}`);
      }
      return json(await domainStatus(domain));
    }

    if (action === "domain-status") {
      const domain = company.domain_canonical as string | null;
      if (!domain) return json({ domain: null });
      return json(await domainStatus(domain));
    }

    if (action === "remove-domain") {
      const domain = company.domain_canonical as string | null;
      if (domain && BLOCKED_DOMAINS.includes(domain)) return json({ error: "Esse domínio é configurado pela Celebrei. Fale com a gente para trocar." }, 400);
      if (domain) {
        await removeVercelDomain(domain);
        await removeVercelDomain(`www.${domain}`);
      }
      const { error } = await supabase.from("companies").update({ custom_domain: null, domain_canonical: null }).eq("id", companyId);
      if (error) return json({ error: `Não consegui remover o domínio (${error.message}).` }, 500);
      return json({ ok: true });
    }

    return json({ error: "Ação desconhecida." }, 400);
  } catch (e) {
    console.error("[site-builder] erro:", e);
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
