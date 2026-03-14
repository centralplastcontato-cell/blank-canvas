import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/contexts/CompanyContext';
import { subDays } from 'date-fns';

export interface ResponseTimeData {
  averageHours: number;
  medianHours: number;
  respondedIn1h: number;
  respondedIn24h: number;
  totalAnalyzed: number;
  pendingResponse: number;
  byPeriod: { period: string; avgHours: number }[];
}

/**
 * Calculates average response time from lead creation to first
 * agent message (from_me=true) in WhatsApp, using wapi_conversations.lead_id
 * to link leads to conversations.
 */
export function useResponseTime(days: number = 30, enabled: boolean = true, selectedUnit?: string) {
  const { currentCompany } = useCompany();
  const companyId = currentCompany?.id;
  const unitFilter = selectedUnit && selectedUnit !== 'all' ? selectedUnit : undefined;

  return useQuery({
    queryKey: ['response-time', companyId, days, unitFilter],
    queryFn: async (): Promise<ResponseTimeData> => {
      if (!companyId) throw new Error('No company');

      const since = subDays(new Date(), days).toISOString();

      // 1) Get recent leads with linked conversations
      // If unit filter active, first get instance IDs for that unit
      let instanceIds: string[] | undefined;
      if (unitFilter) {
        const { data: instances } = await supabase
          .from('wapi_instances')
          .select('id')
          .eq('company_id', companyId)
          .eq('unit', unitFilter);
        instanceIds = instances?.map(i => i.id);
        if (!instanceIds || instanceIds.length === 0) {
          return { averageHours: 0, medianHours: 0, respondedIn1h: 0, respondedIn24h: 0, totalAnalyzed: 0, pendingResponse: 0, byPeriod: [] };
        }
      }

      let query = supabase
        .from('wapi_conversations')
        .select('id, lead_id, created_at, bot_step')
        .eq('company_id', companyId)
        .not('lead_id', 'is', null)
        .gte('created_at', since)
        .limit(500);

      if (instanceIds) {
        query = query.in('instance_id', instanceIds);
      }

      const { data: convos, error: convErr } = await query;

      if (convErr) throw convErr;
      if (!convos || convos.length === 0) {
        return { averageHours: 0, medianHours: 0, respondedIn1h: 0, respondedIn24h: 0, totalAnalyzed: 0, pendingResponse: 0, byPeriod: [] };
      }

      // 2) Get lead creation dates
      const leadIds = [...new Set(convos.map(c => c.lead_id).filter(Boolean))] as string[];
      const { data: leads } = await supabase
        .from('campaign_leads')
        .select('id, created_at')
        .in('id', leadIds);

      const leadCreatedMap = new Map(leads?.map(l => [l.id, l.created_at]) || []);

      // 3) For each conversation, find the first from_me message
      const convoIds = convos.map(c => c.id);
      
      // Batch fetch first agent messages — get earliest from_me per conversation
      const { data: firstMessages, error: msgErr } = await supabase
        .from('wapi_messages')
        .select('conversation_id, timestamp')
        .in('conversation_id', convoIds)
        .eq('from_me', true)
        .order('timestamp', { ascending: true })
        .limit(2000);

      if (msgErr) throw msgErr;

      // Get first message per conversation
      const firstMsgMap = new Map<string, string>();
      firstMessages?.forEach(m => {
        if (!firstMsgMap.has(m.conversation_id)) {
          firstMsgMap.set(m.conversation_id, m.timestamp);
        }
      });

      // 4) Calculate response times
      const responseTimes: number[] = [];
      let pendingResponse = 0;

      convos.forEach(convo => {
        if (!convo.lead_id) return;
        const leadCreated = leadCreatedMap.get(convo.lead_id);
        if (!leadCreated) return;

        const firstMsg = firstMsgMap.get(convo.id);
        if (!firstMsg) {
          // Only count as pending if bot hasn't completed the flow
          const botCompleted = convo.bot_step === 'complete_final' || convo.bot_step === 'complete';
          if (!botCompleted) {
            pendingResponse++;
          }
          return;
        }

        const hours = (new Date(firstMsg).getTime() - new Date(leadCreated).getTime()) / (1000 * 60 * 60);
        // Filter out negative or > 30 days (data anomalies)
        if (hours > 0 && hours < 720) {
          responseTimes.push(hours);
        }
      });

      if (responseTimes.length === 0) {
        return { averageHours: 0, medianHours: 0, respondedIn1h: 0, respondedIn24h: 0, totalAnalyzed: 0, pendingResponse, byPeriod: [] };
      }

      // Sort for median
      const sorted = [...responseTimes].sort((a, b) => a - b);
      const median = sorted[Math.floor(sorted.length / 2)];
      const average = sorted.reduce((a, b) => a + b, 0) / sorted.length;
      const in1h = sorted.filter(h => h <= 1).length;
      const in24h = sorted.filter(h => h <= 24).length;
      const total = sorted.length;

      // 5) Group by period of day for the trend
      const periodBuckets: Record<string, number[]> = {
        'Manhã (6-12h)': [],
        'Tarde (12-18h)': [],
        'Noite (18-0h)': [],
        'Madrugada (0-6h)': [],
      };

      convos.forEach(convo => {
        if (!convo.lead_id) return;
        const leadCreated = leadCreatedMap.get(convo.lead_id);
        if (!leadCreated) return;
        const firstMsg = firstMsgMap.get(convo.id);
        if (!firstMsg) return;

        const hours = (new Date(firstMsg).getTime() - new Date(leadCreated).getTime()) / (1000 * 60 * 60);
        if (hours <= 0 || hours >= 720) return;

        const hour = new Date(leadCreated).getHours();
        if (hour >= 6 && hour < 12) periodBuckets['Manhã (6-12h)'].push(hours);
        else if (hour >= 12 && hour < 18) periodBuckets['Tarde (12-18h)'].push(hours);
        else if (hour >= 18) periodBuckets['Noite (18-0h)'].push(hours);
        else periodBuckets['Madrugada (0-6h)'].push(hours);
      });

      const byPeriod = Object.entries(periodBuckets)
        .filter(([, arr]) => arr.length > 0)
        .map(([period, arr]) => ({
          period,
          avgHours: arr.reduce((a, b) => a + b, 0) / arr.length,
        }));

      return {
        averageHours: average,
        medianHours: median,
        respondedIn1h: Math.round((in1h / total) * 100),
        respondedIn24h: Math.round((in24h / total) * 100),
        totalAnalyzed: total,
        pendingResponse,
        byPeriod,
      };
    },
    enabled: !!companyId && enabled,
    staleTime: 5 * 60_000,
  });
}

/**
 * Formats hours into a human-readable duration string (PT-BR).
 */
export function formatResponseTime(hours: number): string {
  if (hours < 1) {
    const minutes = Math.round(hours * 60);
    return `${minutes}min`;
  }
  if (hours < 24) {
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    if (m === 0) return `${h}h`;
    return `${h}h ${m}min`;
  }
  const days = Math.floor(hours / 24);
  const remainingHours = Math.round(hours % 24);
  if (remainingHours === 0) return `${days}d`;
  return `${days}d ${remainingHours}h`;
}
