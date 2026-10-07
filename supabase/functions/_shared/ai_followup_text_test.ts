import { assertEquals } from "https://deno.land/std@0.208.0/assert/assert_equals.ts";
import { checkFollowUpText, followUpInstruction } from "./ai-followup-text.ts";

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
  assertEquals(inactive.includes("Nenhum material"), true);
  assertEquals(followUpInstruction({ ...base, materialsSent: ["fotos", "pacotes"] }).includes("as fotos do espaço, o PDF dos pacotes"), true);
});
