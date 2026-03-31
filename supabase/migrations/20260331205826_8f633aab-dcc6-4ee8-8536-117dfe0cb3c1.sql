
INSERT INTO storage.buckets (id, name, public)
VALUES ('expense-receipts', 'expense-receipts', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Authenticated users can upload expense receipts"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'expense-receipts');

CREATE POLICY "Anyone can view expense receipts"
ON storage.objects FOR SELECT
USING (bucket_id = 'expense-receipts');

CREATE POLICY "Authenticated users can delete expense receipts"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'expense-receipts');
