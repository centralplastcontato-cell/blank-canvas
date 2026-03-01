
-- Table: campaigns
CREATE TABLE public.campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  created_by uuid NOT NULL,
  name text NOT NULL,
  description text,
  message_variations jsonb NOT NULL DEFAULT '[]'::jsonb,
  image_url text,
  filters jsonb DEFAULT '{}'::jsonb,
  delay_seconds integer NOT NULL DEFAULT 60,
  status text NOT NULL DEFAULT 'draft',
  total_recipients integer NOT NULL DEFAULT 0,
  sent_count integer NOT NULL DEFAULT 0,
  error_count integer NOT NULL DEFAULT 0,
  scheduled_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view campaigns of their companies"
  ON public.campaigns FOR SELECT
  USING (public.user_has_company_access(auth.uid(), company_id));

CREATE POLICY "Users can insert campaigns for their companies"
  ON public.campaigns FOR INSERT
  WITH CHECK (public.user_has_company_access(auth.uid(), company_id));

CREATE POLICY "Users can update campaigns of their companies"
  ON public.campaigns FOR UPDATE
  USING (public.user_has_company_access(auth.uid(), company_id));

CREATE POLICY "Users can delete campaigns of their companies"
  ON public.campaigns FOR DELETE
  USING (public.user_has_company_access(auth.uid(), company_id));

CREATE TRIGGER update_campaigns_updated_at
  BEFORE UPDATE ON public.campaigns
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Table: campaign_recipients
CREATE TABLE public.campaign_recipients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  lead_id uuid REFERENCES public.campaign_leads(id) ON DELETE SET NULL,
  phone text NOT NULL,
  lead_name text NOT NULL DEFAULT '',
  variation_index integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  error_message text,
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.campaign_recipients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view campaign_recipients via campaign"
  ON public.campaign_recipients FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.campaigns c
    WHERE c.id = campaign_id
      AND public.user_has_company_access(auth.uid(), c.company_id)
  ));

CREATE POLICY "Users can insert campaign_recipients via campaign"
  ON public.campaign_recipients FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.campaigns c
    WHERE c.id = campaign_id
      AND public.user_has_company_access(auth.uid(), c.company_id)
  ));

CREATE POLICY "Users can update campaign_recipients via campaign"
  ON public.campaign_recipients FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.campaigns c
    WHERE c.id = campaign_id
      AND public.user_has_company_access(auth.uid(), c.company_id)
  ));

-- Indexes
CREATE INDEX idx_campaigns_company_id ON public.campaigns(company_id);
CREATE INDEX idx_campaigns_status ON public.campaigns(status);
CREATE INDEX idx_campaign_recipients_campaign_id ON public.campaign_recipients(campaign_id);
CREATE INDEX idx_campaign_recipients_status ON public.campaign_recipients(status);
