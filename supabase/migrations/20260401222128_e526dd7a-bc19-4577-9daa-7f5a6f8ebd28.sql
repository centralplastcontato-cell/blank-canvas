
-- Create backup_logs table
CREATE TABLE public.backup_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  backup_type TEXT NOT NULL DEFAULT 'full',
  file_url TEXT,
  file_name TEXT,
  file_size_bytes BIGINT,
  status TEXT NOT NULL DEFAULT 'pending',
  records_count JSONB,
  error_message TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.backup_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view backups of their companies"
ON public.backup_logs FOR SELECT TO authenticated
USING (
  company_id = ANY(public.get_user_company_ids(auth.uid()))
  OR public.is_admin(auth.uid())
);

CREATE INDEX idx_backup_logs_company ON public.backup_logs(company_id);
CREATE INDEX idx_backup_logs_created ON public.backup_logs(created_at DESC);

-- Create private storage bucket for backups
INSERT INTO storage.buckets (id, name, public) VALUES ('data-backups', 'data-backups', false);

CREATE POLICY "Users can download their company backups"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'data-backups'
  AND (storage.foldername(name))[1] = ANY(
    SELECT id::text FROM public.companies 
    WHERE id = ANY(public.get_user_company_ids(auth.uid()))
  )
);

CREATE POLICY "Service role can upload backups"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'data-backups');
