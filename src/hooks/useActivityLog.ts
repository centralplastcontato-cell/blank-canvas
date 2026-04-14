import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/contexts/CompanyContext';

export type ActivityAction = 'create' | 'update' | 'delete' | 'send' | 'sign' | 'login' | 'status_change' | 'payment' | 'export' | 'import';
export type ActivityModule = 'crm' | 'events' | 'financial' | 'contracts' | 'settings' | 'campaigns' | 'attendance' | 'forms' | 'whatsapp';

interface LogActivityParams {
  action: ActivityAction;
  module: ActivityModule;
  entityType?: string;
  entityId?: string;
  entityName?: string;
  details?: Record<string, any>;
}

export function useActivityLog() {
  const { currentCompany } = useCompany();

  const logActivity = useCallback(async ({
    action,
    module,
    entityType,
    entityId,
    entityName,
    details,
  }: LogActivityParams) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !currentCompany?.id) return;

      // Get user profile name
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('user_id', user.id)
        .maybeSingle();

      await supabase.from('activity_logs').insert({
        company_id: currentCompany.id,
        user_id: user.id,
        user_name: profile?.full_name || user.email || 'Desconhecido',
        action,
        module,
        entity_type: entityType,
        entity_id: entityId,
        entity_name: entityName,
        details: details || null,
        user_agent: navigator.userAgent,
      });
    } catch (err) {
      console.error('[ActivityLog] Error logging activity:', err);
    }
  }, [currentCompany?.id]);

  return { logActivity };
}
