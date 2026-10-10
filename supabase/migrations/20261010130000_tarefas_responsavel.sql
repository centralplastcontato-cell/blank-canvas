-- Tarefas: aviso "📋 Tarefa atribuída a você" para o responsável.
--
-- O gatilho antigo comparava texto com uuid (uc.user_id::text = NEW.assigned_to)
-- e dava erro ao trocar o responsável de uma tarefa. Ninguém via porque a tela não
-- tinha o campo; agora tem. Também passa a avisar quando a tarefa já é criada com
-- responsável.
--
-- Não avisa:
--   - quem colocou a si mesmo como responsável;
--   - as repetições que o sistema cria sozinho (o aviso "vence amanhã" cobre essas);
--   - pessoa que não é da empresa.

CREATE OR REPLACE FUNCTION public.fn_notify_task_assigned()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.assigned_to IS NOT NULL
     AND NEW.parent_task_id IS NULL
     AND NEW.assigned_to IS DISTINCT FROM auth.uid()
     AND (TG_OP = 'INSERT' OR OLD.assigned_to IS DISTINCT FROM NEW.assigned_to) THEN
    INSERT INTO public.notifications (user_id, company_id, type, title, message, data)
    SELECT
      uc.user_id,
      NEW.company_id,
      'tarefa_atribuida',
      '📋 Tarefa atribuída a você',
      'Nova tarefa: ' || NEW.title,
      jsonb_build_object('task_id', NEW.id, 'task_title', NEW.title, 'due_date', NEW.due_date)
    FROM public.user_companies uc
    WHERE uc.user_id = NEW.assigned_to
      AND uc.company_id = NEW.company_id
    LIMIT 1;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_task_assigned ON public.company_tasks;
CREATE TRIGGER trg_notify_task_assigned
AFTER INSERT OR UPDATE OF assigned_to ON public.company_tasks
FOR EACH ROW
EXECUTE FUNCTION public.fn_notify_task_assigned();
