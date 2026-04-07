
-- Create company_bank_accounts table
CREATE TABLE public.company_bank_accounts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  bank_name TEXT,
  agency TEXT,
  account_number TEXT,
  account_type TEXT NOT NULL DEFAULT 'corrente',
  initial_balance NUMERIC NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.company_bank_accounts ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their company bank accounts"
ON public.company_bank_accounts FOR SELECT
TO authenticated
USING (company_id = ANY(public.get_user_company_ids(auth.uid())));

CREATE POLICY "Users can create bank accounts for their company"
ON public.company_bank_accounts FOR INSERT
TO authenticated
WITH CHECK (company_id = ANY(public.get_user_company_ids(auth.uid())));

CREATE POLICY "Users can update their company bank accounts"
ON public.company_bank_accounts FOR UPDATE
TO authenticated
USING (company_id = ANY(public.get_user_company_ids(auth.uid())));

CREATE POLICY "Users can delete their company bank accounts"
ON public.company_bank_accounts FOR DELETE
TO authenticated
USING (company_id = ANY(public.get_user_company_ids(auth.uid())));

-- Trigger for updated_at
CREATE TRIGGER update_company_bank_accounts_updated_at
BEFORE UPDATE ON public.company_bank_accounts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add bank_account_id to event_payments
ALTER TABLE public.event_payments
ADD COLUMN bank_account_id UUID REFERENCES public.company_bank_accounts(id);

-- Add bank_account_id to company_expenses
ALTER TABLE public.company_expenses
ADD COLUMN bank_account_id UUID REFERENCES public.company_bank_accounts(id);

-- Index for performance
CREATE INDEX idx_bank_accounts_company ON public.company_bank_accounts(company_id);
CREATE INDEX idx_event_payments_bank_account ON public.event_payments(bank_account_id);
CREATE INDEX idx_company_expenses_bank_account ON public.company_expenses(bank_account_id);
