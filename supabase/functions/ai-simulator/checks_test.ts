import { assertEquals } from "https://deno.land/std@0.208.0/assert/assert_equals.ts";
import { deterministicChecks, listedPartyDates, passed, type RuleCheck, type TranscriptEntry } from "./checks.ts";

const byId = (checks: RuleCheck[]) => Object.fromEntries(checks.map((c) => [c.id, c.ok]));
const KNOWLEDGE = "Pode levar comida/bolo de fora?: Não, é tudo do buffet\nAnimal de estimação: Não pode";

Deno.test("te_mandei: disse que mandou sem o material ter saído", () => {
  const bad: TranscriptEntry[] = [
    { who: "cliente", text: "quero a festa no feriado", turn: 1 },
    { who: "ia", text: "Já te mandei as fotos, o vídeo e o PDF! Qual o mês? 😊", kind: "text", turn: 1 },
  ];
  assertEquals(byId(deterministicChecks({ transcript: bad })).te_mandei, false);
  const ok: TranscriptEntry[] = [
    { who: "cliente", text: "oi", turn: 1 },
    { who: "ia", text: "Olha o nosso espaço 📸", kind: "legenda", turn: 1 },
    { who: "ia", text: "", kind: "image", turn: 1 },
    { who: "ia", text: "Te mandei as fotos aqui em cima! 😍", kind: "text", turn: 1 },
  ];
  assertEquals(byId(deterministicChecks({ transcript: ok })).te_mandei, true);
  assertEquals(byId(deterministicChecks({ transcript: [{ who: "ia", text: "Oi! 😊", kind: "text", turn: 1 }] })).te_mandei, null);
});

Deno.test("datas_da_agenda: data listada tem de vir da agenda", () => {
  const list = "Olha as datas 🎉\n📅 Sábado, 5 de dezembro\n☀️ Almoço (13h às 17h)\n📅 Domingo, 6 de dezembro\n🌙 Noite (19h às 23h)\nQual prefere?";
  assertEquals(listedPartyDates(list), ["5 de dezembro", "6 de dezembro"]);
  // Horário de visita (sem ☀️/🌙) não entra
  assertEquals(listedPartyDates("📅 Quarta, 8 de outubro às 14h\nPode ser?"), []);
  const tool = "consultar_datas_livres({\"mes\":12})\n→ Linhas prontas:\n📅 Sábado, 5 de dezembro\n☀️ Almoço (13h às 17h)";
  const t = (toolText: string): TranscriptEntry[] => [
    { who: "cliente", text: "datas em dezembro?", turn: 1 },
    { who: "ferramenta", text: toolText, turn: 1 },
    { who: "ia", text: list, kind: "text", turn: 1 },
  ];
  assertEquals(byId(deterministicChecks({ transcript: t(tool) })).datas_da_agenda, false);
  assertEquals(byId(deterministicChecks({ transcript: t(`${tool}\n📅 Domingo, 6 de dezembro\n🌙 Noite`) })).datas_da_agenda, true);
});

Deno.test("datas_da_agenda: visita e data dada pelo cliente não reprovam", () => {
  const visita: TranscriptEntry[] = [
    { who: "cliente", text: "quero visitar", turn: 1 },
    { who: "ia", text: "Oba! Tenho estes horários de visita:\n📅 Quinta, 8 de outubro\n🌙 noite (19h)\nPode ser? 😊", kind: "text", turn: 1 },
  ];
  assertEquals(byId(deterministicChecks({ transcript: visita })).datas_da_agenda, null);
  const cliente: TranscriptEntry[] = [
    { who: "cliente", text: "quero dia 05/12 a noite", turn: 1 },
    { who: "ia", text: "Anotei 🎉\n📅 Sábado, 5 de dezembro\n🌙 Noite (19h às 23h)\nQuantos convidados?", kind: "text", turn: 1 },
  ];
  assertEquals(byId(deterministicChecks({ transcript: cliente })).datas_da_agenda, true);
});

Deno.test("regra_do_buffet: segue o cadastro de comida de fora", () => {
  const t = (reply: string): TranscriptEntry[] => [
    { who: "cliente", text: "quero contratar um carrinho de sorvete de fora, pode?", turn: 1 },
    { who: "ia", text: reply, kind: "text", turn: 1 },
  ];
  assertEquals(byId(deterministicChecks({ transcript: t("Pode sim contratar o carrinho de sorvete de fora! 🍦") }, { knowledge: KNOWLEDGE })).regra_do_buffet, false);
  assertEquals(byId(deterministicChecks({ transcript: t("Aqui não pode, é tudo do buffet 😊") }, { knowledge: KNOWLEDGE })).regra_do_buffet, true);
  assertEquals(byId(deterministicChecks({ transcript: t("Infelizmente não, aqui é tudo do buffet 😊 Qualquer dúvida, fique à vontade!") }, { knowledge: KNOWLEDGE })).regra_do_buffet, true);
  // Sem cadastro: não se aplica
  assertEquals(byId(deterministicChecks({ transcript: t("Pode sim! 🍦") })).regra_do_buffet, null);
});

Deno.test("dia_da_semana: data com dia errado reprova", () => {
  // 17/10/2026 é sábado
  const t = (reply: string): TranscriptEntry[] => [{ who: "ia", text: reply, kind: "text", turn: 1 }];
  assertEquals(byId(deterministicChecks({ transcript: t("Tenho a sexta-feira, 17 de outubro, disponível") }, { todayYmd: "2026-10-06" })).dia_da_semana, false);
  assertEquals(byId(deterministicChecks({ transcript: t("Tenho o sábado, 17 de outubro, disponível") }, { todayYmd: "2026-10-06" })).dia_da_semana, true);
  assertEquals(byId(deterministicChecks({ transcript: t("Oi! 😊") }, { todayYmd: "2026-10-06" })).dia_da_semana, null);
});

Deno.test("passed: avaliador só comenta, não reprova", () => {
  const code: RuleCheck = { id: "valores_conferidos", label: "", ok: true, note: "" };
  const judge: RuleCheck = { id: "objetivo_cenario", label: "", ok: false, note: "", advisory: true };
  assertEquals(passed([code, judge]), true);
  assertEquals(passed([{ ...code, ok: false }, judge]), false);
  assertEquals(passed([{ ...judge, advisory: undefined }]), false);
});

Deno.test("permuta_equipe: proposta de permuta tem de ir para a equipe", () => {
  const base: TranscriptEntry[] = [
    { who: "cliente", text: "sou influenciadora com 50 mil seguidores, faz em permuta?", turn: 1 },
    { who: "ia", text: "Que legal! Sobre a permuta, eu não consigo confirmar por aqui 😊", kind: "text", turn: 1 },
  ];
  assertEquals(byId(deterministicChecks({ transcript: base })).permuta_equipe, false);
  const ok: TranscriptEntry[] = [...base, { who: "ferramenta", text: 'transferir_para_atendente({"motivo":"permuta"})\n→ OK', turn: 1 }];
  assertEquals(byId(deterministicChecks({ transcript: ok })).permuta_equipe, true);
  assertEquals(byId(deterministicChecks({ transcript: [{ who: "cliente", text: "oi", turn: 1 }] })).permuta_equipe, null);
});
