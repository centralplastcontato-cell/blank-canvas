
-- Table for training lessons
CREATE TABLE public.training_lessons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  video_url text NOT NULL,
  thumbnail_url text,
  category text DEFAULT 'Geral',
  sort_order integer DEFAULT 0,
  is_published boolean DEFAULT false,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.training_lessons ENABLE ROW LEVEL SECURITY;

-- Admins can do everything
CREATE POLICY "Admins can manage training lessons"
ON public.training_lessons FOR ALL
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

-- Authenticated users can view published lessons
CREATE POLICY "Authenticated users can view published lessons"
ON public.training_lessons FOR SELECT
USING (auth.role() = 'authenticated' AND is_published = true);

-- Storage bucket for training videos
INSERT INTO storage.buckets (id, name, public)
VALUES ('training-videos', 'training-videos', true);

-- Storage policies
CREATE POLICY "Anyone can view training videos"
ON storage.objects FOR SELECT
USING (bucket_id = 'training-videos');

CREATE POLICY "Admins can upload training videos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'training-videos' AND is_admin(auth.uid()));

CREATE POLICY "Admins can update training videos"
ON storage.objects FOR UPDATE
USING (bucket_id = 'training-videos' AND is_admin(auth.uid()));

CREATE POLICY "Admins can delete training videos"
ON storage.objects FOR DELETE
USING (bucket_id = 'training-videos' AND is_admin(auth.uid()));

-- Updated_at trigger
CREATE TRIGGER update_training_lessons_updated_at
BEFORE UPDATE ON public.training_lessons
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
