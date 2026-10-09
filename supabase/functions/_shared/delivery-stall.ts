// Número que parou de entregar mensagens.
//
// A plataforma marca "enviado" quando o provedor (W-API/Z-API) aceita a
// mensagem; "entregue"/"lida" só quando o WhatsApp confirma. Quando a sessão do
// número quebra, o provedor continua aceitando e nada chega ao cliente — foi o
// que aconteceu com a VENDAS 2 em 09/10 (fotos, vídeo e PDF sem chegar desde o
// meio-dia; depois nem os textos). Ninguém percebeu até a cliente reclamar.
//
// Parou de entregar quando: 3+ mensagens enviadas há mais de 20 min, para 2+
// clientes diferentes, continuam só "enviadas" e nenhuma mensagem enviada
// depois delas foi entregue. Cliente com o celular desligado não dispara (é um
// cliente só). Vale para tudo e, separado, só para mídia (foto, vídeo, PDF,
// áudio), que costuma quebrar primeiro.

export const STALL_MIN_AGE_MS = 20 * 60 * 1000;
export const STALL_LOOKBACK_MS = 3 * 60 * 60 * 1000;
const MIN_STUCK = 3;
const MIN_CONVERSATIONS = 2;

const DELIVERED = new Set(["delivered", "read", "played"]);
const STUCK = new Set(["sent", "pending"]);
const MEDIA = new Set(["image", "video", "document", "audio"]);
// Avisos do sistema e reações não contam
const IGNORED_SOURCES = new Set(["system_alert", "reaction"]);

export interface OutgoingRow {
  status: string | null;
  timestamp: string;
  conversation_id: string;
  message_type?: string | null;
  metadata?: unknown;
}

export interface StallDecision {
  stalled: boolean;
  kind: "all" | "media" | null;
  since: string | null;
  stuck: number;
  conversations: number;
}

function check(rows: OutgoingRow[], nowMs: number): Omit<StallDecision, "kind"> {
  const ts = (r: OutgoingRow) => Date.parse(r.timestamp);
  const lastDelivered = rows.filter((r) => DELIVERED.has(r.status || "")).reduce((m, r) => Math.max(m, ts(r)), 0);
  const stuck = rows.filter((r) =>
    STUCK.has(r.status || "") && ts(r) > lastDelivered && nowMs - ts(r) >= STALL_MIN_AGE_MS
  );
  const conversations = new Set(stuck.map((r) => r.conversation_id)).size;
  const stalled = stuck.length >= MIN_STUCK && conversations >= MIN_CONVERSATIONS;
  const since = stuck.length ? new Date(Math.min(...stuck.map(ts))).toISOString() : null;
  return { stalled, since, stuck: stuck.length, conversations };
}

export function decideDeliveryStall(rows: OutgoingRow[], nowMs: number): StallDecision {
  const recent = rows.filter((r) => {
    const meta = (r.metadata && typeof r.metadata === "object" ? r.metadata : {}) as Record<string, unknown>;
    return nowMs - Date.parse(r.timestamp) <= STALL_LOOKBACK_MS && !IGNORED_SOURCES.has(String(meta.source || ""));
  });
  const all = check(recent, nowMs);
  if (all.stalled) return { ...all, kind: "all" };
  const media = check(recent.filter((r) => MEDIA.has(r.message_type || "")), nowMs);
  if (media.stalled) return { ...media, kind: "media" };
  return { stalled: false, kind: null, since: null, stuck: all.stuck, conversations: all.conversations };
}
