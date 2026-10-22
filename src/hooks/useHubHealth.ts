import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { parseHubHealth, type CompanyHealth } from "@/lib/hubAlerts";

/** Saúde das unidades (base da central de alertas); atualiza a cada 5 minutos */
export function useHubHealth() {
  return useQuery<CompanyHealth[]>({
    queryKey: ["hub-health"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("hub_health");
      if (error) throw error;
      return parseHubHealth(data);
    },
    staleTime: 5 * 60_000,
    refetchInterval: 5 * 60_000,
    retry: (count, err) => (err as { code?: string })?.code !== "PGRST202" && count < 2,
  });
}
