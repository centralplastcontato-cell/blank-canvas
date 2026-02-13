import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentCompanyId } from "@/hooks/useCurrentCompanyId";

interface LeadSummaryResult {
  summary: string;
  nextAction: string;
  hasConversation: boolean;
}

export function useLeadSummary(leadId: string | null) {
  const companyId = useCurrentCompanyId();
  const [data, setData] = useState<LeadSummaryResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSummary = useCallback(async () => {
    if (!leadId || !companyId) return;

    setIsLoading(true);
    setError(null);

    try {
      const { data: result, error: fnError } = await supabase.functions.invoke('lead-summary', {
        body: { lead_id: leadId, company_id: companyId },
      });

      if (fnError) {
        // Check for specific status codes in the error
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

      setData(result);
    } catch (e: any) {
      setError(e.message || 'Erro inesperado');
    } finally {
      setIsLoading(false);
    }
  }, [leadId, companyId]);

  return { data, isLoading, error, fetchSummary };
}
