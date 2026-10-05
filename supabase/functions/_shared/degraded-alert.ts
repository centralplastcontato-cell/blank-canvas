// Decide se o "sessão incompleta" (status degraded) de um número merece aviso.
//
// A checagem de saúde roda a cada ~30 min por número e a W-API às vezes
// responde de forma ambígua (lentidão da API, QR "fantasma") com o número
// funcionando normalmente — o que gerava alarme falso. Agora só avisa quando:
//   1. o problema se repete na checagem seguinte (o número já estava
//      "degraded" antes desta checagem), e
//   2. o número não recebeu nenhum aviso do WhatsApp (webhook) nos últimos
//      30 min — se está recebendo mensagens/tiques, está vivo.

export const DEGRADED_ACTIVITY_WINDOW_MS = 30 * 60 * 1000;

export interface DegradedAlertInput {
  // Status gravado no banco ANTES desta checagem
  previousStatus: string | null;
  lastWebhookEventAt: string | null;
  now: number;
}

export interface DegradedAlertDecision {
  alert: boolean;
  reason: "recent_activity" | "first_detection" | "confirmed";
}

export function decideDegradedAlert({ previousStatus, lastWebhookEventAt, now }: DegradedAlertInput): DegradedAlertDecision {
  const lastEventMs = lastWebhookEventAt ? new Date(lastWebhookEventAt).getTime() : 0;
  if (lastEventMs && now - lastEventMs < DEGRADED_ACTIVITY_WINDOW_MS) {
    return { alert: false, reason: "recent_activity" };
  }
  if (previousStatus !== "degraded") {
    return { alert: false, reason: "first_detection" };
  }
  return { alert: true, reason: "confirmed" };
}
