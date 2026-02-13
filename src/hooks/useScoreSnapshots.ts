import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/contexts/CompanyContext';
import { format, subDays, startOfDay, eachDayOfInterval } from 'date-fns';

export interface ScoreSnapshotDay {
  date: string;
  avgScore: number | null;
  totalLeads: number;
}

export function useScoreSnapshots(days: number = 30) {
  const { currentCompany } = useCompany();
  const companyId = currentCompany?.id;

  return useQuery({
    queryKey: ['score-snapshots', companyId, days],
    queryFn: async (): Promise<ScoreSnapshotDay[]> => {
      if (!companyId) return [];

      const cutoff = subDays(new Date(), days);
      const cutoffStr = format(cutoff, 'yyyy-MM-dd');

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('lead_score_snapshots')
        .select('score, snapshot_date')
        .eq('company_id', companyId)
        .gte('snapshot_date', cutoffStr)
        .order('snapshot_date', { ascending: true });

      if (error) throw error;

      // Build day buckets
      const interval = eachDayOfInterval({
        start: startOfDay(cutoff),
        end: startOfDay(new Date()),
      });

      const buckets: Record<string, { total: number; count: number }> = {};
      interval.forEach(d => {
        buckets[format(d, 'yyyy-MM-dd')] = { total: 0, count: 0 };
      });

      // Fill buckets
      (data || []).forEach((row: { score: number; snapshot_date: string }) => {
        const key = row.snapshot_date;
        if (buckets[key]) {
          buckets[key].total += row.score;
          buckets[key].count += 1;
        }
      });

      return Object.entries(buckets).map(([dateStr, { total, count }]) => ({
        date: format(new Date(dateStr + 'T00:00:00'), 'dd/MM'),
        avgScore: count > 0 ? Math.round(total / count) : null,
        totalLeads: count,
      }));
    },
    enabled: !!companyId,
    staleTime: 5 * 60_000,
  });
}
