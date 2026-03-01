
-- Trigger function to notify global admins when a new support ticket is created
CREATE OR REPLACE FUNCTION public.fn_notify_new_support_ticket()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_record RECORD;
  category_emoji TEXT;
  company_name TEXT;
  notif_title TEXT;
  notif_message TEXT;
BEGIN
  -- Get emoji by category
  category_emoji := CASE NEW.category
    WHEN 'bug' THEN '🐛'
    WHEN 'sugestao' THEN '💡'
    WHEN 'duvida' THEN '❓'
    ELSE '📩'
  END;

  -- Get company name if available
  IF NEW.company_id IS NOT NULL THEN
    SELECT name INTO company_name FROM companies WHERE id = NEW.company_id;
  END IF;

  notif_title := category_emoji || ' Novo ticket: ' || LEFT(NEW.subject, 60);
  notif_message := COALESCE(NEW.user_name, 'Usuário') || ' — ' || COALESCE(company_name, 'Sem empresa');

  -- Insert notification for each global admin
  FOR admin_record IN
    SELECT au.id AS user_id
    FROM auth.users au
    JOIN user_roles ur ON ur.user_id = au.id
    WHERE ur.is_admin = true
  LOOP
    INSERT INTO notifications (user_id, company_id, type, title, message, data)
    VALUES (
      admin_record.user_id,
      NEW.company_id,
      'new_support_ticket',
      notif_title,
      notif_message,
      jsonb_build_object(
        'ticket_id', NEW.id,
        'category', NEW.category,
        'priority', NEW.priority,
        'company_name', COALESCE(company_name, 'Sem empresa')
      )
    );
  END LOOP;

  RETURN NEW;
END;
$$;

-- Create trigger on support_tickets
DROP TRIGGER IF EXISTS trg_notify_new_support_ticket ON support_tickets;
CREATE TRIGGER trg_notify_new_support_ticket
  AFTER INSERT ON support_tickets
  FOR EACH ROW
  EXECUTE FUNCTION fn_notify_new_support_ticket();
