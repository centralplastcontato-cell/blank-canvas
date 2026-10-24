import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface VariationResult {
  /** posição da mensagem na campanha (Variação 1 = 0) */
  index: number;
  sent: number;
  replied: number;
}

export interface CampaignResult {
  /** responderam em até 3 dias depois de receber */
  replied: number;
  /** fecharam festa em até 45 dias depois de receber */
  closed: number;
  /** quem respondeu e marcou visita em até 30 dias (sem o SQL novo: indefinido) */
  visited?: number;
  /** enviadas com sucesso (pelo funil) */
  sent?: number;
  /** resultado de cada mensagem */
  variations?: VariationResult[];
}

interface FunnelRow {
  campaign_id: string;
  variation_index: number;
  sent: number;
  replied: number;
  visited: number;
  closed: number;
}

/** Junta as linhas do funil (uma por campanha e mensagem) por campanha */
export function groupFunnel(rows: FunnelRow[]): Record<string, CampaignResult> {
  const out: Record<string, CampaignResult> = {};
  for (const r of rows) {
    const c = (out[r.campaign_id] ||= { replied: 0, closed: 0, visited: 0, sent: 0, variations: [] });
    c.sent = (c.sent || 0) + r.sent;
    c.replied += r.replied;
    c.visited = (c.visited || 0) + r.visited;
    c.closed += r.closed;
    c.variations!.push({ index: r.variation_index, sent: r.sent, replied: r.replied });
  }
  for (const c of Object.values(out)) c.variations!.sort((a, b) => a.index - b.index);
  return out;
}

/**
 * Mensagem que mais trouxe respostas. Só aponta quando dá para comparar:
 * 2+ mensagens com pelo menos `minSent` envios cada e a melhor à frente.
 */
export function bestVariation(variations: VariationResult[] | undefined, minSent = 10): number | null {
  const fair = (variations || []).filter((v) => v.sent >= minSent);
  if (fair.length < 2) return null;
  const rate = (v: VariationResult) => v.replied / v.sent;
  const sorted = [...fair].sort((a, b) => rate(b) - rate(a));
  return rate(sorted[0]) > rate(sorted[1]) ? sorted[0].index : null;
}

/** Resultado de cada campanha da empresa (calculado no banco, pelo telefone). */
export function useCampaignResults(companyId: string | undefined) {
  return useQuery({
    queryKey: ['campaign-results', companyId],
    queryFn: async (): Promise<Record<string, CampaignResult>> => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const db = supabase as any;
      const funnel = await db.rpc('campaign_funnel', { p_company_id: companyId });
      if (!funnel.error) return groupFunnel((funnel.data || []) as FunnelRow[]);
      // Enquanto o SQL do funil não roda no banco, usa o resultado antigo
      const { data, error } = await db.rpc('campaign_results', { p_company_id: companyId });
      if (error) {
        console.warn('campaign_results indisponível:', error.message);
        return {};
      }
      const out: Record<string, CampaignResult> = {};
      for (const r of (data || []) as Array<{ campaign_id: string; replied: number; closed: number }>) {
        out[r.campaign_id] = { replied: r.replied, closed: r.closed };
      }
      return out;
    },
    enabled: !!companyId,
    staleTime: 5 * 60_000,
  });
}

/** Porcentagem arredondada (0 quando não enviou nada) */
export function percentOf(part: number, total: number): number {
  return total > 0 ? Math.round((part * 100) / total) : 0;
}
