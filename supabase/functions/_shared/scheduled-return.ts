// "Vou agendar depois" (Castelo, 22/10): o cliente diz quando quer retomar
// ("início de novembro", "semana que vem", "depois do dia 10") e, no dia, a
// plataforma volta a falar com ele oferecendo 2 horários de visita. A IA só lê
// a frase e devolve a data; estas regras validam, decidem quando sai e montam
// a mensagem. Quem consulta o banco e envia é o follow-up-check.

export const RETURN_HOUR = 10;
export const RETURN_MAX_DAYS = 180;
// Cliente voltou a escrever bem depois de combinar o retorno: a conversa seguiu, o retorno sai de cena
export const RETURN_STALE_REPLY_MS = 6 * 3600000;

const norm = (t: string) => t.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

const TIME_WORDS = /\b(janeiro|fevereiro|marco|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro|amanha|semana que vem|proxima semana|semana seguinte|mes que vem|proximo mes|daqui|depois do dia|dia \d{1,2}|\d{1,2}\/\d{1,2}|segunda|terca|quarta|quinta|sexta|sabado|domingo|fim de semana|final de semana|fim do mes|final do mes|comeco do mes|inicio do mes|natal|carnaval|ano novo|reveillon|ferias|salario|pagamento|decimo|13o|quinzena)\b/;
const LATER_WORDS = /\b(agend|marc|visit|volt|retorn|fal[ao]|chamo|chamar|aviso|decid|fech|pens|conhec|passo|passar|ver |vejo|vou ver|confirm|resolv|combin|entro em contato|te procuro)/;

/** A mensagem parece "falo depois, em tal data"? (filtro barato antes de perguntar à IA) */
export function mentionsLaterTime(text: string | null | undefined): boolean {
  const t = norm(String(text || ""));
  if (t.length < 8 || t.length > 600) return false;
  return TIME_WORDS.test(t) && LATER_WORDS.test(t);
}

export interface ReturnPlan {
  date: string; // AAAA-MM-DD
  whenText: string; // "no início de novembro"
  note: string; // frase do cliente, curta
}

/** Resposta da IA (JSON) → plano validado: data futura, até 180 dias */
export function parseReturnJson(raw: string, todayYmd: string): ReturnPlan | null {
  const m = String(raw || "").match(/\{[\s\S]*\}/);
  if (!m) return null;
  let j: Record<string, unknown>;
  try {
    j = JSON.parse(m[0]);
  } catch {
    return null;
  }
  if (j.retomar !== true) return null;
  const date = String(j.data || "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(`${date}T12:00:00Z`))) return null;
  const days = Math.round((Date.parse(`${date}T12:00:00Z`) - Date.parse(`${todayYmd}T12:00:00Z`)) / 86400000);
  if (days < 1 || days > RETURN_MAX_DAYS) return null;
  const whenText = String(j.quando || "").trim().slice(0, 60);
  const note = String(j.frase || "").trim().slice(0, 140);
  return { date, whenText, note };
}

/** Sai hoje? (no dia combinado ou depois, a partir das 10h) */
export function returnDue(returnAt: string | null | undefined, status: string | null | undefined, todayYmd: string, hourNow: number): boolean {
  return status === "pending" && !!returnAt && returnAt <= todayYmd && hourNow >= RETURN_HOUR;
}

export function returnMessage(c: {
  firstName: string;
  companyName: string;
  whenText?: string | null;
  offers: string[];
  visited: boolean;
  childName?: string | null;
}): string {
  const hi = c.firstName ? `Oi, ${c.firstName}!` : "Oi!";
  const when = (c.whenText || "").trim();
  const passing = when ? `Como você comentou, passando agora ${when}` : "Como você comentou, passando aqui";
  if (c.visited) {
    const party = c.childName ? `com a festa ${/a$/i.test(c.childName) ? "da" : "do"} ${c.childName}` : "com a festa";
    return `${hi} 😊 ${passing} pra gente seguir ${party}. Ficou alguma dúvida? Posso te ajudar a garantir a data 💜`;
  }
  const invite = c.offers.length >= 2
    ? `Tenho ${c.offers[0]} ou ${c.offers[1]}. Qual fica melhor?`
    : "Me fala o melhor dia e horário pra você que eu vejo aqui 😊";
  return `${hi} 😊 ${passing} pra gente marcar a visita ao ${c.companyName}. ${invite}`;
}

/** Instrução para a IA transformar a frase do cliente em data */
export function returnPrompt(todayYmd: string, weekday: string): string {
  return `Você lê mensagens de clientes de um buffet infantil e identifica quando o cliente disse que vai retomar o contato (agendar visita, decidir, fechar, voltar a falar) numa data ou período DEFINIDO. Hoje é ${weekday}, ${todayYmd}.
Responda SÓ com JSON: {"retomar": true|false, "data": "AAAA-MM-DD", "quando": "texto curto para a mensagem, ex.: no início de novembro / nesta semana / depois do dia 10", "frase": "o trecho do cliente"}.
Regras de data: "início de <mês>" = dia 3; "meados de <mês>" = dia 15; "fim/final de <mês>" = dia 25; "mês que vem" = dia 3 do próximo mês; "semana que vem" = a próxima segunda-feira; "daqui N dias/semanas" = hoje + N; "depois do dia N" = dia N+1; "dia N" ou "N/M" = essa data; dia da semana ("sexta") = o próximo; "amanhã" = amanhã; "depois do Natal" = 26/12; "depois do Ano Novo/Réveillon" = 05/01; "depois do Carnaval" = o dia seguinte à quarta-feira de cinzas; "quando receber o salário" = dia 6 do próximo mês; "quando sair o 13º" = 21/12. A data tem que ser no futuro (no máximo 6 meses).
retomar=false quando NÃO houver um momento definido ("vou pensar", "depois te falo", "mais pra frente", "quando der", "quando meu marido ver", "ano que vem" sem mês) ou quando a mensagem não for sobre retomar o contato.`;
}
