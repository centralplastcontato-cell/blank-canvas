// "Te mandei as fotos/o vídeo/o PDF": a IA só pode dizer isso quando o envio
// foi registrado. O simulador pegou ela dizendo que mandou materiais que não
// tinham saído (faltava o mês da festa). As frases com essa afirmação falsa
// saem da resposta antes de enviar.
//
// Precisão antes de tudo: só conta quando o material é o objeto do envio
// ("te mandei as fotos", "as fotos que te mandei", "fotos enviadas", "seguem
// as fotos") — "me segue no Instagram, tem fotos lá", "encaminhei seu pedido
// para a equipe, que vai te mandar o vídeo" e "mandamos assim que..." não contam.

export type MaterialKind = "fotos" | "video" | "pacotes";

const MAT = "fot(?:o|os|inho|inhos)|image(?:m|ns)|v[ií]deos?|pdf|materia(?:l|is)|arquivo d[eo]s? pacotes|cat[áa]logo";
// Palavras curtas que cabem entre o verbo e o material ("te mandei agora há pouco as 6 fotos")
const FILLER = "(?:te|lhe|j[áa]|aqui|agora|ali|acima|em cima|h[áa] pouco|pouco|novamente|de novo|tamb[ée]m|tb|o|a|os|as|um|uma|uns|umas|seu|sua|seus|suas|nosso|nossa|nossos|nossas|todas|todos|mais|algumas|alguns|\\d+|duas|tr[êe]s|v[áa]rias|v[áa]rios)";
// Mais materiais em lista: "as fotos do salão, o vídeo e o PDF"
const ITEM = `(?:${MAT})(?:\\s+d[eoa]s?\\s+\\p{L}+(?:\\s+(?!e(?!\\p{L}))\\p{L}+)?)?`;
const LIST = `${ITEM}(?:\\s*(?:,|\\se)\\s+(?:(?:o|a|os|as|tamb[ée]m|um|uma)\\s+){0,2}${ITEM})*`;
// Envio no passado. "mandamos/enviamos" no presente ("mandamos assim que...") só com "já"/"acabamos de"
const PAST = "mandei|enviei|encaminhei|compartilhei|passei|deixei|" +
  "acabei de (?:te |lhe )?(?:mandar|enviar|encaminhar)|" +
  "j[áa] (?:te |lhe )?(?:mandamos|enviamos|encaminhamos)|acabamos de (?:te |lhe )?(?:mandar|enviar|encaminhar)";
const B = "(?<![\\p{L}\\p{N}])";
const E = "(?![\\p{L}\\p{N}])";

const CLAIMS: RegExp[] = [
  // "te mandei as fotos (do salão), o vídeo e o PDF"
  new RegExp(`${B}(?:${PAST})(?:\\s+${FILLER}){0,4}\\s+${LIST}${E}`, "giu"),
  // "as fotos que te mandei" / "das fotos que te enviamos"
  new RegExp(`${B}${LIST}(?:\\s+\\p{L}+){0,2}?\\s+(?:que|q)\\s+(?:eu\\s+)?(?:j[áa]\\s+)?(?:te\\s+|lhe\\s+)?(?:mandei|enviei|encaminhei|passei|mandamos|enviamos|encaminhamos)${E}`, "giu"),
  // "fotos enviadas", "o vídeo já foi enviado", "as fotos foram enviadas"
  new RegExp(`${B}${LIST}(?:\\s+(?:j[áa]|aqui))?\\s+(?:(?:j[áa]\\s+)?(?:foi|foram|est[áa]|est[ãa]o)\\s+)?(?:enviad|mandad|encaminhad)[oa]s?${E}`, "giu"),
  // "enviada a foto"
  new RegExp(`${B}(?:enviad|mandad)[oa]s?\\s+(?:a|o|as|os)\\s+${LIST}${E}`, "giu"),
  // "Seguem as fotos" (no começo da frase)
  new RegExp(`^[^\\p{L}\\p{N}]*(?:aqui\\s+)?(?:segue|seguem)(?:\\s+(?:aqui|abaixo|em anexo))?\\s+(?:a|o|as|os)\\s+${LIST}${E}`, "giu"),
  // "Aí estão as fotos" / "as fotos estão aí em cima"
  new RegExp(`${B}(?:a[íi]|aqui)\\s+(?:est[ãa]o|est[áa]|t[áa]|t[ãa]o)\\s+(?:a|o|as|os)\\s+${LIST}${E}`, "giu"),
  new RegExp(`${B}(?:a|o|as|os)\\s+${LIST}\\s+(?:est[ãa]o|est[áa]|t[áa]|t[ãa]o)\\s+(?:a[íi]|aqui)\\s+(?:em cima|acima)${E}`, "giu"),
];
// "Ainda não te mandei as fotos": negação logo antes do verbo
const NEGATION_BEFORE = /(?<![\p{L}\p{N}])n[ãa]o\s+(?:(?:te|lhe|j[áa]|ainda|tinha|havia)\s+)*$/iu;

const kindsIn = (match: string): Array<MaterialKind | "any"> => {
  const out: Array<MaterialKind | "any"> = [];
  if (/fot|image/iu.test(match)) out.push("fotos");
  if (/v[ií]deo/iu.test(match)) out.push("video");
  if (/pdf|pacotes|cat[áa]logo/iu.test(match)) out.push("pacotes");
  if (out.length === 0 && /materia/iu.test(match)) out.push("any");
  return out;
};

// Emoji (com tom de pele, bandeira, variação) seguido de palavra também separa frase
// ("Já te mandei as fotos 📸 me conta: qual o mês?")
const EMOJI_BREAK = /((?:\p{Extended_Pictographic}|\p{Emoji_Modifier}|\p{Regional_Indicator}|\u{FE0F}|\u{200D}|\u{20E3})+\s+)(?=[\p{L}*_])/gu;
// Ponto entre números ("R$ 5.490,00") não termina frase
const SENTENCE = /[.!?…]*(?:[^.!?…]|(?<=\d)\.(?=\d))+(?:[.!?…]+[^\p{L}\p{N}*_(]*|$)|[.!?…]+[^\p{L}\p{N}*_(]*$/gu;

/** Frases de uma linha; juntando as partes volta o texto original */
export const sentenceParts = (line: string): string[] =>
  line.replace(EMOJI_BREAK, "$1\u0000").split("\u0000").flatMap((seg) => seg.match(SENTENCE) || (seg ? [seg] : []));

/** Materiais que a frase diz ter enviado ("any" = "os materiais", sem dizer quais) */
export function claimedMaterials(sentence: string): Array<MaterialKind | "any"> {
  const found = new Set<MaterialKind | "any">();
  for (const re of CLAIMS) {
    for (const m of sentence.matchAll(re)) {
      if (NEGATION_BEFORE.test(sentence.slice(Math.max(0, (m.index ?? 0) - 30), m.index))) continue;
      for (const k of kindsIn(m[0])) found.add(k);
    }
  }
  if (found.size > 1) found.delete("any");
  return Array.from(found);
}

/** A resposta afirma ter enviado algum material? */
export function hasMaterialClaim(text: string): boolean {
  return text.split("\n").some((line) => sentenceParts(line).some((s) => claimedMaterials(s).length > 0));
}

const isFalseClaim = (s: string, sent: Set<MaterialKind>) =>
  claimedMaterials(s).some((k) => (k === "any" ? sent.size === 0 : !sent.has(k)));

/** Frases que dizem ter enviado um material que não foi enviado (`sent` = envios registrados) */
export function falseMaterialClaims(text: string, sent: Set<MaterialKind>): string[] {
  return text.split("\n").flatMap((line) => sentenceParts(line)).filter((s) => isFalseClaim(s, sent)).map((s) => s.trim());
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
      const bad = isFalseClaim(s, sent);
      if (bad) removed.push(s.trim());
      return !bad;
    });
    return kept.length === sentences.length ? line : kept.join("").trim();
  });
  if (removed.length === 0) return { text, removed };
  return { text: lines.join("\n").replace(/\n{3,}/g, "\n\n").trim(), removed };
}

/** Sobrou texto de verdade (não só emoji/pontuação) depois de tirar frases? */
export const hasSubstance = (text: string): boolean =>
  text.replace(/[\s\p{P}\p{S}\p{Extended_Pictographic}]|‍|️/gu, "").length >= 5;

/** O que sobrou ainda fala do material que não chegou ("o que achou delas?") */
export const refersToMaterial = (text: string): boolean =>
  /(?<![\p{L}])(delas|deles|gostou|gostaram|achou|achaste|deu (pra|para) ver|conseguiu ver|viu (as|o|a)|chegou|chegaram)(?![\p{L}])/iu.test(text);
