// Análise semanal da Inteligência: por que o lead não fechou, o que os
// clientes mais perguntam e o que trava a venda, mais o resumo da semana que
// vai para o WhatsApp do dono. Usado pela edge function weekly-insights
// (Deno) e pela aba Motivos (React) — não pode depender de nada do Deno nem
// do navegador.

export const INSIGHT_REASONS = {
  sumiu: "Parou de responder",
  preco: "Achou caro",
  data_ocupada: "Data que queria estava ocupada",
  localizacao: "Longe / localização",
  fechou_outro: "Fechou com outro buffet",
  so_pesquisando: "Só pesquisando / festa ainda longe",
  adiou_desistiu: "Adiou ou desistiu da festa",
  espaco_pacote: "Espaço ou pacote não atende",
  atendimento: "Demora ou falha no nosso atendimento",
  ainda_negociando: "Ainda negociando",
  outro: "Outro motivo",
} as const;

export const INSIGHT_QUESTIONS = {
  valor: "Valor / preço",
  datas: "Datas disponíveis",
  cardapio: "Cardápio / comida",
  bebidas: "Bebidas",
  convidados: "Quantidade de convidados",
  incluso: "O que está incluso",
  decoracao: "Decoração / tema",
  brinquedos: "Brinquedos / monitores",
  horario: "Horário / duração",
  pagamento: "Pagamento / parcelamento",
  localizacao: "Endereço / estacionamento",
  visita: "Visitar o espaço",
} as const;

export const INSIGHT_OBJECTIONS = {
  preco_alto: "Preço alto",
  pagamento: "Forma de pagamento",
  data_indisponivel: "Data indisponível",
  distancia: "Distância",
  capacidade: "Espaço pequeno ou grande demais",
  cardapio: "Cardápio",
  concorrente: "Concorrente mais barato",
  decidir_com_alguem: "Precisa decidir com alguém",
  sem_pressa: "Festa ainda longe / sem pressa",
} as const;

export type InsightReason = keyof typeof INSIGHT_REASONS;
export type InsightQuestion = keyof typeof INSIGHT_QUESTIONS;
export type InsightObjection = keyof typeof INSIGHT_OBJECTIONS;

export interface LeadInsight {
  motivo: InsightReason;
  detalhe: string;
  perguntas: InsightQuestion[];
  objecoes: InsightObjection[];
}

// Formato fixo da resposta do modelo (structured outputs da OpenAI)
export const INSIGHT_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    motivo: { type: "string", enum: Object.keys(INSIGHT_REASONS) },
    detalhe: { type: "string" },
    perguntas: { type: "array", items: { type: "string", enum: Object.keys(INSIGHT_QUESTIONS) } },
    objecoes: { type: "array", items: { type: "string", enum: Object.keys(INSIGHT_OBJECTIONS) } },
  },
  required: ["motivo", "detalhe", "perguntas", "objecoes"],
} as const;

const list = (labels: Record<string, string>) => Object.entries(labels).map(([k, v]) => `- ${k}: ${v}`).join("\n");

export const INSIGHT_SYSTEM_PROMPT = `Você analisa conversas de WhatsApp entre um buffet infantil e um cliente que pediu orçamento de festa e não fechou (ou parou de conversar).
Leia a conversa e responda só com o JSON pedido:
- motivo: o principal motivo de a venda não ter fechado (ou "ainda_negociando" se a conversa mostra que ainda está em andamento). Use "sumiu" quando o cliente simplesmente parou de responder sem dar motivo. Use "atendimento" só quando o buffet demorou muito ou deixou de responder o cliente.
${list(INSIGHT_REASONS)}
- detalhe: uma frase curta em português (até 120 caracteres) explicando o que aconteceu, sem nome nem telefone do cliente.
- perguntas: os assuntos que o CLIENTE perguntou (zero ou mais):
${list(INSIGHT_QUESTIONS)}
- objecoes: o que o CLIENTE disse que atrapalha fechar (zero ou mais; só o que ele disse de fato):
${list(INSIGHT_OBJECTIONS)}`;

const pick = <T extends string>(allowed: Record<T, string>, values: unknown): T[] =>
  Array.isArray(values) ? [...new Set(values.filter((v): v is T => typeof v === "string" && v in allowed))] : [];

/** Confere a resposta do modelo; devolve null se vier fora do formato. */
export function normalizeInsight(raw: unknown): LeadInsight | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.motivo !== "string" || !(r.motivo in INSIGHT_REASONS)) return null;
  return {
    motivo: r.motivo as InsightReason,
    detalhe: typeof r.detalhe === "string" ? r.detalhe.trim().slice(0, 160) : "",
    perguntas: pick(INSIGHT_QUESTIONS, r.perguntas),
    objecoes: pick(INSIGHT_OBJECTIONS, r.objecoes),
  };
}

export interface TranscriptMessage {
  from_me: boolean;
  content: string | null;
  message_type: string;
  timestamp: string;
}

const MAX_MESSAGE_CHARS = 400;
const MAX_TRANSCRIPT_CHARS = 14000;

/** Conversa em texto para o modelo, da mais antiga para a mais nova, cortando o começo se ficar grande. */
export function buildTranscript(messages: TranscriptMessage[]): string {
  const sorted = [...messages].sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  const lines = sorted.map((m) => {
    const who = m.from_me ? "Buffet" : "Cliente";
    const text = m.message_type === "text" || m.message_type === "extendedText"
      ? String(m.content || "").replace(/\s+/g, " ").trim().slice(0, MAX_MESSAGE_CHARS)
      : `[${m.message_type}]${m.content && !/^https?:\/\//.test(m.content.trim()) ? " " + String(m.content).replace(/\s+/g, " ").trim().slice(0, 200) : ""}`;
    return `${m.timestamp.slice(8, 10)}/${m.timestamp.slice(5, 7)} ${who}: ${text}`;
  });
  const out: string[] = [];
  let size = 0;
  for (let i = lines.length - 1; i >= 0; i--) {
    size += lines[i].length + 1;
    if (size > MAX_TRANSCRIPT_CHARS) break;
    out.unshift(lines[i]);
  }
  return out.join("\n");
}

/**
 * Casos que não precisam de IA: o cliente não escreveu nada (não analisa) ou
 * só mandou a primeira mensagem e sumiu.
 */
export function quickInsight(messages: TranscriptMessage[]): LeadInsight | "skip" | null {
  const fromClient = messages.filter((m) => !m.from_me).length;
  if (fromClient === 0) return "skip";
  if (fromClient === 1 && messages.some((m) => m.from_me)) {
    return { motivo: "sumiu", detalhe: "Não respondeu depois do primeiro contato", perguntas: [], objecoes: [] };
  }
  return null;
}

export interface CountRow {
  key: string;
  label: string;
  count: number;
}

/** Conta motivos, perguntas e objeções das análises, do mais comum para o menos. */
export function aggregateInsights(rows: Array<{ motivo: string; perguntas: string[] | null; objecoes: string[] | null }>): {
  reasons: CountRow[];
  questions: CountRow[];
  objections: CountRow[];
} {
  const count = (labels: Record<string, string>, values: string[]) => {
    const m = new Map<string, number>();
    for (const v of values) if (v in labels) m.set(v, (m.get(v) || 0) + 1);
    return [...m.entries()]
      .map(([key, n]) => ({ key, label: labels[key], count: n }))
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
  };
  return {
    reasons: count(INSIGHT_REASONS, rows.map((r) => r.motivo)),
    questions: count(INSIGHT_QUESTIONS, rows.flatMap((r) => r.perguntas || [])),
    objections: count(INSIGHT_OBJECTIONS, rows.flatMap((r) => r.objecoes || [])),
  };
}

// ---------------- Semana e resumo para o WhatsApp ----------------

const BRT_OFFSET_MS = 3 * 60 * 60 * 1000; // Brasília sem horário de verão

function ymd(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/**
 * Semana anterior completa (segunda a domingo, horário de Brasília):
 * datas e os instantes de início e fim para filtrar no banco.
 */
export function previousWeekBRT(now: Date): { start: string; end: string; startIso: string; endIso: string } {
  const local = new Date(now.getTime() - BRT_OFFSET_MS); // "relógio" de Brasília
  const dow = (local.getUTCDay() + 6) % 7; // segunda = 0
  const thisMonday = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate() - dow);
  const start = new Date(thisMonday - 7 * 86400000);
  const end = new Date(thisMonday - 86400000);
  return {
    start: ymd(start),
    end: ymd(end),
    startIso: new Date(start.getTime() + BRT_OFFSET_MS).toISOString(),
    endIso: new Date(thisMonday + BRT_OFFSET_MS - 1).toISOString(),
  };
}

export interface WeeklySummaryData {
  companyName: string;
  weekStart: string;
  weekEnd: string;
  leads: number;
  returned: number;
  visitsRealized: number;
  visitsNoShow: number;
  visitsNoAnswer: number;
  sales: number;
  waitingNow: number;
  analyzed: number;
  reasons: CountRow[];
  questions: CountRow[];
  objections: CountRow[];
}

const ddmm = (d: string) => `${d.slice(8, 10)}/${d.slice(5, 7)}`;
const pct = (n: number) => `${n.toFixed(1).replace(".", ",")}%`;

export function formatWeeklySummary(d: WeeklySummaryData): string {
  const lines: string[] = [];
  lines.push(`📊 *Resumo da semana — ${d.companyName}*`);
  lines.push(`${ddmm(d.weekStart)} a ${ddmm(d.weekEnd)}`);
  lines.push("");
  lines.push(`👥 Leads novos: *${d.leads}*${d.returned > 0 ? ` (+${d.returned} voltaram)` : ""}`);
  const visitExtra = [
    d.visitsNoShow > 0 ? `${d.visitsNoShow} ${d.visitsNoShow === 1 ? "faltou" : "faltaram"}` : "",
    d.visitsNoAnswer > 0 ? `${d.visitsNoAnswer} sem resposta` : "",
  ].filter(Boolean).join(" · ");
  lines.push(`🏠 Visitas realizadas: *${d.visitsRealized}*${visitExtra ? ` (${visitExtra})` : ""}`);
  lines.push(`🎉 Festas fechadas: *${d.sales}*${d.leads > 0 ? ` · conversão ${pct((d.sales / d.leads) * 100)}` : ""}`);
  lines.push(`💬 Clientes esperando resposta agora: *${d.waitingNow}*`);
  if (d.analyzed > 0) {
    lines.push("");
    lines.push(`❄️ *Por que não fecharam* (${d.analyzed} ${d.analyzed === 1 ? "conversa analisada" : "conversas analisadas"}):`);
    for (const r of d.reasons.slice(0, 4)) lines.push(`• ${r.label}: ${r.count}`);
    if (d.questions.length > 0) {
      lines.push("");
      lines.push("❓ *O que mais perguntaram:*");
      lines.push(d.questions.slice(0, 4).map((q) => `${q.label} (${q.count})`).join(" · "));
    }
    if (d.objections.length > 0) {
      lines.push("");
      lines.push("🚧 *O que mais travou:*");
      lines.push(d.objections.slice(0, 3).map((o) => `${o.label} (${o.count})`).join(" · "));
    }
  }
  if (d.visitsNoAnswer > 0) {
    lines.push("");
    lines.push(`⚠️ ${d.visitsNoAnswer} ${d.visitsNoAnswer === 1 ? "visita ficou" : "visitas ficaram"} sem marcar se o cliente veio — responda no aviso amarelo da Central.`);
  }
  lines.push("");
  lines.push("👉 Detalhes na Inteligência do Celebrei.");
  return lines.join("\n");
}

/** Módulo "Inteligência com IA" ligado no Hub para a empresa? */
export function isInsightsEnabled(companySettings: unknown): boolean {
  if (!companySettings || typeof companySettings !== "object") return false;
  const modules = (companySettings as Record<string, unknown>).enabled_modules;
  if (!modules || typeof modules !== "object") return false;
  return (modules as Record<string, unknown>).inteligencia_ia === true;
}

/** O resumo automático só sai na segunda-feira, das 7h às 20h de Brasília. */
export function isWeeklySendWindow(now: Date): boolean {
  const local = new Date(now.getTime() - BRT_OFFSET_MS);
  const hour = local.getUTCHours();
  return local.getUTCDay() === 1 && hour >= 7 && hour < 20;
}
