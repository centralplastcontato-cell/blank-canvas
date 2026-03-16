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
  // Phase 3B - Closing probability score
  scoreFechamento: number;
  classificacao: 'alta' | 'media' | 'baixa';
  messageCount: number;
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

function getClassificacao(score: number): 'alta' | 'media' | 'baixa' {
  if (score >= 70) return 'alta';
  if (score >= 40) return 'media';
  return 'baixa';
}

function calculateScore(
  status: string,
  hasVisit: boolean,
  diasParado: number,
  messageCount: number,
  eventValue: number | null,
  avgEventValue: number | null,
): number {
  let score = 0;

  // Positive criteria
  if (hasVisit) score += 40;
  if (status === 'aguardando_resposta') score += 30;
  if (status === 'orcamento_enviado') score += 20;
  if (diasParado <= 10) score += 20;
  if (messageCount > 10) score += 10;
  if (eventValue != null && avgEventValue != null && avgEventValue > 0 && eventValue > avgEventValue) score += 10;

  // Negative criteria
  if (diasParado > 30) score -= 30;
  else if (diasParado > 20) score -= 20;
  if (messageCount < 3) score -= 10;

  return Math.max(0, Math.min(100, score));
}

// Bot steps that indicate the bot is no longer actively managing the conversation
const BOT_INACTIVE_STEPS = ['human_takeover', 'complete_final', 'transferred', 'proximo_passo_reminded', 'lp_sent'];

export function useNegociacoesParadas(stalledDays: number = 10, selectedUnit?: string) {
  const { currentCompany } = useCompany();
  const companyId = currentCompany?.id;

  return useQuery({
    queryKey: ['negociacoes-paradas', companyId, stalledDays, selectedUnit],
    queryFn: async (): Promise<NegociacaoParada[]> => {
      if (!companyId) return [];

      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - stalledDays);
      const cutoffISO = cutoffDate.toISOString();

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

      // 2. Fetch conversations where bot is inactive AND last message is old
      const { data: conversations, error: convErr } = await (supabase as any)
        .from('wapi_conversations')
        .select('id, lead_id, bot_step, last_message_at, last_message_from_me, message_count')
        .eq('company_id', companyId)
        .in('lead_id', leadIds)
        .lte('last_message_at', cutoffISO)
        .limit(2000);

      if (convErr) throw convErr;
      if (!conversations || conversations.length === 0) return [];

      // Filter: only conversations where bot is not actively running
      const inactiveConvs = conversations.filter((c: any) =>
        !c.bot_step || BOT_INACTIVE_STEPS.includes(c.bot_step)
      );

      if (inactiveConvs.length === 0) return [];

      // 3. Fetch visit data for these leads
      const convLeadIds = [...new Set(inactiveConvs.map((c: any) => c.lead_id))] as string[];
      const { data: visits } = await (supabase as any)
        .from('lead_visits')
        .select('lead_id, status_visita')
        .eq('company_id', companyId)
        .in('lead_id', convLeadIds)
        .eq('status_visita', 'realizada')
        .limit(2000);

      const visitedLeadIds = new Set((visits || []).map((v: any) => v.lead_id));

      // 4. Fetch event values for score calculation
      const { data: events } = await (supabase as any)
        .from('company_events')
        .select('lead_id, total_value')
        .eq('company_id', companyId)
        .in('lead_id', convLeadIds)
        .not('total_value', 'is', null)
        .limit(2000);

      const eventValueMap = new Map<string, number>();
      let totalEventValue = 0;
      let eventCount = 0;
      for (const e of (events || [])) {
        if (e.total_value && e.total_value > 0) {
          eventValueMap.set(e.lead_id, e.total_value);
          totalEventValue += e.total_value;
          eventCount++;
        }
      }
      const avgEventValue = eventCount > 0 ? totalEventValue / eventCount : null;

      // 5. Fetch message counts if not available in conversation
      // Try to get message counts from wapi_messages for conversations without message_count
      const convIds = inactiveConvs.map((c: any) => c.id);
      let msgCountMap = new Map<string, number>();

      // Check if message_count exists in conversations
      const hasMessageCount = inactiveConvs.some((c: any) => c.message_count != null);
      
      if (!hasMessageCount && convIds.length > 0) {
        // Fallback: count messages per conversation (batch in chunks)
        const chunks = [];
        for (let i = 0; i < convIds.length; i += 100) {
          chunks.push(convIds.slice(i, i + 100));
        }
        for (const chunk of chunks) {
          const { data: msgs } = await (supabase as any)
            .from('wapi_messages')
            .select('conversation_id')
            .in('conversation_id', chunk)
            .limit(5000);
          
          if (msgs) {
            for (const m of msgs) {
              msgCountMap.set(m.conversation_id, (msgCountMap.get(m.conversation_id) || 0) + 1);
            }
          }
        }
      }

      // Build conv map (latest per lead)
      const convMap = new Map<string, { id: string; last_message_at: string; messageCount: number }>();
      for (const c of inactiveConvs) {
        const existing = convMap.get(c.lead_id);
        if (!existing || (c.last_message_at && c.last_message_at > (existing.last_message_at || ''))) {
          const count = c.message_count ?? msgCountMap.get(c.id) ?? 0;
          convMap.set(c.lead_id, { id: c.id, last_message_at: c.last_message_at, messageCount: count });
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
        const eventValue = eventValueMap.get(lead.id) ?? null;

        const scoreFechamento = calculateScore(
          lead.status,
          hasVisit,
          dias,
          conv.messageCount,
          eventValue,
          avgEventValue,
        );

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
          scoreFechamento,
          classificacao: getClassificacao(scoreFechamento),
          messageCount: conv.messageCount,
        });
      }

      // Sort by score descending (highest probability first)
      result.sort((a, b) => b.scoreFechamento - a.scoreFechamento);

      return result;
    },
    enabled: !!companyId,
    staleTime: 60_000,
  });
}
