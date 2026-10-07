import { assertEquals } from "https://deno.land/std@0.208.0/assert/assert_equals.ts";
import { buildAiSiteWelcome, cleanSiteLead, parseSiteMonth, siteLeadBotData, siteLeadYmd } from "./ai-site-lead.ts";

const today = "2026-10-07";

Deno.test("parseSiteMonth: com ano e sem ano (o próximo que não passou)", () => {
  assertEquals(parseSiteMonth("Setembro/27", today), { monthIndex: 8, year: 2027 });
  assertEquals(parseSiteMonth("Setembro", today), { monthIndex: 8, year: 2027 });
  assertEquals(parseSiteMonth("Outubro", today), { monthIndex: 9, year: 2026 });
  assertEquals(parseSiteMonth("Marco/2028", today), { monthIndex: 2, year: 2028 });
  assertEquals(parseSiteMonth("Nada", today), null);
});

Deno.test("siteLeadYmd: só data válida e futura", () => {
  assertEquals(siteLeadYmd({ month: "Setembro/27", day: 18 }, today), "2027-09-18");
  assertEquals(siteLeadYmd({ month: "Setembro", day: 18 }, today), "2027-09-18");
  assertEquals(siteLeadYmd({ month: "Outubro/26", day: 7 }, today), null); // hoje
  assertEquals(siteLeadYmd({ month: "Outubro/26", day: 2 }, today), null); // passou
  assertEquals(siteLeadYmd({ month: "Fevereiro/27", day: 30 }, today), null);
  assertEquals(siteLeadYmd({ month: "Setembro/27" }, today), null);
});

Deno.test("cleanSiteLead corta tamanho e tipo", () => {
  assertEquals(cleanSiteLead(null), null);
  assertEquals(cleanSiteLead({ name: "Victor", month: "Setembro/27", day: "18", guests: "100 pessoas" })?.day, 18);
  assertEquals(cleanSiteLead({ day: 99 })?.day, null);
  assertEquals((cleanSiteLead({ name: "x".repeat(500) })?.name || "").length, 80);
});

Deno.test("buildAiSiteWelcome: sem menu, com data por extenso e pergunta", () => {
  const msg = buildAiSiteWelcome({ name: "Victor Hugo", month: "Setembro/27", day: 18, guests: "100 pessoas" }, "Castelo da Diversão", today);
  assertEquals(msg, "Olá, *Victor*! 👋 Recebemos seu pedido pelo site do *Castelo da Diversão*! ✨\n\nAnotei por aqui:\n🗓️ Sábado, 18 de setembro de 2027\n👥 100 pessoas\n\nMe conta: de quem é a festa? 🎈😊");
  assertEquals(msg.includes("1️⃣"), false);
  // Valor só para quem pergunta: a boas-vindas não oferece preço
  assertEquals(/valor|preço/i.test(msg), false);
  // Este ano: sem o ano
  assertEquals(buildAiSiteWelcome({ name: "Ana", month: "Dezembro/26", day: 5, guests: "60 pessoas" }, "Castelo", today).includes("🗓️ Sábado, 5 de dezembro\n"), true);
  // Data que já passou: fica só o mês
  const past = buildAiSiteWelcome({ name: "Ana", month: "Outubro/26", day: 1, guests: "60 pessoas" }, "Castelo", today);
  assertEquals(past.includes("🗓️ Outubro\n"), true);
  assertEquals(past.endsWith("Me conta: de quem é a festa? 🎈😊"), true);
  // Sem convidados
  assertEquals(buildAiSiteWelcome({ name: "Ana", month: "Dezembro/26", day: 5 }, "Castelo", today).endsWith("quantos convidados você imagina para a festa? 😊"), true);
  // Frase de abertura do site (ex.: QR Code da mesa)
  assertEquals(buildAiSiteWelcome({ name: "Ana", intro: "Que bom te ver na festa! 🎉" }, "Castelo", today).startsWith("Olá, *Ana*! 👋 Que bom te ver na festa! 🎉"), true);
});

Deno.test("siteLeadBotData: o que a IA já fica sabendo", () => {
  assertEquals(siteLeadBotData({ name: "Victor", month: "Setembro/27", day: 18, guests: "100 pessoas" }, today), {
    ai_agent: "on", nome: "Victor", mes: "Setembro", convidados: "100 pessoas", data_festa: "2027-09-18",
  });
  assertEquals(siteLeadBotData({ name: "Victor", month: "Outubro/26", day: 1 }, today), { ai_agent: "on", nome: "Victor", mes: "Outubro" });
});
