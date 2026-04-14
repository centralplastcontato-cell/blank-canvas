-- Add status column to company_tasks
ALTER TABLE public.company_tasks 
ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pendente';

-- Sync existing data: completed tasks get 'concluida'
UPDATE public.company_tasks SET status = 'concluida' WHERE completed = true;
UPDATE public.company_tasks SET status = 'pendente' WHERE completed = false;

-- Create trigger to keep completed in sync with status
CREATE OR REPLACE FUNCTION public.sync_task_status_completed()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'concluida' THEN
    NEW.completed := true;
    IF OLD.status != 'concluida' THEN
      NEW.completed_at := now();
    END IF;
  ELSE
    NEW.completed := false;
    NEW.completed_at := NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_sync_task_status
BEFORE INSERT OR UPDATE OF status ON public.company_tasks
FOR EACH ROW
EXECUTE FUNCTION public.sync_task_status_completed();

-- Index for filtering overdue tasks efficiently
CREATE INDEX IF NOT EXISTS idx_company_tasks_status_due ON public.company_tasks (company_id, status, due_date) WHERE status != 'concluida';