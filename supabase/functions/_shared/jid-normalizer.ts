// ============================================================================
// JID Normalizer — fonte única de verdade para JIDs do WhatsApp
// ----------------------------------------------------------------------------
// O webhook recebe JIDs em formatos distintos (W-API, Z-API, raw Baileys),
// e cada provedor usa sufixos diferentes:
//   - @s.whatsapp.net  → contato individual (formato canônico)
//   - @c.us            → variante antiga (sinônimo de @s.whatsapp.net)
//   - @g.us            → grupo
//   - @lid             → "Linked ID" (identidade anônima/privacy do WhatsApp)
//   - @broadcast       → lista de transmissão
//   - status@broadcast → feed de status (ignorar)
//   - @newsletter      → canal/newsletter (ignorar)
//
// Sem normalização, mensagens caem em conversas erradas, duplicam ou somem.
// Este módulo NÃO toca em lógica de envio — só classifica e normaliza.
// ============================================================================

export type JidKind =
  | 'individual'   // contato 1:1 (deve processar)
  | 'group'        // grupo (deve processar, mas com regras especiais)
  | 'lid'          // @lid não resolvido (precisa lookup antes de processar)
  | 'broadcast'    // lista de transmissão ou status (IGNORAR)
  | 'newsletter'   // canal (IGNORAR)
  | 'unknown';     // formato não reconhecido

export interface NormalizedJid {
  /** JID original recebido (sem alterações) */
  raw: string;
  /** JID canônico (sufixo padronizado). Para individual = phone@s.whatsapp.net */
  canonical: string;
  /** Tipo classificado */
  kind: JidKind;
  /** Apenas dígitos (sem @sufixo). Vazio para grupos sem fone. */
  phoneDigits: string;
  /** True quando devemos ignorar silenciosamente (status/broadcast/newsletter) */
  shouldIgnore: boolean;
  /** True quando é um @lid pendente de resolução para JID real */
  needsLidResolution: boolean;
}

const EMPTY: NormalizedJid = {
  raw: '',
  canonical: '',
  kind: 'unknown',
  phoneDigits: '',
  shouldIgnore: true,
  needsLidResolution: false,
};

/**
 * Normaliza um JID em qualquer formato (W-API, Z-API, raw).
 * NUNCA lança — retorna kind='unknown' + shouldIgnore=true em entradas inválidas.
 */
export function normalizeJid(input: unknown): NormalizedJid {
  if (typeof input !== 'string') return EMPTY;
  const raw = input.trim();
  if (!raw) return EMPTY;

  const lower = raw.toLowerCase();

  // Broadcast / status feed
  if (lower === 'status' || lower.startsWith('status@') || lower.includes('@broadcast')) {
    return { raw, canonical: lower, kind: 'broadcast', phoneDigits: '', shouldIgnore: true, needsLidResolution: false };
  }

  // Newsletter / canal
  if (lower.includes('@newsletter')) {
    return { raw, canonical: lower, kind: 'newsletter', phoneDigits: '', shouldIgnore: true, needsLidResolution: false };
  }

  // Grupo
  if (lower.includes('@g.us')) {
    const groupId = raw.split('@')[0];
    const digits = groupId.replace(/\D/g, '');
    return {
      raw,
      canonical: `${groupId}@g.us`,
      kind: 'group',
      phoneDigits: digits,
      shouldIgnore: false,
      needsLidResolution: false,
    };
  }

  // @lid (Linked ID) — não processar bot, precisa resolver para JID real primeiro
  if (lower.includes('@lid')) {
    const lidId = raw.split('@')[0];
    return {
      raw,
      canonical: `${lidId}@lid`,
      kind: 'lid',
      phoneDigits: lidId.replace(/\D/g, ''),
      shouldIgnore: false,
      needsLidResolution: true,
    };
  }

  // Individual (@s.whatsapp.net, @c.us, ou só dígitos)
  const digits = raw.replace(/@s\.whatsapp\.net/gi, '')
    .replace(/@c\.us/gi, '')
    .replace(/\D/g, '');

  if (!digits) {
    return { raw, canonical: lower, kind: 'unknown', phoneDigits: '', shouldIgnore: true, needsLidResolution: false };
  }

  return {
    raw,
    canonical: `${digits}@s.whatsapp.net`,
    kind: 'individual',
    phoneDigits: digits,
    shouldIgnore: false,
    needsLidResolution: false,
  };
}

/**
 * Gera variantes de telefone para lookup (com/sem 55, com/sem 9 móvel).
 * Para Brasil: número pode aparecer como 11987654321, 5511987654321, 551187654321.
 */
export function phoneVariants(digits: string): string[] {
  if (!digits) return [];
  const set = new Set<string>([digits]);
  const noCountry = digits.startsWith('55') ? digits.slice(2) : digits;
  set.add(noCountry);
  set.add(`55${noCountry}`);

  // Móvel BR: alterna presença do 9
  if (noCountry.length === 11 && noCountry[2] === '9') {
    const without9 = noCountry.slice(0, 2) + noCountry.slice(3);
    set.add(without9);
    set.add(`55${without9}`);
  } else if (noCountry.length === 10) {
    const with9 = noCountry.slice(0, 2) + '9' + noCountry.slice(2);
    set.add(with9);
    set.add(`55${with9}`);
  }

  return Array.from(set).filter((v) => v.length >= 10 && v.length <= 13);
}
