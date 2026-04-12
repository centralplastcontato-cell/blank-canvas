
-- Create company_tasks table for internal task management
CREATE TABLE public.company_tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'outros',
  priority TEXT NOT NULL DEFAULT 'media',
  due_date DATE,
  due_time TEXT,
  completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMPTZ,
  assigned_to UUID,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.company_tasks ENABLE ROW LEVEL SECURITY;

-- RLS: Users can view tasks from their companies
CREATE POLICY "Users can view company tasks"
ON public.company_tasks
FOR SELECT
TO authenticated
USING (company_id = ANY(public.get_user_company_ids(auth.uid())));

-- RLS: Users can create tasks in their companies
CREATE POLICY "Users can create company tasks"
ON public.company_tasks
FOR INSERT
TO authenticated
WITH CHECK (company_id = ANY(public.get_user_company_ids(auth.uid())));

-- RLS: Users can update tasks in their companies
CREATE POLICY "Users can update company tasks"
ON public.company_tasks
FOR UPDATE
TO authenticated
USING (company_id = ANY(public.get_user_company_ids(auth.uid())));

-- RLS: Users can delete tasks in their companies
CREATE POLICY "Users can delete company tasks"
ON public.company_tasks
FOR DELETE
TO authenticated
USING (company_id = ANY(public.get_user_company_ids(auth.uid())));

-- Index for performance
CREATE INDEX idx_company_tasks_company_id ON public.company_tasks(company_id);
CREATE INDEX idx_company_tasks_due_date ON public.company_tasks(due_date);
CREATE INDEX idx_company_tasks_completed ON public.company_tasks(completed);

-- Auto-update updated_at
CREATE TRIGGER update_company_tasks_updated_at
BEFORE UPDATE ON public.company_tasks
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
