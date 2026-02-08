-- Remove the remaining overly permissive public INSERT policy on b2b_leads
DROP POLICY IF EXISTS "Allow public insert of B2B leads" ON public.b2b_leads;