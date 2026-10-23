// Mensagem automática que a Evolution perdeu em silêncio.
//
// Planeta, 21–22/10: a primeira mensagem para um cliente sem conversa há meses
// (reativação) ficava com um tique para sempre. Nos logs do container:
// "Failed to encrypt … no signal session established with <LID>:0" e, logo
// depois, "Message sent successfully". O whatsmeow da Evolution Go 0.7.2 (antes
// do commit 4f8f64e de 13/07, "send: always use LID for DMs") pula o celular do
// cliente sem avisar e devolve sucesso. A mensagem não vai para ninguém e nunca
// chega depois; a seguinte para o mesmo número chega (Leidiane, 13:00 x 13:33).
//
// Enquanto a Evolution não é atualizada: mensagem automática de texto que ficou
// só "enviada" por 30 min é reenviada UMA vez — se o número do buffet entregou
// alguma outra mensagem depois dela (prova que ele está funcionando) e se a
// conversa não andou (cliente não respondeu, nada mais foi enviado).

export const LOST_RESEND_AFTER_MS = 30 * 60 * 1000;
export const LOST_RESEND_MAX_AGE_MS = 6 * 3600 * 1000;

// Automações que escrevem para quem não está conversando agora
export const LOST_RESEND_SOURCES = ["reactivation_engine", "auto_reminder", "visit_confirmation", "scheduled_return", "post_visit"];

export interface LostCandidate {
  status: string | null;
  message_type: string | null;
  timestamp: string;
  metadata?: unknown;
}

export interface LostContext {
  /** Cliente respondeu ou saiu outra mensagem na conversa depois desta */
  conversationMovedOn: boolean;
  /** O número do buffet entregou alguma mensagem depois desta */
  instanceDeliveredSince: boolean;
}

export function shouldResendLost(row: LostCandidate, ctx: LostContext, nowMs: number): boolean {
  const meta = (row.metadata && typeof row.metadata === "object" ? row.metadata : {}) as Record<string, unknown>;
  if (row.status !== "sent" || row.message_type !== "text") return false;
  if (!LOST_RESEND_SOURCES.includes(String(meta.source || ""))) return false;
  // Uma vez só: nem de novo a mesma, nem o próprio reenvio
  if (meta.lost_resend || meta.retry_of) return false;
  const age = nowMs - Date.parse(row.timestamp);
  if (!(age >= LOST_RESEND_AFTER_MS && age <= LOST_RESEND_MAX_AGE_MS)) return false;
  return ctx.instanceDeliveredSince && !ctx.conversationMovedOn;
}
