import { assertEquals } from "https://deno.land/std@0.208.0/assert/assert_equals.ts";
import { buildCandidateLink, candidateName, inviteCode, shortCandidateLink, withCandidateLink } from "./ai-candidate.ts";

Deno.test("link do cadastro: domínio do buffet, nome, WhatsApp, funções e via=bia", () => {
  const url = buildCandidateLink({
    domain: "https://castelodadiversao.online/",
    companySlug: "castelo-da-diversao",
    templateSlug: "candidatura",
    name: "Victor Hugo",
    phone: "+55 (15) 99999-0000",
    roles: "garçom, monitor",
  });
  assertEquals(url, "https://castelodadiversao.online/freelancer/castelo-da-diversao/candidatura?nome=Victor+Hugo&tel=5515999990000&vagas=gar%C3%A7om%2C+monitor&via=bia");
  const p = new URL(url!).searchParams;
  assertEquals([p.get("nome"), p.get("tel"), p.get("vagas"), p.get("via")], ["Victor Hugo", "5515999990000", "garçom, monitor", "bia"]);
});

Deno.test("link do cadastro: sem domínio ou slug não monta; campos vazios ficam de fora", () => {
  assertEquals(buildCandidateLink({ domain: "", companySlug: "c", templateSlug: "t" }), null);
  assertEquals(buildCandidateLink({ domain: "x.com", companySlug: "", templateSlug: "t" }), null);
  assertEquals(buildCandidateLink({ domain: "x.com", companySlug: "c", templateSlug: "t", name: "🌸🌸", phone: "123" }), "https://x.com/freelancer/c/t?via=bia");
});

Deno.test("nome do WhatsApp: tira emoji e número", () => {
  assertEquals(candidateName("🌸 Ju Souza ✨"), "Ju Souza");
  assertEquals(candidateName("+55 15 99999-0000"), "");
  assertEquals(candidateName(null), "");
});

Deno.test("link vai no fim pelo sistema; link escrito pela IA sai", () => {
  const url = "https://x.com/freelancer/c/t?via=bia";
  assertEquals(
    withCandidateLink("Que legal, Victor! 😊\n\nÉ só preencher o cadastro rapidinho 👇", url),
    `Que legal, Victor! 😊\n\nÉ só preencher o cadastro rapidinho\n\n👉 ${url}`,
  );
  assertEquals(
    withCandidateLink("Preenche aqui: https://errado.com/form\n\nObrigada! 💜", url),
    `Preenche aqui:\n\nObrigada! 💜\n\n👉 ${url}`,
  );
  assertEquals(withCandidateLink("", url), `👉 ${url}`);
});

Deno.test("link curto: código de 6 caracteres sem confusão e www sem https", () => {
  const code = inviteCode(new Uint8Array([0, 1, 30, 31, 255, 100, 7]));
  assertEquals(code.length, 6);
  assertEquals(/^[2-9a-hjkmnp-z]{6}$/.test(code), true);
  assertEquals(shortCandidateLink("https://www.castelodadiversao.com.br/", "k7m2qx"), "www.castelodadiversao.com.br/trabalhe/k7m2qx");
  assertEquals(shortCandidateLink("buffet.online", "k7m2qx"), "https://buffet.online/trabalhe/k7m2qx");
  assertEquals(shortCandidateLink("", "k7m2qx"), null);
  // Link "www." escrito pela IA também sai
  assertEquals(withCandidateLink("Preenche: www.errado.com/x", "www.a.com/trabalhe/k7m2qx"), "Preenche:\n\n👉 www.a.com/trabalhe/k7m2qx");
});
