-- Add photo_urls array column to sales_materials for photo collections
ALTER TABLE public.sales_materials 
ADD COLUMN IF NOT EXISTS photo_urls TEXT[] DEFAULT '{}';

-- Add a comment explaining the column
COMMENT ON COLUMN public.sales_materials.photo_urls IS 'Array of photo URLs for collections (type = photo_collection), max 10 photos';
