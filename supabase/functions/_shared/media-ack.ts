// Confirmação de envio de mídia (Z-API).
//
// A Z-API aceita o pedido de foto/vídeo/PDF/áudio na hora e só depois baixa o
// arquivo e manda para o WhatsApp. Se essa parte falha, não volta erro nenhum:
// simplesmente nunca chega o aviso "SENT" (um tique). Por isso a mídia é
// gravada como "pending" e só vira "sent" quando o aviso chega; sem aviso, o
// follow-up-check tenta de novo uma vez (envios automáticos) e depois marca
// "error" e avisa a equipe.

// Ações de mídia acompanhadas
export const MEDIA_ACK_ACTIONS = ["send-image", "send-video", "send-document", "send-audio"] as const;
export type MediaAckAction = typeof MEDIA_ACK_ACTIONS[number];

// Quanto esperar o aviso do WhatsApp antes de considerar que não saiu. Vídeo
// grande (10 MB) levou ~30 s nos testes.
export const MEDIA_ACK_TIMEOUT_MS = 3 * 60 * 1000;

// Status que provam que o WhatsApp recebeu a mídia
export const CONFIRMED_STATUSES = ["sent", "delivered", "read"];

export interface MediaAckMeta {
  ack?: "awaiting" | "confirmed" | "failed";
  automation?: boolean;
  retry_of?: string | null; // id (wapi_messages.id) do envio original
  retried_by?: string | null; // message_id do reenvio
  resend?: { action: MediaAckAction; mediaUrl: string; caption?: string; fileName?: string } | null;
}

/** Metadata gravada junto com a mídia enviada, para conferir/reenviar depois */
export function mediaAckMetadata(
  action: MediaAckAction,
  payload: { mediaUrl?: string | null; caption?: string | null; fileName?: string | null },
  opts: { automation?: boolean; retryOf?: string | null },
): MediaAckMeta {
  const url = typeof payload.mediaUrl === "string" && /^https?:\/\//.test(payload.mediaUrl) ? payload.mediaUrl : null;
  return {
    ack: "awaiting",
    automation: !!opts.automation,
    retry_of: opts.retryOf || null,
    // Só dá para reenviar sozinho o que veio por link (base64 não é guardado)
    resend: url ? { action, mediaUrl: url, caption: payload.caption || "", fileName: payload.fileName || undefined } : null,
  };
}

export type UnconfirmedDecision = "wait" | "retry" | "fail" | "skip";

/**
 * O que fazer com uma mídia ainda "pending":
 * - wait: ainda dentro do prazo;
 * - skip: a instância não está mandando avisos de status (não dá para julgar
 *   sem risco de duplicar) — fica como está;
 * - retry: envio automático, primeira tentativa, com link para reenviar;
 * - fail: reenvio que também não saiu, ou envio manual/sem link.
 */
export function decideUnconfirmedMedia(
  row: { timestamp: string; metadata: MediaAckMeta | null },
  nowMs: number,
  instanceSendsStatus: boolean,
): UnconfirmedDecision {
  if (nowMs - Date.parse(row.timestamp) < MEDIA_ACK_TIMEOUT_MS) return "wait";
  if (!instanceSendsStatus) return "skip";
  const meta = row.metadata || {};
  if (meta.automation && !meta.retry_of && meta.resend) return "retry";
  return "fail";
}

/**
 * Espera o WhatsApp confirmar as mídias (por message_id). Devolve as que
 * confirmaram, as que deram erro e as que ainda não responderam.
 */
// deno-lint-ignore no-explicit-any
export async function waitForMediaAck(supabase: any, messageIds: string[], timeoutMs: number, pollMs = 3000): Promise<{ confirmed: string[]; failed: string[]; pending: string[] }> {
  const ids = messageIds.filter(Boolean);
  const started = Date.now();
  let rows: Array<{ message_id: string; status: string | null }> = [];
  while (ids.length > 0) {
    const { data } = await supabase.from("wapi_messages").select("message_id, status").in("message_id", ids);
    rows = (data || []) as typeof rows;
    const open = ids.filter((id) => {
      const st = rows.find((r) => r.message_id === id)?.status;
      return !st || st === "pending";
    });
    if (open.length === 0 || Date.now() - started >= timeoutMs) break;
    await new Promise((resolve) => setTimeout(resolve, pollMs));
  }
  const statusOf = (id: string) => rows.find((r) => r.message_id === id)?.status || null;
  return {
    confirmed: ids.filter((id) => CONFIRMED_STATUSES.includes(statusOf(id) || "")),
    failed: ids.filter((id) => statusOf(id) === "error"),
    pending: ids.filter((id) => !statusOf(id) || statusOf(id) === "pending"),
  };
}
