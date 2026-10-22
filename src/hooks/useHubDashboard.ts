import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { parseHubDashboard, type HubDashboardData } from "@/lib/hubDashboardMetrics";
import type { DashboardFilters } from "@/components/hub/HubDashboardFilters";

export class HubDashboardMissingFunctionError extends Error {}

/** Painel do Hub: uma única chamada ao banco (hub_dashboard_metrics) por combinação de filtros */
export function useHubDashboard(filters: DashboardFilters) {
  const from = filters.dateRange.from.toISOString();
  const to = filters.dateRange.to.toISOString();

  return useQuery<HubDashboardData>({
    queryKey: ["hub-dashboard", from, to, filters.companyId, filters.status],
    queryFn: async () => {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const { data, error } = await supabase.rpc("hub_dashboard_metrics", {
        p_from: from,
        p_to: to,
        p_today_start: todayStart.toISOString(),
        p_company_id: filters.companyId ?? undefined,
        p_status: filters.status ?? undefined,
      });
      if (error) {
        // PGRST202 = função não existe (SQL da migração ainda não rodado)
        if (error.code === "PGRST202") throw new HubDashboardMissingFunctionError(error.message);
        throw error;
      }
      return parseHubDashboard(data);
    },
    placeholderData: keepPreviousData,
    staleTime: 60_000,
    retry: (count, err) => !(err instanceof HubDashboardMissingFunctionError) && count < 2,
  });
}
