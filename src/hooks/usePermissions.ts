import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface PermissionDefinition {
  id: string;
  code: string;
  name: string;
  description: string | null;
  category: string;
  is_active: boolean;
  sort_order: number;
}

export interface UserPermission {
  id: string;
  user_id: string;
  permission: string;
  granted: boolean;
  granted_by: string | null;
  created_at: string;
  updated_at: string;
}

export function usePermissions(userId: string | undefined) {
  const [permissions, setPermissions] = useState<UserPermission[]>([]);
  const [definitions, setDefinitions] = useState<PermissionDefinition[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isMountedRef = useRef(true);

  const fetchPermissions = useCallback(async () => {
    if (!userId) {
      setPermissions([]);
      setIsLoading(false);
      return;
    }

    try {
      // Fetch permission definitions
      const { data: defs, error: defsError } = await supabase
        .from('permission_definitions')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (defsError) {
        console.error('[usePermissions] Error fetching definitions:', defsError);
        throw defsError;
      }

      // Fetch user permissions
      const { data: perms, error: permsError } = await supabase
        .from('user_permissions')
        .select('*')
        .eq('user_id', userId);

      if (permsError) {
        console.error('[usePermissions] Error fetching permissions:', permsError);
        throw permsError;
      }

      if (isMountedRef.current) {
        setDefinitions(defs || []);
        setPermissions(perms || []);
        setError(null);
      }
    } catch (err: any) {
      console.error('[usePermissions] Error:', err);
      if (isMountedRef.current) {
        setError(err.message || 'Error fetching permissions');
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [userId]);

  useEffect(() => {
    isMountedRef.current = true;
    setIsLoading(true);
    fetchPermissions();

    return () => {
      isMountedRef.current = false;
    };
  }, [fetchPermissions]);

  const hasPermission = useCallback(
    (permissionCode: string): boolean => {
      const userPerm = permissions.find((p) => p.permission === permissionCode);
      return userPerm?.granted ?? false;
    },
    [permissions]
  );

  const updatePermission = useCallback(
    async (permissionCode: string, granted: boolean, grantedBy: string) => {
      if (!userId) return false;

      try {
        // Check if permission already exists
        const existingPerm = permissions.find((p) => p.permission === permissionCode);

        if (existingPerm) {
          // Update existing permission
          const { error } = await supabase
            .from('user_permissions')
            .update({ granted, granted_by: grantedBy, updated_at: new Date().toISOString() })
            .eq('id', existingPerm.id);

          if (error) throw error;
        } else {
          // Insert new permission
          const { error } = await supabase
            .from('user_permissions')
            .insert({
              user_id: userId,
              permission: permissionCode,
              granted,
              granted_by: grantedBy,
            });

          if (error) throw error;
        }

        // Refresh permissions
        await fetchPermissions();
        return true;
      } catch (err: any) {
        console.error('[usePermissions] Error updating permission:', err);
        return false;
      }
    },
    [userId, permissions, fetchPermissions]
  );

  const getPermissionsByCategory = useCallback(() => {
    const grouped: Record<string, PermissionDefinition[]> = {};
    
    definitions.forEach((def) => {
      if (!grouped[def.category]) {
        grouped[def.category] = [];
      }
      grouped[def.category].push(def);
    });

    return grouped;
  }, [definitions]);

  return {
    permissions,
    definitions,
    isLoading,
    error,
    hasPermission,
    updatePermission,
    getPermissionsByCategory,
    refetch: fetchPermissions,
  };
}

// Hook to fetch permissions for a target user (admin viewing another user)
export function useUserPermissions(targetUserId: string | undefined) {
  const [permissions, setPermissions] = useState<UserPermission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPermissions = useCallback(async () => {
    if (!targetUserId) {
      setPermissions([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    try {
      const { data, error: fetchError } = await supabase
        .from('user_permissions')
        .select('*')
        .eq('user_id', targetUserId);

      if (fetchError) throw fetchError;

      setPermissions(data || []);
      setError(null);
    } catch (err: any) {
      console.error('[useUserPermissions] Error:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [targetUserId]);

  useEffect(() => {
    fetchPermissions();
  }, [fetchPermissions]);

  const hasPermission = useCallback(
    (permissionCode: string): boolean => {
      const perm = permissions.find((p) => p.permission === permissionCode);
      return perm?.granted ?? false;
    },
    [permissions]
  );

  return {
    permissions,
    isLoading,
    error,
    hasPermission,
    refetch: fetchPermissions,
  };
}
