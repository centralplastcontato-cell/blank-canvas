import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCompanyUnits } from './useCompanyUnits';

export interface UnitPermissions {
  canViewAll: boolean;
  allowedUnits: string[];
  /** Map of unit name -> whether user can view it */
  unitAccess: Record<string, boolean>;
}

export function useUnitPermissions(userId: string | undefined, companyId?: string) {
  const { units: companyUnits, isLoading: isLoadingUnits } = useCompanyUnits(companyId);
  const [unitPermissions, setUnitPermissions] = useState<UnitPermissions>({
    canViewAll: false,
    allowedUnits: [],
    unitAccess: {},
  });
  const [isLoading, setIsLoading] = useState(true);

  const fetchUnitPermissions = useCallback(async () => {
    if (!userId) {
      setIsLoading(false);
      return;
    }

    // Wait for company units to load
    if (isLoadingUnits) return;

    try {
      // Build dynamic permission codes based on company units
      const unitPermCodes = companyUnits.map(u => `leads.unit.${u.slug}`);
      const allPermCodes = ['leads.unit.all', ...unitPermCodes];

      const { data: permissions, error } = await supabase
        .from('user_permissions')
        .select('permission, granted')
        .eq('user_id', userId)
        .in('permission', allPermCodes);

      if (error) {
        console.error('[useUnitPermissions] Error:', error);
        setIsLoading(false);
        return;
      }

      const permMap = new Map(permissions?.map(p => [p.permission, p.granted]) || []);
      
      const canViewAll = permMap.get('leads.unit.all') ?? true; // Default to all if no permission set

      // Build allowed units list and access map dynamically
      const allowedUnits: string[] = [];
      const unitAccess: Record<string, boolean> = {};
      
      if (canViewAll) {
        allowedUnits.push('all');
        companyUnits.forEach(u => {
          unitAccess[u.name] = true;
        });
      } else {
        companyUnits.forEach(u => {
          const canView = permMap.get(`leads.unit.${u.slug}`) ?? false;
          unitAccess[u.name] = canView;
          if (canView) {
            allowedUnits.push(u.name);
          }
        });
        // If user has permission for more than one unit, add combined option
        if (allowedUnits.length > 1) {
          allowedUnits.push('As duas');
        }
      }

      setUnitPermissions({
        canViewAll,
        allowedUnits,
        unitAccess,
      });
    } catch (err) {
      console.error('[useUnitPermissions] Error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [userId, companyUnits, isLoadingUnits]);

  useEffect(() => {
    fetchUnitPermissions();
  }, [fetchUnitPermissions]);

  return {
    ...unitPermissions,
    isLoading: isLoading || isLoadingUnits,
    refetch: fetchUnitPermissions,
  };
}
