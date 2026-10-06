// Regras de "vez" da IA (beta): juntar mensagens seguidas do cliente numa
// resposta só e saber se a equipe já respondeu depois da passagem.

// Espera antes de responder: mensagens que chegam nesse intervalo são
// respondidas juntas, numa resposta só. 10 s não bastava: no teste de 05/10
// a segunda pergunta chegou 14 s depois da primeira.
export const AI_DEBOUNCE_MS = 16000;
// Mensagem que parece completa (pergunta, frase longa, áudio): espera curta
export const AI_DEBOUNCE_COMPLETE_MS = 5000;
// Meio-termo (frase curta sem "?")
export const AI_DEBOUNCE_MEDIUM_MS = 9000;

const OPENERS = /^(oi+|ol[aá]|opa|e a[ií]|bom dia|boa tarde|boa noite|ent[aã]o|e|mas|tipo|assim|s[oó]|ok|okay|hum+|hm+|blz|beleza|certo|sim|n[aã]o|t[aá]|tudo bem|td bem)[\s!.,…]*$/i;

/**
 * Quanto esperar antes de responder, pela cara da última mensagem:
 * - completa (tem "?", frase longa ou áudio/foto): 5 s;
 * - incompleta ("Olá", "Então", uma palavra, termina em vírgula/reticências): 16 s;
 * - o resto: 9 s.
 * Se a IA acabou de fazer uma pergunta, resposta curta conta como completa.
 */
export function debounceMsFor(text: string, isMedia = false, answeringQuestion = false): number {
  if (isMedia) return AI_DEBOUNCE_COMPLETE_MS;
  const t = (text || "").trim();
  const words = t.split(/\s+/).filter(Boolean).length;
  const trailing = /(,|\.\.\.|…|\s(e|mas|que|pra|para|de))$/i.test(t);
  // Resposta curta a uma pergunta da IA ("Victor", "dezembro", "60") já é completa
  if (answeringQuestion && t && !trailing && !/^(oi+|ol[aá]|opa|ent[aã]o|e|mas|tipo|assim|hum+|hm+)[\s!.,…]*$/i.test(t)) return AI_DEBOUNCE_COMPLETE_MS;
  if (!t || OPENERS.test(t) || words <= 1 || trailing) return AI_DEBOUNCE_MS;
  if (t.includes("?") || t.length >= 40 || words >= 7) return AI_DEBOUNCE_COMPLETE_MS;
  return AI_DEBOUNCE_MEDIUM_MS;
}

export interface IncomingRow {
  message_id: string | null;
  timestamp: string;
}

// A mensagem mais recente do cliente decide quem responde. Empate no mesmo
// segundo: maior message_id — todas as execuções chegam à mesma escolha.
export function pickLatestIncoming(rows: IncomingRow[]): string | null {
  let best: IncomingRow | null = null;
  for (const r of rows) {
    if (!r.message_id) continue;
    if (!best) { best = r; continue; }
    const tr = Date.parse(r.timestamp), tb = Date.parse(best.timestamp);
    if (tr > tb || (tr === tb && r.message_id > (best.message_id || ""))) best = r;
  }
  return best?.message_id ?? null;
}

// Mensagens nossas que NÃO são de uma pessoa da equipe (robôs/avisos)
const AUTOMATED_SOURCES = new Set(["auto_reminder", "campaign_auto_reply", "system_alert", "ai_agent"]);

export interface OutgoingRow {
  from_me: boolean;
  timestamp: string;
  metadata: Record<string, unknown> | null;
}

// Até esta data as mensagens da IA saíam gravadas como "platform", iguais às
// da equipe pelo Celebrei — antes dela, "platform" não prova resposta humana.
export const AI_SOURCE_MARKED_SINCE = "2026-10-05T23:10:00Z";

// Alguém da equipe respondeu depois da passagem? Mensagens do Celebrei
// (metadata.source "platform") e do celular (sem metadata) contam; follow-up
// automático, avisos do sistema e a própria IA não.
export function teamRepliedAfter(rows: OutgoingRow[], sinceIso: string): boolean {
  const since = Date.parse(sinceIso);
  const markedSince = Date.parse(AI_SOURCE_MARKED_SINCE);
  return rows.some((r) => {
    const at = Date.parse(r.timestamp);
    if (!r.from_me || at <= since) return false;
    const source = typeof r.metadata?.source === "string" ? r.metadata.source as string : null;
    if (source === "platform" && at < markedSince) return false; // pode ser a IA antiga
    return !source || !AUTOMATED_SOURCES.has(source);
  });
}

export interface Turn {
  role: "user" | "assistant";
  content: string;
}

// Junta mensagens seguidas do mesmo lado numa só (o cliente costuma mandar
// várias perguntas picadas) e conta quantas do cliente estão sem resposta.
export function mergeConsecutiveTurns<T extends Turn>(turns: T[]): { merged: T[]; pendingUserMessages: number } {
  const merged: T[] = [];
  for (const t of turns) {
    const last = merged[merged.length - 1];
    if (last && last.role === t.role) last.content = `${last.content}\n${t.content}`;
    else merged.push({ ...t });
  }
  let pending = 0;
  for (let i = turns.length - 1; i >= 0 && turns[i].role === "user"; i--) pending++;
  return { merged, pendingUserMessages: pending };
}

// Quantas respostas da IA desde o último convite para visita (0 = a última
// resposta convidou; null = ainda não convidou). Serve para não terminar toda
// mensagem com "posso agendar uma visita".
const VISIT_INVITE = /\bvisita/i;
export function repliesSinceVisitInvite(turns: Turn[]): number | null {
  // Conta VEZES da IA (mensagens seguidas dela = uma resposta): o envio das
  // fotos/vídeo/PDF são várias mensagens e inflavam a conta (achado do simulador)
  let count = 0;
  let inAssistantBlock = false;
  let blockHasInvite = false;
  for (let i = turns.length - 1; i >= 0; i--) {
    const t = turns[i];
    if (t.role !== "assistant" || t.content.startsWith("🧪")) {
      if (inAssistantBlock) {
        if (blockHasInvite) return count;
        count++;
        inAssistantBlock = false;
        blockHasInvite = false;
      }
      continue;
    }
    inAssistantBlock = true;
    // Mesma detecção da trava (a IA convida sem a palavra "visita": "quer conhecer o espaço?")
    if (VISIT_INVITE.test(t.content) || hasVisitInvite(t.content)) blockHasInvite = true;
  }
  if (inAssistantBlock && blockHasInvite) return count;
  return null;
}

// Menor pacote (convidados) entre os PDFs de pacotes com quantidade definida
export function smallestPackageGuests(materials: Array<{ type?: string; guest_count?: number | null }>): number | null {
  const counts = materials
    .filter((m) => m.type === "pdf_package" && typeof m.guest_count === "number" && m.guest_count > 0)
    .map((m) => m.guest_count as number);
  return counts.length > 0 ? Math.min(...counts) : null;
}

// O cliente pediu o valor e ainda não recebeu nenhum "R$" depois disso?
const PRICE_ASK = /(pre[cç]o|valor|quanto (fica|custa|sai|é|e)|or[cç]amento|investimento)/i;
export function priceRequestPending(turns: Turn[]): boolean {
  let asked = false;
  for (const t of turns) {
    if (t.role === "user" && PRICE_ASK.test(t.content)) asked = true;
    else if (t.role === "assistant" && /R\$\s*\d/.test(t.content)) asked = false;
  }
  return asked;
}

// A última mensagem do cliente cruzou com a última resposta da IA (chegou
// antes dela ou poucos segundos depois)? Então ele ainda não viu a pergunta.
export function crossedWithLastReply(rows: Array<{ from_me: boolean; timestamp: string }>, windowMs = 5000): boolean {
  let lastOut = -Infinity;
  let lastIn = -Infinity;
  for (const r of rows) {
    const t = Date.parse(r.timestamp);
    if (isNaN(t)) continue;
    if (r.from_me) lastOut = Math.max(lastOut, t);
    else lastIn = Math.max(lastIn, t);
  }
  if (!isFinite(lastOut) || !isFinite(lastIn)) return false;
  return lastIn - lastOut < windowMs && lastOut - lastIn < 60000;
}

// ---------- Convite para visita na hora certa ----------
// O simulador pegou a IA convidando em 3 respostas seguidas, inclusive depois
// de a cliente dizer "não vai dar pra fechar". A instrução não bastou: o
// convite é tirado da resposta quando não é a hora.

const VISIT_INVITE_SENTENCE = /(posso (te |lhe )?(receber|agendar|marcar|deixar|reservar|separar)|quer (agendar|marcar|conhecer|vir)|vir conhecer|conhecer (o |nosso |de perto o )?(espa[cç]o|castelo|buffet)|conhecer pessoalmente|ver (tudo |isso |o espa[cç]o )?de pert|te receber|visit(a|inha)s?\b.*sem compromisso|(agendar|marcar|deixar) (uma |a |sua )?visit|sem compromisso|hor[aá]rios? de visita|que tal (uma |vir )|vale (muito |super |a pena |muito a pena )?(conhecer|vir)|te (passar|oferecer) (dois|2) hor[aá]rios)/i;

/** A mensagem convida para visita? */
export function hasVisitInvite(text: string): boolean {
  return VISIT_INVITE_SENTENCE.test(text || "");
}

/** O cliente falou de visita (quer conhecer, pediu horário...) */
export function clientAsksVisit(text: string): boolean {
  return /(visit|conhecer|ir a[ií]|passar a[ií]|ver (o espa[cç]o|pessoalmente)|agendar|hor[aá]rios? (de|pra|para) (visita|conhecer|ir))/i.test(text || "");
}

/** O cliente desistiu / disse que não vai fechar agora */
export function clientDeclined(text: string): boolean {
  return /(n[aã]o vai dar|n[aã]o d[aá] pra|n[aã]o vou (fechar|conseguir)|desist|fica pra (pr[oó]xima|outra)|sem interesse|n[aã]o tenho interesse|acho que n[aã]o|vou procurar outro|muito caro pra mim)/i.test(text || "");
}

/**
 * Remove da resposta as frases que convidam para visita (o resto fica). Se
 * sobrar quase nada, devolve a resposta original.
 */
export function stripVisitInvite(text: string): { text: string; removed: boolean } {
  let removed = false;
  const paragraphs = text.split(/\n/).map((line) => {
    if (!VISIT_INVITE_SENTENCE.test(line)) return line;
    // Frases da linha (mantém a pontuação/emojis de cada uma)
    const sentences = line.match(/[^.!?]+[.!?]+[^\p{L}\p{N}*_(]*|[^.!?]+$/gu) || [line];
    const kept = sentences.filter((sentence) => {
      if (VISIT_INVITE_SENTENCE.test(sentence)) {
        removed = true;
        return false;
      }
      return true;
    });
    return kept.join("").trim();
  });
  const out = paragraphs.join("\n").replace(/\n{3,}/g, "\n\n").trim();
  if (!removed || out.replace(/\s/g, "").length < 15) return { text, removed: false };
  return { text: out, removed: true };
}
