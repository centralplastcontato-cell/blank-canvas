
CREATE OR REPLACE FUNCTION public.fn_notify_new_support_ticket()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  admin_record RECORD;
  category_emoji TEXT;
  company_name TEXT;
  notif_title TEXT;
  notif_message TEXT;
BEGIN
  category_emoji := CASE NEW.category
    WHEN 'bug' THEN '🐛'
    WHEN 'sugestao' THEN '💡'
    WHEN 'duvida' THEN '❓'
    ELSE '📩'
  END;

  IF NEW.company_id IS NOT NULL THEN
    SELECT name INTO company_name FROM companies WHERE id = NEW.company_id;
  END IF;

  notif_title := category_emoji || ' Novo ticket: ' || LEFT(NEW.subject, 60);
  notif_message := COALESCE(NEW.user_name, 'Usuário') || ' — ' || COALESCE(company_name, 'Sem empresa');

  FOR admin_record IN
    SELECT ur.user_id
    FROM user_roles ur
    WHERE ur.role = 'admin'
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
$function$;
