ALTER TABLE public.company_expenses 
ADD COLUMN expense_type text NOT NULL DEFAULT 'fixa';

COMMENT ON COLUMN public.company_expenses.expense_type IS 'Type: fixa, variavel, festa';