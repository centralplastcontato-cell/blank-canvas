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
// o estado não muda — o último estado avisado fica em provider_health.alerted_state.

// deno-lint-ignore no-explicit-any
type Json = Record<string, any>;

export type EvoState = "online" | "reconnecting" | "needs_qr" | "unreachable";

export const MAX_RECONNECT_ATTEMPTS = 3;
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
  reconnect: boolean;
  alert: "down" | "up" | null;
  recovered: boolean;
}

export function decideInstanceHealth(prev: HealthRow | null, observed: EvoState, opts: { serverDown?: boolean } = {}): HealthDecision {
  const wasDown = !!prev && prev.state !== "online" && prev.state !== "unknown";
  if (observed === "online") {
    return {
      state: "online",
      bad_checks: 0,
      reconnect_attempts: 0,
      reconnect: false,
      alert: prev?.alerted_state && prev.alerted_state !== "online" ? "up" : null,
      recovered: wasDown,
    };
  }
  const bad = (wasDown ? prev!.bad_checks : 0) + 1;
  let attempts = wasDown ? prev!.reconnect_attempts : 0;
  const reconnect = observed === "reconnecting" && attempts < MAX_RECONNECT_ATTEMPTS;
  if (reconnect) attempts += 1;
  const confirmed = observed === "needs_qr" || bad >= CONFIRM_CHECKS;
  // Servidor fora: o alerta do servidor cobre todos os números
  const alert = !opts.serverDown && confirmed && prev?.alerted_state !== observed ? "down" : null;
  return { state: observed, bad_checks: bad, reconnect_attempts: attempts, reconnect, alert, recovered: false };
}

export function decideServerHealth(prev: HealthRow | null, down: boolean): { state: "online" | "down"; bad_checks: number; alert: "down" | "up" | null } {
  if (!down) {
    return { state: "online", bad_checks: 0, alert: prev?.alerted_state === "down" ? "up" : null };
  }
  const bad = (prev?.state === "down" ? prev.bad_checks : 0) + 1;
  return { state: "down", bad_checks: bad, alert: bad >= CONFIRM_CHECKS && prev?.alerted_state !== "down" ? "down" : null };
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
    return `🔴 *Celebrei — número desconectado (precisa ler o QR)*\n\n${who} perdeu a sessão do WhatsApp desde ${fmt(since)}. Nada entra nem sai por ele.\n\n👉 Na plataforma: Configurações → Conexão → ${unit} → Conectar, e leia o QR Code no celular do número (WhatsApp → Aparelhos conectados → Conectar um aparelho).`;
  }
  if (state === "reconnecting") {
    return `🔴 *Celebrei — número caiu*\n\n${who} está sem conexão desde ${fmt(since)}. Tentei reconectar sozinho ${MAX_RECONNECT_ATTEMPTS}x e ainda não voltou.\n\n👉 Confira se o celular do número está ligado e com internet. Se continuar, reconecte pelo QR em Configurações → Conexão.`;
  }
  return `⚠️ *Celebrei — número sem resposta*\n\n${who}: a Evolution Go não está respondendo sobre este número desde ${fmt(since)}.`;
}

export function serverAlertText(kind: "down" | "up", since: string | null, units: string[]): string {
  const list = units.length ? units.join(", ") : "os números da Evolution";
  return kind === "down"
    ? `🚨 *Celebrei — servidor da Evolution Go fora do ar*\n\nDesde ${fmt(since)} o servidor da Evolution não responde. Afeta: ${list}. Nada entra nem sai por esses números.\n\n👉 Verifique o servidor (evolution-go.hubcelebrei.com.br).`
    : `🟢 *Celebrei — servidor da Evolution Go voltou*\n\nO servidor voltou a responder (fora desde ${fmt(since)}). Afeta: ${list}.`;
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
