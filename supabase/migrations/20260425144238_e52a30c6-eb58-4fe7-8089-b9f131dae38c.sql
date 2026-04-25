ALTER TABLE public.prefesta_responses
  DROP CONSTRAINT IF EXISTS prefesta_responses_event_id_fkey;

ALTER TABLE public.prefesta_responses
  ADD CONSTRAINT prefesta_responses_event_id_fkey
  FOREIGN KEY (event_id) REFERENCES public.company_events(id) ON DELETE SET NULL;