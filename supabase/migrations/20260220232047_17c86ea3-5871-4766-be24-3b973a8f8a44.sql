
UPDATE company_landing_pages
SET
  hero = '{
    "title": "A Festa dos Sonhos do Seu Filho Começa Aqui!",
    "subtitle": "Espaço aconchegante para até 90 convidados, com atendimento personalizado e momentos que você nunca vai esquecer.",
    "cta_text": "Quero fazer a festa!",
    "background_image_url": "https://rsezgnkfhodltrsewlhz.supabase.co/storage/v1/object/public/onboarding-uploads/6bc204ae-1311-4c67-bb6b-9ab55dae9d11/photos/1771618696306.jpg",
    "background_images": [
      "https://rsezgnkfhodltrsewlhz.supabase.co/storage/v1/object/public/onboarding-uploads/6bc204ae-1311-4c67-bb6b-9ab55dae9d11/photos/1771618696306.jpg",
      "https://rsezgnkfhodltrsewlhz.supabase.co/storage/v1/object/public/onboarding-uploads/6bc204ae-1311-4c67-bb6b-9ab55dae9d11/photos/1771618697238.jpg"
    ]
  }'::jsonb,
  theme = '{
    "primary_color": "#1E3A8A",
    "secondary_color": "#FBBF24",
    "background_color": "#0A1628",
    "text_color": "#FFFFFF",
    "font_heading": "Fredoka One",
    "font_body": "Nunito",
    "button_style": "pill"
  }'::jsonb,
  gallery = '{
    "enabled": true,
    "title": "Nosso Espaço",
    "photos": [
      "https://rsezgnkfhodltrsewlhz.supabase.co/storage/v1/object/public/onboarding-uploads/6bc204ae-1311-4c67-bb6b-9ab55dae9d11/photos/1771618696306.jpg",
      "https://rsezgnkfhodltrsewlhz.supabase.co/storage/v1/object/public/onboarding-uploads/6bc204ae-1311-4c67-bb6b-9ab55dae9d11/photos/1771618697238.jpg",
      "https://rsezgnkfhodltrsewlhz.supabase.co/storage/v1/object/public/onboarding-uploads/6bc204ae-1311-4c67-bb6b-9ab55dae9d11/photos/1771618698659.jpg",
      "https://rsezgnkfhodltrsewlhz.supabase.co/storage/v1/object/public/onboarding-uploads/6bc204ae-1311-4c67-bb6b-9ab55dae9d11/photos/1771618699783.jpg",
      "https://rsezgnkfhodltrsewlhz.supabase.co/storage/v1/object/public/onboarding-uploads/6bc204ae-1311-4c67-bb6b-9ab55dae9d11/photos/1771618700704.jpg",
      "https://rsezgnkfhodltrsewlhz.supabase.co/storage/v1/object/public/onboarding-uploads/6bc204ae-1311-4c67-bb6b-9ab55dae9d11/photos/1771618701630.jpg",
      "https://rsezgnkfhodltrsewlhz.supabase.co/storage/v1/object/public/onboarding-uploads/6bc204ae-1311-4c67-bb6b-9ab55dae9d11/photos/1771618702758.jpg",
      "https://rsezgnkfhodltrsewlhz.supabase.co/storage/v1/object/public/onboarding-uploads/6bc204ae-1311-4c67-bb6b-9ab55dae9d11/photos/1771618704085.jpg",
      "https://rsezgnkfhodltrsewlhz.supabase.co/storage/v1/object/public/onboarding-uploads/6bc204ae-1311-4c67-bb6b-9ab55dae9d11/photos/1771618705413.jpg",
      "https://rsezgnkfhodltrsewlhz.supabase.co/storage/v1/object/public/onboarding-uploads/6bc204ae-1311-4c67-bb6b-9ab55dae9d11/photos/1771618706337.jpg"
    ]
  }'::jsonb,
  testimonials = '{
    "enabled": true,
    "title": "O Que as Famílias Dizem",
    "items": [
      {
        "name": "Camila R.",
        "text": "A Fernanda cuidou de cada detalhe da festa da minha filha. Desde o primeiro contato, me senti acolhida. A festa ficou perfeita e minha filha amou!",
        "rating": 5
      },
      {
        "name": "Thiago M.",
        "text": "Espaço super aconchegante e perfeito para festas menores. As crianças brincaram o tempo todo e nós, pais, ficamos tranquilos. Recomendo demais!",
        "rating": 5
      },
      {
        "name": "Juliana S.",
        "text": "Organização impecável! Tudo saiu como planejado, a equipe foi muito atenciosa e as crianças se divertiram muito. Já estou marcando a próxima festa lá!",
        "rating": 5
      }
    ]
  }'::jsonb,
  video = '{
    "enabled": true,
    "title": "Conheça o Planeta Divertido",
    "video_url": "https://rsezgnkfhodltrsewlhz.supabase.co/storage/v1/object/public/onboarding-uploads/6bc204ae-1311-4c67-bb6b-9ab55dae9d11/videos/1771618735052.mp4",
    "video_type": "upload"
  }'::jsonb,
  offer = '{
    "enabled": true,
    "title": "Garanta a Data da Festa do Seu Filho!",
    "description": "Datas esgotam rápido! Entre em contato agora e garanta condições especiais para sua festa.",
    "highlight_text": "Atendemos até 90 convidados!",
    "cta_text": "Quero garantir minha data!"
  }'::jsonb,
  footer = '{
    "show_instagram": true,
    "show_phone": true,
    "show_address": true,
    "custom_text": "Avenida Mazzei, 692 — São Paulo/SP"
  }'::jsonb,
  is_published = true,
  updated_at = now()
WHERE id = '19e28a5f-bb86-4e48-89a2-d48fde9ae8ad';
