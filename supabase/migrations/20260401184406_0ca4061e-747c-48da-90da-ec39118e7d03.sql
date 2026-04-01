
INSERT INTO storage.buckets (id, name, public)
VALUES ('partner-products', 'partner-products', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Authenticated users can upload partner product images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'partner-products');

CREATE POLICY "Anyone can view partner product images"
ON storage.objects FOR SELECT
USING (bucket_id = 'partner-products');

CREATE POLICY "Authenticated users can update partner product images"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'partner-products');

CREATE POLICY "Authenticated users can delete partner product images"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'partner-products');
