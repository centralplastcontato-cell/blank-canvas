import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/contexts/CompanyContext';
import {
  buildAttentionList,
  OPEN_LEAD_STATUSES,
  type AttentionConversation,
  type AttentionLead,
  type AttentionSection,
  type AttentionVisit,
} from '@/lib/attentionList';
import { brtDateDaysAgo } from '@/lib/visitOutcome';

const LEAD_COLUMNS = 'id, name, whatsapp, status, unit';
const CONVERSATION_COLUMNS = 'lead_id, last_message_at, last_message_from_me, last_message_content, is_closed';
// Listas de ids vão no endereço da busca; em pedaços para não passar do limite
const IDS_PER_REQUEST = 150;

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

export function useAttentionList(selectedUnit?: string, options: { enabled?: boolean } = {}) {
  const { currentCompany } = useCompany();
  const companyId = currentCompany?.id;

  return useQuery({
    queryKey: ['attention-list', companyId, selectedUnit],
    queryFn: async (): Promise<AttentionSection[]> => {
      if (!companyId) return [];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const db = supabase as any;
      const now = new Date();
      const iso = (msAgo: number) => new Date(now.getTime() - msAgo).toISOString();

      const [waitingRes, negotiatingRes, visitsRes] = await Promise.all([
        // Conversas em que o cliente mandou a última mensagem (30 min a 7 dias)
        db
          .from('wapi_conversations')
          .select('lead_id')
          .eq('company_id', companyId)
          .eq('last_message_from_me', false)
          .gte('last_message_at', iso(7 * 24 * 60 * 60 * 1000))
          .lte('last_message_at', iso(30 * 60 * 1000))
          .not('lead_id', 'is', null)
          .eq('is_equipe', false)
          .eq('is_freelancer', false)
          .limit(1000),
        // Leads em "Negociando"
        db
          .from('campaign_leads')
          .select(LEAD_COLUMNS)
          .eq('company_id', companyId)
          .eq('status', 'aguardando_resposta')
          .limit(1000),
        // Visitas realizadas nos últimos 30 dias
        db
          .from('lead_visits')
          .select('lead_id, data_visita')
          .eq('company_id', companyId)
          .eq('status_visita', 'realizada')
          .gte('data_visita', brtDateDaysAgo(30, now))
          .limit(1000),
      ]);
      if (waitingRes.error) throw waitingRes.error;
      if (negotiatingRes.error) throw negotiatingRes.error;
      if (visitsRes.error) throw visitsRes.error;

      const visits = (visitsRes.data || []) as AttentionVisit[];
      const leads = new Map<string, AttentionLead>();
      for (const l of (negotiatingRes.data || []) as AttentionLead[]) leads.set(l.id, l);

      // Dados dos outros leads (quem está esperando e quem visitou)
      const missing = [
        ...new Set([...(waitingRes.data || []).map((c: { lead_id: string }) => c.lead_id), ...visits.map((v) => v.lead_id)]),
      ].filter((id) => !leads.has(id));
      for (const ids of chunk(missing, IDS_PER_REQUEST)) {
        const { data, error } = await db
          .from('campaign_leads')
          .select(LEAD_COLUMNS)
          .eq('company_id', companyId)
          .in('id', ids)
          .in('status', [...OPEN_LEAD_STATUSES]);
        if (error) throw error;
        for (const l of (data || []) as AttentionLead[]) leads.set(l.id, l);
      }

      const unitLeads = [...leads.values()].filter(
        (l) => !selectedUnit || l.unit === selectedUnit || l.unit === 'As duas',
      );

      // Todas as conversas desses leads, para saber qual é a mais recente
      const conversations: AttentionConversation[] = [];
      for (const ids of chunk(unitLeads.map((l) => l.id), IDS_PER_REQUEST)) {
        const { data, error } = await db
          .from('wapi_conversations')
          .select(CONVERSATION_COLUMNS)
          .eq('company_id', companyId)
          .in('lead_id', ids)
          .eq('is_equipe', false)
          .eq('is_freelancer', false);
        if (error) throw error;
        conversations.push(...((data || []) as AttentionConversation[]));
      }

      return buildAttentionList({ leads: unitLeads, conversations, visits, now });
    },
    enabled: !!companyId && options.enabled !== false,
    staleTime: 60_000,
    refetchInterval: 2 * 60_000,
  });
}
