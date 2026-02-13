import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentCompanyId } from "@/hooks/useCurrentCompanyId";

interface LeadSummaryResult {
  summary: string;
  nextAction: string;
  hasConversation: boolean;
  generatedAt?: string | null;
}

export function useLeadSummary(leadId: string | null) {
  const companyId = useCurrentCompanyId();
  const [data, setData] = useState<LeadSummaryResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingSaved, setIsFetchingSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load saved summary when leadId changes
  useEffect(() => {
    setData(null);
    setError(null);

    if (!leadId) return;

    const loadSaved = async () => {
      setIsFetchingSaved(true);
      try {
        const { data: intel, error: fetchError } = await supabase
          .from('lead_intelligence')
          .select('ai_summary, ai_next_action, ai_summary_at')
          .eq('lead_id', leadId)
          .maybeSingle();

        if (!fetchError && intel?.ai_summary) {
          setData({
            summary: intel.ai_summary as string,
            nextAction: (intel.ai_next_action as string) || '',
            hasConversation: true,
            generatedAt: intel.ai_summary_at as string | null,
          });
        }
      } catch (e) {
        console.error('Error loading saved summary:', e);
      } finally {
        setIsFetchingSaved(false);
      }
    };

    loadSaved();
  }, [leadId]);

  const fetchSummary = useCallback(async () => {
    if (!leadId || !companyId) return;

    setIsLoading(true);
    setError(null);

    try {
      const { data: result, error: fnError } = await supabase.functions.invoke('lead-summary', {
        body: { lead_id: leadId, company_id: companyId },
      });

      if (fnError) {
        const msg = fnError.message || '';
        if (msg.includes('429')) {
          setError('Limite de requisições excedido. Tente novamente em alguns segundos.');
        } else if (msg.includes('402')) {
          setError('Créditos de IA insuficientes.');
        } else {
          setError('Erro ao gerar resumo. Tente novamente.');
        }
        return;
      }

      if (result?.error) {
        setError(result.error);
        return;
      }

      setData({
        ...result,
        generatedAt: new Date().toISOString(),
      });
    } catch (e: any) {
      setError(e.message || 'Erro inesperado');
    } finally {
      setIsLoading(false);
    }
  }, [leadId, companyId]);

  return { data, isLoading, isFetchingSaved, error, fetchSummary };
}
