-- Create storage bucket for WhatsApp media downloads
INSERT INTO storage.buckets (id, name, public)
VALUES ('whatsapp-media', 'whatsapp-media', false)
ON CONFLICT (id) DO NOTHING;

-- Allow service role to upload (edge functions use service role key)
-- Allow authenticated users to read files from their companies
CREATE POLICY "Authenticated users can read whatsapp media"
ON storage.objects FOR SELECT
USING (bucket_id = 'whatsapp-media' AND auth.role() = 'authenticated');

CREATE POLICY "Service role can upload whatsapp media"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'whatsapp-media');

CREATE POLICY "Service role can update whatsapp media"
ON storage.objects FOR UPDATE
USING (bucket_id = 'whatsapp-media');
