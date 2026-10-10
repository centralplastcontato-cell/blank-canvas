import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/contexts/CompanyContext';
import { useAttentionList } from '@/hooks/useAttentionList';
import { brtNow } from '@/lib/visitOutcome';
import { AWAITING_READ_OR_FILTER } from '@/lib/conversationUnread';

export interface MenuBadges {
  /** mensagens não lidas na Central de Atendimento */
  unread: number;
  /** clientes esperando resposta (mesma conta da aba Atenção da Inteligência) */
  waiting: number;
  /** visitas marcadas para hoje */
  visitsToday: number;
}

/** Números de pendências do menu lateral. Só busca enquanto o menu está à vista. */
export function useMenuBadges(enabled: boolean, withAttention: boolean): MenuBadges {
  const { currentCompany } = useCompany();
  const companyId = currentCompany?.id;

  const { data } = useQuery({
    queryKey: ['menu-badges', companyId],
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const db = supabase as any;
      const [unreadRes, visitsRes] = await Promise.all([
        // Só conversas esperando a equipe (o cliente mandou a última mensagem)
        db.from('wapi_conversations').select('unread_count').eq('company_id', companyId).gt('unread_count', 0).or(AWAITING_READ_OR_FILTER).limit(1000),
        db
          .from('lead_visits')
          .select('id', { count: 'exact', head: true })
          .eq('company_id', companyId)
          .eq('data_visita', brtNow().date)
          .in('status_visita', ['agendada', 'confirmada', 'remarcada', 'realizada']),
      ]);
      const unread = ((unreadRes.data || []) as Array<{ unread_count: number | null }>)
        .reduce((sum, c) => sum + (c.unread_count || 0), 0);
      return { unread, visitsToday: visitsRes.count || 0 };
    },
    enabled: enabled && !!companyId,
    staleTime: 60_000,
    // No computador o menu fica sempre à vista: atualiza sozinho a cada minuto
    refetchInterval: enabled ? 60_000 : false,
  });

  const { data: attention } = useAttentionList(undefined, { enabled: enabled && withAttention });
  const waiting = attention?.find((s) => s.kind === 'cliente_esperando')?.items.length || 0;

  return { unread: data?.unread || 0, visitsToday: data?.visitsToday || 0, waiting };
}
