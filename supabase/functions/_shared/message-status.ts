// Tradução dos avisos de status (tiques) enviados pela W-API e pela Z-API para o
// status que guardamos em wapi_messages.status.

const STATUS_MAP: Record<string, string> = {
  "0": "error", "1": "pending", "2": "sent", "3": "delivered", "4": "read",
  PENDING: "pending", SENT: "sent", SERVER_ACK: "sent",
  DELIVERY: "delivered", DELIVERY_ACK: "delivered", DELIVERED: "delivered",
  // Z-API: "RECEIVED" é o "entregue" (dois tiques cinza). Sem ele, toda mensagem
  // entregue e ainda não lida ficava com um tique só na plataforma.
  RECEIVED: "delivered",
  READ: "read", READ_SELF: "read",
  ERROR: "error", FAILED: "error",
};

// PLAYED e READ_BY_ME ficam de fora de propósito: PLAYED só vale para áudio
// (tratado à parte) e READ_BY_ME é o buffet lendo a mensagem do cliente.
export function mapProviderMessageStatus(status: unknown, ack: unknown): string {
  for (const v of [status, ack]) {
    if (v === null || v === undefined) continue;
    const key = String(v).trim().toUpperCase();
    if (STATUS_MAP[key]) return STATUS_MAP[key];
  }
  return "unknown";
}

export function isPlayedStatus(status: unknown, ack: unknown): boolean {
  return [status, ack].some((v) => typeof v === "string" && v.trim().toUpperCase() === "PLAYED");
}

const STATUS_RANK: Record<string, number> = { pending: 1, sent: 2, delivered: 3, read: 4 };

// Status que podem ser substituídos por `next` sem regredir (um "entregue"
// atrasado não pode apagar o "lido"). Erro só vale para o que ainda não saiu.
export function statusesBelow(next: string): string[] {
  if (next === "error") return ["pending", "sent"];
  const rank = STATUS_RANK[next] ?? 0;
  const lower = Object.keys(STATUS_RANK).filter((s) => STATUS_RANK[s] < rank);
  // "error" pode ser corrigido por qualquer confirmação posterior do WhatsApp
  return rank >= STATUS_RANK.sent ? [...lower, "error"] : lower;
}

// Filtro PostgREST (.or) das linhas que podem receber o novo status.
export function statusUpdateFilter(next: string): string {
  const lower = statusesBelow(next);
  return lower.length > 0 ? `status.is.null,status.in.(${lower.join(",")})` : "status.is.null";
}

export function collectStatusMessageIds(messageId: unknown, ids: unknown): string[] {
  const out: string[] = [];
  const push = (v: unknown) => {
    if (typeof v === "string" && v.trim() && !out.includes(v.trim())) out.push(v.trim());
  };
  push(messageId);
  if (Array.isArray(ids)) ids.forEach(push);
  return out;
}
