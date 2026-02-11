import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface CompanyUnit {
  id: string;
  company_id: string;
  name: string;
  slug: string;
  is_active: boolean;
  sort_order: number;
}

export function useCompanyUnits(companyId?: string) {
  const [units, setUnits] = useState<CompanyUnit[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchUnits = useCallback(async () => {
    if (!companyId) {
      const storedCompanyId = localStorage.getItem('selected_company_id') || 'a0000000-0000-0000-0000-000000000001';
      
      const { data, error } = await supabase
        .from('company_units')
        .select('*')
        .eq('company_id', storedCompanyId)
        .eq('is_active', true)
        .order('sort_order');

      if (!error && data) {
        setUnits(data as CompanyUnit[]);
      }
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('company_units')
        .select('*')
        .eq('company_id', companyId)
        .eq('is_active', true)
        .order('sort_order');

      if (error) {
        console.error('[useCompanyUnits] Error:', error);
      } else {
        setUnits((data || []) as CompanyUnit[]);
      }
    } catch (err) {
      console.error('[useCompanyUnits] Error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    fetchUnits();
  }, [fetchUnits]);

  // Re-fetch when auth state changes (fixes RLS race condition)
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        console.log('[useCompanyUnits] Auth state changed, re-fetching units');
        fetchUnits();
      }
    });
    return () => subscription.unsubscribe();
  }, [fetchUnits]);
  // Helper: get unit names as simple string array
  const unitNames = units.map(u => u.name);

  // Helper: get units as {value, label} for Select components
  const unitOptions = units.map(u => ({ value: u.name, label: u.name }));

  return {
    units,
    unitNames,
    unitOptions,
    isLoading,
    refetch: fetchUnits,
  };
}
