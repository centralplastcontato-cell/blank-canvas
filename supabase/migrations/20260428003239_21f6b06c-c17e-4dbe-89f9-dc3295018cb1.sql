INSERT INTO public.lp_bot_settings (company_id, venue_question_enabled)
VALUES ('b81fca0b-6cd8-41c6-9cad-9590f1ed5f39', true)
ON CONFLICT (company_id) DO UPDATE SET venue_question_enabled = true;