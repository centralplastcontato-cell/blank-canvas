import { assertEquals } from "https://deno.land/std@0.208.0/assert/assert_equals.ts";
import {
  bookedRecently,
  buildAiVisitConfirmation,
  confirmationsForCurrentDate,
  fixedConfirmationTextChoice,
  isAiOwnedConversation,
  visitStartMs,
  visitWhenText,
} from "./visit-confirm.ts";

Deno.test("visitWhenText: hoje, amanhã e outro dia", () => {
  assertEquals(visitWhenText("2026-10-10", "10:00", "2026-10-10"), "hoje às 10h");
  assertEquals(visitWhenText("2026-10-10", "10:00", "2026-10-09"), "amanhã, sábado (10/10), às 10h");
  assertEquals(visitWhenText("2026-10-12", "15:30", "2026-10-09"), "segunda, 12/10, às 15h30");
});

Deno.test("buildAiVisitConfirmation: tom da IA, sem menu 1/2, termina perguntando", () => {
  const text = buildAiVisitConfirmation({ name: "daiany souza", dateYmd: "2026-10-10", time: "10:00", todayYmd: "2026-10-09", companyName: "Castelo da Diversão" });
  assertEquals(text, "Oi, Daiany! 😊 Passando pra lembrar da sua visita amanhã, sábado (10/10), às 10h aqui no Castelo da Diversão 🏰✨\n\nPosso confirmar sua presença?");
  const noName = buildAiVisitConfirmation({ name: "5515997998500", dateYmd: "2026-10-10", time: "10:00", todayYmd: "2026-10-10", companyName: "Castelo" });
  assertEquals(noName.startsWith("Oi! 😊 Passando pra lembrar da sua visita hoje às 10h"), true);
});

Deno.test("confirmationsForCurrentDate: remarcada para outra semana recebe confirmação nova", () => {
  const start = visitStartMs("2026-10-19", "10:00"); // segunda seguinte
  const old = { sent_at: "2026-10-09T20:00:00Z" }; // sexta 17h, era da visita de sábado
  assertEquals(confirmationsForCurrentDate([old], start, 6).length, 0);
});

Deno.test("confirmationsForCurrentDate: mesma data (cliente pediu remarcar e a data não mudou) não reenvia", () => {
  const start = visitStartMs("2026-10-10", "10:00");
  const sent = { sent_at: "2026-10-09T20:00:00Z" };
  assertEquals(confirmationsForCurrentDate([sent], start, 6).length, 1);
  // remarcada para o mesmo dia à tarde: a de sexta ainda vale
  assertEquals(confirmationsForCurrentDate([sent], visitStartMs("2026-10-10", "16:00"), 6).length, 1);
});

Deno.test("isAiOwnedConversation", () => {
  assertEquals(isAiOwnedConversation({ bot_step: "ai_agent", bot_enabled: true }), true);
  assertEquals(isAiOwnedConversation({ bot_step: "human_takeover", bot_enabled: false }), false);
  assertEquals(isAiOwnedConversation({ bot_step: "ai_agent", bot_enabled: false }), false);
  assertEquals(isAiOwnedConversation({ bot_step: "welcome", bot_enabled: true }), false);
});

Deno.test("fixedConfirmationTextChoice: 'assim' não confirma mais", () => {
  assertEquals(fixedConfirmationTextChoice("não vou conseguir assim"), null);
  assertEquals(fixedConfirmationTextChoice("Sim, confirmo!"), 1);
  assertEquals(fixedConfirmationTextChoice("sim"), 1);
  assertEquals(fixedConfirmationTextChoice("Confirmadíssimo"), 1);
  assertEquals(fixedConfirmationTextChoice("não confirmo"), null);
  assertEquals(fixedConfirmationTextChoice("preciso remarcar"), 2);
  assertEquals(fixedConfirmationTextChoice("Não vou poder, quero reagendar"), 2);
  assertEquals(fixedConfirmationTextChoice("simples assim"), null);
  assertEquals(fixedConfirmationTextChoice("que horas abre?"), null);
});

Deno.test("bookedRecently: marcada há pouco não recebe confirmação", () => {
  const now = Date.parse("2026-10-09T20:00:00Z"); // sexta 17h
  assertEquals(bookedRecently(["2026-10-09T19:00:00Z"], now), true); // marcou 16h
  assertEquals(bookedRecently(["2026-10-08T23:52:00Z"], now), false); // marcou ontem à noite
  // remarcada pela IA há pouco (a criação é antiga)
  assertEquals(bookedRecently(["2026-10-01T12:00:00Z", "2026-10-09T18:30:00Z"], now), true);
  assertEquals(bookedRecently([null, undefined], now), false);
});
