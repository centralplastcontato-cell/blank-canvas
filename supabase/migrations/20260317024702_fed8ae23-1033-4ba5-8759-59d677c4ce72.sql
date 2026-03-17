-- Drop the constraint that doesn't handle NULLs properly
ALTER TABLE public.monthly_reviews DROP CONSTRAINT IF EXISTS monthly_reviews_company_unit_month_key;

-- Create a unique index that handles NULLs using COALESCE
CREATE UNIQUE INDEX IF NOT EXISTS monthly_reviews_company_unit_month_idx 
  ON public.monthly_reviews (company_id, review_month, COALESCE(unit_slug, '__all__'));