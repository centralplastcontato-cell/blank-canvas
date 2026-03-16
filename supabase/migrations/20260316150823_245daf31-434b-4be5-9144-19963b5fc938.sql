UPDATE public.permission_definitions
SET category = 'Agenda'
WHERE lower(category) = 'agenda' AND category != 'Agenda';