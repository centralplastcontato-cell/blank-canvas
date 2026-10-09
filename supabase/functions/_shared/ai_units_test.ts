import { assertEquals } from "https://deno.land/std@0.208.0/assert/assert_equals.ts";
import { aiUnitFor, aiUnits } from "./ai-units.ts";

const settings = {
  unit: "VENDAS 3",
  activated_at: "2026-10-08T17:44:00Z",
  extra_units: [{ unit: "VENDAS 2", activated_at: "2026-10-09T15:00:00Z" }, { unit: "vendas 3", activated_at: "x" }, { unit: "" }],
};

Deno.test("aiUnits: principal primeiro, extras sem repetir", () => {
  assertEquals(aiUnits(settings), [
    { unit: "VENDAS 3", activated_at: "2026-10-08T17:44:00Z" },
    { unit: "VENDAS 2", activated_at: "2026-10-09T15:00:00Z" },
  ]);
  assertEquals(aiUnits({ unit: "VENDAS 3", activated_at: null }), [{ unit: "VENDAS 3", activated_at: null }]);
  assertEquals(aiUnits(null), []);
});

Deno.test("aiUnitFor: cada número com a sua data de liberação", () => {
  assertEquals(aiUnitFor(settings, "Vendas 2")?.activated_at, "2026-10-09T15:00:00Z");
  assertEquals(aiUnitFor(settings, "VENDAS 3")?.activated_at, "2026-10-08T17:44:00Z");
  assertEquals(aiUnitFor(settings, "VENDAS 1"), null);
  assertEquals(aiUnitFor({ unit: "VENDAS 3", extra_units: "lixo" }, "VENDAS 3")?.unit, "VENDAS 3");
});
