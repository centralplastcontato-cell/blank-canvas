import { assertEquals } from "https://deno.land/std@0.208.0/assert/assert_equals.ts";
import { formatLeadUtm, sanitizeLeadUtm } from "./lead-utm.ts";

Deno.test("sanitizeLeadUtm: mantém só os 4 campos conhecidos", () => {
  assertEquals(
    sanitizeLeadUtm({ utm_source: "meta", utm_medium: "pago", utm_campaign: "mes-criancas", utm_content: "conj-1", utm_term: "x", foo: 1 }),
    { utm_source: "meta", utm_medium: "pago", utm_campaign: "mes-criancas", utm_content: "conj-1" },
  );
});

Deno.test("sanitizeLeadUtm: ignora vazio, não-texto e corta textos longos", () => {
  assertEquals(sanitizeLeadUtm(null), null);
  assertEquals(sanitizeLeadUtm("meta"), null);
  assertEquals(sanitizeLeadUtm({ utm_source: "  ", utm_medium: 3 }), null);
  assertEquals(sanitizeLeadUtm({ utm_campaign: "a".repeat(150) })?.utm_campaign?.length, 100);
});

Deno.test("formatLeadUtm: resumo para o histórico", () => {
  assertEquals(formatLeadUtm({ utm_source: "meta", utm_campaign: "mes-criancas" }), "meta / mes-criancas");
  assertEquals(formatLeadUtm(null), null);
});
