
UPDATE public.company_landing_pages
SET gallery = jsonb_build_object(
  'enabled', true,
  'title', 'Conheça Nosso Espaço',
  'subtitle', 'Um ambiente mágico preparado para encantar crianças e adultos',
  'photos', (
    SELECT jsonb_agg(url)
    FROM (
      SELECT unnest(photo_urls) AS url
      FROM public.sales_materials
      WHERE id = '9ba13d56-d4dd-49aa-857a-9b108e3f2aa7'
    ) sub
  )
),
updated_at = now()
WHERE company_id = '84f6a011-a1e1-4a2a-96f6-38da92a319ce';
