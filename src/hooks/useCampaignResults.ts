import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface CampaignResult {
  /** responderam em até 3 dias depois de receber */
  replied: number;
  /** fecharam festa em até 45 dias depois de receber */
  closed: number;
}

/** Resultado de cada campanha da empresa (calculado no banco, pelo telefone). */
export function useCampaignResults(companyId: string | undefined) {
  return useQuery({
    queryKey: ['campaign-results', companyId],
    queryFn: async (): Promise<Record<string, CampaignResult>> => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any).rpc('campaign_results', { p_company_id: companyId });
      if (error) {
        // Enquanto o SQL novo não roda no banco, a tela segue sem o resultado
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
