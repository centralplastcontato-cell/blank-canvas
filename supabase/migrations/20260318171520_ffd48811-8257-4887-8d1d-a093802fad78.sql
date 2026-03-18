
-- 1. Add payment_details JSONB column to company_events
ALTER TABLE public.company_events ADD COLUMN IF NOT EXISTS payment_details jsonb DEFAULT NULL;

-- 2. Create client_data_requests table
CREATE TABLE public.client_data_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  event_id uuid NOT NULL REFERENCES public.company_events(id) ON DELETE CASCADE,
  lead_id uuid REFERENCES public.campaign_leads(id) ON DELETE SET NULL,
  token text UNIQUE NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  client_data jsonb DEFAULT NULL,
  sent_at timestamptz DEFAULT NULL,
  completed_at timestamptz DEFAULT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 3. RLS on client_data_requests
ALTER TABLE public.client_data_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their company client data requests"
  ON public.client_data_requests
  FOR SELECT TO authenticated
  USING (company_id = ANY(public.get_user_company_ids(auth.uid())));

CREATE POLICY "Users can insert client data requests for their company"
  ON public.client_data_requests
  FOR INSERT TO authenticated
  WITH CHECK (company_id = ANY(public.get_user_company_ids(auth.uid())));

CREATE POLICY "Users can update their company client data requests"
  ON public.client_data_requests
  FOR UPDATE TO authenticated
  USING (company_id = ANY(public.get_user_company_ids(auth.uid())));

-- 4. RPC: get client data request by token (public access)
CREATE OR REPLACE FUNCTION public.get_client_data_request_by_token(_token text)
RETURNS TABLE(
  id uuid,
  company_id uuid,
  event_id uuid,
  status text,
  company_name text,
  company_logo text,
  event_title text,
  event_date date
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    cdr.id,
    cdr.company_id,
    cdr.event_id,
    cdr.status,
    c.name AS company_name,
    c.logo_url AS company_logo,
    ce.title AS event_title,
    ce.event_date
  FROM public.client_data_requests cdr
  JOIN public.companies c ON c.id = cdr.company_id
  JOIN public.company_events ce ON ce.id = cdr.event_id
  WHERE cdr.token = _token
  LIMIT 1;
$$;

-- 5. RPC: submit client data (public access)
CREATE OR REPLACE FUNCTION public.submit_client_data_public(_token text, _client_data jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.client_data_requests
  SET client_data = _client_data,
      status = 'completed',
      completed_at = now()
  WHERE token = _token
    AND status IN ('pending', 'sent');

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Token inválido ou solicitação já processada';
  END IF;
END;
$$;

-- 6. Index for token lookups
CREATE INDEX idx_client_data_requests_token ON public.client_data_requests(token);
CREATE INDEX idx_client_data_requests_event_id ON public.client_data_requests(event_id);
