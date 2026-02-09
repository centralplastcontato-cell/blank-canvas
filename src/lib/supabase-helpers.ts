import { supabase } from '@/integrations/supabase/client';

// Default company ID for legacy operations
// This is a temporary solution while migrating to full multi-tenant support
const DEFAULT_COMPANY_ID = 'a0000000-0000-0000-0000-000000000001';

/**
 * Get the current company ID from localStorage or return default
 */
export function getCurrentCompanyId(): string {
  const stored = localStorage.getItem('selected_company_id');
  return stored || DEFAULT_COMPANY_ID;
}

/**
 * Helper to insert data with automatic company_id injection
 * This bypasses TypeScript strict checking for legacy code migration
 */
export async function insertWithCompany<T extends Record<string, unknown>>(
  table: string,
  data: T | T[]
): Promise<{ data: unknown; error: unknown }> {
  const companyId = getCurrentCompanyId();
  
  const dataWithCompany = Array.isArray(data)
    ? data.map(item => ({ ...item, company_id: companyId }))
    : { ...data, company_id: companyId };
  
  // Use type assertion to bypass strict typing
  return supabase.from(table as any).insert(dataWithCompany as any);
}

/**
 * Helper to insert a single record and return it
 */
export async function insertSingleWithCompany<T extends Record<string, unknown>>(
  table: string,
  data: T
): Promise<{ data: unknown; error: unknown }> {
  const companyId = getCurrentCompanyId();
  const dataWithCompany = { ...data, company_id: companyId };
  
  return supabase.from(table as any).insert(dataWithCompany as any).select().single();
}
