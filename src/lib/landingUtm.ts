/**
 * UTMs da visita na LP (ex.: anúncios da Meta com
 * ?utm_source=meta&utm_medium=pago&utm_campaign=...&utm_content=...).
 *
 * Guardadas em sessionStorage porque a pessoa navega pela página antes de abrir
 * o chat de orçamento — e o lead criado pelo chat precisa levar a origem junto.
 */

export const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_content"] as const;
export type UtmKey = (typeof UTM_KEYS)[number];
export type UtmParams = Partial<Record<UtmKey, string>>;

const STORAGE_KEY = "lp_utm";
const MAX_LEN = 100;

function clean(value: string | null | undefined): string | null {
  const v = (value || "").trim().slice(0, MAX_LEN);
  return v ? v : null;
}

/** Lê as UTMs de uma query string. Sem nenhuma UTM, devolve null. */
export function parseUtms(search: string): UtmParams | null {
  const params = new URLSearchParams(search);
  const out: UtmParams = {};
  for (const key of UTM_KEYS) {
    const v = clean(params.get(key));
    if (v) out[key] = v;
  }
  return Object.keys(out).length > 0 ? out : null;
}

/**
 * Lê as UTMs da URL (se houver), guarda na sessão e devolve as UTMs ativas.
 * Uma visita nova com UTMs substitui as anteriores (última campanha vale).
 */
export function captureLandingUtms(): UtmParams | null {
  if (typeof window === "undefined") return null;
  const fromUrl = parseUtms(window.location.search);
  try {
    if (fromUrl) {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(fromUrl));
      return fromUrl;
    }
    const stored = sessionStorage.getItem(STORAGE_KEY);
    if (!stored) return null;
    const parsed = JSON.parse(stored) as Record<string, unknown>;
    const out: UtmParams = {};
    for (const key of UTM_KEYS) {
      const v = typeof parsed[key] === "string" ? clean(parsed[key] as string) : null;
      if (v) out[key] = v;
    }
    return Object.keys(out).length > 0 ? out : null;
  } catch {
    return fromUrl;
  }
}
