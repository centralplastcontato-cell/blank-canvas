// Rede de segurança: cliente respondeu uma pergunta do robô e ficou sem
// retorno (reconexão do número, mensagem que a plataforma não consegue ler,
// qualquer falha nova). Em vez de o cliente ficar esquecido, o robô pausa
// naquela conversa e a equipe é avisada para assumir.

export const UNANSWERED_MINUTES = 15;
export const UNANSWERED_MAX_AGE_HOURS = 24;

// Passos em que o robô fez uma pergunta e espera a resposta do cliente
export const BOT_STEPS_WAITING_ANSWER = [
  "welcome", "tipo", "nome", "mes", "dia", "convidados", "proximo_passo", "proximo_passo_reminded",
];

export interface BotSettingsLike {
  bot_enabled?: boolean | null;
  test_mode_enabled?: boolean | null;
}

// O robô só "devia" ter respondido se estava ligado para esse número. Com o
// robô desligado (ou modo de teste para outro número) o silêncio é proposital.
export function botShouldHaveAnswered(settings: BotSettingsLike | null | undefined, isTestNumber: boolean): boolean {
  if (!settings) return false;
  if (settings.test_mode_enabled) return isTestNumber;
  return settings.bot_enabled === true;
}
