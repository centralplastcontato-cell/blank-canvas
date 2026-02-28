-- Add approval_status to freelancer_responses
ALTER TABLE public.freelancer_responses 
ADD COLUMN approval_status text NOT NULL DEFAULT 'pendente'
CHECK (approval_status IN ('pendente', 'aprovado', 'rejeitado'));

-- Add approved_by and approved_at for audit
ALTER TABLE public.freelancer_responses 
ADD COLUMN approved_by uuid REFERENCES auth.users(id),
ADD COLUMN approved_at timestamptz;

-- Index for filtering by status
CREATE INDEX idx_freelancer_responses_approval ON public.freelancer_responses(company_id, approval_status);