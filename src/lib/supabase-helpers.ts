import { supabase } from '@/integrations/supabase/client';

// Default company ID for legacy operations
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
 * Uses type assertion to bypass TypeScript strict checking
 */
export async function insertWithCompany(
  table: string,
  data: Record<string, unknown> | Record<string, unknown>[]
): Promise<{ data: unknown; error: unknown }> {
  const companyId = getCurrentCompanyId();
  
  const dataWithCompany = Array.isArray(data)
    ? data.map(item => ({ ...item, company_id: companyId }))
    : { ...data, company_id: companyId };
  
  // Use any to bypass strict typing - this is intentional for migration period
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const client = supabase as any;
  return client.from(table).insert(dataWithCompany);
}

/**
 * Helper to insert a single record and return it
 */
export async function insertSingleWithCompany(
  table: string,
  data: Record<string, unknown>
): Promise<{ data: unknown; error: unknown }> {
  const companyId = getCurrentCompanyId();
  const dataWithCompany = { ...data, company_id: companyId };
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const client = supabase as any;
  return client.from(table).insert(dataWithCompany).select().single();
}

/**
 * Helper to upsert data with automatic company_id injection
 */
export async function upsertWithCompany(
  table: string,
  data: Record<string, unknown> | Record<string, unknown>[],
  options?: { onConflict?: string }
): Promise<{ data: unknown; error: unknown }> {
  const companyId = getCurrentCompanyId();
  
  const dataWithCompany = Array.isArray(data)
    ? data.map(item => ({ ...item, company_id: companyId }))
    : { ...data, company_id: companyId };
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const client = supabase as any;
  let query = client.from(table).upsert(dataWithCompany);
  
  if (options?.onConflict) {
    query = query.onConflict(options.onConflict);
  }
  
  return query;
}
