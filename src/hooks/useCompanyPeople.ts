import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface CompanyPerson {
  user_id: string;
  full_name: string;
}

// Pessoas da empresa (user_companies → profiles), em ordem alfabética.
// Só quem faz parte desta empresa: perfis de outras empresas não aparecem.
export function useCompanyPeople(companyId: string | undefined) {
  const [people, setPeople] = useState<CompanyPerson[]>([]);

  useEffect(() => {
    if (!companyId) return;
    let cancelled = false;
    (async () => {
      const { data: members } = await supabase.from("user_companies").select("user_id").eq("company_id", companyId);
      const ids = (members || []).map((m) => m.user_id);
      if (ids.length === 0) {
        if (!cancelled) setPeople([]);
        return;
      }
      const { data } = await supabase.from("profiles").select("user_id, full_name").in("user_id", ids);
      if (!cancelled && data) setPeople([...data].sort((a, b) => (a.full_name || "").localeCompare(b.full_name || "", "pt-BR")));
    })();
    return () => {
      cancelled = true;
    };
  }, [companyId]);

  return people;
}
