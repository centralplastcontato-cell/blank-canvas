// UTMs dos anúncios que trouxeram o lead (enviadas pelo chat de orçamento das LPs).

export const LEAD_UTM_FIELDS = ["utm_source", "utm_medium", "utm_campaign", "utm_content"] as const;
export type LeadUtm = Partial<Record<(typeof LEAD_UTM_FIELDS)[number], string>>;

const MAX_LEN = 100;

/** Aceita só os 4 campos conhecidos, como texto curto. Sem nenhum válido → null. */
export function sanitizeLeadUtm(raw: unknown): LeadUtm | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const src = raw as Record<string, unknown>;
  const out: LeadUtm = {};
  for (const key of LEAD_UTM_FIELDS) {
    const v = src[key];
    if (typeof v !== "string") continue;
    const cleaned = v.replace(/[\u0000-\u001f]/g, "").trim().slice(0, MAX_LEN);
    if (cleaned) out[key] = cleaned;
  }
  return Object.keys(out).length > 0 ? out : null;
}

/** Resumo curto para o histórico do lead: "meta / pago / campanha / conjunto". */
export function formatLeadUtm(utm: LeadUtm | null): string | null {
  if (!utm) return null;
  return LEAD_UTM_FIELDS.map((k) => utm[k]).filter(Boolean).join(" / ") || null;
}
