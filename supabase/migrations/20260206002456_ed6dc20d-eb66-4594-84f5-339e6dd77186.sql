-- Drop existing check constraint for type column and add photo_collection as valid type
ALTER TABLE public.sales_materials DROP CONSTRAINT IF EXISTS sales_materials_type_check;

-- Add new check constraint that includes photo_collection
ALTER TABLE public.sales_materials ADD CONSTRAINT sales_materials_type_check 
  CHECK (type IN ('pdf_package', 'photo', 'video', 'photo_collection'));