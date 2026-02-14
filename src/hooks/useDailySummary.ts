import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/contexts/CompanyContext';

export interface DailyMetrics {
  novos: number;
  visitas: number;
  orcamentos: number;
  fechados: number;
  querPensar: number;
  querHumano: number;
  taxaConversao: number;
}

export interface TimelineEvent {
  time: string;
  leadName: string;
  action: string;
  oldValue: string | null;
  newValue: string | null;
  userName: string | null;
}

export interface DailySummaryData {
  metrics: DailyMetrics;
  aiSummary: string | null;
  timeline: TimelineEvent[];
}

export function useDailySummary() {
  const { currentCompany } = useCompany();
  const [data, setData] = useState<DailySummaryData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSummary = useCallback(async () => {
    if (!currentCompany?.id) return;
    setIsLoading(true);
    setError(null);

    try {
      const { data: result, error: fnError } = await supabase.functions.invoke('daily-summary', {
        body: { company_id: currentCompany.id },
      });

      if (fnError) throw fnError;
      setData(result as DailySummaryData);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao gerar resumo');
    } finally {
      setIsLoading(false);
    }
  }, [currentCompany?.id]);

  return { data, isLoading, error, fetchSummary };
}
