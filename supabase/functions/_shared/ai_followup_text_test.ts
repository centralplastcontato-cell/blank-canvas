import { assertEquals } from "https://deno.land/std@0.208.0/assert/assert_equals.ts";
import { checkFollowUpText, followUpInstruction, repeatsLastQuestion } from "./ai-followup-text.ts";

const opts = { previousAssistantTexts: ["🏰 *Castelo* — R$ 7.400,00"], sentMaterials: new Set<"fotos" | "video" | "pacotes">(["fotos"]), todayYmd: "2026-10-07" };

Deno.test("checkFollowUpText: valores só os já passados, sem menu, sem 'te mandei' falso", () => {
  assertEquals(checkFollowUpText("Oi, Victor! Conseguiu ver as fotos? 😍", opts).ok, true);
  assertEquals(checkFollowUpText("O Castelo continua R$ 7.400 para sua data 🎉", opts), { ok: true, text: "O Castelo continua R$ 7.400,00 para sua data 🎉" });
  assertEquals(checkFollowUpText("Fechando hoje fica R$ 6.900,00!", opts).ok, false);
  assertEquals(checkFollowUpText("Escolha:\n1️⃣ Visita\n2️⃣ Dúvidas", opts).ok, false);
  assertEquals(checkFollowUpText("Te mandei o vídeo, viu? 😊", opts).ok, false);
  assertEquals(checkFollowUpText("  ", opts).ok, false);
  // Material que não saiu (só as fotos saíram) e escassez inventada
  assertEquals(checkFollowUpText("Conseguiu ver o vídeo do espaço? 🎬", opts).ok, false);
  assertEquals(checkFollowUpText("Conseguiu ver o PDF?", opts).ok, false);
  assertEquals(checkFollowUpText("Corre que são as últimas vagas de dezembro!", opts).ok, false);
  assertEquals(checkFollowUpText("As datas estão quase esgotando 😱", opts).ok, false);
  assertEquals(checkFollowUpText("Dezembro tem muita procura, viu?", opts).ok, false);
  assertEquals(checkFollowUpText("As datas de março estão saindo rápido!", opts).ok, false);
  assertEquals(checkFollowUpText("Ficou alguma dúvida sobre a festa? Posso te ajudar com a data 😊", opts).ok, true);
  // Aspas em volta saem; dia da semana errado é corrigido (18/12/2026 é sexta)
  assertEquals(checkFollowUpText("\"E aí, ainda pensando em sábado, 18 de dezembro?\"", opts).text, "E aí, ainda pensando em sexta, 18 de dezembro?");
});

Deno.test("followUpInstruction: objetivo, agenda real e valores", () => {
  const base = { kind: "step" as const, stepNumber: 1, stepsTotal: 2, goal: "Convidar para visita.", silenceMs: 72 * 3600000, todayYmd: "2026-10-07", valuesAlreadyGiven: false, materialsSent: [] as Array<"fotos" | "video" | "pacotes"> };
  const free = followUpInstruction({ ...base, partyYmd: "2026-12-18", partyDateFree: ["almoço (13h)", "noite (19h)"] });
  assertEquals(free.includes("Convidar para visita."), true);
  assertEquals(free.includes("3 dias"), true);
  assertEquals(free.includes("ainda está disponível neste momento (almoço (13h) ou noite (19h))"), true);
  assertEquals(free.includes("NÃO cite valores"), true);
  const taken = followUpInstruction({ ...base, partyYmd: "2026-12-18", partyDateFree: [], valuesAlreadyGiven: true });
  assertEquals(taken.includes("NÃO está mais disponível"), true);
  assertEquals(taken.includes("os mesmos que você já passou"), true);
  const inactive = followUpInstruction({ ...base, kind: "inactivity", silenceMs: 60 * 60000 });
  assertEquals(inactive.includes("há 60 minutos"), true);
  const second = followUpInstruction({ ...base, kind: "inactivity", reminderNumber: 2, silenceMs: 200 * 60000 });
  assertEquals(second.includes("2º lembrete"), true);
  assertEquals(second.includes("sem repetir o 1º"), true);
  assertEquals(inactive.includes("Nenhum material"), true);
  assertEquals(followUpInstruction({ ...base, materialsSent: ["fotos", "pacotes"] }).includes("as fotos do espaço, o PDF dos pacotes"), true);
});

Deno.test("followUpInstruction: lembrete antes da festa com data livre, ocupada ou só o mês", () => {
  const base = { kind: "reactivation" as const, daysBefore: 60, silenceMs: 90 * 86400000, todayYmd: "2027-01-12", valuesAlreadyGiven: false, materialsSent: [] as Array<"fotos" | "video" | "pacotes"> };
  const alt = "🗓️ Sábado, 6 de março\n🌙 Noite (19h às 23h)";
  const free = followUpInstruction({ ...base, partyYmd: "2027-03-13", partyExact: true, partyDateFree: ["almoço (13h)"] });
  assertEquals(free.includes("faltam cerca de 60 dias"), true);
  assertEquals(free.includes("ainda está disponível neste momento"), true);
  const taken = followUpInstruction({ ...base, partyYmd: "2027-03-13", partyExact: true, partyDateFree: [], alternatives: alt });
  assertEquals(taken.includes("NÃO está mais disponível (foi reservada)"), true);
  assertEquals(taken.includes(alt), true);
  const month = followUpInstruction({ ...base, partyYmd: "2027-03-15", partyExact: false, partyMonth: "Março", partyDateFree: null, alternatives: alt });
  assertEquals(month.includes("falou só do mês"), true);
  assertEquals(month.includes(alt), true);
});

Deno.test("lembrete não repete a pergunta da última mensagem", () => {
  const last = "E aí, o que achou do nosso espaço? 😍";
  assertEquals(repeatsLastQuestion("Ana, o que você achou do espaço para a festinha de 1 aninho da sua bebê? 🥳", last), true);
  assertEquals(repeatsLastQuestion("Ana, quer vir conhecer o Castelo de pertinho? Tenho sábado às 10h ou domingo às 11h 😍", last), false);
  assertEquals(repeatsLastQuestion("Oi! Tudo bem? 😊", "Que bom! 🎉"), false);
  const r = checkFollowUpText("Ana, o que você achou do espaço para a festinha? 🥳", { previousAssistantTexts: ["Olha as fotos", last], sentMaterials: new Set(), todayYmd: "2026-10-08" });
  assertEquals(r.ok, false);
});
