import { useCompany } from '@/contexts/CompanyContext';

/**
 * Simple hook to get the current company ID for database operations.
 * Returns null if no company is selected.
 * 
 * Usage in components that need to insert data:
 * 
 * const companyId = useCurrentCompanyId();
 * 
 * // Then in your insert:
 * await supabase.from('table').insert({ 
 *   ...data, 
 *   company_id: companyId 
 * });
 */
export function useCurrentCompanyId(): string | null {
  const { currentCompanyId } = useCompany();
  return currentCompanyId;
}

/**
 * Hook that throws an error if no company is selected.
 * Use this when company_id is required.
 */
export function useRequiredCompanyId(): string {
  const { currentCompanyId } = useCompany();
  
  if (!currentCompanyId) {
    throw new Error('Nenhuma empresa selecionada. Por favor, selecione uma empresa.');
  }
  
  return currentCompanyId;
}
