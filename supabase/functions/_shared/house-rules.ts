// Regras do buffet que vêm do cadastro ("Pode levar comida/bolo de fora?",
// "Animal de estimação"). O simulador pegou a IA dizendo "Pode sim contratar
// o carrinho de sorvete de fora" com o cadastro dizendo "Não, é tudo do
// buffet". Aqui ficam: ler a resposta do cadastro, saber se o cliente
// perguntou disso e conferir se a resposta da IA contradiz o cadastro.
//
// Precisão antes de tudo: só confere quando o CLIENTE perguntou do assunto
// nesta mensagem, e só conta frase que libera o assunto ("pode sim trazer o
// bolo", "Pode sim!") — "pode levar até 80 convidados", "pode sim visitar no
// sábado" e "o bolo já está incluso" não contam.

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
// Origem de fora. Só "levar" não basta ("quantos convidados posso levar", "levar o bolo pra casa")
const FOOD_OUTSIDE = words(
  "de fora|trazer|trago|traga|trazemos|contratar|contrato|contratamos|fornecedor\\p{L}*|terceiriz\\p{L}*|" +
    "por (minha|nossa) conta|encomend\\p{L}*|confeit\\p{L}*|bolei\\p{L}*|docei\\p{L}*|outro buffet|outra empresa|" +
    "de casa|feit[oa]s? em casa|caseir[oa]s?|(minha|meu) (m[ãa]e|tia|tio|av[óoô]|sogra|irm[ãa]|amig[oa]|prim[oa])",
);
const LEVAR = words("levar|levo|levamos|leva");
const TAKE_HOME = words("(pra|para) casa|embora|sobr(a|ar|ou|ando|aram)|convidad\\p{L}*|pessoas|crian[çc]as|adultos");
const ANIMAL = words(
  "cachorr(o|a|os|as|inho|inha|inhos|inhas)|c[ãa]es|c[ãa]o|cadel\\p{L}*|gat(o|a|os|as|inho|inha|inhos|inhas)|" +
    "pets?|animal|animais|bichinhos?|bicho de estima[çc][ãa]o|dog",
);
const ANIMAL_ASK = words("levar|levo|trazer|trago|entrar|entra|junto|acompanh\\p{L}*|pode|posso|podemos|permit\\p{L}*|aceit\\p{L}*|liberad\\p{L}*");
const THEME = words("tema|tem[áa]tic\\p{L}*|decora[çc][ãa]o|festa (e|é|vai ser|ser[áa]) d[eao]|personage\\p{L}*|patrulha");

const mentionsTopic = (sentence: string, topic: HouseTopic): boolean =>
  topic === "comida" ? FOOD.test(sentence) : ANIMAL.test(sentence.replace(HOT_DOG, " "));

const splitSentences = (text: string): string[] => text.split("\n").flatMap((line) => sentenceParts(line));

/** Assuntos do cadastro que o cliente perguntou nesta mensagem */
export function topicsAsked(clientText: string): HouseTopic[] {
  const out: HouseTopic[] = [];
  const sentences = splitSentences(clientText);
  if (sentences.some((s) => FOOD.test(s) && (FOOD_OUTSIDE.test(s) || (LEVAR.test(s) && !TAKE_HOME.test(s))))) out.push("comida");
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

// Frase que libera o assunto: "pode sim", "pode trazer", "é permitido", "sem problema", "pets são bem-vindos"
const PERMITS = words(
  "pode(m)? sim|sim,? pode(m)?|claro que pode(m)?|pode(m)?(\\s+\\S+){0,2}\\s+(levar|trazer|contratar|chamar|incluir|entrar|vir)|" +
    "(é|est[áa]|fica|s[ãa]o|est[ãa]o)\\s+(permitid|liberad)\\p{L}*|permitimos|aceitamos|liberad[oa]s?|sem problemas?|" +
    "(n[ãa]o tem|n[ãa]o h[áa]) problemas?|bem[- ]vind[oa]s?|pet[- ]friendly",
);
// Frase que diz que não pode (a negação tem de ser sobre poder: "não tem taxa", "não esqueça" não contam)
const NEGATES = words(
  "n[ãa]o (pode(m)?|[ée] permitid\\p{L}*|permitimos|aceitamos|trabalhamos|d[áa]|rola|[ée] poss[íi]vel|tem como|conseguimos|liberamos|fazemos|[ée] liberad\\p{L}*)|" +
    "infelizmente|proibid\\p{L}*|vedad\\p{L}*|exclusiv\\p{L}*|(s[óo]|somente|apenas) (do|o|pelo|com o|nosso) buffet|" +
    "tudo (do|pelo|[ée] do|feito pelo) buffet|(feit[oa]s?|fornecid[oa]s?|servid[oa]s?|preparad[oa]s?) (pelo buffet|aqui|por n[óo]s|pela nossa equipe|pela equipe)|" +
    "por nossa conta",
);
const NO_ANSWER = /^[^\p{L}]*n[ãa]o\s*[,!.…]/iu; // "Não, ..." / "Não!"
// "Pode sim, só não pode salgado": a exceção não desfaz a liberação
const ONLY_NOT = /(?<![\p{L}])(s[óo]|mas) n[ãa]o\s.*$/iu;
const negates = (s: string) => {
  const core = s.replace(ONLY_NOT, " ");
  return NEGATES.test(core) || NO_ANSWER.test(core);
};

// "Pode sim!", "Sim, pode!", "Claro!", "Pode levar ele sim" — liberação sem outro assunto na frase
const BARE_WORDS = new Set([
  "pode", "podem", "sim", "claro", "que", "com", "certeza", "liberado", "liberada", "tranquilo", "tranquila", "opa", "oba",
  "levar", "trazer", "contratar", "ele", "ela", "eles", "elas", "lo", "la", "los", "las", "o", "a", "os", "as", "ser", "também", "tambem",
]);
const BARE_CORE = new Set(["pode", "podem", "sim", "claro", "certeza", "liberado", "liberada"]);
function isBarePermit(sentence: string): boolean {
  const firstClause = sentence.split(/[,;:]/)[0];
  const tokens = firstClause.split(/[^\p{L}-]+/u).filter(Boolean);
  // Nome próprio no meio ("Pode sim, Mariana") não conta
  const plain = tokens.filter((t, i) => i === 0 || !/^\p{Lu}/u.test(t)).map((t) => t.toLowerCase().replace(/-(lo|la|los|las)$/, ""));
  return plain.length > 0 && plain.every((t) => BARE_WORDS.has(t)) && plain.some((t) => BARE_CORE.has(t));
}

function sentenceViolates(s: string, r: HouseRule, restrictionStated: boolean): boolean {
  if (negates(s)) return false;
  if (mentionsTopic(s, r.topic) && PERMITS.test(s) && !(r.topic === "comida" && TAKE_HOME.test(s))) return true;
  return isBarePermit(s) && !restrictionStated;
}

const checked = (rules: HouseRule[], asked: HouseTopic[]) => rules.filter((r) => r.forbidden && asked.includes(r.topic));

/**
 * Regras proibidas (que o cliente perguntou nesta mensagem) que a resposta contradiz.
 */
export function houseRuleViolations(reply: string, rules: HouseRule[], asked: HouseTopic[]): HouseRule[] {
  const sentences = splitSentences(reply);
  const stated = sentences.some(negates);
  return checked(rules, asked).filter((r) => sentences.some((s) => sentenceViolates(s, r, stated)));
}

/** Frases da resposta que contradizem o cadastro */
export function houseRuleViolatingSentences(reply: string, rules: HouseRule[], asked: HouseTopic[]): string[] {
  const sentences = splitSentences(reply);
  const stated = sentences.some(negates);
  const active = checked(rules, asked);
  return sentences.filter((s) => active.some((r) => sentenceViolates(s, r, stated))).map((s) => s.trim());
}

const answerSentence = (r: HouseRule) =>
  `Sobre ${TOPIC_ASK[r.topic]}: ${r.answer.charAt(0).toLowerCase()}${r.answer.slice(1).replace(/[.!\s]+$/, "")}.`;

/**
 * Reserva quando a IA insiste: tira as frases que liberam o assunto e põe a
 * resposta do cadastro no começo.
 */
export function enforceHouseRules(reply: string, violated: HouseRule[]): { text: string; removed: string[] } {
  if (violated.length === 0) return { text: reply, removed: [] };
  const stated = splitSentences(reply).some(negates);
  const removed: string[] = [];
  const lines = reply.split("\n").map((line) => {
    const sentences = sentenceParts(line);
    const kept = sentences.filter((s) => {
      const bad = violated.some((r) => sentenceViolates(s, r, stated));
      if (bad) removed.push(s.trim());
      return !bad;
    });
    return kept.length === sentences.length ? line : kept.join("").trim();
  });
  const rest = lines.join("\n").replace(/\n{3,}/g, "\n\n").trim();
  const head = violated.map(answerSentence).join(" ");
  return { text: rest ? `${head}\n\n${rest}` : head, removed };
}
