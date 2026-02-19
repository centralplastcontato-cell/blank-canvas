
-- Create storage bucket for event info attachments
INSERT INTO storage.buckets (id, name, public)
VALUES ('event-info-attachments', 'event-info-attachments', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload
CREATE POLICY "Authenticated users can upload event info attachments"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'event-info-attachments' AND auth.role() = 'authenticated');

-- Allow public read access
CREATE POLICY "Public read access for event info attachments"
ON storage.objects FOR SELECT
USING (bucket_id = 'event-info-attachments');

-- Allow authenticated users to delete their uploads
CREATE POLICY "Authenticated users can delete event info attachments"
ON storage.objects FOR DELETE
USING (bucket_id = 'event-info-attachments' AND auth.role() = 'authenticated');
