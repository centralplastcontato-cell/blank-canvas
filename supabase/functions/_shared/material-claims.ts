// "Te mandei as fotos/o vídeo/o PDF": a IA só pode dizer isso quando o envio
// foi registrado. O simulador pegou ela dizendo que mandou materiais que não
// tinham saído (faltava o mês da festa). As frases com essa afirmação falsa
// saem da resposta antes de enviar.

export type MaterialKind = "fotos" | "video" | "pacotes";

// \b do JavaScript não entende acento: palavra inteira com letras Unicode
const words = (alternatives: string) => new RegExp(`(?<![\\p{L}\\p{N}])(${alternatives})(?![\\p{L}\\p{N}])`, "iu");

// Envio no passado ("mandei", "já te enviei", "acabei de mandar", "seguem",
// "foram enviadas") — "vou te mandar" ou "te mando" não são afirmação de envio
const SENT_VERB = words(
  "mandei|enviei|encaminhei|compartilhei|mandamos|enviamos|encaminhamos|" +
    "acabei de (te |lhe )?(mandar|enviar|encaminhar)|segue|seguem|" +
    "(foi|foram|j[áa] est[áa]|j[áa] est[ãa]o) (enviad|mandad|encaminhad)[oa]s?",
);
// "Ainda não te mandei as fotos" não é afirmação de envio
const NEGATED_VERB = words(
  "n[ãa]o\\s+(\\S+\\s+){0,2}(mandei|enviei|encaminhei|compartilhei|mandamos|enviamos|encaminhamos|foi|foram)",
);

const KIND_WORDS: Array<[MaterialKind, RegExp]> = [
  ["fotos", words("fot(o|os|inho|inhos)|image(m|ns)")],
  ["video", words("v[ií]deos?")],
  // Só "PDF": "te mandei os valores dos pacotes" é texto, não o arquivo
  ["pacotes", words("pdf")],
];
const GENERIC = words("materia(l|is)");

// Emoji seguido de palavra com maiúscula também separa frase ("Já te mandei as fotos 📸 Qual o mês?")
const EMOJI_BREAK = /(\p{Extended_Pictographic}[\u{FE0F}\u{200D}\p{Extended_Pictographic}]*\s+)(?=\p{Lu})/gu;
// Ponto entre números ("R$ 5.490,00") não termina frase
const SENTENCE = /(?:[^.!?]|(?<=\d)\.(?=\d))+(?:[.!?]+[^\p{L}\p{N}*_(]*|$)/gu;

/** Frases de uma linha; juntando as partes volta o texto original */
export const sentenceParts = (line: string): string[] =>
  line.replace(EMOJI_BREAK, "$1\u0000").split("\u0000").flatMap((seg) => seg.match(SENTENCE) || (seg ? [seg] : []));

/** Materiais que a frase diz ter enviado ("any" = "os materiais", sem dizer quais) */
export function claimedMaterials(sentence: string): Array<MaterialKind | "any"> {
  if (!SENT_VERB.test(sentence) || NEGATED_VERB.test(sentence)) return [];
  const kinds: Array<MaterialKind | "any"> = KIND_WORDS.filter(([, re]) => re.test(sentence)).map(([k]) => k);
  if (kinds.length === 0 && GENERIC.test(sentence)) kinds.push("any");
  return kinds;
}

/** A resposta afirma ter enviado algum material? */
export function hasMaterialClaim(text: string): boolean {
  return text.split("\n").some((line) => sentenceParts(line).some((s) => claimedMaterials(s).length > 0));
}

/** Frases que dizem ter enviado um material que não foi enviado (`sent` = envios registrados) */
export function falseMaterialClaims(text: string, sent: Set<MaterialKind>): string[] {
  return text.split("\n").flatMap((line) => sentenceParts(line))
    .filter((s) => claimedMaterials(s).some((k) => (k === "any" ? sent.size === 0 : !sent.has(k))))
    .map((s) => s.trim());
}

/**
 * Tira as frases que dizem ter enviado um material que não foi enviado.
 * `sent` = materiais com envio registrado na conversa.
 */
export function stripFalseMaterialClaims(text: string, sent: Set<MaterialKind>): { text: string; removed: string[] } {
  const removed: string[] = [];
  const lines = text.split("\n").map((line) => {
    const sentences = sentenceParts(line);
    const kept = sentences.filter((s) => {
      const isFalse = claimedMaterials(s).some((k) => (k === "any" ? sent.size === 0 : !sent.has(k)));
      if (isFalse) removed.push(s.trim());
      return !isFalse;
    });
    return kept.length === sentences.length ? line : kept.join("").trim();
  });
  if (removed.length === 0) return { text, removed };
  return { text: lines.join("\n").replace(/\n{3,}/g, "\n\n").trim(), removed };
}

/** Sobrou texto de verdade (não só emoji/pontuação) depois de tirar frases? */
export const hasSubstance = (text: string): boolean =>
  text.replace(/[\s\p{P}\p{S}\p{Extended_Pictographic}]|\u200d|\ufe0f/gu, "").length >= 8;
