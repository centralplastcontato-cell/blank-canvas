import { assertEquals } from "https://deno.land/std@0.208.0/assert/assert_equals.ts";
import { clientDataLink, dueReminder, fillClientDataTemplate, isOverdue, normalizeReminderHours, shortClientToken } from "./client-data.ts";

Deno.test("clientDataLink: domínio do buffet, link curto", () => {
  assertEquals(clientDataLink("K7M2QX9", "www.castelodadiversao.com.br"), "www.castelodadiversao.com.br/dados/K7M2QX9");
  assertEquals(clientDataLink("K7M2QX9", "https://buffetmegamagic.com.br/"), "buffetmegamagic.com.br/dados/K7M2QX9");
  assertEquals(clientDataLink("K7M2QX9", null), "hubcelebrei.com.br/dados/K7M2QX9");
  const t = shortClientToken();
  assertEquals(t.length, 7);
  assertEquals(/^[A-HJ-NP-Z2-9]+$/.test(t), true);
});

Deno.test("fillClientDataTemplate: variáveis e sem data", () => {
  assertEquals(fillClientDataTemplate("Oi, {{primeiro_nome}}! {{link}}", { nome: "Amanda Souza", link: "L" }), "Oi, Amanda! L");
  assertEquals(fillClientDataTemplate("sua festa no {{empresa}} no dia {{data_evento}}.", { nome: "A", empresa: "Castelo", link: "L" }), "sua festa no Castelo.");
  assertEquals(fillClientDataTemplate("no dia {{data_evento}}.", { nome: "A", data_evento: "21/02/2027", link: "L" }), "no dia 21/02/2027.");
});

Deno.test("dueReminder / isOverdue: prazos a partir do envio", () => {
  const sent = "2026-10-20T12:00:00Z";
  const h = (n: number) => Date.parse(sent) + n * 3600000;
  assertEquals(dueReminder({ sent_at: sent, reminder_count: 0 }, [24, 48, 72], h(23)), null);
  assertEquals(dueReminder({ sent_at: sent, reminder_count: 0 }, [24, 48, 72], h(25)), 0);
  assertEquals(dueReminder({ sent_at: sent, reminder_count: 1 }, [24, 48, 72], h(30)), null);
  assertEquals(dueReminder({ sent_at: sent, reminder_count: 1 }, [24, 48, 72], h(49)), 1);
  assertEquals(dueReminder({ sent_at: sent, reminder_count: 3 }, [24, 48, 72], h(200)), null);
  const last = new Date(h(73)).toISOString();
  assertEquals(isOverdue({ sent_at: sent, reminder_count: 3, last_reminder_at: last }, [24, 48, 72], h(90)), false);
  assertEquals(isOverdue({ sent_at: sent, reminder_count: 3, last_reminder_at: last }, [24, 48, 72], h(98)), true);
  assertEquals(isOverdue({ sent_at: sent, reminder_count: 99, last_reminder_at: last }, [24, 48, 72], h(300)), false);
  assertEquals(normalizeReminderHours([72, 24, "48"]), [24, 48, 72]);
  assertEquals(normalizeReminderHours(null), [24, 48, 72]);
});
