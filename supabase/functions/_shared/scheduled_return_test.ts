import { assertEquals } from "https://deno.land/std@0.208.0/assert/assert_equals.ts";
import { mentionsLaterTime, parseReturnJson, returnDue, returnMessage } from "./scheduled-return.ts";
import { isPacedAutomatic } from "./auto-pacing.ts";

Deno.test("mentionsLaterTime: frases com data para retomar", () => {
  assertEquals(mentionsLaterTime("Vou agendar pra ir início de Novembro"), true);
  assertEquals(mentionsLaterTime("semana que vem eu vejo com meu marido"), true);
  assertEquals(mentionsLaterTime("depois do dia 10 eu te falo, quando receber"), true);
  assertEquals(mentionsLaterTime("vou pensar e te falo"), false); // sem data
  assertEquals(mentionsLaterTime("a festa é dia 21 de fevereiro"), false); // data da festa, não retorno
  assertEquals(mentionsLaterTime("ok"), false);
});

Deno.test("parseReturnJson: valida data futura até 180 dias", () => {
  const today = "2026-10-22";
  assertEquals(parseReturnJson('{"retomar": true, "data": "2026-11-03", "quando": "no início de novembro", "frase": "vou agendar início de novembro"}', today),
    { date: "2026-11-03", whenText: "no início de novembro", note: "vou agendar início de novembro" });
  assertEquals(parseReturnJson('Claro: {"retomar": false}', today), null);
  assertEquals(parseReturnJson('{"retomar": true, "data": "2026-10-20"}', today), null); // passado
  assertEquals(parseReturnJson('{"retomar": true, "data": "2027-08-01"}', today), null); // longe demais
  assertEquals(parseReturnJson("sem json", today), null);
});

Deno.test("returnDue e returnMessage", () => {
  assertEquals(returnDue("2026-11-03", "pending", "2026-11-03", 9), false);
  assertEquals(returnDue("2026-11-03", "pending", "2026-11-03", 10), true);
  assertEquals(returnDue("2026-11-03", "pending", "2026-11-04", 11), true);
  assertEquals(returnDue("2026-11-03", "sent", "2026-11-03", 11), false);
  assertEquals(returnDue("2026-11-03", "pending", "2026-11-02", 11), false);
  assertEquals(
    returnMessage({ firstName: "Thayane", companyName: "Castelo da Diversão", whenText: "no início de novembro", offers: ["terça (03/11) às 10h", "quarta (04/11) às 15h"], visited: false }),
    "Oi, Thayane! 😊 Como você comentou, passando agora no início de novembro pra gente marcar a visita ao Castelo da Diversão. Tenho terça (03/11) às 10h ou quarta (04/11) às 15h. Qual fica melhor?",
  );
  assertEquals(
    returnMessage({ firstName: "Juliana", companyName: "Castelo", whenText: "", offers: [], visited: true, childName: "Aurora" }),
    "Oi, Juliana! 😊 Como você comentou, passando aqui pra gente seguir com a festa da Aurora. Ficou alguma dúvida? Posso te ajudar a garantir a data 💜",
  );
  assertEquals(isPacedAutomatic({ source: "scheduled_return" }), true);
});
