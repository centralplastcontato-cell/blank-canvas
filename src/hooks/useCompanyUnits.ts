import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface CompanyUnit {
  id: string;
  company_id: string;
  name: string;
  slug: string;
  is_active: boolean;
  sort_order: number;
  color: string | null;
  is_physical?: boolean;
}

/**
 * Returns company units.
 *
 * IMPORTANT: `units` returns ONLY physical units (places where parties happen).
 * Sales-channel rows (VENDAS 1/2/3/4) live in the same table because their
 * slugs power the WhatsApp instance ↔ leads.unit permission sync, but they
 * must NOT appear in Agenda/Financeiro/Inteligência selectors.
 *
 * Use `allUnits` only in screens that need the full list for permission/slug
 * mapping (InstanceVisibilityCard, TransferLeadDialog, CampaignAudienceStep,
 * PermissionsPanel).
 */
export function useCompanyUnits(companyId?: string) {
  const [allUnits, setAllUnits] = useState<CompanyUnit[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchUnits = useCallback(async () => {
    const cid = companyId
      || localStorage.getItem('selected_company_id')
      || 'a0000000-0000-0000-0000-000000000001';

    try {
      const { data, error } = await supabase
        .from('company_units')
        .select('*')
        .eq('company_id', cid)
        .eq('is_active', true)
        .order('sort_order');

      if (error) {
        console.error('[useCompanyUnits] Error:', error);
      } else {
        setAllUnits((data || []) as CompanyUnit[]);
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
        fetchUnits();
      }
    });
    return () => subscription.unsubscribe();
  }, [fetchUnits]);

  // Default: only physical units (excludes sales channels like VENDAS 1/2/3/4).
  // is_physical defaults to true server-side, so legacy rows continue to appear.
  // Memoize derived arrays so consumers don't see a new reference on every render
  // (this caused infinite re-fetch loops in dependent hooks like useUnitPermissions).
  const units = useMemo(
    () => allUnits.filter(u => u.is_physical !== false),
    [allUnits],
  );

  // Helper: get unit names as simple string array
  const unitNames = useMemo(() => units.map(u => u.name), [units]);

  // Helper: get units as {value, label} for Select components
  const unitOptions = useMemo(
    () => units.map(u => ({ value: u.name, label: u.name })),
    [units],
  );

  return {
    units,            // physical units only (default — backwards compatible for UI selectors)
    allUnits,         // every active unit row, including sales channels (for permission/slug mapping)
    unitNames,
    unitOptions,
    isLoading,
    refetch: fetchUnits,
  };
}
