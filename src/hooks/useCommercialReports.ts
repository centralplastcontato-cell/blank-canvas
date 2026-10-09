import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/contexts/CompanyContext';
import { startOfDay, endOfDay, subDays, startOfMonth, endOfMonth, format } from 'date-fns';
import { buildCommercialReport, type CommercialReport, type ReportEvent, type ReportLead, type ReportVisit } from '@/lib/commercialReport';
import { brtNow } from '@/lib/visitOutcome';
import { fetchAllPages } from '@/lib/fetchAllPages';

export type PeriodPreset = 'today' | '7d' | '30d' | 'month' | 'custom';

export interface CommercialFilters {
  preset: PeriodPreset;
  from: Date;
  to: Date;
  unit: string; // 'all' or unit name
}

export type CommercialReportData = CommercialReport;

const EXCLUDED_LEAD_STATUSES = '("transferido","trabalhe_conosco","fornecedor","outros")';

export function getDefaultFilters(): CommercialFilters {
  const { from, to } = buildDateRange('30d');
  return { preset: '30d', from, to, unit: 'all' };
}

/** "7 dias" e "30 dias" contam com o dia de hoje (hoje + 6 dias antes = 7 dias). */
export function buildDateRange(preset: PeriodPreset, customFrom?: Date, customTo?: Date): { from: Date; to: Date } {
  const now = new Date();
  switch (preset) {
    case 'today':
      return { from: startOfDay(now), to: endOfDay(now) };
    case '7d':
      return { from: startOfDay(subDays(now, 6)), to: endOfDay(now) };
    case '30d':
      return { from: startOfDay(subDays(now, 29)), to: endOfDay(now) };
    case 'month':
      return { from: startOfMonth(now), to: endOfMonth(now) };
    case 'custom':
      return {
        from: customFrom ? startOfDay(customFrom) : startOfDay(subDays(now, 29)),
        to: customTo ? endOfDay(customTo) : endOfDay(now),
      };
  }
}

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
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
      // Datas do calendário (dia local), não do UTC — senão o fim do período pula para o dia seguinte
      const fromDate = format(filters.from, 'yyyy-MM-dd');
      const toDate = format(filters.to, 'yyyy-MM-dd');
      const unit = filters.unit !== 'all' ? filters.unit : null;
      const unitFilter = unit ? `unit.eq."${unit}",unit.eq."As duas"` : null;
      const matchesUnit = (u: string | null) => !unit || u === unit || u === 'As duas';

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const db = supabase as any;

      const [leads, visits, rawEvents, returnedResult, aiResult] = await Promise.all([
        // 1. Leads que chegaram no período
        fetchAllPages<ReportLead>((a, b) => {
          let q = db
            .from('campaign_leads')
            .select('id, status, unit, origem, campaign_id')
            .eq('company_id', companyId)
            .gte('created_at', fromISO)
            .lte('created_at', toISO)
            .not('status', 'in', EXCLUDED_LEAD_STATUSES);
          if (unitFilter) q = q.or(unitFilter);
          return q.order('id').range(a, b);
        }),

        // 2. Visitas marcadas para dentro do período
        fetchAllPages<ReportVisit>((a, b) => {
          let q = db
            .from('lead_visits')
            .select('id, lead_id, status_visita, data_visita, horario_visita, unit')
            .eq('company_id', companyId)
            .gte('data_visita', fromDate)
            .lte('data_visita', toDate);
          if (unitFilter) q = q.or(unitFilter);
          return q.order('id').range(a, b);
        }),

        // 3. Festas vendidas no período (sem data de venda, vale o dia do cadastro)
        fetchAllPages<{ lead_id: string | null; total_value: number | null; data_fechamento_venda: string | null; created_at: string; unit: string | null }>((a, b) =>
          db
            .from('company_events')
            .select('id, lead_id, total_value, data_fechamento_venda, created_at, unit')
            .eq('company_id', companyId)
            .neq('status', 'cancelado')
            .or(
              `and(data_fechamento_venda.gte.${fromDate},data_fechamento_venda.lte.${toDate}),` +
              `and(data_fechamento_venda.is.null,created_at.gte."${fromISO}",created_at.lte."${toISO}")`,
            )
            .order('id')
            .range(a, b),
        ),

        // 4. Leads antigos que voltaram a pedir orçamento no período
        (() => {
          let q = db
            .from('campaign_leads')
            .select('id', { count: 'exact', head: true })
            .eq('company_id', companyId)
            .gte('last_return_at', fromISO)
            .lte('last_return_at', toISO)
            .not('status', 'in', EXCLUDED_LEAD_STATUSES);
          if (unitFilter) q = q.or(unitFilter);
          return q;
        })(),

        // 5. Canal que a IA atende, para marcar na tabela por canal
        db.from('ai_agent_settings').select('unit').eq('company_id', companyId).maybeSingle(),
      ]);

      const events: ReportEvent[] = rawEvents
        .filter((e) => matchesUnit(e.unit))
        .map((e) => ({
          lead_id: e.lead_id,
          total_value: e.total_value,
          data_fechamento_venda: e.data_fechamento_venda,
          created_date: e.created_at ? brtNow(new Date(e.created_at)).date : null,
        }));

      // Canal de atendimento dos leads de cada festa
      const eventLeadUnits = new Map<string, string | null>();
      const leadIds = [...new Set(events.map((e) => e.lead_id).filter((id): id is string => !!id))];
      for (const ids of chunk(leadIds, 200)) {
        const { data } = await db.from('campaign_leads').select('id, unit').in('id', ids);
        for (const l of data || []) eventLeadUnits.set(l.id, l.unit);
      }

      return buildCommercialReport({
        leads,
        // Informativo: se a contagem falhar, o relatório segue sem ela
        leadsReturned: returnedResult.error ? 0 : returnedResult.count || 0,
        visits,
        events,
        eventLeadUnits,
        aiChannel: aiResult.error ? null : aiResult.data?.unit ?? null,
        from: fromDate,
        to: toDate,
      });
    },
    enabled: !!companyId,
    staleTime: 60_000,
  });
}
