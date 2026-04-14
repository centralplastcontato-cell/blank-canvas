import { supabase } from '@/integrations/supabase/client';

/**
 * Standalone function to log activity without needing React hooks.
 * Can be called from anywhere (hooks, event handlers, etc.)
 */
export async function logActivity({
  companyId,
  action,
  module,
  entityType,
  entityId,
  entityName,
  details,
}: {
  companyId: string;
  action: string;
  module: string;
  entityType?: string;
  entityId?: string;
  entityName?: string;
  details?: Record<string, any>;
}) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('user_id', user.id)
      .maybeSingle();

    const { error } = await supabase.from('activity_logs').insert({
      company_id: companyId,
      user_id: user.id,
      user_name: profile?.full_name || user.email || 'Desconhecido',
      action,
      module,
      entity_type: entityType || null,
      entity_id: entityId || null,
      entity_name: entityName || null,
      details: details || null,
      user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
    } as any);

    if (error) {
      console.error('[ActivityLog] Insert error:', error.message, error.details, error.hint);
    }
  } catch (err) {
    console.error('[ActivityLog] Error:', err);
  }
}
