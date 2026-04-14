
-- Add recurrence fields to company_tasks
ALTER TABLE public.company_tasks
  ADD COLUMN IF NOT EXISTS recurrence_type text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS recurrence_interval integer DEFAULT 1,
  ADD COLUMN IF NOT EXISTS recurrence_days integer[] DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS recurrence_end_date date DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS parent_task_id uuid DEFAULT NULL REFERENCES public.company_tasks(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS is_recurring boolean DEFAULT false;

-- Index for finding child tasks of a parent
CREATE INDEX IF NOT EXISTS idx_company_tasks_parent_id ON public.company_tasks(parent_task_id);

-- Index for finding recurring tasks
CREATE INDEX IF NOT EXISTS idx_company_tasks_recurring ON public.company_tasks(is_recurring) WHERE is_recurring = true;
