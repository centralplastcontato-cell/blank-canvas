-- Tabela para materiais de vendas por unidade
CREATE TABLE public.sales_materials (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  unit TEXT NOT NULL CHECK (unit IN ('Manchester', 'Trujillo')),
  type TEXT NOT NULL CHECK (type IN ('pdf_package', 'photo', 'video')),
  name TEXT NOT NULL,
  guest_count INTEGER, -- Apenas para pdf_package
  file_url TEXT NOT NULL,
  file_path TEXT, -- Caminho no storage para gerenciamento
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Índices para performance
CREATE INDEX idx_sales_materials_unit ON public.sales_materials(unit);
CREATE INDEX idx_sales_materials_type ON public.sales_materials(type);
CREATE INDEX idx_sales_materials_active ON public.sales_materials(is_active);

-- Trigger para updated_at
CREATE TRIGGER update_sales_materials_updated_at
  BEFORE UPDATE ON public.sales_materials
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS
ALTER TABLE public.sales_materials ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Admins can manage sales materials"
  ON public.sales_materials
  FOR ALL
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Users with config permission can manage sales materials"
  ON public.sales_materials
  FOR ALL
  USING (
    auth.uid() IS NOT NULL AND 
    (is_admin(auth.uid()) OR has_permission(auth.uid(), 'config.whatsapp.messages'))
  )
  WITH CHECK (
    auth.uid() IS NOT NULL AND 
    (is_admin(auth.uid()) OR has_permission(auth.uid(), 'config.whatsapp.messages'))
  );

CREATE POLICY "Authenticated users can view active sales materials"
  ON public.sales_materials
  FOR SELECT
  USING (auth.uid() IS NOT NULL AND is_active = true);

-- Bucket para armazenar os materiais
INSERT INTO storage.buckets (id, name, public)
VALUES ('sales-materials', 'sales-materials', true)
ON CONFLICT (id) DO NOTHING;

-- Política de acesso público para leitura
CREATE POLICY "Public read access for sales materials"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'sales-materials');

-- Política para upload por usuários autenticados com permissão
CREATE POLICY "Authenticated users can upload sales materials"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'sales-materials' AND 
    auth.uid() IS NOT NULL AND
    (is_admin(auth.uid()) OR has_permission(auth.uid(), 'config.whatsapp.messages'))
  );

-- Política para delete por usuários autenticados com permissão
CREATE POLICY "Authenticated users can delete sales materials"
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'sales-materials' AND 
    auth.uid() IS NOT NULL AND
    (is_admin(auth.uid()) OR has_permission(auth.uid(), 'config.whatsapp.messages'))
  );