import { assertEquals } from "https://deno.land/std@0.208.0/assert/assert_equals.ts";
import { crossedWithLastReply, debounceMsFor, mergeConsecutiveTurns, priceRequestPending, pickLatestIncoming, repliesSinceVisitInvite, smallestPackageGuests, teamRepliedAfter } from "./ai-turn.ts";

Deno.test("pickLatestIncoming: a última mensagem do cliente responde por todas", () => {
  assertEquals(pickLatestIncoming([
    { message_id: "A", timestamp: "2026-10-05T22:10:01Z" },
    { message_id: "C", timestamp: "2026-10-05T22:10:07Z" },
    { message_id: "B", timestamp: "2026-10-05T22:10:04Z" },
  ]), "C");
});

Deno.test("pickLatestIncoming: empate no mesmo segundo tem vencedor único", () => {
  const rows = [
    { message_id: "3EB0AAA", timestamp: "2026-10-05T22:10:07Z" },
    { message_id: "3EB0BBB", timestamp: "2026-10-05T22:10:07Z" },
  ];
  assertEquals(pickLatestIncoming(rows), "3EB0BBB");
  assertEquals(pickLatestIncoming([...rows].reverse()), "3EB0BBB");
});

Deno.test("teamRepliedAfter: só resposta de gente da equipe conta", () => {
  const since = "2026-10-05T22:00:00Z";
  assertEquals(teamRepliedAfter([
    { from_me: true, timestamp: "2026-10-05T21:59:00Z", metadata: { source: "platform" } }, // antes
    { from_me: false, timestamp: "2026-10-05T22:01:00Z", metadata: null }, // cliente
    { from_me: true, timestamp: "2026-10-05T22:02:00Z", metadata: { source: "auto_reminder" } }, // follow-up
  ], since), false);
  assertEquals(teamRepliedAfter([{ from_me: true, timestamp: "2026-10-05T23:30:00Z", metadata: { source: "platform" } }], since), true);
  assertEquals(teamRepliedAfter([{ from_me: true, timestamp: "2026-10-05T22:03:00Z", metadata: null }], since), true); // pelo celular
});

Deno.test("mergeConsecutiveTurns: perguntas picadas viram um turno só, contando as pendentes", () => {
  assertEquals(mergeConsecutiveTurns([
    { role: "assistant", content: "Oi! Qual seu nome?" },
    { role: "user", content: "Victor" },
    { role: "assistant", content: "Prazer, Victor!" },
    { role: "user", content: "vocês fazem festa à noite?" },
    { role: "user", content: "tem estacionamento?" },
  ]), {
    merged: [
      { role: "assistant", content: "Oi! Qual seu nome?" },
      { role: "user", content: "Victor" },
      { role: "assistant", content: "Prazer, Victor!" },
      { role: "user", content: "vocês fazem festa à noite?\ntem estacionamento?" },
    ],
    pendingUserMessages: 2,
  });
});

Deno.test("teamRepliedAfter: 'platform' de antes da marcação da IA não conta; celular conta", () => {
  const since = "2026-10-05T22:56:24Z"; // passagem às 19:56
  // resposta da IA antiga, gravada como se fosse do Celebrei
  assertEquals(teamRepliedAfter([{ from_me: true, timestamp: "2026-10-05T22:56:30Z", metadata: { source: "platform", provider: "zapi" } }], since), false);
  // depois da atualização, "platform" é gente da equipe
  assertEquals(teamRepliedAfter([{ from_me: true, timestamp: "2026-10-05T23:30:00Z", metadata: { source: "platform" } }], since), true);
  // pelo celular (sem metadata) sempre foi gente
  assertEquals(teamRepliedAfter([{ from_me: true, timestamp: "2026-10-05T22:58:00Z", metadata: null }], since), true);
});

Deno.test("teamRepliedAfter: mensagem da IA (ai_agent) não conta como equipe", () => {
  assertEquals(teamRepliedAfter([{ from_me: true, timestamp: "2026-10-05T22:03:00Z", metadata: { source: "ai_agent" } }], "2026-10-05T22:00:00Z"), false);
});

Deno.test("repliesSinceVisitInvite: conta respostas desde o último convite", () => {
  const base = [
    { role: "user" as const, content: "oi" },
    { role: "assistant" as const, content: "Oi! Quer agendar uma visita sem compromisso?" },
    { role: "user" as const, content: "tem estacionamento?" },
    { role: "assistant" as const, content: "Tem sim!" },
    { role: "user" as const, content: "e cama elástica?" },
    { role: "assistant" as const, content: "Temos também." },
  ];
  assertEquals(repliesSinceVisitInvite(base), 2);
  assertEquals(repliesSinceVisitInvite(base.slice(0, 2)), 0);
  assertEquals(repliesSinceVisitInvite([{ role: "assistant", content: "🧪 Conversa reiniciada" }, { role: "user", content: "oi" }]), null);
});

Deno.test("smallestPackageGuests: menor pacote com quantidade", () => {
  assertEquals(smallestPackageGuests([
    { type: "pdf_package", guest_count: 80 },
    { type: "pdf_package", guest_count: 50 },
    { type: "pdf_package", guest_count: null },
    { type: "video", guest_count: 10 },
  ]), 50);
  assertEquals(smallestPackageGuests([{ type: "pdf_package", guest_count: null }]), null);
});

Deno.test("debounceMsFor: pergunta/frase longa espera pouco; 'Olá'/'Então' espera mais", () => {
  assertEquals(debounceMsFor("tem estacionamento?"), 5000);
  assertEquals(debounceMsFor("quero fazer a festa do meu filho em dezembro para umas 60 pessoas"), 5000);
  assertEquals(debounceMsFor("", true), 5000); // áudio/foto
  assertEquals(debounceMsFor("Olá"), 16000);
  assertEquals(debounceMsFor("Então"), 16000);
  assertEquals(debounceMsFor("dezembro"), 16000); // uma palavra só
  assertEquals(debounceMsFor("queria saber sobre a festa,"), 16000);
  assertEquals(debounceMsFor("dia 5 de dezembro"), 9000);
  // respondendo pergunta da IA
  assertEquals(debounceMsFor("dezembro", false, true), 5000);
  assertEquals(debounceMsFor("60", false, true), 5000);
  assertEquals(debounceMsFor("Então", false, true), 16000);
});

Deno.test("priceRequestPending: pediu valor no começo e ainda não recebeu", () => {
  assertEquals(priceRequestPending([
    { role: "user", content: "oi, quanto custa uma festa?" },
    { role: "assistant", content: "Oi! Para quantos convidados?" },
    { role: "user", content: "60, dia 26 de dezembro" },
  ]), true);
  assertEquals(priceRequestPending([
    { role: "user", content: "qual o valor?" },
    { role: "assistant", content: "🏰 *Castelo* — R$ 6.890" },
    { role: "user", content: "legal" },
  ]), false);
  assertEquals(priceRequestPending([{ role: "user", content: "tem estacionamento?" }]), false);
});

Deno.test("crossedWithLastReply: mensagem do cliente chegou junto com a resposta", () => {
  // teste de 06/10 12:38: resposta saiu 15:38:08 e o cliente escreveu no mesmo segundo
  assertEquals(crossedWithLastReply([
    { from_me: false, timestamp: "2026-10-06T15:37:54Z" },
    { from_me: true, timestamp: "2026-10-06T15:38:08Z" },
    { from_me: false, timestamp: "2026-10-06T15:38:08Z" },
  ]), true);
  // cliente respondeu 20 s depois: viu a pergunta
  assertEquals(crossedWithLastReply([
    { from_me: true, timestamp: "2026-10-06T15:38:08Z" },
    { from_me: false, timestamp: "2026-10-06T15:38:28Z" },
  ]), false);
});

import { clientAsksVisit, clientDeclined, stripVisitInvite } from "./ai-turn.ts";

Deno.test("stripVisitInvite: tira só o convite (conversas reais do simulador)", () => {
  const a = stripVisitInvite("Aaah, eu entendo, Renata 😕💜\n\nMesmo assim, se você quiser, vale super conhecer sem compromisso, porque muita família se surpreende 🎉🏰\n\nSe fizer sentido pra você, posso deixar uma visitinha na quarta, 7 de outubro às 10h ou na quinta, 8 de outubro às 11h 😊");
  assertEquals(a.removed, true);
  assertEquals(a.text, "Aaah, eu entendo, Renata 😕💜");
  const b = stripVisitInvite("Simone, as condições de pagamento quem confirma é a equipe no fechamento, tá bem? ✨💜\n\nSe você quiser, vale muito a pena conhecer o espaço primeiro — posso te agendar uma visita sem compromisso na quarta às 10h 🏰😊");
  assertEquals(b.text, "Simone, as condições de pagamento quem confirma é a equipe no fechamento, tá bem? ✨💜");
  // sem convite: não mexe
  const c = stripVisitInvite("Perfeito, Patrícia! 🥳 Sua visita ficou agendada para quinta, 8 de outubro, às 11h.");
  assertEquals(c, { text: "Perfeito, Patrícia! 🥳 Sua visita ficou agendada para quinta, 8 de outubro, às 11h.", removed: false });
  // só convite: devolve o original (melhor que mandar vazio)
  assertEquals(stripVisitInvite("Posso te receber na quarta às 10h?").removed, false);
});

Deno.test("clientAsksVisit / clientDeclined", () => {
  assertEquals(clientAsksVisit("pode me passar os horários de visita?"), true);
  assertEquals(clientAsksVisit("no à vista tem desconto?"), false);
  assertEquals(clientDeclined("Nesse caso não vai dar pra fechar então"), true);
  assertEquals(clientDeclined("vou pensar"), false);
});

Deno.test("repliesSinceVisitInvite: convite sem a palavra 'visita' também conta", () => {
  assertEquals(repliesSinceVisitInvite([
    { role: "assistant", content: "Se você quiser conhecer o espaço de pertinho, tenho quarta às 10h 🏰" },
    { role: "user", content: "obrigada" },
  ]), 0);
  assertEquals(clientAsksVisit("qual o horário da festa?"), false);
});
