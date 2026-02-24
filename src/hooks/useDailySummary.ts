import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/contexts/CompanyContext';
import { format, isToday, eachDayOfInterval, isSameDay } from 'date-fns';

export interface DailyMetrics {
  novos: number;
  visitas: number;
  orcamentos: number;
  fechados: number;
  querPensar: number;
  querHumano: number;
  taxaConversao: number;
  followUp24h: number;
  followUp48h: number;
  followUp3: number;
  followUp4: number;
}

export interface FollowUpLead {
  leadId: string;
  name: string;
  whatsapp: string;
  tipo: string;
  time: string;
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

export interface FollowUpLabels {
  fu1: string;
  fu2: string;
  fu3: string;
  fu4: string;
}

export interface DailySummaryData {
  metrics: DailyMetrics;
  aiSummary: string | null;
  timeline: TimelineEvent[];
  incompleteLeads: IncompleteLead[];
  followUpLeads: FollowUpLead[];
  followUpLabels?: FollowUpLabels;
  userNote?: string | null;
  isHistorical?: boolean;
  noData?: boolean;
}

function aggregateResults(results: DailySummaryData[]): DailySummaryData {
  const valid = results.filter(r => !r.noData);
  if (valid.length === 0) {
    return {
      metrics: { novos: 0, visitas: 0, orcamentos: 0, fechados: 0, querPensar: 0, querHumano: 0, taxaConversao: 0, followUp24h: 0, followUp48h: 0, followUp3: 0, followUp4: 0 },
      aiSummary: null,
      timeline: [],
      incompleteLeads: [],
      followUpLeads: [],
      noData: true,
    };
  }

  const metrics: DailyMetrics = {
    novos: 0, visitas: 0, orcamentos: 0, fechados: 0,
    querPensar: 0, querHumano: 0, taxaConversao: 0,
    followUp24h: 0, followUp48h: 0, followUp3: 0, followUp4: 0,
  };

  for (const r of valid) {
    if (r.metrics) {
      metrics.novos += r.metrics.novos || 0;
      metrics.visitas += r.metrics.visitas || 0;
      metrics.orcamentos += r.metrics.orcamentos || 0;
      metrics.fechados += r.metrics.fechados || 0;
      metrics.querPensar += r.metrics.querPensar || 0;
      metrics.querHumano += r.metrics.querHumano || 0;
      metrics.followUp24h += r.metrics.followUp24h || 0;
      metrics.followUp48h += r.metrics.followUp48h || 0;
      metrics.followUp3 += r.metrics.followUp3 || 0;
      metrics.followUp4 += r.metrics.followUp4 || 0;
    }
  }

  // Recalculate conversion rate from aggregated data
  const totalLeads = metrics.novos + metrics.visitas + metrics.orcamentos + metrics.fechados + metrics.querPensar;
  metrics.taxaConversao = totalLeads > 0 ? Math.round((metrics.fechados / totalLeads) * 100) : 0;

  // Merge timelines
  const allTimeline = valid.flatMap(r => r.timeline || []);

  // Merge incomplete leads (deduplicate by whatsapp)
  const seenIncomplete = new Set<string>();
  const incompleteLeads: IncompleteLead[] = [];
  for (const r of valid) {
    for (const lead of r.incompleteLeads || []) {
      if (!seenIncomplete.has(lead.whatsapp)) {
        seenIncomplete.add(lead.whatsapp);
        incompleteLeads.push(lead);
      }
    }
  }

  // Merge follow-up leads
  const allFollowUps = valid.flatMap(r => r.followUpLeads || []);

  // Merge AI summaries
  const aiParts = valid.filter(r => r.aiSummary).map(r => r.aiSummary!);
  const aiSummary = aiParts.length > 0 ? aiParts.join('\n\n---\n\n') : null;

  return {
    metrics,
    aiSummary,
    timeline: allTimeline,
    incompleteLeads,
    followUpLeads: allFollowUps,
    followUpLabels: valid[0]?.followUpLabels,
    isHistorical: true,
    noData: false,
  };
}

export function useDailySummary() {
  const { currentCompany } = useCompany();
  const [data, setData] = useState<DailySummaryData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSummary = useCallback(async (selectedDate?: Date, forceRefresh?: boolean) => {
    if (!currentCompany?.id) return;
    setIsLoading(true);
    setError(null);

    try {
      const body: Record<string, any> = { company_id: currentCompany.id };

      if (selectedDate && !isToday(selectedDate)) {
        body.date = format(selectedDate, 'yyyy-MM-dd');
      }

      if (forceRefresh) {
        body.force_refresh = true;
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

  const fetchRange = useCallback(async (from: Date, to: Date) => {
    if (!currentCompany?.id) return;
    setIsLoading(true);
    setError(null);

    try {
      const days = eachDayOfInterval({ start: from, end: to });
      
      // Fetch all days in parallel (max 31 days)
      const limited = days.slice(0, 31);
      const promises = limited.map(day => {
        const body: Record<string, any> = { company_id: currentCompany.id };
        if (!isToday(day)) {
          body.date = format(day, 'yyyy-MM-dd');
        }
        return supabase.functions.invoke('daily-summary', { body }).then(r => {
          if (r.error) throw r.error;
          return r.data as DailySummaryData;
        });
      });

      const results = await Promise.all(promises);
      setData(aggregateResults(results));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao gerar resumo');
    } finally {
      setIsLoading(false);
    }
  }, [currentCompany?.id]);

  return { data, isLoading, error, fetchSummary, fetchRange };
}
