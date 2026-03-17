-- Add unit_slug column (null = consolidated/all)
ALTER TABLE public.monthly_reviews ADD COLUMN IF NOT EXISTS unit_slug text;

-- Drop old unique constraint and create new one including unit_slug
ALTER TABLE public.monthly_reviews DROP CONSTRAINT IF EXISTS monthly_reviews_company_id_review_month_key;
ALTER TABLE public.monthly_reviews ADD CONSTRAINT monthly_reviews_company_unit_month_key UNIQUE (company_id, review_month, unit_slug);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_monthly_reviews_unit ON public.monthly_reviews (company_id, unit_slug, review_month DESC);