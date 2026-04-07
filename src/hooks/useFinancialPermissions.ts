import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface FinancialPermissions {
  canView: boolean;
  canViewValues: boolean;
  canEdit: boolean;
  canPay: boolean;
  canViewBankAccounts: boolean;
}

/**
 * Hook to check financial permissions for a user.
 * Defaults to true (allowed) when no record exists — only blocks when explicitly denied (granted=false).
 */
export function useFinancialPermissions(userId: string | undefined) {
  const [permissions, setPermissions] = useState<FinancialPermissions>({
    canView: true,
    canViewValues: true,
    canEdit: true,
    canPay: true,
  });
  const [isLoading, setIsLoading] = useState(true);

  const fetchPermissions = useCallback(async () => {
    if (!userId) {
      setIsLoading(false);
      return;
    }

    try {
      const { data } = await supabase
        .from('user_permissions')
        .select('permission, granted')
        .eq('user_id', userId)
        .in('permission', [
          'financial.view',
          'financial.values',
          'financial.edit',
          'financial.payments',
        ]);

      const map: Record<string, boolean> = {};
      data?.forEach((p) => {
        map[p.permission] = p.granted;
      });

      setPermissions({
        canView: map['financial.view'] ?? true,
        canViewValues: map['financial.values'] ?? true,
        canEdit: map['financial.edit'] ?? true,
        canPay: map['financial.payments'] ?? true,
      });
    } catch (err) {
      console.error('[useFinancialPermissions] Error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    setIsLoading(true);
    fetchPermissions();
  }, [fetchPermissions]);

  return { ...permissions, isLoading };
}
