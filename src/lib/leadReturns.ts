/**
 * Retornos de leads (quem voltou a pedir orçamento).
 *
 * Os retornos passaram a ser gravados no próprio lead (return_count e
 * last_return_at). Os anteriores a isso só existem no histórico
 * ("Lead retornou pela Landing Page"), então as telas combinam as duas fontes.
 */

export interface LegacyReturnSummary {
  count: number;
  lastAt: string | null;
}

export function summarizeLegacyReturns(
  rows: { lead_id: string | null; created_at?: string | null }[],
): Map<string, LegacyReturnSummary> {
  const byLead = new Map<string, LegacyReturnSummary>();
  for (const row of rows) {
    if (!row.lead_id) continue;
    const cur = byLead.get(row.lead_id) ?? { count: 0, lastAt: null };
    cur.count++;
    if (row.created_at && (!cur.lastAt || row.created_at > cur.lastAt)) cur.lastAt = row.created_at;
    byLead.set(row.lead_id, cur);
  }
  return byLead;
}

interface ReturnFields {
  id: string;
  return_count?: number | null;
  last_return_at?: string | null;
}

export function withReturnInfo<T extends ReturnFields>(
  lead: T,
  legacy: Map<string, LegacyReturnSummary>,
): T & { return_count: number; last_return_at: string | null; has_return: boolean } {
  const past = legacy.get(lead.id);
  const return_count = Math.max(Number(lead.return_count) || 0, past?.count ?? 0);
  const candidates = [lead.last_return_at, past?.lastAt].filter((d): d is string => !!d);
  const last_return_at = candidates.length ? candidates.reduce((a, b) => (a > b ? a : b)) : null;
  return { ...lead, return_count, last_return_at, has_return: return_count > 0 };
}

/**
 * Aplica uma atualização em tempo real à lista de leads.
 * Mantém as informações extras já calculadas (follow-ups, retornos antigos) e,
 * se o lead acabou de voltar a pedir orçamento, leva-o para o topo.
 */
export function mergeLeadUpdate<T extends ReturnFields>(list: T[], updated: T): T[] {
  const idx = list.findIndex((l) => l.id === updated.id);
  if (idx === -1) return list;
  const prev = list[idx];
  const merged = {
    ...prev,
    ...updated,
    return_count: Math.max(Number(prev.return_count) || 0, Number(updated.return_count) || 0),
    last_return_at:
      [prev.last_return_at, updated.last_return_at]
        .filter((d): d is string => !!d)
        .reduce<string | null>((a, b) => (!a || b > a ? b : a), null),
  } as T;
  if (merged.return_count && merged.return_count > 0) {
    (merged as T & { has_return?: boolean }).has_return = true;
  }
  const justReturned =
    !!updated.last_return_at && (!prev.last_return_at || updated.last_return_at > prev.last_return_at);
  if (!justReturned) return list.map((l, i) => (i === idx ? merged : l));
  return [merged, ...list.filter((_, i) => i !== idx)];
}
