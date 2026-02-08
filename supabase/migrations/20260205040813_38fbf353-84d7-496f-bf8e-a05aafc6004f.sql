-- Create table for B2B leads (buffets interested in the platform)
CREATE TABLE public.b2b_leads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_name TEXT NOT NULL,
  contact_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  city TEXT,
  state TEXT,
  monthly_parties INTEGER,
  current_tools TEXT,
  main_challenges TEXT,
  how_found_us TEXT,
  status TEXT NOT NULL DEFAULT 'novo',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.b2b_leads ENABLE ROW LEVEL SECURITY;

-- Allow public inserts (for the form)
CREATE POLICY "Allow public insert of B2B leads"
ON public.b2b_leads
FOR INSERT
WITH CHECK (true);

-- Only admins can view B2B leads
CREATE POLICY "Admins can view B2B leads"
ON public.b2b_leads
FOR SELECT
USING (is_admin(auth.uid()));

-- Only admins can update B2B leads
CREATE POLICY "Admins can update B2B leads"
ON public.b2b_leads
FOR UPDATE
USING (is_admin(auth.uid()));

-- Only admins can delete B2B leads
CREATE POLICY "Admins can delete B2B leads"
ON public.b2b_leads
FOR DELETE
USING (is_admin(auth.uid()));

-- Add updated_at trigger
CREATE TRIGGER update_b2b_leads_updated_at
BEFORE UPDATE ON public.b2b_leads
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();