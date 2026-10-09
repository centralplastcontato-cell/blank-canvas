import { assertEquals } from "https://deno.land/std@0.208.0/assert/assert_equals.ts";
import {
  aggregateInsights,
  buildTranscript,
  formatWeeklySummary,
  isInsightsEnabled,
  isWeeklySendWindow,
  normalizeInsight,
  previousWeekBRT,
  quickInsight,
  type TranscriptMessage,
} from "./lead-insights.ts";

const msg = (from_me: boolean, content: string, timestamp: string, message_type = "text"): TranscriptMessage => ({ from_me, content, message_type, timestamp });

Deno.test("normalizeInsight aceita só valores da lista", () => {
  assertEquals(
    normalizeInsight({ motivo: "preco", detalhe: "  Achou o pacote caro  ", perguntas: ["valor", "valor", "inventado"], objecoes: ["preco_alto", 3] }),
    { motivo: "preco", detalhe: "Achou o pacote caro", perguntas: ["valor"], objecoes: ["preco_alto"] },
  );
  assertEquals(normalizeInsight({ motivo: "qualquer", detalhe: "x", perguntas: [], objecoes: [] }), null);
  assertEquals(normalizeInsight(null), null);
});

Deno.test("buildTranscript ordena, marca quem falou e resume mídia", () => {
  const t = buildTranscript([
    msg(true, "Olá! Segue o orçamento", "2026-10-02T13:05:00Z"),
    msg(false, "Oi, quanto custa\npara 50 crianças?", "2026-10-02T13:00:00Z"),
    msg(false, "", "2026-10-02T13:10:00Z", "audio"),
    msg(false, "https://cdn.exemplo.com/foto.jpg", "2026-10-02T13:11:00Z", "image"),
    msg(false, "Decoração assim", "2026-10-02T13:12:00Z", "image"),
  ]);
  assertEquals(t, [
    "02/10 Cliente: Oi, quanto custa para 50 crianças?",
    "02/10 Buffet: Olá! Segue o orçamento",
    "02/10 Cliente: [audio]",
    "02/10 Cliente: [image]",
    "02/10 Cliente: [image] Decoração assim",
  ].join("\n"));
});

Deno.test("buildTranscript corta o começo de conversas enormes", () => {
  const many = Array.from({ length: 100 }, (_, i) => msg(i % 2 === 0, "x".repeat(400), `2026-10-02T13:${String(i % 60).padStart(2, "0")}:00Z`));
  const t = buildTranscript(many);
  assertEquals(t.length <= 14000, true);
});

Deno.test("quickInsight: sem cliente não analisa; uma mensagem e sumiu", () => {
  assertEquals(quickInsight([msg(true, "Oi", "2026-10-02T13:00:00Z")]), "skip");
  assertEquals((quickInsight([msg(false, "Oi", "2026-10-02T13:00:00Z"), msg(true, "Olá!", "2026-10-02T13:01:00Z")]) as { motivo: string }).motivo, "sumiu");
  assertEquals(quickInsight([msg(false, "Oi", "2026-10-02T13:00:00Z"), msg(true, "Olá!", "2026-10-02T13:01:00Z"), msg(false, "Valor?", "2026-10-02T13:02:00Z")]), null);
});

Deno.test("aggregateInsights conta e ordena", () => {
  const r = aggregateInsights([
    { motivo: "preco", perguntas: ["valor", "datas"], objecoes: ["preco_alto"] },
    { motivo: "sumiu", perguntas: ["valor"], objecoes: [] },
    { motivo: "preco", perguntas: null, objecoes: null },
  ]);
  assertEquals(r.reasons.map((x) => [x.key, x.count]), [["preco", 2], ["sumiu", 1]]);
  assertEquals(r.questions.map((x) => [x.key, x.count]), [["valor", 2], ["datas", 1]]);
  assertEquals(r.objections[0].label, "Preço alto");
});

Deno.test("previousWeekBRT: segunda a domingo anteriores, em Brasília", () => {
  // Segunda 12/10/2026 08:52 em Brasília
  const w = previousWeekBRT(new Date("2026-10-12T11:52:00Z"));
  assertEquals(w, { start: "2026-10-05", end: "2026-10-11", startIso: "2026-10-05T03:00:00.000Z", endIso: "2026-10-12T02:59:59.999Z" });
  // Domingo 11/10 23:30 em Brasília (já é segunda em UTC): ainda vale a semana de 28/09
  assertEquals(previousWeekBRT(new Date("2026-10-12T02:30:00Z")).start, "2026-09-28");
});

Deno.test("formatWeeklySummary monta a mensagem", () => {
  const text = formatWeeklySummary({
    companyName: "Castelo da Diversão",
    weekStart: "2026-10-05",
    weekEnd: "2026-10-11",
    leads: 80,
    returned: 6,
    visitsRealized: 5,
    visitsNoShow: 1,
    visitsNoAnswer: 2,
    sales: 4,
    waitingNow: 3,
    analyzed: 30,
    reasons: [{ key: "sumiu", label: "Parou de responder", count: 18 }, { key: "preco", label: "Achou caro", count: 7 }],
    questions: [{ key: "valor", label: "Valor / preço", count: 25 }],
    objections: [],
  });
  assertEquals(text.includes("05/10 a 11/10"), true);
  assertEquals(text.includes("Leads novos: *80* (+6 voltaram)"), true);
  assertEquals(text.includes("Visitas realizadas: *5* (1 faltou · 2 sem resposta)"), true);
  assertEquals(text.includes("conversão 5,0%"), true);
  assertEquals(text.includes("• Parou de responder: 18"), true);
  assertEquals(text.includes("Valor / preço (25)"), true);
  assertEquals(text.includes("O que mais travou"), false);
});

Deno.test("isInsightsEnabled lê o módulo do Hub", () => {
  assertEquals(isInsightsEnabled({ enabled_modules: { inteligencia_ia: true } }), true);
  assertEquals(isInsightsEnabled({ enabled_modules: { inteligencia: true } }), false);
  assertEquals(isInsightsEnabled(null), false);
});

Deno.test("isWeeklySendWindow: só segunda, 7h às 20h de Brasília", () => {
  assertEquals(isWeeklySendWindow(new Date("2026-10-12T11:52:00Z")), true); // seg 08:52
  assertEquals(isWeeklySendWindow(new Date("2026-10-12T03:30:00Z")), false); // seg 00:30
  assertEquals(isWeeklySendWindow(new Date("2026-10-12T23:30:00Z")), false); // seg 20:30
  assertEquals(isWeeklySendWindow(new Date("2026-10-13T12:00:00Z")), false); // terça
});
