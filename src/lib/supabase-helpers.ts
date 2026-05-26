import { supabase } from '@/integrations/supabase/client';

/**
 * Returns the current company ID from localStorage, or null if not set.
 * Never returns a hardcoded default — callers must handle null.
 */
export function getCurrentCompanyId(): string | null {
  const stored = localStorage.getItem('selected_company_id');
  return stored || null;
}

/**
 * Helper to insert data with automatic company_id injection.
 * Returns an error object if no company_id is available.
 */
export async function insertWithCompany(
  table: string,
  data: Record<string, unknown> | Record<string, unknown>[]
): Promise<{ data: unknown; error: unknown }> {
  const companyId = getCurrentCompanyId();
  if (!companyId) {
    console.error('[supabase-helpers] insertWithCompany: no company_id available');
    return { data: null, error: new Error('No company_id available') };
  }

  const dataWithCompany = Array.isArray(data)
    ? data.map(item => ({ ...item, company_id: companyId }))
    : { ...data, company_id: companyId };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const client = supabase as any;
  return client.from(table).insert(dataWithCompany);
}

/**
 * Helper to insert a single record and return it.
 * Returns an error object if no company_id is available.
 */
export async function insertSingleWithCompany(
  table: string,
  data: Record<string, unknown>
): Promise<{ data: unknown; error: unknown }> {
  const companyId = getCurrentCompanyId();
  if (!companyId) {
    console.error('[supabase-helpers] insertSingleWithCompany: no company_id available');
    return { data: null, error: new Error('No company_id available') };
  }
  const dataWithCompany = { ...data, company_id: companyId };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const client = supabase as any;
  return client.from(table).insert(dataWithCompany).select().single();
}

/**
 * Helper to upsert data with automatic company_id injection.
 * Returns an error object if no company_id is available.
 */
export async function upsertWithCompany(
  table: string,
  data: Record<string, unknown> | Record<string, unknown>[],
  options?: { onConflict?: string }
): Promise<{ data: unknown; error: unknown }> {
  const companyId = getCurrentCompanyId();
  if (!companyId) {
    console.error('[supabase-helpers] upsertWithCompany: no company_id available');
    return { data: null, error: new Error('No company_id available') };
  }

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
