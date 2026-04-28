ALTER TABLE public.lp_bot_settings
  ADD COLUMN IF NOT EXISTS venue_question_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS venue_question_text text NOT NULL DEFAULT 'Onde você quer fazer a festa?',
  ADD COLUMN IF NOT EXISTS venue_options jsonb NOT NULL DEFAULT '[
    {"id":"interno","label":"No nosso espaço","emoji":"🏛️"},
    {"id":"externo","label":"Festa externa (em outro local)","emoji":"🌳"},
    {"id":"indeciso","label":"Ainda não decidi","emoji":"🤔"}
  ]'::jsonb,
  ADD COLUMN IF NOT EXISTS external_location_question text NOT NULL DEFAULT 'Perfeito! Em qual *bairro e cidade* será a festa? 📍',
  ADD COLUMN IF NOT EXISTS external_location_required boolean NOT NULL DEFAULT true;