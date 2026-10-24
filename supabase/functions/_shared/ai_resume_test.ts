import { assertEquals } from "https://deno.land/std@0.208.0/assert/assert_equals.ts";
import { RESUME_APOLOGY_AFTER_MS, resumeNote, resumeTooSoon } from "./ai-resume.ts";

Deno.test("retomada logo depois da falha: continua sem desculpas e manda os materiais", () => {
  const n = resumeNote({ gapMs: 5 * 60000, clientWaiting: false, materialsPending: true });
  assertEquals(n.includes("RETOMAR"), true);
  assertEquals(n.includes("Desculpa a demora"), false);
  assertEquals(n.includes("MATERIAIS NESTE TURNO"), true);
  assertEquals(n.includes("responda a ela primeiro"), false);
});

Deno.test("mais de 1 hora: pede desculpas; cliente escreveu: responde primeiro", () => {
  const n = resumeNote({ gapMs: RESUME_APOLOGY_AFTER_MS, clientWaiting: true, materialsPending: false });
  assertEquals(n.includes("Desculpa a demora"), true);
  assertEquals(n.includes("responda a ela primeiro"), true);
  assertEquals(n.includes("MATERIAIS"), false);
});

Deno.test("clique duplo: segunda retomada em menos de 1 min é barrada", () => {
  const now = Date.parse("2026-10-24T12:00:00Z");
  assertEquals(resumeTooSoon("2026-10-24T11:59:30Z", now), true);
  assertEquals(resumeTooSoon("2026-10-24T11:58:00Z", now), false);
  assertEquals(resumeTooSoon(undefined, now), false);
});
