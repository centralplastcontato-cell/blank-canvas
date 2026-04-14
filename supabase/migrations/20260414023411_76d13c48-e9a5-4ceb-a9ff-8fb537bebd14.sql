-- Create event_task_templates table
CREATE TABLE public.event_task_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.event_task_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view own company templates"
ON public.event_task_templates FOR SELECT
TO authenticated
USING (company_id = ANY(public.get_user_company_ids(auth.uid())));

CREATE POLICY "Members can create templates for own company"
ON public.event_task_templates FOR INSERT
TO authenticated
WITH CHECK (company_id = ANY(public.get_user_company_ids(auth.uid())));

CREATE POLICY "Members can update own company templates"
ON public.event_task_templates FOR UPDATE
TO authenticated
USING (company_id = ANY(public.get_user_company_ids(auth.uid())));

CREATE POLICY "Members can delete own company templates"
ON public.event_task_templates FOR DELETE
TO authenticated
USING (company_id = ANY(public.get_user_company_ids(auth.uid())));

CREATE TRIGGER update_event_task_templates_updated_at
BEFORE UPDATE ON public.event_task_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger for task assignment notifications
CREATE OR REPLACE FUNCTION public.fn_notify_task_assigned()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.assigned_to IS DISTINCT FROM NEW.assigned_to AND NEW.assigned_to IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, company_id, type, title, message, data)
    SELECT
      uc.user_id,
      NEW.company_id,
      'tarefa_atribuida',
      '📋 Tarefa atribuída a você',
      'Nova tarefa: ' || NEW.title,
      jsonb_build_object('task_id', NEW.id, 'task_title', NEW.title)
    FROM public.user_companies uc
    WHERE uc.user_id::text = NEW.assigned_to
    LIMIT 1;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_task_assigned
AFTER UPDATE ON public.company_tasks
FOR EACH ROW
EXECUTE FUNCTION public.fn_notify_task_assigned();