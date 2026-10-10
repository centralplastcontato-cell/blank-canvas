import { assertEquals } from "https://deno.land/std@0.208.0/assert/assert_equals.ts";
import {
  classifyEvolutionStatus,
  decideInstanceHealth,
  decideServerHealth,
  type HealthRow,
  instanceAlertText,
  pickResendable,
} from "./evolution-health.ts";

const row = (state: string, bad = 0, attempts = 0, alerted: string | null = null): HealthRow =>
  ({ state, bad_checks: bad, reconnect_attempts: attempts, alerted_state: alerted });

Deno.test("status da Evolution vira estado", () => {
  assertEquals(classifyEvolutionStatus({ ok: true, data: { data: { Connected: true, LoggedIn: true } } }), "online");
  assertEquals(classifyEvolutionStatus({ ok: true, data: { data: { Connected: false, LoggedIn: true } } }), "reconnecting");
  assertEquals(classifyEvolutionStatus({ ok: true, data: { data: { Connected: false, LoggedIn: false } } }), "needs_qr");
  assertEquals(classifyEvolutionStatus({ ok: true, data: { Connected: true, LoggedIn: true } }), "online");
  assertEquals(classifyEvolutionStatus({ ok: false }), "unreachable");
});

Deno.test("caiu com sessão: reconecta já, só alerta se continuar na checagem seguinte", () => {
  const first = decideInstanceHealth(row("online"), "reconnecting");
  assertEquals([first.reconnect, first.alert, first.reconnect_attempts, first.bad_checks], [true, null, 1, 1]);
  const second = decideInstanceHealth(row("reconnecting", 1, 1), "reconnecting");
  assertEquals([second.reconnect, second.alert, second.reconnect_attempts], [true, "down", 2]);
  // Já avisado: não repete; tentativas param em 3
  const fourth = decideInstanceHealth(row("reconnecting", 3, 3, "reconnecting"), "reconnecting");
  assertEquals([fourth.reconnect, fourth.alert], [false, null]);
});

Deno.test("queda rápida que a reconexão resolve: nenhum alerta", () => {
  const back = decideInstanceHealth(row("reconnecting", 1, 1), "online");
  assertEquals([back.alert, back.recovered, back.reconnect_attempts], [null, true, 0]);
});

Deno.test("precisa de QR: alerta na hora e não tenta reconectar", () => {
  const d = decideInstanceHealth(row("online"), "needs_qr");
  assertEquals([d.reconnect, d.alert], [false, "down"]);
  // de "reconectando" (já avisado) para "precisa de QR": avisa de novo (é outra situação)
  assertEquals(decideInstanceHealth(row("reconnecting", 3, 3, "reconnecting"), "needs_qr").alert, "down");
  assertEquals(decideInstanceHealth(row("needs_qr", 5, 0, "needs_qr"), "needs_qr").alert, null);
});

Deno.test("voltou: avisa só se tinha avisado a queda", () => {
  assertEquals(decideInstanceHealth(row("needs_qr", 4, 0, "needs_qr"), "online").alert, "up");
  assertEquals(decideInstanceHealth(row("online", 0, 0, "online"), "online").alert, null);
  assertEquals(decideInstanceHealth(null, "online").alert, null);
});

Deno.test("servidor fora: alerta do servidor no lugar do de cada número", () => {
  assertEquals(decideInstanceHealth(row("unreachable", 1), "unreachable", { serverDown: true }).alert, null);
  assertEquals(decideServerHealth(null, true).alert, null);
  assertEquals(decideServerHealth(row("down", 1), true).alert, "down");
  assertEquals(decideServerHealth(row("down", 2, 0, "down"), true).alert, null);
  assertEquals(decideServerHealth(row("down", 3, 0, "down"), false).alert, "up");
  assertEquals(decideServerHealth(row("online"), false).alert, null);
});

Deno.test("texto do alerta", () => {
  const t = instanceAlertText("down", "needs_qr", "VENDAS 2", "2026-10-09T23:00:00Z");
  assertEquals(t.includes("VENDAS 2") && t.includes("QR"), true);
  const up = instanceAlertText("up", "online", "VENDAS 2", "2026-10-09T23:00:00Z", { resent: 2, stuck: 1 });
  assertEquals(up.includes("2 mensagem(ns)") && up.includes("1 mensagem(ns)"), true);
});

Deno.test("reenvio: só o que falhou nas últimas 2h, sem nada mais novo na conversa", () => {
  const now = Date.parse("2026-10-09T23:00:00Z");
  const evo = (extra: Record<string, unknown> = {}) => ({ provider: "evolution", resend: { action: "send-text", message: "oi" }, ...extra });
  const rows = [
    { id: "a", conversation_id: "c1", timestamp: "2026-10-09T22:30:00Z", status: "error", metadata: evo() },
    { id: "b", conversation_id: "c1", timestamp: "2026-10-09T22:31:00Z", status: "error", metadata: evo() },
    { id: "old", conversation_id: "c2", timestamp: "2026-10-09T20:00:00Z", status: "error", metadata: evo() },
    { id: "done", conversation_id: "c3", timestamp: "2026-10-09T22:40:00Z", status: "error", metadata: evo({ resent_at: "x" }) },
    { id: "later", conversation_id: "c4", timestamp: "2026-10-09T22:40:00Z", status: "error", metadata: evo() },
    { id: "zapi", conversation_id: "c5", timestamp: "2026-10-09T22:40:00Z", status: "error", metadata: { provider: "zapi", resend: {} } },
    { id: "sent", conversation_id: "c6", timestamp: "2026-10-09T22:40:00Z", status: "sent", metadata: evo() },
  ];
  const picked = pickResendable(rows, { c4: "2026-10-09T22:50:00Z" }, now).map((r) => r.id);
  assertEquals(picked, ["a", "b"]);
});
