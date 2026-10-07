import { assertEquals } from "https://deno.land/std@0.208.0/assert/assert_equals.ts";
import {
  clientPostponed,
  DEFAULT_AI_FOLLOWUP,
  journeyOwns,
  partyReference,
  yearHintFrom,
  followupLabel,
  inSendWindowBR,
  type JourneyContext,
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

Deno.test("journeyOwns: só conversas que a jornada pode atender saem dos follow-ups fixos", () => {
  assertEquals(journeyOwns(cfg, base), true);
  // Desligado, parada antes de ligar, equipe respondeu, cliente falou por último: continuam nos fixos
  assertEquals(journeyOwns(normalizeFollowUpConfig(null), base), false);
  assertEquals(journeyOwns(normalizeFollowUpConfig({ ...cfg, since: new Date(T0 + H).toISOString() }), base), false);
  assertEquals(journeyOwns(cfg, [...base, { atMs: T0 + 60000, fromMe: true, byAi: false }]), false);
  assertEquals(journeyOwns(cfg, [...base, { atMs: T0 + 60000, fromMe: false }]), false);
  // Jornada já concluída (perdido desligado) continua sendo dela: nada de fixo por cima
  const done = normalizeFollowUpConfig({ ...cfg, auto_lost: { enabled: false, hours: 48 } });
  const all = [...base, { atMs: T0 + 72 * H, fromMe: true, followup: "etapa_1" }, { atMs: T0 + 288 * H, fromMe: true, followup: "etapa_2" }];
  assertEquals(journeyOwns(done, all), true);
});

const D = 24 * H;
// Mariana chega em 7/10/2026, festa em 13/03/2027 (distante)
const far = normalizeFollowUpConfig({
  enabled: true,
  since: "2026-01-01T00:00:00Z",
  inactivity: { enabled: false, minutes: 60 },
  steps: [{ delay_hours: 24, goal: "a" }, { delay_hours: 96, goal: "b" }, { delay_hours: 240, goal: "c" }],
  auto_lost: { enabled: true, hours: 168 },
  far_months: 3,
  reactivation: { enabled: true, days_before: [30, 60] },
});
const ctxOf = (dataFesta: string | null, mes: string | null = null, clientTexts: string[] = []): JourneyContext => ({ dataFesta, mes, clientTexts });
const farCtx = ctxOf("2027-03-13");
const run = (cfg: ReturnType<typeof normalizeFollowUpConfig>, msgs: JourneyMessage[], now: number, ctx: JourneyContext) => {
  const a = nextJourneyAction(cfg, msgs, now, ctx).action;
  return a ? (a.kind === "step" ? `step${a.index + 1}` : a.kind === "reactivation" ? `reativacao_${a.daysBefore}` : a.kind) : null;
};
const plan = (msgs: JourneyMessage[], now: number, ctx: JourneyContext = farCtx) => run(far, msgs, now, ctx);
const partyAt = (ymd: string) => Date.parse(`${ymd}T12:00:00-03:00`);

Deno.test("festa distante: só a 1ª etapa, lembretes 60 e 30 dias antes e só então perdido", () => {
  assertEquals(plan(base, T0 + D), "step1");
  const s1 = [...base, { atMs: T0 + D, fromMe: true, followup: "etapa_1" }];
  assertEquals(plan(s1, T0 + 30 * D), null);
  assertEquals(nextJourneyAction(far, s1, T0 + 30 * D, farCtx).nextDueMs, partyAt("2027-03-13") - 60 * D);
  const r60At = partyAt("2027-03-13") - 60 * D;
  assertEquals(plan(s1, r60At - H), null);
  assertEquals(plan(s1, r60At + H), "reativacao_60");
  // O marcador continua até o envio (se algo impedir o envio, a conversa é achada de novo)
  assertEquals(nextJourneyAction(far, s1, r60At + H, farCtx).nextDueMs, r60At);
  const r60 = [...s1, { atMs: r60At + H, fromMe: true, followup: "reativacao_60" }];
  const r30At = partyAt("2027-03-13") - 30 * D;
  assertEquals(plan(r60, r30At + H), "reativacao_30");
  const r30 = [...r60, { atMs: r30At + H, fromMe: true, followup: "reativacao_30" }];
  assertEquals(plan(r30, r30At + 3 * D), null);
  assertEquals(plan(r30, r30At + 8 * D), "lost");
});

Deno.test("festa próxima: todas as etapas; lembrete só com folga depois da última etapa", () => {
  // Festa em 45 dias: etapas 1/4/10 dias; o de 30 dias (dia 15) fica colado na despedida (dia 10) → pula; perdido
  const nearCtx = ctxOf("2026-11-21");
  const s3 = [
    ...base,
    { atMs: T0 + D, fromMe: true, followup: "etapa_1" },
    { atMs: T0 + 4 * D, fromMe: true, followup: "etapa_2" },
    { atMs: T0 + 10 * D, fromMe: true, followup: "etapa_3" },
  ];
  assertEquals(plan(base, T0 + D, nearCtx), "step1");
  assertEquals(plan(s3, T0 + 18 * D, nearCtx), "lost");
  // Festa em 75 dias: o de 30 dias (dia 45) tem folga e sai antes do perdido
  const ctx75 = ctxOf("2026-12-21");
  assertEquals(plan(s3, T0 + 18 * D, ctx75), null);
  assertEquals(plan(s3, partyAt("2026-12-21") - 30 * D + H, ctx75), "reativacao_30");
});

Deno.test("vou pensar, data que passou, sem data e lembretes desligados", () => {
  // "vou pensar" com festa e lembrete à frente: só a 1ª etapa
  const s1 = [...base, { atMs: T0 + D, fromMe: true, followup: "etapa_1" }];
  assertEquals(plan(s1, T0 + 5 * D, ctxOf("2026-12-21", null, ["legal, vou pensar"])), null);
  // ... sem lembrete à frente (sem data): segue todas as etapas
  assertEquals(plan(s1, T0 + 5 * D, ctxOf(null, null, ["legal, vou pensar"])), "step2");
  // Lembretes desligados: festa distante segue todas as etapas
  const off = normalizeFollowUpConfig({ ...far, reactivation: { enabled: false, days_before: [60, 30] } });
  assertEquals(run(off, s1, T0 + 5 * D, farCtx), "step2");
  // Data exata que já passou: etapas normais (sem lembrete) e perdido depois da última
  const old = ctxOf("2026-05-10");
  assertEquals(plan(base, T0 + H, old), null);
  assertEquals(plan(base, T0 + D, old), "step1");
  // Sem data: etapas e perdido como antes
  const s3 = [...s1, { atMs: T0 + 4 * D, fromMe: true, followup: "etapa_2" }, { atMs: T0 + 10 * D, fromMe: true, followup: "etapa_3" }];
  assertEquals(plan(s3, T0 + 18 * D, ctxOf(null)), "lost");
  // Lembrete atrasado mais de 7 dias (sistema fora do ar) não sai
  assertEquals(plan(s1, partyAt("2027-03-13") - 60 * D + 8 * D), null);
});

Deno.test("só o mês: conta a partir de quando a conversa parou; ano dito pelo cliente vale", () => {
  // Parou em 7/10 com "outubro": a referência continua 15/10/2026 mesmo em novembro (não pula para 2027)
  assertEquals(nextJourneyAction(far, base, Date.UTC(2026, 10, 2, 13), ctxOf(null, "Outubro")).party, { ymd: "2026-10-15", exact: false });
  // "dezembro do ano que vem"
  assertEquals(nextJourneyAction(far, base, T0 + D, ctxOf(null, "Dezembro", ["é só ano que vem, em dezembro"])).party, { ymd: "2027-12-15", exact: false });
  assertEquals(nextJourneyAction(far, base, T0 + D, ctxOf(null, "Março")).party, { ymd: "2027-03-15", exact: false });
  // "2026" com "março" (já passou em outubro/2026) não joga a festa para trás
  assertEquals(nextJourneyAction(far, base, T0 + D, ctxOf(null, "Março", ["seria em 2026 mesmo"])).party, { ymd: "2027-03-15", exact: false });
});

Deno.test("partyReference, yearHintFrom e clientPostponed", () => {
  assertEquals(partyReference("2027-03-13", "Março", "2026-10-07"), { ymd: "2027-03-13", exact: true });
  assertEquals(partyReference(null, "Março", "2026-10-07"), { ymd: "2027-03-15", exact: false });
  assertEquals(partyReference(null, "Dezembro", "2026-10-07"), { ymd: "2026-12-15", exact: false });
  assertEquals(partyReference(null, "Dezembro", "2026-10-07", 2027), { ymd: "2027-12-15", exact: false });
  assertEquals(partyReference(null, "", "2026-10-07"), null);
  assertEquals(yearHintFrom(["a festa vai ser em 2027"], "2026-10-07"), 2027);
  assertEquals(yearHintFrom(["oi"], "2026-10-07"), null);
  assertEquals(clientPostponed(["Legal, vou pensar e te falo"]), true);
  assertEquals(clientPostponed(["a festa é só ano que vem"]), true);
  assertEquals(clientPostponed(["quero mais pra frente"]), true);
  // Frases do dia a dia não contam
  assertEquals(clientPostponed(["ainda não sei quantos convidados"]), false);
  assertEquals(clientPostponed(["sem pressa, pode mandar"]), false);
  assertEquals(clientPostponed(["vou ver com meu marido e já te respondo hoje"]), false);
  assertEquals(clientPostponed(["depois eu vejo o pdf"]), false);
  assertEquals(normalizeFollowUpConfig({ reactivation: { enabled: true, days_before: [30, 60, 30, 999] } }).reactivation.days_before, [180, 60, 30]);
});
