import { useCompany } from '@/contexts/CompanyContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Company } from '@/types/company';

/**
 * Hook to fetch data filtered by current company
 * Automatically includes company_id in queries
 */
export function useCompanyQuery<T>(
  key: string[],
  table: string,
  selectQuery: string = '*',
  additionalFilters?: (query: any) => any,
  options?: { enabled?: boolean }
) {
  const { currentCompanyId } = useCompany();

  return useQuery({
    queryKey: [...key, currentCompanyId],
    queryFn: async () => {
      if (!currentCompanyId) return [] as T[];

      let query = supabase
        .from(table)
        .select(selectQuery)
        .eq('company_id', currentCompanyId);

      if (additionalFilters) {
        query = additionalFilters(query);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as T[];
    },
    enabled: !!currentCompanyId && (options?.enabled !== false),
  });
}

/**
 * Hook to insert data with automatic company_id
 */
export function useCompanyInsert<T extends Record<string, unknown>>(
  table: string,
  invalidateKeys?: string[][]
) {
  const { currentCompanyId } = useCompany();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Omit<T, 'company_id'>) => {
      if (!currentCompanyId) throw new Error('Nenhuma empresa selecionada');

      const { data: result, error } = await supabase
        .from(table)
        .insert({ ...data, company_id: currentCompanyId })
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      invalidateKeys?.forEach(key => {
        queryClient.invalidateQueries({ queryKey: [...key, currentCompanyId] });
      });
    },
  });
}

/**
 * Hook to update data with company_id validation
 */
export function useCompanyUpdate<T extends Record<string, unknown>>(
  table: string,
  invalidateKeys?: string[][]
) {
  const { currentCompanyId } = useCompany();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<T> }) => {
      if (!currentCompanyId) throw new Error('Nenhuma empresa selecionada');

      const { data: result, error } = await supabase
        .from(table)
        .update(data)
        .eq('id', id)
        .eq('company_id', currentCompanyId)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      invalidateKeys?.forEach(key => {
        queryClient.invalidateQueries({ queryKey: [...key, currentCompanyId] });
      });
    },
  });
}

/**
 * Hook to delete data with company_id validation
 */
export function useCompanyDelete(
  table: string,
  invalidateKeys?: string[][]
) {
  const { currentCompanyId } = useCompany();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!currentCompanyId) throw new Error('Nenhuma empresa selecionada');

      const { error } = await supabase
        .from(table)
        .delete()
        .eq('id', id)
        .eq('company_id', currentCompanyId);

      if (error) throw error;
    },
    onSuccess: () => {
      invalidateKeys?.forEach(key => {
        queryClient.invalidateQueries({ queryKey: [...key, currentCompanyId] });
      });
    },
  });
}

/**
 * Hook to manage companies (for admins)
 */
export function useCompanies() {
  return useQuery({
    queryKey: ['companies'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .order('name');
      
      if (error) throw error;
      return data as Company[];
    },
  });
}

/**
 * Hook to create a new company (super admin only)
 */
export function useCreateCompany() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (company: Omit<Company, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('companies')
        .insert(company)
        .select()
        .single();

      if (error) throw error;
      return data as Company;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companies'] });
    },
  });
}
