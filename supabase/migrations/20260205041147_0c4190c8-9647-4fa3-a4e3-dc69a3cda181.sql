-- Create proposals history table
CREATE TABLE public.proposals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  prospect_name TEXT NOT NULL,
  company_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  plan TEXT NOT NULL,
  payment_type TEXT NOT NULL,
  custom_features TEXT[] DEFAULT '{}',
  notes TEXT,
  valid_days INTEGER NOT NULL DEFAULT 7,
  discount NUMERIC(5,2) DEFAULT 0,
  subtotal NUMERIC(10,2) NOT NULL,
  discount_amount NUMERIC(10,2) DEFAULT 0,
  total NUMERIC(10,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.proposals ENABLE ROW LEVEL SECURITY;

-- Policies: Only admins can view and manage proposals
CREATE POLICY "Admins can view proposals"
ON public.proposals
FOR SELECT
USING (is_admin(auth.uid()));

CREATE POLICY "Admins can insert proposals"
ON public.proposals
FOR INSERT
WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Admins can delete proposals"
ON public.proposals
FOR DELETE
USING (is_admin(auth.uid()));