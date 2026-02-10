
-- Table for editable landing page content per company
CREATE TABLE public.company_landing_pages (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  
  -- Hero section
  hero jsonb NOT NULL DEFAULT '{
    "title": "",
    "subtitle": "",
    "cta_text": "Quero fazer minha festa!",
    "background_image_url": null
  }'::jsonb,
  
  -- Video section
  video jsonb NOT NULL DEFAULT '{
    "enabled": true,
    "title": "Conheça nosso espaço",
    "video_url": null,
    "video_type": "youtube"
  }'::jsonb,
  
  -- Gallery section
  gallery jsonb NOT NULL DEFAULT '{
    "enabled": true,
    "title": "Galeria de Fotos",
    "photos": []
  }'::jsonb,
  
  -- Testimonials section
  testimonials jsonb NOT NULL DEFAULT '{
    "enabled": true,
    "title": "O que nossos clientes dizem",
    "items": []
  }'::jsonb,
  
  -- Offer section
  offer jsonb NOT NULL DEFAULT '{
    "enabled": true,
    "title": "Oferta Especial",
    "description": "",
    "highlight_text": "",
    "cta_text": "Aproveitar agora!"
  }'::jsonb,
  
  -- Theme / visual customization
  theme jsonb NOT NULL DEFAULT '{
    "primary_color": "#7c3aed",
    "secondary_color": "#f59e0b",
    "background_color": "#0f0d15",
    "text_color": "#ffffff",
    "font_heading": "Inter",
    "font_body": "Inter",
    "button_style": "rounded"
  }'::jsonb,
  
  -- Footer
  footer jsonb NOT NULL DEFAULT '{
    "show_address": true,
    "show_phone": true,
    "show_instagram": true,
    "custom_text": ""
  }'::jsonb,
  
  is_published boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  
  UNIQUE(company_id)
);

-- Enable RLS
ALTER TABLE public.company_landing_pages ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Admins can manage all landing pages"
  ON public.company_landing_pages FOR ALL
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Company admins can manage own landing page"
  ON public.company_landing_pages FOR ALL
  USING (
    company_id = ANY(get_user_company_ids(auth.uid()))
    AND EXISTS (
      SELECT 1 FROM user_companies uc
      WHERE uc.user_id = auth.uid()
        AND uc.company_id = company_landing_pages.company_id
        AND uc.role IN ('owner', 'admin')
    )
  )
  WITH CHECK (
    company_id = ANY(get_user_company_ids(auth.uid()))
    AND EXISTS (
      SELECT 1 FROM user_companies uc
      WHERE uc.user_id = auth.uid()
        AND uc.company_id = company_landing_pages.company_id
        AND uc.role IN ('owner', 'admin')
    )
  );

-- Public read for published LPs (visitors need to see them)
CREATE POLICY "Anyone can view published landing pages"
  ON public.company_landing_pages FOR SELECT
  USING (is_published = true);

-- Trigger for updated_at
CREATE TRIGGER update_company_landing_pages_updated_at
  BEFORE UPDATE ON public.company_landing_pages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Storage bucket for LP images
INSERT INTO storage.buckets (id, name, public) VALUES ('landing-pages', 'landing-pages', true);

-- Storage policies
CREATE POLICY "Anyone can view landing page images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'landing-pages');

CREATE POLICY "Admins can upload landing page images"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'landing-pages'
    AND (is_admin(auth.uid()) OR auth.uid() IS NOT NULL)
  );

CREATE POLICY "Admins can update landing page images"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'landing-pages'
    AND (is_admin(auth.uid()) OR auth.uid() IS NOT NULL)
  );

CREATE POLICY "Admins can delete landing page images"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'landing-pages'
    AND (is_admin(auth.uid()) OR auth.uid() IS NOT NULL)
  );
