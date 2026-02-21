
UPDATE company_landing_pages 
SET testimonials = jsonb_set(
  testimonials, 
  '{items,0,text}', 
  '"Cada detalhe da festa da minha filha foi pensado com muito carinho. Desde o primeiro contato, me senti acolhida. A festa ficou perfeita e minha filha amou!"'
)
WHERE id = '19e28a5f-bb86-4e48-89a2-d48fde9ae8ad';
