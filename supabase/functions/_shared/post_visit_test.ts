import { assertEquals } from "https://deno.land/std@0.208.0/assert/assert_equals.ts";
import { firstNameOf, partyYmdFromLead, postVisitDue, postVisitMessage, promoName } from "./post-visit.ts";
import { isPacedAutomatic } from "./auto-pacing.ts";

Deno.test("postVisitDue: dia seguinte às 10h, 2ª 3 dias depois, não compareceu", () => {
  const now = Date.parse("2026-10-22T13:00:00Z");
  const base = { status: "realizada", visitYmd: "2026-10-21", count: 0, lastAtMs: null };
  assertEquals(postVisitDue(base, "2026-10-22", 9, now), null); // antes das 10h
  assertEquals(postVisitDue(base, "2026-10-22", 10, now), "first");
  assertEquals(postVisitDue({ ...base, visitYmd: "2026-10-22" }, "2026-10-22", 11, now), null); // no próprio dia
  assertEquals(postVisitDue({ ...base, visitYmd: "2026-10-10" }, "2026-10-22", 11, now), null); // mais de 7 dias
  const sentAt = Date.parse("2026-10-22T13:00:00Z");
  assertEquals(postVisitDue({ ...base, count: 1, lastAtMs: sentAt }, "2026-10-24", 11, Date.parse("2026-10-24T14:00:00Z")), null);
  assertEquals(postVisitDue({ ...base, count: 1, lastAtMs: sentAt }, "2026-10-25", 11, Date.parse("2026-10-25T14:00:00Z")), "second");
  assertEquals(postVisitDue({ ...base, count: 2, lastAtMs: sentAt }, "2026-10-26", 11, Date.parse("2026-10-26T14:00:00Z")), null);
  assertEquals(postVisitDue({ ...base, count: 99 }, "2026-10-22", 11, now), null);
  assertEquals(postVisitDue({ ...base, status: "nao_compareceu" }, "2026-10-22", 11, now), "no_show");
  assertEquals(postVisitDue({ ...base, status: "nao_compareceu", count: 1, lastAtMs: sentAt }, "2026-10-26", 11, now), null);
  assertEquals(postVisitDue({ ...base, status: "agendada" }, "2026-10-22", 11, now), null);
});

Deno.test("postVisitMessage: textos aprovados", () => {
  const c = { firstName: "Juliana", companyName: "Castelo da Diversão", childName: "Aurora", visitYmd: "2026-10-21", todayYmd: "2026-10-22" };
  const first = postVisitMessage("first", { ...c, partyYmd: "2027-02-13", partyFree: true });
  assertEquals(first.startsWith("Oi, Juliana! 😊 Foi um prazer receber vocês ontem aqui no Castelo da Diversão! Espero que Aurora tenha gostado do espaço 🏰💜"), true);
  assertEquals(first.includes("O sábado, 13 de fevereiro, ainda está livre na agenda ✅"), true);
  assertEquals(postVisitMessage("first", { ...c, partyYmd: "2027-02-13", partyFree: false }).includes("já foi reservado"), true);
  assertEquals(postVisitMessage("first", { ...c, todayYmd: "2026-10-24" }).includes("receber vocês na visita"), true);
  const second = postVisitMessage("second", { ...c, promo: { title: "PROMOÇÃO MÊS DAS CRIANÇAS", endYmd: "2026-10-31" } });
  assertEquals(second, "Juliana, passando só pra lembrar: a promoção Mês das Crianças vai até sábado, 31 de outubro 🎉 Se quiser, já deixo a data da Aurora encaminhada com a equipe. Me conta como posso te ajudar 😊");
  assertEquals(postVisitMessage("second", { ...c, childName: null }).includes("a data da festa encaminhada"), true);
  const noShow = postVisitMessage("no_show", { ...c, offers: ["quinta (23/10) às 15h", "sábado (25/10) às 10h"] });
  assertEquals(noShow, "Oi, Juliana! Sentimos sua falta ontem 😊 Imagino que surgiu algum imprevisto.\n\nQuer remarcar a visita? Tenho quinta (23/10) às 15h ou sábado (25/10) às 10h. Qual fica melhor?");
});

Deno.test("auxiliares: nome, promoção, data pelo lead, mensagem que conta no ritmo", () => {
  assertEquals(firstNameOf("DIANDRA LUMA"), "Diandra");
  assertEquals(firstNameOf("5515999999999"), "");
  assertEquals(promoName("PROMOÇÃO MÊS DAS CRIANÇAS"), "Mês das Crianças");
  assertEquals(partyYmdFromLead("Fevereiro", 21, "2026-10-22"), "2027-02-21");
  assertEquals(partyYmdFromLead("Dezembro", 13, "2026-10-22"), "2026-12-13");
  assertEquals(partyYmdFromLead("Fevereiro", null, "2026-10-22"), null);
  assertEquals(isPacedAutomatic({ source: "auto_reminder", type: "follow_up_1" }), true);
  assertEquals(isPacedAutomatic({ source: "post_visit" }), true);
  assertEquals(isPacedAutomatic({ source: "ai_agent", ai_followup: "etapa 1" }), true);
  assertEquals(isPacedAutomatic({ source: "ai_agent" }), false); // resposta da IA ao cliente
  assertEquals(isPacedAutomatic({ source: "visit_confirmation" }), false);
  assertEquals(isPacedAutomatic(null), false);
});
