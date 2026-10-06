import { assertEquals } from "https://deno.land/std@0.208.0/assert/assert_equals.ts";
import { auditConversation, type RealMessage, realTranscript } from "./audit.ts";

const msg = (from_me: boolean, content: string, at: string, extra: Partial<RealMessage> = {}): RealMessage => ({
  from_me,
  content,
  message_type: "text",
  timestamp: `2026-10-06T${at}:00Z`,
  metadata: from_me ? { source: "ai_agent" } : null,
  ...extra,
});

Deno.test("realTranscript: vezes, texto da equipe fora, mídia da equipe conta, legenda", () => {
  const t = realTranscript([
    msg(false, "oi", "10:00"),
    msg(true, "Olha o espaço 📸", "10:01"),
    msg(true, "", "10:01", { message_type: "image" }),
    msg(true, "Oi, aqui é a Ana da equipe", "10:05", { metadata: { source: "platform" } }),
    msg(false, "legal", "10:06"),
    msg(false, "e o valor?", "10:06"),
    msg(true, "Fica R$ 5.000", "10:07"),
  ], false);
  assertEquals(t.map((e) => [e.who, e.kind || "", e.turn]), [
    ["cliente", "", 1],
    ["ia", "legenda", 1],
    ["ia", "image", 1],
    ["cliente", "", 2],
    ["cliente", "", 2],
    ["ia", "text", 2],
  ]);
});

Deno.test("auditConversation: acha 'te mandei' falso e ignora o que precisa das consultas", () => {
  const t = realTranscript([
    msg(false, "quero ver o espaço", "10:00"),
    msg(true, "Já te mandei as fotos! Fica R$ 9.999 😊", "10:01"),
  ], false);
  assertEquals(auditConversation(t, {}).map((c) => c.id), ["te_mandei"]);
  const ok = realTranscript([
    msg(false, "quero ver o espaço", "10:00"),
    msg(true, "", "10:01", { message_type: "image", metadata: { source: "platform" } }),
    msg(true, "Te mandei as fotos aqui em cima 😊", "10:02"),
  ], false);
  assertEquals(auditConversation(ok, {}), []);
});

Deno.test("auditConversation: permuta passada para a equipe não é problema", () => {
  const msgs = [msg(false, "sou influenciadora com 50 mil seguidores, faz em permuta?", "10:00"), msg(true, "Vou passar para a equipe avaliar 😊", "10:01")];
  assertEquals(auditConversation(realTranscript(msgs, true), {}), []);
  assertEquals(auditConversation(realTranscript(msgs, false), {}).map((c) => c.id), ["permuta_equipe"]);
});
