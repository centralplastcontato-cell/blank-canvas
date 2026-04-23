
DROP FUNCTION IF EXISTS public.get_event_public_info(uuid);

CREATE OR REPLACE FUNCTION public.get_event_public_info(_event_id uuid)
 RETURNS TABLE(
   id uuid, title text, event_date date, company_id uuid,
   start_time text, end_time text, lead_id uuid, event_type text,
   package_name text, guest_count integer, status text, unit text,
   child_name text, child_age text, birthday_children jsonb,
   parent_names text, event_optionals jsonb, notes text
 )
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT ce.id, ce.title, ce.event_date, ce.company_id,
    ce.start_time, ce.end_time, ce.lead_id, ce.event_type,
    ce.package_name, ce.guest_count, ce.status, ce.unit,
    ce.child_name, ce.child_age, ce.birthday_children,
    ce.parent_names, ce.event_optionals, ce.notes
  FROM public.company_events ce
  WHERE ce.id = _event_id
  LIMIT 1;
$function$;
