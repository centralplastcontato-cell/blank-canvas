
-- Restrict onboarding-uploads to only allow image, video, and PDF file types
-- Drop existing permissive INSERT policy and replace with type-restricted one
DROP POLICY IF EXISTS "Anyone can upload onboarding files" ON storage.objects;
DROP POLICY IF EXISTS "Public upload to onboarding-uploads" ON storage.objects;

-- Find and drop any existing INSERT policies on onboarding-uploads
DO $$
DECLARE
  pol record;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies 
    WHERE tablename = 'objects' AND schemaname = 'storage'
    AND policyname ILIKE '%onboarding%' AND cmd = 'INSERT'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', pol.policyname);
  END LOOP;
END $$;

-- Create restricted upload policy: only images, videos, and PDFs
CREATE POLICY "Restricted upload to onboarding-uploads"
ON storage.objects
FOR INSERT
TO public
WITH CHECK (
  bucket_id = 'onboarding-uploads'
  AND (storage.extension(name) = ANY(ARRAY[
    'jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'heic', 'heif',
    'mp4', 'mov', 'avi', 'webm',
    'pdf'
  ]))
  AND (octet_length(decode('', 'base64')) >= 0) -- placeholder; size enforced by bucket config
);
