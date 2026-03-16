import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/contexts/CompanyContext';
import { differenceInDays } from 'date-fns';

export interface NegociacaoParada {
  leadId: string;
  leadName: string;
  whatsapp: string;
  unit: string | null;
  status: string;
  statusLabel: string;
  lastMessageAt: string;
  diasParado: number;
  motivo: string;
  conversationId: string | null;
  hasVisitRealized: boolean;
}

const STATUS_MONITORED: Array<'em_contato' | 'orcamento_enviado' | 'aguardando_resposta'> = ['em_contato', 'orcamento_enviado', 'aguardando_resposta'];

const STATUS_LABELS: Record<string, string> = {
  em_contato: 'Visita',
  orcamento_enviado: 'Orçamento enviado',
  aguardando_resposta: 'Negociando',
};

function getMotivo(status: string, hasVisit: boolean): string {
  if (status === 'em_contato' && hasVisit) return '⚠ Visita realizada sem evolução';
  if (status === 'em_contato') return '⚠ Em contato sem evolução';
  if (status === 'orcamento_enviado') return '⚠ Orçamento enviado sem resposta';
  if (status === 'aguardando_resposta') return '⚠ Negociação parada';
  return '⚠ Negociação parada';
}

export function useNegociacoesParadas(stalledDays: number = 10, selectedUnit?: string) {
  const { currentCompany } = useCompany();
  const companyId = currentCompany?.id;

  return useQuery({
    queryKey: ['negociacoes-paradas', companyId, stalledDays, selectedUnit],
    queryFn: async (): Promise<NegociacaoParada[]> => {
      if (!companyId) return [];

      // 1. Fetch leads in monitored statuses
      let leadsQuery = supabase
        .from('campaign_leads')
        .select('id, name, whatsapp, unit, status')
        .eq('company_id', companyId)
        .in('status', STATUS_MONITORED)
        .limit(2000);

      if (selectedUnit && selectedUnit !== 'all') {
        leadsQuery = leadsQuery.or(`unit.eq.${selectedUnit},unit.eq.As duas`);
      }

      const { data: leads, error: leadsErr } = await leadsQuery;
      if (leadsErr) throw leadsErr;
      if (!leads || leads.length === 0) return [];

      const leadIds = leads.map(l => l.id);

      // 2. Fetch conversations for these leads (only human_takeover)
      const { data: conversations, error: convErr } = await (supabase as any)
        .from('wapi_conversations')
        .select('id, lead_id, bot_step, last_message_at')
        .eq('company_id', companyId)
        .in('lead_id', leadIds)
        .eq('bot_step', 'human_takeover')
        .limit(2000);

      if (convErr) throw convErr;
      if (!conversations || conversations.length === 0) return [];

      // 3. Fetch visit data for these leads
      const convLeadIds = conversations.map((c: any) => c.lead_id);
      const { data: visits } = await (supabase as any)
        .from('lead_visits')
        .select('lead_id, status_visita')
        .eq('company_id', companyId)
        .in('lead_id', convLeadIds)
        .eq('status_visita', 'realizada')
        .limit(2000);

      const visitedLeadIds = new Set((visits || []).map((v: any) => v.lead_id));

      // Build conv map (latest per lead)
      const convMap = new Map<string, { id: string; last_message_at: string }>();
      for (const c of conversations) {
        const existing = convMap.get(c.lead_id);
        if (!existing || (c.last_message_at && c.last_message_at > (existing.last_message_at || ''))) {
          convMap.set(c.lead_id, { id: c.id, last_message_at: c.last_message_at });
        }
      }

      const now = new Date();
      const result: NegociacaoParada[] = [];

      for (const lead of leads) {
        const conv = convMap.get(lead.id);
        if (!conv || !conv.last_message_at) continue;

        const lastMsg = new Date(conv.last_message_at);
        const dias = differenceInDays(now, lastMsg);

        if (dias < stalledDays) continue;

        const hasVisit = visitedLeadIds.has(lead.id);

        result.push({
          leadId: lead.id,
          leadName: lead.name,
          whatsapp: lead.whatsapp,
          unit: lead.unit,
          status: lead.status,
          statusLabel: STATUS_LABELS[lead.status] || lead.status,
          lastMessageAt: conv.last_message_at,
          diasParado: dias,
          motivo: getMotivo(lead.status, hasVisit),
          conversationId: conv.id,
          hasVisitRealized: hasVisit,
        });
      }

      // Sort by days stalled descending
      result.sort((a, b) => b.diasParado - a.diasParado);

      return result;
    },
    enabled: !!companyId,
    staleTime: 60_000,
  });
}
