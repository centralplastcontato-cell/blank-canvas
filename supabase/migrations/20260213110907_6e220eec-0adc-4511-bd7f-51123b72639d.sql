
-- Etapa 1: Tabela de snapshots
CREATE TABLE public.lead_score_snapshots (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL,
  company_id uuid NOT NULL,
  score integer NOT NULL,
  temperature text NOT NULL,
  snapshot_date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (id),
  UNIQUE (lead_id, snapshot_date)
);

CREATE INDEX idx_score_snapshots_company_date 
  ON public.lead_score_snapshots (company_id, snapshot_date);
CREATE INDEX idx_score_snapshots_lead 
  ON public.lead_score_snapshots (lead_id, snapshot_date);

ALTER TABLE public.lead_score_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view snapshots from their companies"
  ON public.lead_score_snapshots FOR SELECT
  USING (company_id = ANY(get_user_company_ids(auth.uid())) OR is_admin(auth.uid()));

CREATE POLICY "System can insert snapshots"
  ON public.lead_score_snapshots FOR INSERT
  WITH CHECK (true);

-- Etapa 2: Trigger automático
CREATE OR REPLACE FUNCTION public.fn_snapshot_score()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public' AS $$
BEGIN
  INSERT INTO public.lead_score_snapshots (lead_id, company_id, score, temperature, snapshot_date)
  VALUES (NEW.lead_id, NEW.company_id, NEW.score, NEW.temperature, CURRENT_DATE)
  ON CONFLICT (lead_id, snapshot_date)
  DO UPDATE SET score = EXCLUDED.score, temperature = EXCLUDED.temperature;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_snapshot_score
  AFTER INSERT OR UPDATE ON public.lead_intelligence
  FOR EACH ROW EXECUTE FUNCTION public.fn_snapshot_score();

-- Etapa 3: Seed inicial
INSERT INTO public.lead_score_snapshots (lead_id, company_id, score, temperature, snapshot_date)
SELECT lead_id, company_id, score, temperature, CURRENT_DATE
FROM public.lead_intelligence
ON CONFLICT (lead_id, snapshot_date) DO NOTHING;
