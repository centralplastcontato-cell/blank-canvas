// Saúde dos números da Evolution Go (monitor a cada 5 min + eventos do webhook).
//
// Estados de um número:
//   online       — Connected e LoggedIn
//   reconnecting — caiu a conexão mas a sessão existe (LoggedIn): tenta /instance/reconnect
//   needs_qr     — sessão perdida (LoggedIn=false): só alerta, precisa ler o QR
//   unreachable  — a Evolution não respondeu sobre este número
// O servidor inteiro fora (nenhum número responde) vira um alerta só, do servidor.
//
// Alertas: "caiu" quando a queda se confirma (2 checagens seguidas, ou na hora
// se precisa de QR); "voltou" só se antes saiu o "caiu". Nada se repete enquanto
// o número não volta — o último estado avisado fica em provider_health.alerted_state.

// deno-lint-ignore no-explicit-any
type Json = Record<string, any>;

export type EvoState = "online" | "reconnecting" | "needs_qr" | "unreachable";

// Uma tentativa só: com o servidor travado o /instance/reconnect não resolve
// ("no active session found") — a saída é reiniciar o evolution-go no Coolify
export const MAX_RECONNECT_ATTEMPTS = 1;
export const CONFIRM_CHECKS = 2;
export const RESEND_WINDOW_MS = 2 * 60 * 60 * 1000;
export const RESEND_LIMIT = 20;

export function classifyEvolutionStatus(res: { ok: boolean; data?: unknown }): EvoState {
  if (!res.ok) return "unreachable";
  const raw = (res.data || {}) as Json;
  const d = (raw.data && typeof raw.data === "object" ? raw.data : raw) as Json;
  if (d.Connected === true && d.LoggedIn === true) return "online";
  if (d.LoggedIn === false) return "needs_qr";
  return "reconnecting";
}

/** Resposta do /user/check saudável: 200, 1 usuário, IsInWhatsapp=true, em menos de 15 s */
export function aliveCheckHealthy(res: { ok: boolean; status?: number; data?: unknown; ms?: number }, timeoutMs = 15000): boolean {
  if (!res.ok || (res.status !== undefined && res.status !== 200)) return false;
  if (typeof res.ms === "number" && res.ms >= timeoutMs) return false;
  const inner = (res.data as Json | null)?.data as Json | null;
  const users = inner?.Users ?? inner?.users;
  const u = Array.isArray(users) && users.length === 1 ? users[0] as Json : null;
  return !!u && (u.IsInWhatsapp ?? u.IsInWhatsApp ?? u.isInWhatsapp ?? u.exists) === true;
}

// Número deslogado já avisado: consultar o status (ou o /user/check) faz a
// Evolution reabrir o ciclo de QR (um QR novo a cada ~2 min). Até alguém
// reconectar, ele é checado só a cada 30 min (o evento "Connected" do webhook
// dispara a checagem na hora quando reconectam).
export const LOGGED_OUT_CHECK_EVERY_MS = 30 * 60 * 1000;
export function skipLoggedOutCheck(row: { state?: string | null; alerted_state?: string | null; last_check_at?: string | null } | null, nowMs: number): boolean {
  // Número fora e já avisado (sem sessão, sem resposta ou reconectando): cada
  // consulta pode reiniciar o cliente na Evolution e gastar conexões do banco
  // dela (14/10) — só a cada 30 min; a volta é vista pelo tráfego no meio-tempo
  if (!row || !row.state || row.state === "online" || row.state === "unknown") return false;
  if (!row.alerted_state || row.alerted_state === "online" || !row.last_check_at) return false;
  return nowMs - Date.parse(row.last_check_at) < LOGGED_OUT_CHECK_EVERY_MS;
}

export interface HealthRow {
  state: string;
  bad_checks: number;
  reconnect_attempts: number;
  alerted_state: string | null;
}

export interface HealthDecision {
  state: EvoState;
  bad_checks: number;
  reconnect_attempts: number;
  /** Recuperação a tentar agora: reconnect (sessão existe) ou connect (sessão parada) */
  recover: "reconnect" | "connect" | null;
  alert: "down" | "up" | null;
  recovered: boolean;
}

// Cada reinício do cliente na Evolution abre um pool novo de conexões com o
// banco dela e não fecha o anterior (14/10: 42 reinícios no VENDAS 1 e 31 no
// VENDAS 2 esgotaram o Postgres → "too many clients" → 401 em tudo). Por isso:
// uma recuperação por queda e no máximo 3 por número por dia.
export const MAX_RECOVERIES_PER_DAY = 3;
const DAY_MS = 24 * 3600 * 1000;

export function recoveriesInLastDay(log: unknown, nowMs: number): string[] {
  return (Array.isArray(log) ? log : []).filter((t): t is string => typeof t === "string" && nowMs - Date.parse(t) < DAY_MS);
}

/**
 * Banco da Evolution esgotado: 401 para um token que já funcionava ou erro com
 * "too many clients". Não adianta reconectar (só piora): reiniciar o serviço.
 */
export function looksLikeDbExhausted(res: { ok: boolean; status?: number; error?: string; data?: unknown }, tokenWorkedBefore: boolean): boolean {
  if (res.ok) return false;
  let body = String(res.error || "");
  try {
    body += " " + JSON.stringify(res.data ?? "");
  } catch { /* ignora */ }
  if (/too many clients/i.test(body)) return true;
  return res.status === 401 && tokenWorkedBefore;
}

export function decideInstanceHealth(
  prev: HealthRow | null,
  observed: EvoState,
  opts: { serverDown?: boolean; dbExhausted?: boolean; recoveriesToday?: number } = {},
): HealthDecision {
  const wasDown = !!prev && prev.state !== "online" && prev.state !== "unknown";
  if (observed === "online") {
    return {
      state: "online",
      bad_checks: 0,
      reconnect_attempts: 0,
      recover: null,
      alert: prev?.alerted_state && prev.alerted_state !== "online" ? "up" : null,
      recovered: wasDown,
    };
  }
  const bad = (wasDown ? prev!.bad_checks : 0) + 1;
  let attempts = wasDown ? prev!.reconnect_attempts : 0;
  // Só com a queda confirmada (2 checagens, 5+ min): logo depois de um
  // "Disconnected" a Evolution já está reconectando sozinha e uma chamada nossa
  // abre uma 2ª conexão ("StreamReplaced", VENDAS 1 13/10 18:47)
  const confirmed = bad >= CONFIRM_CHECKS;
  const canRecover = confirmed && !opts.serverDown && !opts.dbExhausted &&
    attempts < MAX_RECONNECT_ATTEMPTS && (opts.recoveriesToday ?? 0) < MAX_RECOVERIES_PER_DAY;
  // Sessão existe e caiu a conexão → reconnect; cliente parado (ex.: depois de
  // reiniciar o servidor) → connect, que volta logado sem QR se a sessão está salva
  const recover = !canRecover ? null : observed === "reconnecting" ? "reconnect" : observed === "needs_qr" ? "connect" : null;
  if (recover) attempts += 1;
  // Servidor/banco fora: o aviso do servidor cobre. Um aviso de queda por vez.
  // Com uma recuperação tentando agora, o aviso espera a próxima checagem
  // (só pede QR se o connect não resolver)
  const alreadyWarned = !!prev?.alerted_state && prev.alerted_state !== "online";
  const alert = !opts.serverDown && !opts.dbExhausted && confirmed && !alreadyWarned && !recover ? "down" : null;
  return { state: observed, bad_checks: bad, reconnect_attempts: attempts, recover, alert, recovered: false };
}

/**
 * Servidor: "down" quando nada responde, ou travamento provável (2+ números da
 * Evolution caídos juntos — 12/10 23h45 o servidor travou e derrubou VENDAS 1 e
 * celebrei-go). confirmNow: a queda dos números já foi confirmada, alerta já.
 */
export function decideServerHealth(prev: HealthRow | null, down: boolean, opts: { confirmNow?: boolean } = {}): { state: "online" | "down"; bad_checks: number; alert: "down" | "up" | null } {
  if (!down) {
    return { state: "online", bad_checks: 0, alert: prev?.alerted_state === "down" ? "up" : null };
  }
  const bad = (prev?.state === "down" ? prev.bad_checks : 0) + 1;
  const confirmed = opts.confirmNow || bad >= CONFIRM_CHECKS;
  return { state: "down", bad_checks: bad, alert: confirmed && prev?.alerted_state !== "down" ? "down" : null };
}

/** Número com queda confirmada (conta para o "provável travamento") */
export function isConfirmedDown(d: { state: EvoState; bad_checks: number }): boolean {
  return d.state !== "online" && d.bad_checks >= CONFIRM_CHECKS;
}

export const SUSPECT_MIN_DOWN = 2;
export const REMINDER_EVERY_MS = 60 * 60 * 1000;

/** Lembrete: já avisou a queda, continua fora e o último aviso tem 60+ min */
export function reminderDue(row: { alerted_state?: string | null; alerted_at?: string | null } | null, stillDown: boolean, nowMs: number): boolean {
  if (!row || !stillDown || !row.alerted_state || row.alerted_state === "online" || !row.alerted_at) return false;
  return nowMs - Date.parse(row.alerted_at) >= REMINDER_EVERY_MS;
}

function elapsed(since: string | null | undefined, nowMs: number): string {
  if (!since) return "";
  const min = Math.max(1, Math.round((nowMs - Date.parse(since)) / 60000));
  return min < 60 ? `${min} min` : `${Math.floor(min / 60)}h${String(min % 60).padStart(2, "0")}`;
}

const fmt = (iso: string | null | undefined) =>
  iso
    ? new Date(iso).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })
    : "agora há pouco";

export function instanceAlertText(kind: "down" | "up", state: EvoState, unit: string, since: string | null, extra: { stuck?: number; resent?: number } = {}): string {
  const who = `*${unit || "WhatsApp"}* (Evolution Go)`;
  if (kind === "up") {
    const lines = [`🟢 *Celebrei — número voltou*`, ``, `${who} está conectado de novo (fora desde ${fmt(since)}).`];
    if (extra.resent) lines.push(`🔁 ${extra.resent} mensagem(ns) que falharam na queda foram reenviadas.`);
    if (extra.stuck) lines.push(`⚠️ ${extra.stuck} mensagem(ns) ficaram como "enviada" sem confirmação nesse período — vale conferir na Central.`);
    return lines.join("\n");
  }
  if (state === "needs_qr") {
    return `🔴 *Celebrei — número desconectado (precisa ler o QR)*\n\n${who} perdeu a sessão do WhatsApp desde ${fmt(since)}. Nada entra nem sai por ele.\n\n👉 Confira no Hub (Configurações → Conexão) se o ${unit} aparece Desconectado. Se sim: Conectar e leia o QR Code no celular do número (WhatsApp → Aparelhos conectados → Conectar um aparelho). Se estiver Online, mande uma mensagem de teste antes de mexer.`;
  }
  if (state === "reconnecting") {
    return `🔴 *Celebrei — número caiu*\n\n${who} está sem conexão desde ${fmt(since)}. Tentei reconectar sozinho e não voltou.\n\n👉 Confira se o celular do número está ligado e com internet. Verifique no Hub se o número está Online e mande uma mensagem de teste. Só reconecte pelo QR se o Hub mostrar Desconectado.`;
  }
  return `⚠️ *Celebrei — número sem resposta*\n\n${who}: a Evolution Go não está respondendo sobre este número desde ${fmt(since)}.`;
}

export const COOLIFY_HINT = "👉 Reinicie o serviço *evolution-go* no Coolify.";

export function serverAlertText(kind: "down" | "up", since: string | null, units: string[], opts: { suspect?: boolean; dbExhausted?: boolean } = {}): string {
  const list = units.length ? units.join(", ") : "os números da Evolution";
  if (kind === "down" && opts.dbExhausted) {
    return `🚨 *Celebrei — Evolution Go com banco esgotado*\n\nDesde ${fmt(since)} a Evolution está recusando os números por falta de conexão com o banco dela ("too many clients"). Afeta: ${list}. Não adianta reconectar nem ler QR.\n\n${COOLIFY_HINT}`;
  }
  if (kind === "up") {
    return `🟢 *Celebrei — Evolution Go normalizada*\n\nOs números voltaram a funcionar (fora desde ${fmt(since)}). Afeta: ${list}.`;
  }
  return opts.suspect
    ? `🚨 *Celebrei — provável travamento da Evolution Go*\n\n${list} caíram ao mesmo tempo (desde ${fmt(since)}). Quando vários números caem juntos, normalmente é o servidor da Evolution que travou.\n\n${COOLIFY_HINT}`
    : `🚨 *Celebrei — servidor da Evolution Go fora do ar*\n\nDesde ${fmt(since)} o servidor da Evolution não responde. Afeta: ${list}. Nada entra nem sai por esses números.\n\n${COOLIFY_HINT}`;
}

/** Lembrete de hora em hora enquanto não resolve */
export function reminderText(what: "server" | "instance", state: string, unit: string, since: string | null, nowMs: number): string {
  const tempo = elapsed(since, nowMs);
  if (what === "server") {
    return `⏰ *Lembrete — Evolution Go continua com problema*\n\n${unit} seguem fora desde ${fmt(since)}${tempo ? ` (há ${tempo})` : ""}.\n\n${COOLIFY_HINT}`;
  }
  const how = state === "needs_qr"
    ? `👉 Configurações → Conexão → ${unit} → Conectar e ler o QR Code no celular do número.`
    : `👉 Confira o celular do número (ligado e com internet). Se vários números estiverem fora, reinicie o serviço *evolution-go* no Coolify.`;
  return `⏰ *Lembrete — ${unit} continua fora*\n\n*${unit}* (Evolution Go) está fora desde ${fmt(since)}${tempo ? ` (há ${tempo})` : ""}.\n\n${how}`;
}

// ─── Reenvio do que falhou durante a queda ─────────────────────────────────

export interface FailedRow {
  id: string;
  conversation_id: string;
  timestamp: string;
  status: string | null;
  metadata: Json | null;
}

/**
 * Mensagens que falharam por queda e podem ser reenviadas: das últimas 2h,
 * ainda não reenviadas, e só se nada nosso mais novo saiu na conversa (para não
 * chegar fora de ordem). No máximo RESEND_LIMIT, das mais antigas para as novas.
 */
export function pickResendable(rows: FailedRow[], newestOkOutgoingByConv: Record<string, string>, nowMs: number): FailedRow[] {
  return rows
    .filter((r) => r.status === "error")
    .filter((r) => r.metadata?.provider === "evolution" && r.metadata?.resend && !r.metadata?.resent_at)
    .filter((r) => nowMs - Date.parse(r.timestamp) <= RESEND_WINDOW_MS)
    .filter((r) => {
      const newest = newestOkOutgoingByConv[r.conversation_id];
      return !newest || Date.parse(newest) <= Date.parse(r.timestamp);
    })
    .sort((a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp))
    .slice(0, RESEND_LIMIT);
}
