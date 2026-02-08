-- Create storage bucket for WhatsApp media
INSERT INTO storage.buckets (id, name, public) 
VALUES ('whatsapp-media', 'whatsapp-media', true)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for whatsapp-media bucket
-- Allow authenticated users to view media
CREATE POLICY "Authenticated users can view whatsapp media"
ON storage.objects FOR SELECT
USING (bucket_id = 'whatsapp-media' AND auth.uid() IS NOT NULL);

-- Allow authenticated users to upload media
CREATE POLICY "Authenticated users can upload whatsapp media"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'whatsapp-media' AND auth.uid() IS NOT NULL);

-- Allow users to delete their own uploaded media
CREATE POLICY "Users can delete their own whatsapp media"
ON storage.objects FOR DELETE
USING (bucket_id = 'whatsapp-media' AND auth.uid() IS NOT NULL);