import { assertEquals } from "https://deno.land/std@0.208.0/assert/assert_equals.ts";
import { brPhoneVariants, findLeadByPhone } from "./lead-phone.ts";

const sorted = (xs: string[]) => [...xs].sort();

Deno.test("variants: LP format (no 55) matches the WhatsApp format (with 55)", () => {
  const fromLp = brPhoneVariants("15974000152");
  const fromBot = brPhoneVariants("5515974000152");
  assertEquals(sorted(fromLp), sorted(fromBot));
  assertEquals(fromLp.includes("5515974000152"), true);
  assertEquals(fromBot.includes("15974000152"), true);
});

Deno.test("variants: with and without the ninth digit", () => {
  const v = brPhoneVariants("(15) 97400-0152");
  for (const expected of ["15974000152", "5515974000152", "1574000152", "551574000152"]) {
    assertEquals(v.includes(expected), true, `faltou ${expected}`);
  }
  assertEquals(brPhoneVariants("551574000152").includes("5515974000152"), true);
});

Deno.test("variants: empty or too short input", () => {
  assertEquals(brPhoneVariants(""), []);
  assertEquals(brPhoneVariants(null), []);
  assertEquals(brPhoneVariants("12345"), ["12345"]);
});

// Cliente falso só para verificar os filtros aplicados na consulta
function fakeSupabase(rows: Record<string, unknown>[], calls: Record<string, unknown>) {
  const q = {
    select(cols: string) { calls.select = cols; return q; },
    eq(col: string, val: unknown) { calls[`eq:${col}`] = val; return q; },
    in(col: string, vals: string[]) { calls[`in:${col}`] = vals; return q; },
    order() { return q; },
    limit() { return Promise.resolve({ data: rows, error: null }); },
  };
  return { from(table: string) { calls.table = table; return q; } };
}

Deno.test("findLeadByPhone: searches the whole company by exact variants", async () => {
  const calls: Record<string, unknown> = {};
  const lead = await findLeadByPhone(fakeSupabase([{ id: "l1" }], calls), "c1", "15974000152", "id");
  assertEquals(lead, { id: "l1" });
  assertEquals(calls.table, "campaign_leads");
  assertEquals(calls["eq:company_id"], "c1");
  assertEquals((calls["in:whatsapp"] as string[]).includes("5515974000152"), true);
  assertEquals("eq:unit" in calls, false); // nunca restringe à unidade
});

Deno.test("findLeadByPhone: no company or phone returns null without querying", async () => {
  const calls: Record<string, unknown> = {};
  assertEquals(await findLeadByPhone(fakeSupabase([], calls), null, "15974000152"), null);
  assertEquals(await findLeadByPhone(fakeSupabase([], calls), "c1", ""), null);
  assertEquals(calls.table, undefined);
});
