import { assertEquals } from "https://deno.land/std@0.208.0/assert/assert_equals.ts";
import { parseGuestCount, pickPackagePdfs } from "./package-pdf.ts";

const p = (name: string, guest_count: number | null) => ({ name, guest_count });

Deno.test("PDF sem faixa vale para todos", () => {
  const r = pickPackagePdfs([p("geral", null), p("50", 50)], 80);
  assertEquals(r.pdfs.map((x) => x.name), ["geral"]);
});

Deno.test("faixa exata, faixa acima ou a maior", () => {
  const list = [p("70", 70), p("50", 50), p("100", 100)];
  assertEquals(pickPackagePdfs(list, 70).pdfs[0].name, "70");
  assertEquals(pickPackagePdfs(list, 60).pdfs[0].name, "70");
  assertEquals(pickPackagePdfs(list, 30).pdfs[0].name, "50");
  assertEquals(pickPackagePdfs(list, 150).pdfs[0].name, "100");
});

Deno.test("só PDFs por faixa e sem convidados: pede a quantidade", () => {
  assertEquals(pickPackagePdfs([p("50", 50)], null), { pdfs: [], needGuests: true });
});

Deno.test("lê o número dos convidados", () => {
  assertEquals(parseGuestCount("51 a 70 pessoas"), 51);
  assertEquals(parseGuestCount("80"), 80);
  assertEquals(parseGuestCount(""), null);
});
