// Regras do buffet que vêm do cadastro ("Pode levar comida/bolo de fora?",
// "Animal de estimação"). O simulador pegou a IA dizendo "Pode sim contratar
// o carrinho de sorvete de fora" com o cadastro dizendo "Não, é tudo do
// buffet". Aqui ficam: ler a resposta do cadastro, saber se o cliente
// perguntou disso e conferir se a resposta da IA contradiz o cadastro.

import { sentenceParts } from "./material-claims.ts";

export type HouseTopic = "comida" | "animal";

export interface HouseRule {
  topic: HouseTopic;
  /** Resposta do cadastro, como está ("Não, é tudo do buffet") */
  answer: string;
  /** A resposta do cadastro proíbe (começa com "Não") */
  forbidden: boolean;
}

// Rótulos do cadastro (AiAgentSection.tsx → BUFFET_FIELDS)
const LABELS: Array<[HouseTopic, RegExp]> = [
  ["comida", /^\s*pode levar comida\/bolo de fora\?\s*:\s*(.+)$/im],
  ["animal", /^\s*animal de estima[çc][ãa]o\s*:\s*(.+)$/im],
];

/** Assunto da pergunta, para o aviso e para a frase de reserva */
export const TOPIC_ASK: Record<HouseTopic, string> = {
  comida: "levar ou contratar comida, bolo, doces ou sorvete de fora",
  animal: "levar animal de estimação",
};

export function parseHouseRules(extra: string | null | undefined): HouseRule[] {
  if (!extra) return [];
  const rules: HouseRule[] = [];
  for (const [topic, re] of LABELS) {
    const answer = extra.match(re)?.[1]?.trim();
    if (answer) rules.push({ topic, answer, forbidden: /^n[ãa]o(?![\p{L}\p{N}])/iu.test(answer) });
  }
  return rules;
}

// \b do JavaScript não entende acento ("é", "açaí"): palavra inteira com letras Unicode
const words = (alternatives: string) => new RegExp(`(?<![\\p{L}\\p{N}])(${alternatives})(?![\\p{L}\\p{N}])`, "iu");

// "Cachorro-quente" é comida, não animal
const HOT_DOG = /(?<![\p{L}\p{N}])cachorr(o|os|inho|inhos)[- ]quentes?(?![\p{L}\p{N}])/giu;

const FOOD = words(
  "comidas?|bolos?|doces?|docinhos?|salgad(o|os|inho|inhos)|sorvetes?|sorveteri\\p{L}*|picol[eé]s?|a[cç]a[ií]|" +
    "pipocas?|algod[aã]o[- ]doce|crepes?|churros|cachorr(o|os|inho|inhos)[- ]quentes?|hot[- ]?dogs?|lanches?|tortas?|" +
    "brigadeiros?|beijinhos?|cupcakes?|bem[- ]casados?|food[- ]?trucks?|confeit\\p{L}*|bolei\\p{L}*|docei\\p{L}*|" +
    "petiscos?|pizzas?|mesa de doces|guloseimas?|carrinho de \\p{L}+",
);
const FOOD_OUTSIDE = words(
  "de fora|levar|levo|levamos|trazer|trago|traga|trazemos|contratar|contrato|contratamos|fornecedor\\p{L}*|" +
    "terceiriz\\p{L}*|por (minha|nossa) conta|encomend\\p{L}*|confeit\\p{L}*|bolei\\p{L}*|docei\\p{L}*|outro buffet|outra empresa",
);
const ANIMAL = words(
  "cachorr(o|a|os|as|inho|inha|inhos|inhas)|c[ãa]es|c[ãa]o|cadel\\p{L}*|gat(o|a|os|as|inho|inha|inhos|inhas)|" +
    "pets?|animal|animais|bichinhos?|bicho de estima[çc][ãa]o",
);
const ANIMAL_ASK = words(
  "levar|levo|trazer|trago|ir|vir|entrar|entra|junto|acompanh\\p{L}*|pode|posso|podemos|permit\\p{L}*|aceit\\p{L}*|liberad\\p{L}*",
);
const THEME = words("tema|tem[áa]tic\\p{L}*|decora[çc][ãa]o");

const mentionsTopic = (sentence: string, topic: HouseTopic): boolean =>
  topic === "comida" ? FOOD.test(sentence) : ANIMAL.test(sentence.replace(HOT_DOG, " "));

const splitSentences = (text: string): string[] => text.split("\n").flatMap((line) => sentenceParts(line));

/** Assuntos do cadastro que o cliente perguntou nesta mensagem */
export function topicsAsked(clientText: string): HouseTopic[] {
  const out: HouseTopic[] = [];
  const sentences = splitSentences(clientText);
  if (sentences.some((s) => FOOD.test(s) && FOOD_OUTSIDE.test(s))) out.push("comida");
  if (sentences.some((s) => mentionsTopic(s, "animal") && ANIMAL_ASK.test(s) && !THEME.test(s))) out.push("animal");
  return out;
}

/** Aviso para o prompt: a resposta exata do cadastro para o que o cliente perguntou */
export function houseRuleNote(rules: HouseRule[], asked: HouseTopic[]): string | null {
  const hits = rules.filter((r) => asked.includes(r.topic));
  if (hits.length === 0) return null;
  return hits.map((r) =>
    `o cliente perguntou sobre ${TOPIC_ASK[r.topic]}. A resposta do cadastro do buffet é: "${r.answer}".` +
    (r.forbidden
      ? " Responda que NÃO pode, com gentileza; não abra exceção, não diga \"pode sim\" e não ofereça alternativa que não esteja nas informações do buffet."
      : " Responda seguindo exatamente isso.")
  ).join(" ");
}

// Frase que libera: "pode sim", "pode levar/trazer/contratar", "é permitido",
// "sem problema", "fique à vontade", "pets são bem-vindos"
const PERMITS = words(
  "pode(m)? sim|claro que pode|pode(m)?(\\s+\\S+){0,2}\\s+(levar|trazer|contratar|chamar|incluir|entrar|vir|ir)|" +
    "(é|est[áa]|fica|s[ãa]o|est[ãa]o)\\s+(permitid|liberad)\\p{L}*|permitimos|aceitamos|sem problemas?|" +
    "(n[ãa]o tem|n[ãa]o h[áa]) problemas?|fi(que|ca) [àa] vontade|bem[- ]vind[oa]s?|pet[- ]friendly",
);
// "Não tem problema" / "não se preocupe" liberam, apesar do "não"
const PERMISSIVE_NEGATION = /(?<![\p{L}\p{N}])n[ãa]o (tem|h[áa]|vejo) problemas?|n[ãa]o (se )?preocupe|n[ãa]o precisa se preocupar/giu;
// Frase que restringe: "não", "infelizmente", "proibido", "é tudo do buffet"
const RESTRICTS_RE = words(
  "n[ãa]o|nunca|infelizmente|proibid\\p{L}*|vedad\\p{L}*|exclusiv\\p{L}*|s[óo] (do|o|pelo) buffet|" +
    "tudo (do|pelo|é do) buffet|somente (do|o|pelo) buffet",
);
const restricts = (s: string) => RESTRICTS_RE.test(s.replace(PERMISSIVE_NEGATION, " "));

function sentenceViolates(s: string, r: HouseRule, asked: HouseTopic[], statesRestriction: boolean): boolean {
  return PERMITS.test(s) && !restricts(s) && (mentionsTopic(s, r.topic) || (asked.includes(r.topic) && !statesRestriction));
}

const statesRestriction = (sentences: string[], r: HouseRule) => sentences.some((s) => mentionsTopic(s, r.topic) && restricts(s));

/**
 * Regras proibidas que a resposta contradiz. Frase que libera e fala do
 * assunto conta sempre; "pode sim" solto conta quando o cliente perguntou do
 * assunto e a resposta não disse a restrição em lugar nenhum.
 */
export function houseRuleViolations(reply: string, rules: HouseRule[], asked: HouseTopic[]): HouseRule[] {
  const sentences = splitSentences(reply);
  return rules.filter((r) => r.forbidden && sentences.some((s) => sentenceViolates(s, r, asked, statesRestriction(sentences, r))));
}

/** Frases da resposta que contradizem o cadastro (para o relatório do simulador) */
export function houseRuleViolatingSentences(reply: string, rules: HouseRule[], asked: HouseTopic[]): string[] {
  const sentences = splitSentences(reply);
  return sentences
    .filter((s) => rules.some((r) => r.forbidden && sentenceViolates(s, r, asked, statesRestriction(sentences, r))))
    .map((s) => s.trim());
}

const answerSentence = (r: HouseRule) =>
  `Sobre ${TOPIC_ASK[r.topic]}: ${r.answer.charAt(0).toLowerCase()}${r.answer.slice(1).replace(/[.!\s]+$/, "")}.`;

/**
 * Reserva quando a IA insiste: tira as frases que liberam o assunto e põe a
 * resposta do cadastro no lugar da primeira.
 */
export function enforceHouseRules(reply: string, violated: HouseRule[], asked: HouseTopic[]): { text: string; removed: string[] } {
  if (violated.length === 0) return { text: reply, removed: [] };
  const all = splitSentences(reply);
  const restricted = new Map(violated.map((r) => [r.topic, statesRestriction(all, r)]));
  const removed: string[] = [];
  const inserted = new Set<HouseTopic>();
  const lines = reply.split("\n").map((line) => {
    const sentences = sentenceParts(line);
    let changed = false;
    const out: string[] = [];
    for (const s of sentences) {
      const rule = violated.find((r) => sentenceViolates(s, r, asked, restricted.get(r.topic) || false));
      if (!rule) {
        out.push(s);
        continue;
      }
      changed = true;
      removed.push(s.trim());
      if (!inserted.has(rule.topic)) {
        inserted.add(rule.topic);
        out.push(`${answerSentence(rule)} `);
      }
    }
    return changed ? out.join("").trim() : line;
  });
  let text = lines.join("\n").replace(/\n{3,}/g, "\n\n").trim();
  for (const r of violated) {
    if (!inserted.has(r.topic)) text = `${answerSentence(r)}\n\n${text}`;
  }
  return { text, removed };
}
