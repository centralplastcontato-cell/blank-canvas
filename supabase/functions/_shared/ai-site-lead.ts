// Lead que chega pelo formulário do site quando a IA Conversacional atende
// esse cliente: em vez do menu do bot fixo ("1️⃣ orçamento / 2️⃣ atendente"),
// vai uma boas-vindas no tom da IA e a conversa já fica com ela, sabendo nome,
// data e convidados. Com a IA desligada (ou cliente fora da regra dela), nada
// muda: segue o menu de sempre.

// deno-lint-ignore-file no-explicit-any

import { loadAiConversationalEnabled } from "./ai-module.ts";
import { aiUnitFor } from "./ai-units.ts";
import { formatDateLong } from "./whatsapp-format.ts";

export interface SiteLeadInfo {
  name?: string;
  month?: string; // "Setembro/27" (ou "Setembro", das LPs antigas)
  day?: number | null;
  guests?: string;
  interest?: string;
  intro?: string; // frase de abertura do site ("Recebemos seu pedido pelo site do ...")
}

const MONTHS = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];

/** Lê o que o navegador mandou, sem confiar em tamanho/tipo */
export function cleanSiteLead(raw: unknown): SiteLeadInfo | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");
  const day = Number(r.day);
  return {
    name: str(r.name, 80),
    month: str(r.month, 20),
    day: Number.isInteger(day) && day >= 1 && day <= 31 ? day : null,
    guests: str(r.guests, 50),
    interest: str(r.interest, 120),
    intro: str(r.intro, 300),
  };
}

/** "Setembro/27" → { monthIndex: 8, year: 2027 }; sem ano, o próximo que ainda não passou */
export function parseSiteMonth(option: string, todayYmd: string): { monthIndex: number; year: number } | null {
  const [namePart, yearPart] = option.split("/");
  const monthIndex = MONTHS.indexOf((namePart || "").trim().toLowerCase().replace("marco", "março"));
  if (monthIndex < 0) return null;
  const [ty, tm] = todayYmd.split("-").map(Number);
  if (yearPart && /^\d{2,4}$/.test(yearPart.trim())) {
    const y = yearPart.trim();
    return { monthIndex, year: y.length <= 2 ? 2000 + Number(y) : Number(y) };
  }
  return { monthIndex, year: monthIndex < tm - 1 ? ty + 1 : ty };
}

/** Data da festa (AAAA-MM-DD) se for válida e futura; senão null */
export function siteLeadYmd(info: SiteLeadInfo, todayYmd: string): string | null {
  if (!info.month || !info.day) return null;
  const p = parseSiteMonth(info.month, todayYmd);
  if (!p) return null;
  const last = new Date(Date.UTC(p.year, p.monthIndex + 1, 0)).getUTCDate();
  if (info.day > last) return null;
  const ymd = `${p.year}-${String(p.monthIndex + 1).padStart(2, "0")}-${String(info.day).padStart(2, "0")}`;
  return ymd > todayYmd ? ymd : null;
}

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** Boas-vindas no tom da IA, sem menu numerado, terminando com uma pergunta */
export function buildAiSiteWelcome(info: SiteLeadInfo, companyName: string, todayYmd: string, assistantName = ""): string {
  const firstName = (info.name || "").split(/\s+/)[0] || "";
  const greeting = firstName ? `Olá, *${firstName}*! 👋` : "Olá! 👋";
  const name = assistantName.trim();
  // Com o nome da assistente, ela se apresenta (a frase do site repetiria o buffet)
  const siteIntro = info.intro && !/^Recebemos seu pedido pelo site/i.test(info.intro) ? info.intro : "";
  const intro = name
    ? `Eu sou a *${name}*, do *${companyName}* 🏰 ${siteIntro || "Recebi seu pedido de orçamento pelo site! ✨"}`
    : info.intro || `Recebemos seu pedido pelo site do *${companyName}*! ✨`;
  const ymd = siteLeadYmd(info, todayYmd);
  const month = info.month ? parseSiteMonth(info.month, todayYmd) : null;
  const thisYear = Number(todayYmd.slice(0, 4));
  let dateLine = "";
  if (ymd) {
    const year = Number(ymd.slice(0, 4));
    dateLine = `🗓️ ${capitalize(formatDateLong(ymd))}${year !== thisYear ? ` de ${year}` : ""}`;
  } else if (month) {
    dateLine = `🗓️ ${capitalize(MONTHS[month.monthIndex])}${month.year !== thisYear ? ` de ${month.year}` : ""}`;
  }
  const lines = [
    info.interest ? `🎯 ${info.interest}` : "",
    dateLine,
    info.guests ? `👥 ${info.guests}` : "",
  ].filter(Boolean);
  const question = info.guests && (ymd || month)
    ? "Me conta: de quem é a festa? 🎈😊"
    : !info.guests
    ? "Me conta: quantos convidados você imagina para a festa? 😊"
    : "Me conta: qual dia você tem em mente para a festa? 😊";
  return `${greeting} ${intro}\n\n${lines.length ? `Anotei por aqui:\n${lines.join("\n")}\n\n` : ""}${question}`;
}

/** Dados do formulário que a IA já fica sabendo (não pergunta de novo) */
export function siteLeadBotData(info: SiteLeadInfo, todayYmd: string): Record<string, unknown> {
  const out: Record<string, unknown> = { ai_agent: "on" };
  if (info.name) out.nome = info.name;
  const month = info.month ? parseSiteMonth(info.month, todayYmd) : null;
  if (month) out.mes = capitalize(MONTHS[month.monthIndex]);
  if (info.guests) out.convidados = info.guests;
  const ymd = siteLeadYmd(info, todayYmd);
  if (ymd) out.data_festa = ymd;
  return out;
}

export function phoneVariantsBR(phone: string): string[] {
  const clean = phone.replace(/\D/g, "");
  const variants = new Set<string>([clean]);
  const without55 = clean.startsWith("55") ? clean.slice(2) : clean;
  variants.add(without55);
  variants.add(`55${without55}`);
  if (without55.length === 11 && without55[2] === "9") {
    const short = without55.slice(0, 2) + without55.slice(3);
    variants.add(short);
    variants.add(`55${short}`);
  } else if (without55.length === 10) {
    const long = without55.slice(0, 2) + "9" + without55.slice(2);
    variants.add(long);
    variants.add(`55${long}`);
  }
  return Array.from(variants);
}

const samePhone = (a: string, b: string) => {
  const vb = phoneVariantsBR(b);
  return phoneVariantsBR(a).some((v) => vb.includes(v));
};

/**
 * A IA vai atender este cliente que veio do site? Mesmas regras da IA no
 * webhook (wapi-webhook/ai-agent.ts): IA ligada, módulo do Hub, mesma
 * unidade, modo de teste (só o número de teste) e, fora do teste, só cliente
 * novo — sem conversa antiga com o bot fixo/equipe e sem lead já trabalhado.
 */
export async function aiTakesSiteLead(
  supabase: any,
  instanceExternalId: string,
  phone: string,
): Promise<{ take: boolean; companyName: string; reason: string; assistantName?: string; introImageUrl?: string | null }> {
  const no = (reason: string) => ({ take: false, companyName: "", reason });
  const { data: instance } = await supabase.from("wapi_instances").select("id, company_id, unit").eq("instance_id", instanceExternalId).maybeSingle();
  if (!instance?.company_id || !instance.unit) return no("instância sem empresa/unidade");
  const { data: settings } = await supabase.from("ai_agent_settings").select("*").eq("company_id", instance.company_id).maybeSingle();
  if (!settings?.enabled) return no("IA desligada");
  const aiUnit = aiUnitFor(settings, instance.unit);
  if (!aiUnit) return no("IA é de outra unidade");
  if (!(await loadAiConversationalEnabled(supabase, instance.company_id))) return no("módulo da IA desligado no Hub");

  // Modo de teste do bot fixo com outro número: a IA também não entra (igual ao webhook)
  const { data: botSettings } = await supabase.from("wapi_bot_settings").select("test_mode_enabled, test_mode_number").eq("instance_id", instance.id).maybeSingle();
  if (botSettings?.test_mode_enabled && botSettings?.test_mode_number && !samePhone(phone, botSettings.test_mode_number)) return no("modo de teste do bot fixo");

  const isTestPhone = Boolean(settings.test_mode_enabled && String(settings.test_mode_number || "").replace(/\D/g, "") && samePhone(phone, settings.test_mode_number));
  if (settings.test_mode_enabled && !isTestPhone) return no("modo de teste da IA (não é o número de teste)");
  const { data: company } = await supabase.from("companies").select("name").eq("id", instance.company_id).maybeSingle();
  const companyName = String(company?.name || instance.unit);
  // Apresentação: nome da assistente e a arte dela (a boas-vindas vai como legenda)
  const intro = { assistantName: String(settings.assistant_name || "").trim(), introImageUrl: cleanIntroImage(settings.intro_image_url) };
  if (isTestPhone) return { take: true, companyName, reason: "número de teste da IA", ...intro };

  // Data de liberação deste número
  const activatedAt = aiUnit.activated_at ? Date.parse(aiUnit.activated_at) : 0;
  if (!activatedAt) return no("IA sem data de ativação");
  const variants = phoneVariantsBR(phone);
  const { data: convs } = await supabase.from("wapi_conversations")
    .select("bot_step, bot_data, created_at")
    .eq("instance_id", instance.id)
    .in("remote_jid", variants.map((v) => `${v}@s.whatsapp.net`))
    .limit(5);
  for (const c of (convs || []) as any[]) {
    if (c.bot_data?.ai_agent === "off") return no("conversa já marcada como fora da IA");
    if (c.bot_step === "human_takeover") return no("conversa com a equipe");
    if (c.bot_step && !["lp_sent", "ai_agent"].includes(c.bot_step)) return no(`conversa no passo "${c.bot_step}" do bot fixo`);
    if (c.created_at && Date.parse(c.created_at) < activatedAt && c.bot_data?.ai_agent !== "on") return no("conversa de antes da IA");
  }
  const { data: leads } = await supabase.from("campaign_leads").select("status, created_at")
    .eq("company_id", instance.company_id).in("whatsapp", variants).limit(10);
  for (const l of (leads || []) as any[]) {
    if (Date.parse(l.created_at) < activatedAt || !["novo", "em_contato"].includes(l.status)) return no("lead antigo ou já trabalhado");
  }
  return { take: true, companyName, reason: "cliente novo", ...intro };
}

/** Arte de apresentação: só link https */
export function cleanIntroImage(v: unknown): string | null {
  const s = typeof v === "string" ? v.trim() : "";
  return /^https:\/\/\S+$/.test(s) && s.length <= 1000 ? s : null;
}
