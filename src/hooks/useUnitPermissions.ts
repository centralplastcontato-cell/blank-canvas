import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface UnitPermissions {
  canViewAll: boolean;
  canViewManchester: boolean;
  canViewTrujillo: boolean;
  allowedUnits: string[];
}

export function useUnitPermissions(userId: string | undefined) {
  const [unitPermissions, setUnitPermissions] = useState<UnitPermissions>({
    canViewAll: true,
    canViewManchester: true,
    canViewTrujillo: true,
    allowedUnits: [],
  });
  const [isLoading, setIsLoading] = useState(true);

  const fetchUnitPermissions = useCallback(async () => {
    if (!userId) {
      setIsLoading(false);
      return;
    }

    try {
      const { data: permissions, error } = await supabase
        .from('user_permissions')
        .select('permission, granted')
        .eq('user_id', userId)
        .in('permission', ['leads.unit.all', 'leads.unit.manchester', 'leads.unit.trujillo']);

      if (error) {
        console.error('[useUnitPermissions] Error:', error);
        setIsLoading(false);
        return;
      }

      const permMap = new Map(permissions?.map(p => [p.permission, p.granted]) || []);
      
      const canViewAll = permMap.get('leads.unit.all') ?? true; // Default to all if no permission set
      const canViewManchester = permMap.get('leads.unit.manchester') ?? false;
      const canViewTrujillo = permMap.get('leads.unit.trujillo') ?? false;

      // Build allowed units list
      const allowedUnits: string[] = [];
      
      if (canViewAll) {
        // If can view all, don't filter by unit
        allowedUnits.push('all');
      } else {
        if (canViewManchester) {
          allowedUnits.push('Manchester');
        }
        if (canViewTrujillo) {
          allowedUnits.push('Trujillo');
        }
        // If user has permission for at least one unit, also include 'As duas'
        if (canViewManchester || canViewTrujillo) {
          allowedUnits.push('As duas');
        }
      }

      setUnitPermissions({
        canViewAll,
        canViewManchester,
        canViewTrujillo,
        allowedUnits,
      });
    } catch (err) {
      console.error('[useUnitPermissions] Error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchUnitPermissions();
  }, [fetchUnitPermissions]);

  return {
    ...unitPermissions,
    isLoading,
    refetch: fetchUnitPermissions,
  };
}
