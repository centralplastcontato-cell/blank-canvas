import { assertEquals } from "https://deno.land/std@0.208.0/assert/assert_equals.ts";
import {
  aliveCheckHealthy,
  classifyEvolutionStatus,
  decideInstanceHealth,
  decideServerHealth,
  type HealthRow,
  instanceAlertText,
  isConfirmedDown,
  pickResendable,
  reminderDue,
  reminderText,
  serverAlertText,
  skipLoggedOutCheck,
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
  // Uma tentativa só (com o servidor travado reconectar não resolve)
  const second = decideInstanceHealth(row("reconnecting", 1, 1), "reconnecting");
  assertEquals([second.reconnect, second.alert, second.reconnect_attempts], [false, "down", 1]);
  const third = decideInstanceHealth(row("reconnecting", 2, 1, "reconnecting"), "reconnecting");
  assertEquals([third.reconnect, third.alert], [false, null]);
});

Deno.test("queda rápida que a reconexão resolve: nenhum alerta", () => {
  const back = decideInstanceHealth(row("reconnecting", 1, 1), "online");
  assertEquals([back.alert, back.recovered, back.reconnect_attempts], [null, true, 0]);
});

Deno.test("precisa de QR: alerta na hora e não tenta reconectar", () => {
  const d = decideInstanceHealth(row("online"), "needs_qr");
  assertEquals([d.reconnect, d.alert], [false, "down"]);
  // já avisou a queda: trocar de "reconectando"/"sem resposta" para "precisa de QR" (e vice-versa) não repete
  assertEquals(decideInstanceHealth(row("reconnecting", 3, 3, "reconnecting"), "needs_qr").alert, null);
  assertEquals(decideInstanceHealth(row("needs_qr", 3, 0, "needs_qr"), "unreachable").alert, null);
  assertEquals(decideInstanceHealth(row("unreachable", 4, 0, "needs_qr"), "needs_qr").alert, null);
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

Deno.test("provável travamento: alerta já, com a instrução do Coolify", () => {
  assertEquals(decideServerHealth(null, true, { confirmNow: true }).alert, "down");
  assertEquals(decideServerHealth(null, true).alert, null);
  const t = serverAlertText("down", "2026-10-12T02:45:00Z", ["VENDAS 1", "celebrei-go"], { suspect: true });
  assertEquals(t.includes("provável travamento") && t.includes("Coolify") && t.includes("VENDAS 1, celebrei-go"), true);
  assertEquals(isConfirmedDown({ state: "needs_qr", bad_checks: 1 }), true);
  assertEquals(isConfirmedDown({ state: "unreachable", bad_checks: 1 }), false);
  assertEquals(isConfirmedDown({ state: "unreachable", bad_checks: 2 }), true);
  assertEquals(isConfirmedDown({ state: "online", bad_checks: 0 }), false);
});

Deno.test("lembrete de hora em hora enquanto não resolve", () => {
  const now = Date.parse("2026-10-13T12:00:00Z");
  assertEquals(reminderDue({ alerted_state: "needs_qr", alerted_at: "2026-10-13T10:59:00Z" }, true, now), true);
  assertEquals(reminderDue({ alerted_state: "needs_qr", alerted_at: "2026-10-13T11:30:00Z" }, true, now), false);
  assertEquals(reminderDue({ alerted_state: "needs_qr", alerted_at: "2026-10-13T10:00:00Z" }, false, now), false);
  assertEquals(reminderDue({ alerted_state: "online", alerted_at: "2026-10-13T10:00:00Z" }, true, now), false);
  assertEquals(reminderDue(null, true, now), false);
  const t = reminderText("instance", "needs_qr", "VENDAS 1", "2026-10-13T10:10:00Z", now);
  assertEquals(t.includes("VENDAS 1") && t.includes("1h50") && t.includes("QR"), true);
});

Deno.test("checagem /user/check: só vale 200 + 1 usuário + IsInWhatsapp + rápido", () => {
  const ok = { message: "success", data: { Users: [{ Query: "5515991336278", IsInWhatsapp: true, JID: "5515991336278@s.whatsapp.net" }] } };
  assertEquals(aliveCheckHealthy({ ok: true, status: 200, data: ok, ms: 800 }), true);
  // falha interna: 200 com data null
  assertEquals(aliveCheckHealthy({ ok: true, status: 200, data: { message: "success", data: null }, ms: 800 }), false);
  assertEquals(aliveCheckHealthy({ ok: true, status: 200, data: { data: { Users: [] } }, ms: 800 }), false);
  assertEquals(aliveCheckHealthy({ ok: true, status: 200, data: { data: { Users: [{ IsInWhatsapp: false }] } }, ms: 800 }), false);
  assertEquals(aliveCheckHealthy({ ok: true, status: 200, data: ok, ms: 15000 }), false);
  assertEquals(aliveCheckHealthy({ ok: false, status: 401, data: null, ms: 100 }), false);
  assertEquals(aliveCheckHealthy({ ok: false, ms: 15001 }), false);
});

Deno.test("deslogado já avisado: checa só a cada 30 min (não deixa o QR girando)", () => {
  const now = Date.parse("2026-10-13T12:00:00Z");
  const r = (state: string, alerted: string | null, last: string) => ({ state, alerted_state: alerted, last_check_at: last });
  assertEquals(skipLoggedOutCheck(r("needs_qr", "needs_qr", "2026-10-13T11:45:00Z"), now), true);
  assertEquals(skipLoggedOutCheck(r("needs_qr", "needs_qr", "2026-10-13T11:29:00Z"), now), false);
  // ainda não avisado: checa normal (precisa confirmar e avisar)
  assertEquals(skipLoggedOutCheck(r("needs_qr", null, "2026-10-13T11:58:00Z"), now), false);
  assertEquals(skipLoggedOutCheck(r("unreachable", "unreachable", "2026-10-13T11:58:00Z"), now), false);
  assertEquals(skipLoggedOutCheck(null, now), false);
});
