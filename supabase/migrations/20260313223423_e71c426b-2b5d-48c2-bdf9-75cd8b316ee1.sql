
-- Add photo_url column to hub_recruitment_responses
ALTER TABLE public.hub_recruitment_responses ADD COLUMN IF NOT EXISTS photo_url TEXT;

-- Create recruitment-photos storage bucket (public)
INSERT INTO storage.buckets (id, name, public)
VALUES ('recruitment-photos', 'recruitment-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Allow anonymous uploads to recruitment-photos
CREATE POLICY "Anyone can upload recruitment photos"
ON storage.objects FOR INSERT
TO anon, authenticated
WITH CHECK (bucket_id = 'recruitment-photos');

-- Allow public read access
CREATE POLICY "Anyone can view recruitment photos"
ON storage.objects FOR SELECT
TO anon, authenticated
USING (bucket_id = 'recruitment-photos');
