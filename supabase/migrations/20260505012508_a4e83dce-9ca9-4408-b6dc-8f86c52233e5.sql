ALTER TABLE public.company_card_fees
ADD COLUMN IF NOT EXISTS prazo_recebimento_dias integer NOT NULL DEFAULT 30;