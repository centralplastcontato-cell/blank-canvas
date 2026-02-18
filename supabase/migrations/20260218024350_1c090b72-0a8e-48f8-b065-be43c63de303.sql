
-- Add view_count column to freelancer_templates
ALTER TABLE public.freelancer_templates ADD COLUMN view_count integer NOT NULL DEFAULT 0;

-- Create RPC to increment view count (callable by anon)
CREATE OR REPLACE FUNCTION public.increment_freelancer_template_views(_template_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE freelancer_templates SET view_count = view_count + 1 WHERE id = _template_id;
END;
$$;
