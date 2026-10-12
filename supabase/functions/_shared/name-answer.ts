// Nome que o cliente respondeu quando a IA perguntou "Qual é o seu nome?".
// Rede de segurança: a IA às vezes chama o cliente pelo nome sem registrar
// (caso Alaide, 12/10 — a conversa ficou com o nome do WhatsApp, "não sei").

const ASKED_NAME = /\b(qual\s+(?:é\s+|e\s+)?(?:o\s+)?seu\s+nome|como\s+(?:você|voce|vc)\s+se\s+chama|com\s+quem\s+(?:eu\s+)?falo|seu\s+nome\s*\?)/i;

const PREFIXES = [
  /^(?:o\s+)?meu\s+nome\s+(?:é|e)\s+/i,
  /^(?:eu\s+)?(?:sou|me\s+chamo)\s+(?:a\s+|o\s+)?/i,
  /^(?:pode\s+me\s+chamar\s+de\s+)/i,
  /^(?:aqui\s+(?:é|e)\s+(?:a\s+|o\s+)?)/i,
  /^(?:é|e)\s+(?:a\s+|o\s+)?/i,
  /^nome:?\s+/i,
];

// Palavras que indicam frase/resposta, não nome
const NOT_NAME_WORDS = new Set([
  'oi', 'ola', 'olá', 'bom', 'boa', 'dia', 'tarde', 'noite', 'sim', 'não', 'nao', 'ok', 'tá', 'ta', 'blz',
  'sei', 'talvez', 'quero', 'queria', 'gostaria', 'preciso', 'que', 'tem', 'como', 'qual', 'quanto',
  'festa', 'buffet', 'orçamento', 'orcamento', 'valor', 'preço', 'preco', 'pacote', 'visita',
  'obrigado', 'obrigada', 'cliente', 'você', 'voce', 'mãe', 'mae', 'pai', 'aniversário', 'aniversario',
  'meu', 'minha', 'filho', 'filha', 'para', 'pra', 'de', 'do', 'da', 'e',
]);

export function askedForName(assistantText: string | null | undefined): boolean {
  return ASKED_NAME.test(String(assistantText || ''));
}

/** "alaide" → "Alaide"; "meu nome é ana paula" → "Ana Paula"; frase/resposta → null */
export function nameFromAnswer(raw: string | null | undefined): string | null {
  let t = String(raw || '').trim().replace(/[.!😊🙂☺️]+$/u, '').trim();
  for (const p of PREFIXES) {
    if (p.test(t)) {
      t = t.replace(p, '').trim();
      break;
    }
  }
  if (t.length < 2 || t.length > 40) return null;
  if (!/^[\p{L}\s'-]+$/u.test(t)) return null;
  const words = t.split(/\s+/).filter(Boolean);
  if (words.length > 4) return null;
  // Nomes compostos aceitam "de/da/dos" no meio, nunca no começo
  const connectors = new Set(['de', 'da', 'do', 'dos', 'das', 'e']);
  if (connectors.has(words[0].toLowerCase())) return null;
  if (words.some((w) => !connectors.has(w.toLowerCase()) && NOT_NAME_WORDS.has(w.toLowerCase()))) return null;
  return words
    .map((w) => (connectors.has(w.toLowerCase()) ? w.toLowerCase() : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()))
    .join(' ');
}
