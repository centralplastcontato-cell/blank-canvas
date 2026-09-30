// Regras do alerta de "mensagem sem confirmação de entrega" (follow-up-check).
//
// Um cliente com o celular desligado ou sem internet deixa as mensagens com um
// tique só — isso é normal e não há o que a equipe fazer. O alerta só vale quando
// o problema é do NÚMERO do buffet:
//  - o número parou de mandar qualquer aviso para a plataforma (webhook caiu):
//    mensagens de clientes deixam de aparecer e nada recebe o segundo tique; ou
//  - várias conversas do mesmo número travaram ao mesmo tempo.

export const STUCK_MIN_CONVERSATIONS = 3;
export const WEBHOOK_SILENT_MINUTES = 20;

export interface StuckAlertInput {
  conversationCount: number;
  lastWebhookEventAt: string | null;
  now: number;
}

export interface StuckAlertDecision {
  notify: boolean;
  webhookSilent: boolean;
}

export function decideStuckAlert({ conversationCount, lastWebhookEventAt, now }: StuckAlertInput): StuckAlertDecision {
  const lastMs = lastWebhookEventAt ? new Date(lastWebhookEventAt).getTime() : 0;
  const webhookSilent = !Number.isFinite(lastMs) || lastMs < now - WEBHOOK_SILENT_MINUTES * 60 * 1000;
  return {
    notify: webhookSilent || conversationCount >= STUCK_MIN_CONVERSATIONS,
    webhookSilent,
  };
}

export function formatContactList(names: string[], max = 3): string {
  const unique = Array.from(new Set(names.filter((n) => n && n.trim()).map((n) => n.trim())));
  if (unique.length <= max) return unique.join(", ");
  return `${unique.slice(0, max).join(", ")} e mais ${unique.length - max}`;
}
