
-- Add company_id column to notifications table
ALTER TABLE public.notifications 
ADD COLUMN company_id uuid REFERENCES public.companies(id);

-- Create index for efficient filtering
CREATE INDEX idx_notifications_company_id ON public.notifications(company_id);

-- Backfill existing notifications using user_companies (pick the default or first company)
UPDATE public.notifications n
SET company_id = (
  SELECT uc.company_id 
  FROM public.user_companies uc 
  WHERE uc.user_id = n.user_id 
  ORDER BY uc.is_default DESC, uc.created_at ASC 
  LIMIT 1
)
WHERE n.company_id IS NULL;
