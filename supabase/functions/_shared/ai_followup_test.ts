import { assertEquals } from "https://deno.land/std@0.208.0/assert/assert_equals.ts";
import {
  DEFAULT_AI_FOLLOWUP,
  followupLabel,
  inSendWindowBR,
  type JourneyMessage,
  nextJourneyAction,
  normalizeFollowUpConfig,
} from "./ai-followup.ts";

const H = 3600000;
const T0 = Date.UTC(2026, 9, 7, 13, 0, 0); // 10h em Brasília
const cfg = normalizeFollowUpConfig({
  enabled: true,
  since: "2026-01-01T00:00:00Z",
  inactivity: { enabled: true, minutes: 60 },
  steps: [{ delay_hours: 72, goal: "retomar" }, { delay_hours: 288, goal: "última" }],
  auto_lost: { enabled: true, hours: 48 },
});
const kind = (msgs: JourneyMessage[], now: number) => {
  const a = nextJourneyAction(cfg, msgs, now).action;
  return a ? (a.kind === "step" ? `step${a.index + 1}` : a.kind) : null;
};
const base: JourneyMessage[] = [
  { atMs: T0 - 10 * 60000, fromMe: false },
  { atMs: T0, fromMe: true, byAi: true, text: "Quer que eu veja as datas de dezembro? 😊" }, // resposta da Bia (âncora)
];

Deno.test("normalizeFollowUpConfig: vazio usa o padrão; limites e ordem", () => {
  assertEquals(normalizeFollowUpConfig(null), DEFAULT_AI_FOLLOWUP);
  const c = normalizeFollowUpConfig({
    inactivity: { enabled: false, minutes: 1 },
    steps: [{ delay_hours: 300, goal: "b" }, { delay_hours: 24, goal: "" }],
    auto_lost: { enabled: false, hours: 99999 },
  });
  assertEquals(c.inactivity, { enabled: false, minutes: 5 });
  assertEquals(c.steps.map((s) => s.delay_hours), [24, 300]);
  assertEquals(c.steps[0].goal.length > 10, true); // objetivo vazio vira o padrão
  assertEquals(c.auto_lost, { enabled: false, hours: 2160 });
  assertEquals(normalizeFollowUpConfig({ steps: Array.from({ length: 9 }, (_, i) => ({ delay_hours: i + 1, goal: "x" })) }).steps.length, 6);
});

Deno.test("nextJourneyAction: inatividade, etapas e perdido", () => {
  assertEquals(kind(base, T0 + 30 * 60000), null); // ainda cedo
  assertEquals(kind(base, T0 + 61 * 60000), "inactivity");
  // Já mandou o lembrete: espera a etapa 1
  const reminded = [...base, { atMs: T0 + 61 * 60000, fromMe: true, followup: "inatividade" }];
  assertEquals(kind(reminded, T0 + 5 * H), null);
  assertEquals(kind(reminded, T0 + 72 * H), "step1");
  // Silêncio longo sem lembrete (ex.: madrugada): não manda inatividade atrasada
  assertEquals(kind(base, T0 + 13 * H), null);
  const s1 = [...reminded, { atMs: T0 + 72 * H, fromMe: true, followup: "etapa_1" }];
  assertEquals(kind(s1, T0 + 100 * H), null);
  assertEquals(kind(s1, T0 + 288 * H), "step2");
  const s2 = [...s1, { atMs: T0 + 288 * H, fromMe: true, followup: "etapa_2" }];
  assertEquals(kind(s2, T0 + 300 * H), null);
  assertEquals(kind(s2, T0 + 336 * H), "lost");
});

Deno.test("nextJourneyAction: cliente respondeu recomeça; cliente por último não manda nada", () => {
  const s1 = [...base, { atMs: T0 + 72 * H, fromMe: true, followup: "etapa_1" }];
  assertEquals(kind([...s1, { atMs: T0 + 73 * H, fromMe: false }], T0 + 80 * H), null);
  // Bia respondeu de novo: nova âncora, jornada do zero
  const again = [...s1, { atMs: T0 + 73 * H, fromMe: false }, { atMs: T0 + 73 * H + 60000, fromMe: true, byAi: true, text: "Combinado! E qual horário prefere?" }];
  assertEquals(kind(again, T0 + 74 * H + 120000), "inactivity");
  assertEquals(kind(again, T0 + 73 * H + 72 * H + 60000), "step1");
});

Deno.test("nextJourneyAction: duas etapas vencidas juntas respeitam o intervalo", () => {
  const s1 = [...base, { atMs: T0 + 300 * H, fromMe: true, followup: "etapa_1" }]; // etapa 1 saiu atrasada
  assertEquals(kind(s1, T0 + 301 * H), null);
  assertEquals(kind(s1, T0 + 312 * H), "step2");
});

Deno.test("nextJourneyAction: sem etapas, perdido conta da última resposta", () => {
  const c = normalizeFollowUpConfig({ enabled: true, since: "2026-01-01T00:00:00Z", inactivity: { enabled: false, minutes: 60 }, steps: [], auto_lost: { enabled: true, hours: 24 } });
  assertEquals(nextJourneyAction(c, base, T0 + 23 * H).action, null);
  assertEquals(nextJourneyAction(c, base, T0 + 24 * H).action, { kind: "lost" });
  const off = normalizeFollowUpConfig({ enabled: true, since: "2026-01-01T00:00:00Z", inactivity: { enabled: false, minutes: 60 }, steps: [], auto_lost: { enabled: false, hours: 24 } });
  assertEquals(nextJourneyAction(off, base, T0 + 999 * H).action, null);
});

Deno.test("followupLabel e inSendWindowBR", () => {
  assertEquals(followupLabel({ kind: "inactivity" }), "inatividade");
  assertEquals(followupLabel({ kind: "step", index: 1 }), "etapa_2");
  assertEquals(followupLabel({ kind: "lost" }), null);
  assertEquals(inSendWindowBR(Date.UTC(2026, 9, 7, 13)), true); // 10h
  assertEquals(inSendWindowBR(Date.UTC(2026, 9, 7, 10)), false); // 7h
  assertEquals(inSendWindowBR(Date.UTC(2026, 9, 8, 1)), false); // 22h
});

Deno.test("nextJourneyAction: desligado, antes de ligar, equipe e mensagem de encerramento", () => {
  // Chave geral desligada (padrão) ou sem data de ativação: nada
  assertEquals(nextJourneyAction(normalizeFollowUpConfig(null), base, T0 + 72 * H).action, null);
  assertEquals(normalizeFollowUpConfig({ enabled: true }).enabled, false);
  // Conversa parada antes de ligar o acompanhamento
  const late = normalizeFollowUpConfig({ ...cfg, since: new Date(T0 + H).toISOString() });
  assertEquals(nextJourneyAction(late, base, T0 + 72 * H).action, null);
  // Equipe escreveu depois do cliente
  assertEquals(kind([...base, { atMs: T0 + 60000, fromMe: true, byAi: false, text: "Oi! Aqui é a Ana" }], T0 + 72 * H), null);
  // Bia encerrou sem pergunta: sem lembrete de inatividade (etapas continuam)
  const closing: JourneyMessage[] = [{ atMs: T0 - 60000, fromMe: false }, { atMs: T0, fromMe: true, byAi: true, text: "Imagina! Qualquer coisa estou aqui 😊" }];
  assertEquals(kind(closing, T0 + 2 * H), null);
  assertEquals(kind(closing, T0 + 72 * H), "step1");
  // Depois dos materiais (PDF por último): lembrete vale
  const materials: JourneyMessage[] = [
    { atMs: T0 - 60000, fromMe: false },
    { atMs: T0, fromMe: true, byAi: true, text: "Vou te mostrar o espaço 😍👇" },
    { atMs: T0 + 60000, fromMe: true, byAi: true, isMedia: true },
  ];
  assertEquals(kind(materials, T0 + 2 * H), "inactivity");
});
