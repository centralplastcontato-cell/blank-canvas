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
  RESEND_PER_RUN,
  looksLikeDbExhausted,
  recoveriesInLastDay,
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

Deno.test("caiu com sessão: espera a Evolution reconectar sozinha; 1 reconnect na 2ª checagem e aviso na seguinte", () => {
  const first = decideInstanceHealth(row("online"), "reconnecting");
  assertEquals([first.recover, first.alert, first.reconnect_attempts, first.bad_checks], [null, null, 0, 1]);
  const second = decideInstanceHealth(row("reconnecting", 1, 0), "reconnecting");
  assertEquals([second.recover, second.alert, second.reconnect_attempts], ["reconnect", null, 1]);
  const third = decideInstanceHealth(row("reconnecting", 2, 1), "reconnecting");
  assertEquals([third.recover, third.alert], [null, "down"]);
  const fourth = decideInstanceHealth(row("reconnecting", 3, 1, "reconnecting"), "reconnecting");
  assertEquals([fourth.recover, fourth.alert], [null, null]);
});

Deno.test("limite de recuperações: 3 por dia — passou disso, só avisa", () => {
  const d = decideInstanceHealth(row("reconnecting", 1, 0), "reconnecting", { recoveriesToday: 3 });
  assertEquals([d.recover, d.alert], [null, "down"]);
});

Deno.test("banco da Evolution esgotado: nunca reconecta e o aviso é do servidor", () => {
  const d = decideInstanceHealth(row("unreachable", 1, 0), "unreachable", { dbExhausted: true });
  assertEquals([d.recover, d.alert], [null, null]);
  assertEquals(looksLikeDbExhausted({ ok: false, status: 401, error: "not authorized" }, true), true);
  assertEquals(looksLikeDbExhausted({ ok: false, status: 401, error: "not authorized" }, false), false);
  assertEquals(looksLikeDbExhausted({ ok: false, status: 500, error: "pq: sorry, too many clients already" }, false), true);
  assertEquals(looksLikeDbExhausted({ ok: true, status: 200 }, true), false);
  const t = serverAlertText("down", "2026-10-14T15:05:00Z", ["VENDAS 1", "VENDAS 2"], { dbExhausted: true });
  assertEquals(t.includes("banco esgotado") && t.includes("Coolify"), true);
});

Deno.test("recuperações do último dia", () => {
  const now = Date.parse("2026-10-14T18:00:00Z");
  assertEquals(recoveriesInLastDay(["2026-10-14T10:00:00Z", "2026-10-13T17:00:00Z", 5, null], now), ["2026-10-14T10:00:00Z"]);
  assertEquals(recoveriesInLastDay(undefined, now), []);
});

Deno.test("queda rápida que a reconexão resolve: nenhum alerta", () => {
  const back = decideInstanceHealth(row("reconnecting", 1, 1), "online");
  assertEquals([back.alert, back.recovered, back.reconnect_attempts], [null, true, 0]);
});

Deno.test("sem sessão: connect na 2ª checagem; QR só se o connect não resolver", () => {
  const first = decideInstanceHealth(row("online"), "needs_qr");
  assertEquals([first.recover, first.alert], [null, null]);
  const second = decideInstanceHealth(row("needs_qr", 1), "needs_qr");
  assertEquals([second.recover, second.alert], ["connect", null]);
  const third = decideInstanceHealth(row("needs_qr", 2, 1), "needs_qr");
  assertEquals([third.recover, third.alert], [null, "down"]);
  // já avisou a queda: trocar de estado de queda não repete
  assertEquals(decideInstanceHealth(row("reconnecting", 3, 1, "reconnecting"), "needs_qr").alert, null);
  assertEquals(decideInstanceHealth(row("needs_qr", 3, 1, "needs_qr"), "unreachable").alert, null);
  assertEquals(decideInstanceHealth(row("needs_qr", 5, 1, "needs_qr"), "needs_qr").alert, null);
  // sem resposta (provável servidor/banco): não tenta recuperar
  assertEquals(decideInstanceHealth(row("unreachable", 1), "unreachable").recover, null);
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

Deno.test("fila de reenvio: validade por tipo e limite por rodada", () => {
  const now = Date.parse("2026-10-09T23:00:00Z");
  const evo = (source: string, extra: Record<string, unknown> = {}) => ({ provider: "evolution", source, resend: { action: "send-text", message: "oi" }, ...extra });
  const at = (minAgo: number) => new Date(now - minAgo * 60000).toISOString();
  const rows = [
    { id: "ia-ok", conversation_id: "c1", timestamp: at(10), status: "error", metadata: evo("ai_agent") },
    { id: "ia-velha", conversation_id: "c2", timestamp: at(20), status: "error", metadata: evo("ai_agent") },
    { id: "equipe-velha", conversation_id: "c3", timestamp: at(40), status: "error", metadata: evo("platform") },
    { id: "fu-ok", conversation_id: "c4", timestamp: at(150), status: "error", metadata: evo("follow-up") },
    { id: "camp-velha", conversation_id: "c5", timestamp: at(200), status: "error", metadata: evo("campaign") },
    { id: "ja-foi", conversation_id: "c6", timestamp: at(5), status: "error", metadata: evo("ai_agent", { resent_at: "x" }) },
    { id: "ja-vencida", conversation_id: "c7", timestamp: at(50), status: "error", metadata: evo("ai_agent", { resend_expired_at: "x" }) },
    { id: "mais-nova-saiu", conversation_id: "c8", timestamp: at(5), status: "error", metadata: evo("ai_agent") },
    { id: "zapi", conversation_id: "c9", timestamp: at(5), status: "error", metadata: { provider: "zapi", resend: {} } },
    { id: "enviada", conversation_id: "c10", timestamp: at(5), status: "sent", metadata: evo("ai_agent") },
  ];
  const r = pickResendable(rows, { c8: at(1) }, now);
  assertEquals(r.send.map((x) => x.id), ["fu-ok", "ia-ok"]);
  assertEquals(r.expired.map((x) => x.id).sort(), ["camp-velha", "equipe-velha", "ia-velha"]);
  // no máximo 5 por rodada
  const many = Array.from({ length: 8 }, (_, i) => ({ id: `m${i}`, conversation_id: `k${i}`, timestamp: at(8 - i), status: "error", metadata: evo("ai_agent") }));
  assertEquals(pickResendable(many, {}, now).send.length, RESEND_PER_RUN);
});

Deno.test("provável travamento: alerta já, com a instrução do Coolify", () => {
  assertEquals(decideServerHealth(null, true, { confirmNow: true }).alert, "down");
  assertEquals(decideServerHealth(null, true).alert, null);
  const t = serverAlertText("down", "2026-10-12T02:45:00Z", ["VENDAS 1", "celebrei-go"], { suspect: true });
  assertEquals(t.includes("provável travamento") && t.includes("Coolify") && t.includes("VENDAS 1, celebrei-go"), true);
  assertEquals(isConfirmedDown({ state: "needs_qr", bad_checks: 1 }), false);
  assertEquals(isConfirmedDown({ state: "needs_qr", bad_checks: 2 }), true);
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
  // qualquer queda já avisada também (cada consulta pode reiniciar o cliente na Evolution)
  assertEquals(skipLoggedOutCheck(r("unreachable", "unreachable", "2026-10-13T11:58:00Z"), now), true);
  assertEquals(skipLoggedOutCheck(r("online", "online", "2026-10-13T11:58:00Z"), now), false);
  assertEquals(skipLoggedOutCheck(null, now), false);
});
