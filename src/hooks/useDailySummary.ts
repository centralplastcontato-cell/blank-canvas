import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/contexts/CompanyContext';
import { format, isToday } from 'date-fns';

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
  index: number;
  time: string;
  leadId: string;
  leadName: string;
  action: string;
  oldValue: string | null;
  newValue: string | null;
  userName: string | null;
  botStep: string | null;
  proximoPasso: string | null;
}

export interface IncompleteLead {
  name: string;
  whatsapp: string;
  botStep: string;
  lastMessageAt: string | null;
  isReminded: boolean;
}

export interface DailySummaryData {
  metrics: DailyMetrics;
  aiSummary: string | null;
  timeline: TimelineEvent[];
  incompleteLeads: IncompleteLead[];
  userNote?: string | null;
  isHistorical?: boolean;
  noData?: boolean;
}

export function useDailySummary() {
  const { currentCompany } = useCompany();
  const [data, setData] = useState<DailySummaryData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSummary = useCallback(async (selectedDate?: Date) => {
    if (!currentCompany?.id) return;
    setIsLoading(true);
    setError(null);

    try {
      const body: Record<string, string> = { company_id: currentCompany.id };

      // If a date is selected and it's not today, pass it to fetch historical data
      if (selectedDate && !isToday(selectedDate)) {
        body.date = format(selectedDate, 'yyyy-MM-dd');
      }

      const { data: result, error: fnError } = await supabase.functions.invoke('daily-summary', {
        body,
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
