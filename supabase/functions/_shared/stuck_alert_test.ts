import { assertEquals } from "https://deno.land/std@0.208.0/assert/assert_equals.ts";
import { decideStuckAlert, formatContactList } from "./stuck-alert.ts";

const NOW = new Date("2026-09-30T17:00:00Z").getTime();
const minutesAgo = (m: number) => new Date(NOW - m * 60 * 1000).toISOString();

Deno.test("decideStuckAlert: um cliente só, número recebendo avisos → não alerta", () => {
  assertEquals(
    decideStuckAlert({ conversationCount: 1, activeConversationCount: 5, lastWebhookEventAt: minutesAgo(1), now: NOW }),
    { notify: false, webhookSilent: false },
  );
  assertEquals(
    decideStuckAlert({ conversationCount: 2, activeConversationCount: 2, lastWebhookEventAt: minutesAgo(5), now: NOW }).notify,
    false,
  );
});

Deno.test("decideStuckAlert: várias conversas travadas no mesmo número → alerta", () => {
  assertEquals(
    decideStuckAlert({ conversationCount: 3, activeConversationCount: 4, lastWebhookEventAt: minutesAgo(1), now: NOW }),
    { notify: true, webhookSilent: false },
  );
});

Deno.test("decideStuckAlert: número sem mandar aviso nenhum (caso VENDAS 1) → alerta mesmo com 1 conversa", () => {
  assertEquals(
    decideStuckAlert({ conversationCount: 1, activeConversationCount: 4, lastWebhookEventAt: minutesAgo(240), now: NOW }),
    { notify: true, webhookSilent: true },
  );
  assertEquals(
    decideStuckAlert({ conversationCount: 1, activeConversationCount: 1, lastWebhookEventAt: null, now: NOW }).webhookSilent,
    true,
  );
});

Deno.test("decideStuckAlert: número movimentado com poucos clientes sem tique → não alerta (casos reais de 30/09)", () => {
  // Planeta Divertido: 3 de 16 conversas; Mega Magic: 5 de 11
  assertEquals(decideStuckAlert({ conversationCount: 3, activeConversationCount: 16, lastWebhookEventAt: minutesAgo(1), now: NOW }).notify, false);
  assertEquals(decideStuckAlert({ conversationCount: 5, activeConversationCount: 11, lastWebhookEventAt: minutesAgo(1), now: NOW }).notify, false);
  // VENDAS 2: 27 de 33 conversas — problema no número
  assertEquals(decideStuckAlert({ conversationCount: 27, activeConversationCount: 33, lastWebhookEventAt: minutesAgo(1), now: NOW }).notify, true);
});

Deno.test("formatContactList: resume nomes repetidos e longos", () => {
  assertEquals(formatContactList(["Ana", "Ana", "Érica"]), "Ana, Érica");
  assertEquals(formatContactList(["A", "B", "C", "D", "E"]), "A, B, C e mais 2");
  assertEquals(formatContactList(["", "  "]), "");
});
