import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { AppRole } from '@/types/crm';

const MAX_RETRIES = 3;
const RETRY_DELAYS = [500, 1000, 2000]; // Exponential backoff

export function useUserRole(userId: string | undefined) {
  const [role, setRole] = useState<AppRole | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasFetched, setHasFetched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fetchAttemptRef = useRef(0);
  const isMountedRef = useRef(true);

  const fetchRole = useCallback(async (retryCount = 0): Promise<void> => {
    if (!userId) {
      console.log('[useUserRole] No userId provided, skipping fetch');
      return;
    }

    const currentAttempt = ++fetchAttemptRef.current;
    console.log(`[useUserRole] Fetching role for user ${userId} (attempt ${retryCount + 1}/${MAX_RETRIES})`);

    try {
      // First, verify we have an active session
      const { data: sessionData } = await supabase.auth.getSession();
      
      if (!sessionData.session) {
        console.log('[useUserRole] No active session, aborting fetch');
        if (isMountedRef.current && currentAttempt === fetchAttemptRef.current) {
          setRole(null);
          setIsLoading(false);
          setHasFetched(true);
          setError('No active session');
        }
        return;
      }

      console.log(`[useUserRole] Session verified for user ${sessionData.session.user.id}`);

      // Now fetch the role
      const { data, error: queryError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .maybeSingle();

      // Ignore stale requests
      if (!isMountedRef.current || currentAttempt !== fetchAttemptRef.current) {
        console.log('[useUserRole] Ignoring stale request');
        return;
      }

      if (queryError) {
        console.error('[useUserRole] Query error:', queryError);
        
        // Retry on permission errors or network issues
        if (retryCount < MAX_RETRIES - 1) {
          const delay = RETRY_DELAYS[retryCount] || 2000;
          console.log(`[useUserRole] Retrying in ${delay}ms...`);
          setTimeout(() => {
            if (isMountedRef.current) {
              fetchRole(retryCount + 1);
            }
          }, delay);
          return;
        }
        
        setRole(null);
        setError(queryError.message);
      } else if (data) {
        console.log(`[useUserRole] Role found: ${data.role}`);
        setRole(data.role as AppRole);
        setError(null);
      } else {
        console.log('[useUserRole] No role found for user');
        setRole(null);
        setError('No role assigned');
      }
    } catch (err) {
      console.error('[useUserRole] Unexpected error:', err);
      
      if (!isMountedRef.current || currentAttempt !== fetchAttemptRef.current) {
        return;
      }

      // Retry on unexpected errors
      if (retryCount < MAX_RETRIES - 1) {
        const delay = RETRY_DELAYS[retryCount] || 2000;
        console.log(`[useUserRole] Retrying after error in ${delay}ms...`);
        setTimeout(() => {
          if (isMountedRef.current) {
            fetchRole(retryCount + 1);
          }
        }, delay);
        return;
      }
      
      setRole(null);
      setError('Unexpected error');
    }

    if (isMountedRef.current && currentAttempt === fetchAttemptRef.current) {
      setIsLoading(false);
      setHasFetched(true);
    }
  }, [userId]);

  useEffect(() => {
    isMountedRef.current = true;
    
    if (!userId) {
      console.log('[useUserRole] No userId, setting null state');
      setRole(null);
      setIsLoading(false);
      setHasFetched(true);
      setError(null);
      return;
    }

    // Reset state when userId changes
    setIsLoading(true);
    setHasFetched(false);
    setError(null);

    // Small delay to ensure session is fully established
    const timeoutId = setTimeout(() => {
      fetchRole(0);
    }, 100);

    return () => {
      isMountedRef.current = false;
      clearTimeout(timeoutId);
    };
  }, [userId, fetchRole]);

  const isAdmin = role === 'admin';
  const isGestor = role === 'gestor';
  const isComercial = role === 'comercial';
  const isVisualizacao = role === 'visualizacao';
  const canEdit = isAdmin || isGestor || isComercial;
  const canManageUsers = isAdmin || isGestor;

  return {
    role,
    isLoading,
    hasFetched,
    error,
    isAdmin,
    isGestor,
    isComercial,
    isVisualizacao,
    canEdit,
    canManageUsers,
    refetch: () => fetchRole(0),
  };
}
