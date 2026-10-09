import { assertEquals } from "https://deno.land/std@0.208.0/assert/assert_equals.ts";
import {
  brtDayStart,
  isSendWindow,
  nextSendAfterSend,
  nextWindowStart,
  phoneTail,
  phoneVariants,
  renderCampaignMessage,
  spreadStart,
} from "./campaign-schedule.ts";

// Horários em Brasília (-03:00). 09/10/2026 é sexta; 10/10 sábado; 11/10 domingo.
const at = (s: string) => new Date(s);

Deno.test("janela: seg a sáb, 9h às 19h de Brasília", () => {
  assertEquals(isSendWindow(at("2026-10-09T08:59:00-03:00")), false);
  assertEquals(isSendWindow(at("2026-10-09T09:00:00-03:00")), true);
  assertEquals(isSendWindow(at("2026-10-09T18:59:00-03:00")), true);
  assertEquals(isSendWindow(at("2026-10-09T19:00:00-03:00")), false);
  assertEquals(isSendWindow(at("2026-10-10T12:00:00-03:00")), true); // sábado
  assertEquals(isSendWindow(at("2026-10-11T12:00:00-03:00")), false); // domingo
});

Deno.test("próxima janela: pula domingo", () => {
  // sexta de madrugada -> sexta 9h
  assertEquals(nextWindowStart(at("2026-10-09T06:00:00-03:00")).toISOString(), at("2026-10-09T09:00:00-03:00").toISOString());
  // sexta à noite -> sábado 9h
  assertEquals(nextWindowStart(at("2026-10-09T20:00:00-03:00")).toISOString(), at("2026-10-10T09:00:00-03:00").toISOString());
  // sábado à noite -> segunda 9h
  assertEquals(nextWindowStart(at("2026-10-10T19:30:00-03:00")).toISOString(), at("2026-10-12T09:00:00-03:00").toISOString());
  // domingo de manhã -> segunda 9h
  assertEquals(nextWindowStart(at("2026-10-11T08:00:00-03:00")).toISOString(), at("2026-10-12T09:00:00-03:00").toISOString());
  // 23h UTC de sexta ainda é sexta 20h em Brasília -> sábado 9h
  assertEquals(nextWindowStart(at("2026-10-09T23:00:00Z")).toISOString(), at("2026-10-10T09:00:00-03:00").toISOString());
});

Deno.test("começo do dia em Brasília", () => {
  assertEquals(brtDayStart(at("2026-10-10T01:30:00Z")).toISOString(), at("2026-10-09T00:00:00-03:00").toISOString());
  assertEquals(brtDayStart(at("2026-10-10T12:00:00Z")).toISOString(), at("2026-10-10T00:00:00-03:00").toISOString());
});

Deno.test("próximo envio: 14 a 26 min depois, dentro da janela", () => {
  const now = at("2026-10-09T10:00:00-03:00");
  assertEquals(nextSendAfterSend(now, 0).toISOString(), at("2026-10-09T10:14:00-03:00").toISOString());
  assertEquals(nextSendAfterSend(now, 0.5).toISOString(), at("2026-10-09T10:20:00-03:00").toISOString());
});

Deno.test("próximo envio: perto das 19h passa para o dia seguinte com folga", () => {
  const now = at("2026-10-09T18:50:00-03:00");
  assertEquals(nextSendAfterSend(now, 0).toISOString(), at("2026-10-10T09:00:00-03:00").toISOString());
  assertEquals(nextSendAfterSend(now, 0.5).toISOString(), at("2026-10-10T09:10:00-03:00").toISOString());
  assertEquals(spreadStart(at("2026-10-12T09:00:00-03:00"), 0.99).toISOString(), at("2026-10-12T09:19:00-03:00").toISOString());
});

Deno.test("telefone: final e formatos", () => {
  assertEquals(phoneTail("+55 (15) 99111-2222"), "91112222");
  assertEquals(phoneTail("123"), "");
  assertEquals(phoneVariants("15991112222").sort(), ["15991112222", "5515991112222"]);
  assertEquals(phoneVariants("5515991112222").sort(), ["15991112222", "5515991112222"]);
});

Deno.test("mensagem: troca nome e empresa", () => {
  assertEquals(renderCampaignMessage("Oi {nome}! Aqui é da {{ empresa }}", "Ana", "Castelo"), "Oi Ana! Aqui é da Castelo");
});
