
-- Create storage bucket for onboarding uploads
INSERT INTO storage.buckets (id, name, public) VALUES ('onboarding-uploads', 'onboarding-uploads', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for onboarding uploads (public read, anyone can upload)
CREATE POLICY "Anyone can upload onboarding files"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'onboarding-uploads');

CREATE POLICY "Anyone can view onboarding files"
ON storage.objects FOR SELECT
USING (bucket_id = 'onboarding-uploads');

-- Create the onboarding table
CREATE TABLE public.company_onboarding (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pendente',
  current_step INTEGER NOT NULL DEFAULT 1,

  -- Step 1: Identity
  buffet_name TEXT,
  city TEXT,
  state TEXT,
  full_address TEXT,
  instagram TEXT,
  website TEXT,

  -- Step 2: Contact
  contact_name TEXT,
  contact_role TEXT,
  contact_phone TEXT,
  contact_email TEXT,
  secondary_contact TEXT,

  -- Step 3: Operation
  lead_volume TEXT,
  lead_sources TEXT[],
  current_service_method TEXT,

  -- Step 4: Paid traffic
  uses_paid_traffic BOOLEAN,
  monthly_investment TEXT,
  cost_per_lead TEXT,
  current_agency TEXT,

  -- Step 5: WhatsApp
  whatsapp_numbers TEXT[],
  attendants_count INTEGER,
  service_hours TEXT,
  multiple_units BOOLEAN DEFAULT false,

  -- Step 6: Brand
  logo_url TEXT,
  photo_urls TEXT[] DEFAULT '{}',
  video_urls TEXT[] DEFAULT '{}',
  brand_notes TEXT,

  -- Step 7: Goals
  main_goal TEXT,
  additional_notes TEXT,

  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.company_onboarding ENABLE ROW LEVEL SECURITY;

-- Anyone can insert (public form via slug)
CREATE POLICY "Anyone can insert onboarding"
ON public.company_onboarding FOR INSERT
WITH CHECK (true);

-- Anyone can update their onboarding (for saving progress)
CREATE POLICY "Anyone can update onboarding"
ON public.company_onboarding FOR UPDATE
USING (true);

-- Hub admins can view all onboardings
CREATE POLICY "Admins can view onboardings"
ON public.company_onboarding FOR SELECT
USING (is_admin(auth.uid()) OR (company_id = ANY(get_user_company_ids(auth.uid()))));

-- Hub admins can delete onboardings
CREATE POLICY "Admins can delete onboardings"
ON public.company_onboarding FOR DELETE
USING (is_admin(auth.uid()));

-- Trigger for updated_at
CREATE TRIGGER update_company_onboarding_updated_at
BEFORE UPDATE ON public.company_onboarding
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
