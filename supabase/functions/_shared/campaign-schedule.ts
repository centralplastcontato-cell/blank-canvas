// Regras de quando uma campanha pode mandar mensagem (decisão do dono, out/2026):
// - no máximo 30 por dia por empresa;
// - só de segunda a sábado, das 9h às 19h (horário de Brasília);
// - espalhadas ao longo do dia, uma a cada ~20 min, com tempo variado
//   (ritmo de máquina é o que mais faz o WhatsApp bloquear o número).

export const DAILY_LIMIT = 30;
export const WINDOW_START_HOUR = 9;
export const WINDOW_END_HOUR = 19;
/** Intervalo entre mensagens: sorteado entre 14 e 26 minutos (média 20) */
export const MIN_GAP_MINUTES = 14;
export const MAX_GAP_MINUTES = 26;

// Brasília não tem horário de verão desde 2019
const BRT_OFFSET_MS = 3 * 60 * 60 * 1000;

/** Data/hora "de parede" em Brasília (campos UTC do Date representam o horário de Brasília) */
function brtWall(now: Date): Date {
  return new Date(now.getTime() - BRT_OFFSET_MS);
}

/** Pode mandar agora? Segunda a sábado, 9h às 19h em Brasília */
export function isSendWindow(now: Date): boolean {
  const wall = brtWall(now);
  const day = wall.getUTCDay(); // 0 = domingo
  const hour = wall.getUTCHours();
  return day !== 0 && hour >= WINDOW_START_HOUR && hour < WINDOW_END_HOUR;
}

/** Próximo começo de janela (9h de um dia de segunda a sábado), em UTC */
export function nextWindowStart(now: Date): Date {
  const wall = brtWall(now);
  const start = new Date(Date.UTC(wall.getUTCFullYear(), wall.getUTCMonth(), wall.getUTCDate(), WINDOW_START_HOUR));
  // Hoje ainda não chegou às 9h e é dia de envio: hoje mesmo
  if (wall < start && wall.getUTCDay() !== 0) return new Date(start.getTime() + BRT_OFFSET_MS);
  do {
    start.setUTCDate(start.getUTCDate() + 1);
  } while (start.getUTCDay() === 0);
  return new Date(start.getTime() + BRT_OFFSET_MS);
}

/** Começo do dia de hoje em Brasília, em UTC (para contar os envios do dia) */
export function brtDayStart(now: Date): Date {
  const wall = brtWall(now);
  return new Date(Date.UTC(wall.getUTCFullYear(), wall.getUTCMonth(), wall.getUTCDate()) + BRT_OFFSET_MS);
}

/** Quando pode sair a próxima mensagem depois de uma enviada agora. rand em [0, 1). */
export function nextSendAfterSend(now: Date, rand: number): Date {
  const minutes = MIN_GAP_MINUTES + rand * (MAX_GAP_MINUTES - MIN_GAP_MINUTES);
  const next = new Date(now.getTime() + minutes * 60 * 1000);
  return isSendWindow(next) ? next : spreadStart(nextWindowStart(now), rand);
}

/** Começo do dia com alguns minutos de folga, para não sair sempre às 9h em ponto */
export function spreadStart(windowStart: Date, rand: number): Date {
  return new Date(windowStart.getTime() + Math.floor(rand * 20) * 60 * 1000);
}

/** Últimos 8 dígitos do telefone (igual ao banco e à tela) */
export function phoneTail(phone: string | null | undefined): string {
  const digits = (phone || "").replace(/\D/g, "");
  return digits.length >= 8 ? digits.slice(-8) : "";
}

/** Formatos do telefone como aparecem no remote_jid das conversas */
export function phoneVariants(phone: string): string[] {
  const n = (phone || "").replace(/\D/g, "");
  const variants = new Set<string>();
  if (n) {
    variants.add(n);
    variants.add(n.replace(/^55/, ""));
    if (!n.startsWith("55")) variants.add(`55${n}`);
  }
  return [...variants].filter(Boolean);
}

/** Texto da mensagem com {nome} e {empresa} trocados (igual ao envio antigo pela tela) */
export function renderCampaignMessage(text: string, leadName: string, companyName: string): string {
  return (text || "")
    .replace(/\{\{?\s*nome\s*\}?\}/gi, leadName || "")
    .replace(/\{\{?\s*empresa\s*\}?\}/gi, companyName || "");
}
