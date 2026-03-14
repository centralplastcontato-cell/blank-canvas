import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/contexts/CompanyContext';
import { subDays } from 'date-fns';

export interface JourneyStageTime {
  stage: string;
  label: string;
  avgHours: number;
  medianHours: number;
  count: number;
}

export interface LeadJourneyData {
  stages: JourneyStageTime[];
  totalLeadsAnalyzed: number;
}

const STAGE_LABELS: Record<string, string> = {
  'primeiro_contato': '1ª Resposta',
  'em_contato': 'Em Contato',
  'orcamento_enviado': 'Orçamento Enviado',
  'aguardando_resposta': 'Aguardando Resposta',
  'fechado': 'Fechado',
};

/**
 * Calculates the average time from lead creation to each CRM stage,
 * using the lead_history table to find the first time a lead entered each status.
 */
export function useLeadJourneyTimes(days: number = 30, enabled: boolean = true, selectedUnit?: string) {
  const { currentCompany } = useCompany();
  const companyId = currentCompany?.id;
  const unitFilter = selectedUnit && selectedUnit !== 'all' ? selectedUnit : undefined;

  return useQuery({
    queryKey: ['lead-journey-times', companyId, days, unitFilter],
    queryFn: async (): Promise<LeadJourneyData> => {
      if (!companyId) throw new Error('No company');

      const since = subDays(new Date(), days).toISOString();

      // 1) Get leads created in the period
      let leadsQuery = supabase
        .from('campaign_leads')
        .select('id, created_at, unit')
        .eq('company_id', companyId)
        .gte('created_at', since)
        .limit(1000);

      if (unitFilter) {
        leadsQuery = leadsQuery.eq('unit', unitFilter);
      }

      const { data: leads, error: leadsErr } = await leadsQuery;
      if (leadsErr) throw leadsErr;
      if (!leads || leads.length === 0) {
        return { stages: [], totalLeadsAnalyzed: 0 };
      }

      const leadIds = leads.map(l => l.id);
      const leadCreatedMap = new Map(leads.map(l => [l.id, new Date(l.created_at).getTime()]));

      // 2) Get status_change history for these leads
      const { data: history, error: histErr } = await supabase
        .from('lead_history')
        .select('lead_id, new_value, created_at')
        .eq('action', 'status_change')
        .in('lead_id', leadIds)
        .order('created_at', { ascending: true })
        .limit(5000);

      if (histErr) throw histErr;

      // 3) Also check first agent message time (primeiro_contato)
      // Get conversations linked to these leads
      const { data: convos } = await supabase
        .from('wapi_conversations')
        .select('id, lead_id')
        .eq('company_id', companyId)
        .in('lead_id', leadIds)
        .limit(1000);

      let firstMsgMap = new Map<string, number>(); // lead_id -> timestamp ms
      if (convos && convos.length > 0) {
        const convoIds = convos.map(c => c.id);
        const convoLeadMap = new Map(convos.map(c => [c.id, c.lead_id]));

        const { data: msgs } = await supabase
          .from('wapi_messages')
          .select('conversation_id, timestamp')
          .in('conversation_id', convoIds)
          .eq('from_me', true)
          .order('timestamp', { ascending: true })
          .limit(3000);

        if (msgs) {
          const seenConvo = new Set<string>();
          msgs.forEach(m => {
            if (!seenConvo.has(m.conversation_id)) {
              seenConvo.add(m.conversation_id);
              const leadId = convoLeadMap.get(m.conversation_id);
              if (leadId && !firstMsgMap.has(leadId)) {
                firstMsgMap.set(leadId, new Date(m.timestamp).getTime());
              }
            }
          });
        }
      }

      // 4) For each lead, find the FIRST time it reached each status
      const stageFirstReach = new Map<string, Map<string, number>>(); // status -> lead_id -> timestamp
      const targetStatuses = ['em_contato', 'orcamento_enviado', 'aguardando_resposta', 'fechado'];

      targetStatuses.forEach(s => stageFirstReach.set(s, new Map()));

      history?.forEach(h => {
        if (!h.new_value || !targetStatuses.includes(h.new_value)) return;
        const map = stageFirstReach.get(h.new_value)!;
        if (!map.has(h.lead_id)) {
          map.set(h.lead_id, new Date(h.created_at).getTime());
        }
      });

      // 5) Calculate durations from lead creation to each stage
      const stages: JourneyStageTime[] = [];

      // First contact (1ª resposta) - from lead creation to first agent message
      const firstContactDurations: number[] = [];
      firstMsgMap.forEach((msgTs, leadId) => {
        const created = leadCreatedMap.get(leadId);
        if (!created) return;
        const hours = (msgTs - created) / (1000 * 60 * 60);
        if (hours > 0 && hours < 720) firstContactDurations.push(hours);
      });

      if (firstContactDurations.length > 0) {
        const sorted = [...firstContactDurations].sort((a, b) => a - b);
        stages.push({
          stage: 'primeiro_contato',
          label: STAGE_LABELS['primeiro_contato'],
          avgHours: sorted.reduce((a, b) => a + b, 0) / sorted.length,
          medianHours: sorted[Math.floor(sorted.length / 2)],
          count: sorted.length,
        });
      }

      // Other stages
      targetStatuses.forEach(status => {
        const map = stageFirstReach.get(status)!;
        const durations: number[] = [];

        map.forEach((reachedAt, leadId) => {
          const created = leadCreatedMap.get(leadId);
          if (!created) return;
          const hours = (reachedAt - created) / (1000 * 60 * 60);
          if (hours > 0 && hours < 8760) durations.push(hours); // max 1 year
        });

        if (durations.length > 0) {
          const sorted = [...durations].sort((a, b) => a - b);
          stages.push({
            stage: status,
            label: STAGE_LABELS[status] || status,
            avgHours: sorted.reduce((a, b) => a + b, 0) / sorted.length,
            medianHours: sorted[Math.floor(sorted.length / 2)],
            count: sorted.length,
          });
        }
      });

      return { stages, totalLeadsAnalyzed: leads.length };
    },
    enabled: !!companyId && enabled,
    staleTime: 5 * 60_000,
  });
}
