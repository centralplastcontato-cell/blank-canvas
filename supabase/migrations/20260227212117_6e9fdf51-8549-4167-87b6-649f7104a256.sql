
CREATE TABLE public.password_reset_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  target_user_id uuid NOT NULL,
  target_user_name text,
  target_user_email text,
  reset_by_user_id uuid NOT NULL,
  reset_by_user_name text,
  company_id uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.password_reset_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view password reset logs"
ON public.password_reset_logs
FOR SELECT
TO authenticated
USING (is_admin(auth.uid()));

CREATE POLICY "Service can insert password reset logs"
ON public.password_reset_logs
FOR INSERT
WITH CHECK (true);
