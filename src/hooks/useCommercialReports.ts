import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/contexts/CompanyContext';
import { startOfDay, endOfDay, subDays, startOfMonth, endOfMonth } from 'date-fns';

export type PeriodPreset = 'today' | '7d' | '30d' | 'month' | 'custom';

export interface CommercialFilters {
  preset: PeriodPreset;
  from: Date;
  to: Date;
  unit: string; // 'all' or unit name
}

export interface CommercialReportData {
  // Conversion
  leadsReceived: number;
  leadsClosed: number;
  conversionRate: number;

  // Funnel
  funnelSteps: { status: string; label: string; count: number; pct: number }[];

  // Visits
  visitsTotal: number;
  visitsRealized: number;
  visitsNoShow: number;
  visitsCancelled: number;
  visitsRescheduled: number;
  attendanceRate: number;

  // Sales
  salesCount: number;
  salesTotal: number;
  ticketMedio: number;
}

const STATUS_LABELS: Record<string, string> = {
  novo: 'Novo',
  em_contato: 'Visita',
  orcamento_enviado: 'Orçamento enviado',
  aguardando_resposta: 'Negociando',
  fechado: 'Fechado',
  perdido: 'Perdido',
};

const FUNNEL_ORDER = ['novo', 'em_contato', 'orcamento_enviado', 'aguardando_resposta', 'fechado', 'perdido'];

export function getDefaultFilters(): CommercialFilters {
  const now = new Date();
  return {
    preset: '30d',
    from: startOfDay(subDays(now, 30)),
    to: endOfDay(now),
    unit: 'all',
  };
}

export function buildDateRange(preset: PeriodPreset, customFrom?: Date, customTo?: Date): { from: Date; to: Date } {
  const now = new Date();
  switch (preset) {
    case 'today':
      return { from: startOfDay(now), to: endOfDay(now) };
    case '7d':
      return { from: startOfDay(subDays(now, 7)), to: endOfDay(now) };
    case '30d':
      return { from: startOfDay(subDays(now, 30)), to: endOfDay(now) };
    case 'month':
      return { from: startOfMonth(now), to: endOfMonth(now) };
    case 'custom':
      return {
        from: customFrom ? startOfDay(customFrom) : startOfDay(subDays(now, 30)),
        to: customTo ? endOfDay(customTo) : endOfDay(now),
      };
  }
}

export function useCommercialReports(filters: CommercialFilters) {
  const { currentCompany } = useCompany();
  const companyId = currentCompany?.id;

  return useQuery({
    queryKey: ['commercial-reports', companyId, filters.from.toISOString(), filters.to.toISOString(), filters.unit],
    queryFn: async (): Promise<CommercialReportData> => {
      if (!companyId) throw new Error('No company');

      const fromISO = filters.from.toISOString();
      const toISO = filters.to.toISOString();
      const fromDate = filters.from.toISOString().split('T')[0];
      const toDate = filters.to.toISOString().split('T')[0];

      console.log('[RelatoriosComerciais] Fetching', { companyId, from: fromISO, to: toISO, unit: filters.unit });

      // Parallel queries
      const [leadsResult, visitsResult, eventsResult] = await Promise.all([
        // 1. All leads created in the period
        (() => {
          let q = supabase
            .from('campaign_leads')
            .select('id, status, unit, created_at')
            .eq('company_id', companyId)
            .gte('created_at', fromISO)
            .lte('created_at', toISO)
            .not('status', 'in', '("transferido","trabalhe_conosco","fornecedor","outros")')
            .limit(2000);
          if (filters.unit !== 'all') {
            q = q.or(`unit.eq.${filters.unit},unit.eq.As duas`);
          }
          return q;
        })(),

        // 2. Visits in the period
        (() => {
          let q = (supabase as any)
            .from('lead_visits')
            .select('id, lead_id, status_visita, data_visita, company_id')
            .eq('company_id', companyId)
            .gte('data_visita', fromDate)
            .lte('data_visita', toDate)
            .limit(2000);
          return q;
        })(),

        // 3. Events (sales) with data_fechamento_venda in the period
        (() => {
          let q = supabase
            .from('company_events')
            .select('id, total_value, data_fechamento_venda, unit, status')
            .eq('company_id', companyId)
            .not('data_fechamento_venda', 'is', null)
            .gte('data_fechamento_venda', fromDate)
            .lte('data_fechamento_venda', toDate)
            .neq('status', 'cancelado')
            .limit(2000);
          if (filters.unit !== 'all') {
            q = q.or(`unit.eq.${filters.unit},unit.eq.As duas`);
          }
          return q;
        })(),
      ]);

      if (leadsResult.error) throw leadsResult.error;
      if (visitsResult.error) throw visitsResult.error;
      if (eventsResult.error) throw eventsResult.error;

      const leads = leadsResult.data || [];
      const visits = visitsResult.data || [];
      const events = eventsResult.data || [];

      // Filter visits by unit if needed (via lead lookup)
      // For simplicity, visits are company-wide unless we join lead unit
      // (visits table doesn't have unit directly)

      // --- Conversion ---
      const leadsReceived = leads.length;
      const leadsClosed = leads.filter(l => l.status === 'fechado').length;
      const conversionRate = leadsReceived > 0 ? (leadsClosed / leadsReceived) * 100 : 0;

      // --- Funnel ---
      const statusCounts: Record<string, number> = {};
      FUNNEL_ORDER.forEach(s => { statusCounts[s] = 0; });
      leads.forEach(l => {
        if (l.status in statusCounts) statusCounts[l.status]++;
      });
      const total = leadsReceived || 1;
      const funnelSteps = FUNNEL_ORDER.map(status => ({
        status,
        label: STATUS_LABELS[status] || status,
        count: statusCounts[status] || 0,
        pct: parseFloat((((statusCounts[status] || 0) / total) * 100).toFixed(1)),
      }));

      // --- Visits ---
      const visitsTotal = visits.filter((v: any) =>
        ['agendada', 'realizada', 'nao_compareceu'].includes(v.status_visita)
      ).length;
      const visitsRealized = visits.filter((v: any) => v.status_visita === 'realizada').length;
      const visitsNoShow = visits.filter((v: any) => v.status_visita === 'nao_compareceu').length;
      const visitsCancelled = visits.filter((v: any) => v.status_visita === 'cancelada').length;
      const visitsRescheduled = visits.filter((v: any) => v.status_visita === 'remarcada').length;
      const attendanceRate = visitsTotal > 0 ? (visitsRealized / visitsTotal) * 100 : 0;

      // --- Sales ---
      const salesCount = events.length;
      const salesTotal = events.reduce((sum: number, e: any) => sum + (e.total_value || 0), 0);
      const ticketMedio = salesCount > 0 ? salesTotal / salesCount : 0;

      const result: CommercialReportData = {
        leadsReceived,
        leadsClosed,
        conversionRate,
        funnelSteps,
        visitsTotal,
        visitsRealized,
        visitsNoShow,
        visitsCancelled,
        visitsRescheduled,
        attendanceRate,
        salesCount,
        salesTotal,
        ticketMedio,
      };

      console.log('[RelatoriosComerciais] Result', result);
      return result;
    },
    enabled: !!companyId,
    staleTime: 60_000,
  });
}
