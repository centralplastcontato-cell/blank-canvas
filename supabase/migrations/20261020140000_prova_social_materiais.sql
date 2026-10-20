-- Materiais: novo tipo "Prova social" (até 4 avaliações; 1 por cliente, em rodízio)
ALTER TABLE public.sales_materials DROP CONSTRAINT IF EXISTS sales_materials_type_check;
ALTER TABLE public.sales_materials ADD CONSTRAINT sales_materials_type_check
  CHECK (type IN ('pdf_package', 'photo', 'video', 'photo_collection', 'social_proof'));
