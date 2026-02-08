-- Create table for bot qualification questions
CREATE TABLE public.wapi_bot_questions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  instance_id uuid NOT NULL REFERENCES public.wapi_instances(id) ON DELETE CASCADE,
  step text NOT NULL,
  question_text text NOT NULL,
  confirmation_text text,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(instance_id, step)
);

-- Enable RLS
ALTER TABLE public.wapi_bot_questions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admins can manage bot questions"
  ON public.wapi_bot_questions
  FOR ALL
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Users with automation permission can view bot questions"
  ON public.wapi_bot_questions
  FOR SELECT
  USING (
    auth.uid() IS NOT NULL AND (
      is_admin(auth.uid()) OR 
      has_permission(auth.uid(), 'config.whatsapp.automations')
    )
  );

CREATE POLICY "Users with automation permission can update bot questions"
  ON public.wapi_bot_questions
  FOR UPDATE
  USING (
    auth.uid() IS NOT NULL AND (
      is_admin(auth.uid()) OR 
      has_permission(auth.uid(), 'config.whatsapp.automations')
    )
  );

-- Create trigger for updated_at
CREATE TRIGGER update_wapi_bot_questions_updated_at
  BEFORE UPDATE ON public.wapi_bot_questions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();