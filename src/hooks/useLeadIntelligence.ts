import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/contexts/CompanyContext';

export interface LeadIntelligence {
  id: string;
  lead_id: string;
  company_id: string;
  score: number;
  temperature: string;
  priority_flag: boolean;
  abandonment_type: string | null;
  intent_tags: string[];
  last_customer_message_at: string | null;
  last_agent_message_at: string | null;
  followup_count: number;
  updated_at: string;
  created_at: string;
  // Joined from campaign_leads
  lead_name?: string;
  lead_status?: string;
  lead_whatsapp?: string;
  lead_unit?: string | null;
  lead_created_at?: string;
}

export function useLeadIntelligence(enabled: boolean = true) {
  const { currentCompany } = useCompany();
  const companyId = currentCompany?.id;

  return useQuery({
    queryKey: ['lead-intelligence', companyId],
    queryFn: async (): Promise<LeadIntelligence[]> => {
      if (!companyId) return [];

      // Fetch intelligence data joined with lead info
      const { data: intelligence, error: intError } = await supabase
        .from('lead_intelligence')
        .select('*')
        .eq('company_id', companyId)
        .order('score', { ascending: false });

      if (intError) throw intError;
      if (!intelligence || intelligence.length === 0) return [];

      // Get lead IDs and fetch lead details
      const leadIds = intelligence.map(i => i.lead_id);
      const { data: leads, error: leadsError } = await supabase
        .from('campaign_leads')
        .select('id, name, status, whatsapp, unit, created_at')
        .in('id', leadIds);

      if (leadsError) throw leadsError;

      const leadsMap = new Map(leads?.map(l => [l.id, l]) || []);

      return intelligence.map(i => {
        const lead = leadsMap.get(i.lead_id);
        return {
          ...i,
          intent_tags: Array.isArray(i.intent_tags) ? i.intent_tags as string[] : [],
          lead_name: lead?.name || 'Desconhecido',
          lead_status: lead?.status || 'novo',
          lead_whatsapp: lead?.whatsapp || '',
          lead_unit: lead?.unit || null,
          lead_created_at: lead?.created_at || i.created_at,
        };
      });
    },
    enabled: !!companyId && enabled,
    staleTime: 60_000,
  });
}

export function useRecalculateScore() {
  return async (leadId: string) => {
    const { error } = await supabase.rpc('recalculate_lead_score', { _lead_id: leadId });
    if (error) throw error;
  };
}
