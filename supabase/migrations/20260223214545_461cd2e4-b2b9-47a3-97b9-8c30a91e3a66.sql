INSERT INTO storage.buckets (id, name, public) VALUES ('sales-materials', 'sales-materials', true) ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Anyone can read sales materials" ON storage.objects FOR SELECT USING (bucket_id = 'sales-materials');

CREATE POLICY "Authenticated users can upload sales materials" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'sales-materials' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update sales materials" ON storage.objects FOR UPDATE USING (bucket_id = 'sales-materials' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete sales materials" ON storage.objects FOR DELETE USING (bucket_id = 'sales-materials' AND auth.role() = 'authenticated');