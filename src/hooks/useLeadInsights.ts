import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/contexts/CompanyContext';
import { aggregateInsights, type CountRow } from '@/lib/leadInsights';

export interface LeadInsightRow {
  leadId: string;
  name: string;
  unit: string | null;
  motivo: string;
  detalhe: string | null;
  perguntas: string[];
  objecoes: string[];
  analyzedAt: string;
  lastMessageAt: string | null;
}

export interface LeadInsightsData {
  rows: LeadInsightRow[];
  reasons: CountRow[];
  questions: CountRow[];
  objections: CountRow[];
  lastRun: { week_start: string; finished_at: string | null; summary_sent: boolean } | null;
}

const PERIOD_DAYS = 30;
const IDS_PER_REQUEST = 150;

export function useLeadInsights(selectedUnit?: string) {
  const { currentCompany } = useCompany();
  const companyId = currentCompany?.id;

  return useQuery({
    queryKey: ['lead-insights', companyId, selectedUnit],
    queryFn: async (): Promise<LeadInsightsData> => {
      if (!companyId) throw new Error('No company');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const db = supabase as any;
      const since = new Date(Date.now() - PERIOD_DAYS * 24 * 60 * 60 * 1000).toISOString();

      const [insightsRes, runRes] = await Promise.all([
        db
          .from('lead_insights')
          .select('lead_id, motivo, detalhe, perguntas, objecoes, analyzed_at, last_message_at')
          .eq('company_id', companyId)
          .gte('analyzed_at', since)
          .order('last_message_at', { ascending: false })
          .limit(1000),
        db
          .from('weekly_insight_runs')
          .select('week_start, finished_at, summary_sent')
          .eq('company_id', companyId)
          .order('week_start', { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);
      if (insightsRes.error) throw insightsRes.error;

      const insights = (insightsRes.data || []) as Array<{
        lead_id: string; motivo: string; detalhe: string | null; perguntas: string[] | null; objecoes: string[] | null; analyzed_at: string; last_message_at: string | null;
      }>;

      // Nome e canal dos leads (as listas de ids vão em pedaços)
      const leads = new Map<string, { name: string; unit: string | null }>();
      const ids = insights.map((i) => i.lead_id);
      for (let i = 0; i < ids.length; i += IDS_PER_REQUEST) {
        const { data } = await db.from('campaign_leads').select('id, name, unit').in('id', ids.slice(i, i + IDS_PER_REQUEST));
        for (const l of data || []) leads.set(l.id, { name: l.name, unit: l.unit });
      }

      const rows: LeadInsightRow[] = insights
        .filter((i) => {
          if (!selectedUnit) return true;
          const unit = leads.get(i.lead_id)?.unit;
          return unit === selectedUnit || unit === 'As duas';
        })
        .map((i) => ({
          leadId: i.lead_id,
          name: leads.get(i.lead_id)?.name || 'Cliente',
          unit: leads.get(i.lead_id)?.unit ?? null,
          motivo: i.motivo,
          detalhe: i.detalhe,
          perguntas: i.perguntas || [],
          objecoes: i.objecoes || [],
          analyzedAt: i.analyzed_at,
          lastMessageAt: i.last_message_at,
        }));

      return {
        rows,
        ...aggregateInsights(rows),
        lastRun: runRes.error ? null : runRes.data ?? null,
      };
    },
    enabled: !!companyId,
    staleTime: 60_000,
  });
}
