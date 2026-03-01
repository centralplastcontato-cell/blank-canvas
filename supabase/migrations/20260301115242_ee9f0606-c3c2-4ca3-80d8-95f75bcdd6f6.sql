
-- Create support_tickets table
CREATE TABLE public.support_tickets (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid REFERENCES public.companies(id),
  user_id uuid NOT NULL,
  user_name text,
  user_email text,
  subject text NOT NULL,
  description text NOT NULL,
  category text NOT NULL DEFAULT 'duvida', -- duvida, bug, sugestao
  page_url text,
  user_agent text,
  console_errors jsonb DEFAULT '[]'::jsonb,
  context_data jsonb DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'novo', -- novo, em_andamento, resolvido, fechado
  priority text NOT NULL DEFAULT 'media', -- baixa, media, alta, critica
  ai_classification text,
  conversation_history jsonb DEFAULT '[]'::jsonb,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

-- Users can view their own tickets
CREATE POLICY "Users can view their own tickets"
  ON public.support_tickets FOR SELECT
  USING (auth.uid() = user_id);

-- Users can create their own tickets
CREATE POLICY "Users can insert their own tickets"
  ON public.support_tickets FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Admins can view all tickets
CREATE POLICY "Admins can view all tickets"
  ON public.support_tickets FOR SELECT
  USING (public.is_admin(auth.uid()));

-- Admins can update any ticket
CREATE POLICY "Admins can update any ticket"
  ON public.support_tickets FOR UPDATE
  USING (public.is_admin(auth.uid()));

-- Trigger for updated_at
CREATE TRIGGER update_support_tickets_updated_at
  BEFORE UPDATE ON public.support_tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Index for queries
CREATE INDEX idx_support_tickets_user_id ON public.support_tickets(user_id);
CREATE INDEX idx_support_tickets_company_id ON public.support_tickets(company_id);
CREATE INDEX idx_support_tickets_status ON public.support_tickets(status);
