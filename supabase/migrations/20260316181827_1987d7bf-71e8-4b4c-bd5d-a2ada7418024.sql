-- Fase 4B: Reativação Conversacional
-- Add interactive options fields to automation_reactivation_settings
ALTER TABLE public.automation_reactivation_settings 
  ADD COLUMN IF NOT EXISTS interactive_options_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS capture_window_hours integer NOT NULL DEFAULT 48,
  ADD COLUMN IF NOT EXISTS pause_days_on_analyzing integer NOT NULL DEFAULT 30,
  ADD COLUMN IF NOT EXISTS option_1_label text NOT NULL DEFAULT 'Ainda tenho interesse na festa',
  ADD COLUMN IF NOT EXISTS option_2_label text NOT NULL DEFAULT 'Quero ver os valores',
  ADD COLUMN IF NOT EXISTS option_3_label text NOT NULL DEFAULT 'Ainda estou analisando';

-- Add response tracking fields to lead_reactivation_history
ALTER TABLE public.lead_reactivation_history 
  ADD COLUMN IF NOT EXISTS option_selected integer,
  ADD COLUMN IF NOT EXISTS option_label text,
  ADD COLUMN IF NOT EXISTS selected_at timestamptz,
  ADD COLUMN IF NOT EXISTS action_executed text,
  ADD COLUMN IF NOT EXISTS is_interactive boolean NOT NULL DEFAULT false;

-- Index for quick lookup of pending reactivations awaiting response
CREATE INDEX IF NOT EXISTS idx_reactivation_history_pending_response 
  ON public.lead_reactivation_history (conversation_id, status, is_interactive) 
  WHERE status = 'sent' AND is_interactive = true;