
CREATE TABLE public.campaign_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  image_url text NOT NULL,
  source text NOT NULL DEFAULT 'ai_compose',
  campaign_id uuid REFERENCES public.campaigns(id) ON DELETE SET NULL,
  campaign_name text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.campaign_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view images from their companies"
ON public.campaign_images FOR SELECT
TO authenticated
USING (public.user_has_company_access(auth.uid(), company_id));

CREATE POLICY "Users can insert images for their companies"
ON public.campaign_images FOR INSERT
TO authenticated
WITH CHECK (public.user_has_company_access(auth.uid(), company_id));

CREATE POLICY "Users can update images from their companies"
ON public.campaign_images FOR UPDATE
TO authenticated
USING (public.user_has_company_access(auth.uid(), company_id));

CREATE INDEX idx_campaign_images_company_id ON public.campaign_images(company_id);
CREATE INDEX idx_campaign_images_created_at ON public.campaign_images(created_at DESC);
