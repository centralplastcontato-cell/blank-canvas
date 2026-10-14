// Regras do alerta de "mensagem sem confirmação de entrega" (follow-up-check).
//
// Um cliente com o celular desligado ou sem internet deixa as mensagens com um
// tique só — isso é normal e não há o que a equipe fazer. O alerta só vale quando
// o problema é do NÚMERO do buffet:
//  - o número parou de mandar qualquer aviso para a plataforma (webhook caiu):
//    mensagens de clientes deixam de aparecer e nada recebe o segundo tique; ou
//  - várias conversas do mesmo número travaram ao mesmo tempo — e são a maioria
//    das conversas que receberam mensagem no período (número com muito movimento
//    sempre tem alguns clientes com celular desligado ou sem WhatsApp).

export const STUCK_MIN_CONVERSATIONS = 3;
export const STUCK_MIN_RATIO = 0.5;
// "Número mudo" (nenhum aviso do WhatsApp): sozinho não prova queda — à noite
// ninguém escreve (alarme falso VENDAS 2, 13/10 21:18). Só conta em horário
// comercial, depois de 2h sem nada, e nunca quando o monitor da Evolution
// confirmou o número online (status + /user/check) nos últimos minutos.
export const WEBHOOK_SILENT_MINUTES = 120;
export const SILENT_HOURS_BR: [number, number] = [9, 21];

export interface StuckAlertInput {
  conversationCount: number;
  // conversas desse número que receberam mensagem da plataforma no mesmo período
  activeConversationCount: number;
  lastWebhookEventAt: string | null;
  now: number;
  /** Monitor da Evolution confirmou o número online há pouco */
  providerConfirmedOnline?: boolean;
}

export interface StuckAlertDecision {
  notify: boolean;
  webhookSilent: boolean;
}

export function decideStuckAlert({ conversationCount, activeConversationCount, lastWebhookEventAt, now, providerConfirmedOnline }: StuckAlertInput): StuckAlertDecision {
  const lastMs = lastWebhookEventAt ? new Date(lastWebhookEventAt).getTime() : 0;
  const hourBR = new Date(now - 3 * 3600000).getUTCHours();
  const businessHours = hourBR >= SILENT_HOURS_BR[0] && hourBR < SILENT_HOURS_BR[1];
  const webhookSilent = !providerConfirmedOnline && businessHours &&
    (!Number.isFinite(lastMs) || lastMs < now - WEBHOOK_SILENT_MINUTES * 60 * 1000);
  return {
    notify: webhookSilent || (
      conversationCount >= STUCK_MIN_CONVERSATIONS &&
      conversationCount >= STUCK_MIN_RATIO * Math.max(activeConversationCount, conversationCount)
    ),
    webhookSilent,
  };
}

export function formatContactList(names: string[], max = 3): string {
  const unique = Array.from(new Set(names.filter((n) => n && n.trim()).map((n) => n.trim())));
  if (unique.length <= max) return unique.join(", ");
  return `${unique.slice(0, max).join(", ")} e mais ${unique.length - max}`;
}
