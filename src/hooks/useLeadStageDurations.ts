import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/contexts/CompanyContext';

/**
 * Calculates average time leads spend in each CRM stage
 * by analyzing status change history in lead_history.
 */
export function useLeadStageDurations(enabled: boolean = true) {
  const { currentCompany } = useCompany();
  const companyId = currentCompany?.id;

  return useQuery({
    queryKey: ['lead-stage-durations', companyId],
    queryFn: async () => {
      if (!companyId) return {};

      // Get all status_change entries ordered by lead and time
      const { data: history, error } = await supabase
        .from('lead_history')
        .select('lead_id, action, old_value, new_value, created_at')
        .eq('company_id', companyId)
        .eq('action', 'status_change')
        .order('created_at', { ascending: true });

      if (error) throw error;
      if (!history || history.length === 0) return {};

      // Also get lead creation dates for the first stage duration
      const leadIds = [...new Set(history.map(h => h.lead_id))];
      const { data: leads } = await supabase
        .from('campaign_leads')
        .select('id, created_at, status')
        .eq('company_id', companyId)
        .in('id', leadIds);

      const leadsMap = new Map(leads?.map(l => [l.id, l]) || []);

      // Group history by lead
      const byLead = new Map<string, typeof history>();
      history.forEach(h => {
        if (!byLead.has(h.lead_id)) byLead.set(h.lead_id, []);
        byLead.get(h.lead_id)!.push(h);
      });

      // Calculate durations per stage
      const stageDurations: Record<string, number[]> = {};

      byLead.forEach((entries, leadId) => {
        const lead = leadsMap.get(leadId);
        if (!lead) return;

        // First stage: from lead creation to first status change
        const firstEntry = entries[0];
        if (firstEntry?.old_value) {
          const startTime = new Date(lead.created_at).getTime();
          const endTime = new Date(firstEntry.created_at).getTime();
          const hours = (endTime - startTime) / (1000 * 60 * 60);
          if (hours > 0 && hours < 8760) { // max 1 year
            if (!stageDurations[firstEntry.old_value]) stageDurations[firstEntry.old_value] = [];
            stageDurations[firstEntry.old_value].push(hours);
          }
        }

        // Subsequent stages
        for (let i = 0; i < entries.length - 1; i++) {
          const current = entries[i];
          const next = entries[i + 1];
          if (current.new_value) {
            const startTime = new Date(current.created_at).getTime();
            const endTime = new Date(next.created_at).getTime();
            const hours = (endTime - startTime) / (1000 * 60 * 60);
            if (hours > 0 && hours < 8760) {
              if (!stageDurations[current.new_value]) stageDurations[current.new_value] = [];
              stageDurations[current.new_value].push(hours);
            }
          }
        }
      });

      // Calculate averages
      const averages: Record<string, number> = {};
      Object.entries(stageDurations).forEach(([stage, durations]) => {
        if (durations.length > 0) {
          averages[stage] = durations.reduce((a, b) => a + b, 0) / durations.length;
        }
      });

      return averages;
    },
    enabled: !!companyId && enabled,
    staleTime: 5 * 60_000,
  });
}

/**
 * Formats hours into a human-readable duration string.
 */
export function formatDuration(hours: number): string {
  if (hours < 1) {
    const minutes = Math.round(hours * 60);
    return `${minutes}min`;
  }
  if (hours < 24) {
    return `${Math.round(hours)}h`;
  }
  const days = Math.floor(hours / 24);
  const remainingHours = Math.round(hours % 24);
  if (remainingHours === 0) return `${days}d`;
  return `${days}d ${remainingHours}h`;
}
