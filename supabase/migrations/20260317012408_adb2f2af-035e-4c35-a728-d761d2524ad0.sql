-- Add missing permission definitions for Visitas, Campanhas, Treinamento
INSERT INTO public.permission_definitions (code, name, description, category, is_active, sort_order) VALUES
  -- Visitas
  ('visitas.view', 'Ver Visitas', 'Permite visualizar a agenda de visitas', 'Visitas', true, 1),
  ('visitas.manage', 'Gerenciar Visitas', 'Permite criar, editar e cancelar visitas', 'Visitas', true, 2),
  -- Campanhas
  ('campanhas.view', 'Ver Campanhas', 'Permite visualizar campanhas de marketing', 'Campanhas', true, 1),
  ('campanhas.create', 'Criar Campanhas', 'Permite criar novas campanhas', 'Campanhas', true, 2),
  ('campanhas.send', 'Enviar Campanhas', 'Permite executar o envio de campanhas', 'Campanhas', true, 3),
  ('campanhas.gallery', 'Galeria de Imagens', 'Acesso à galeria de imagens de campanhas', 'Campanhas', true, 4),
  -- Treinamento
  ('treinamento.view', 'Ver Treinamento', 'Permite acessar o módulo de treinamento', 'Treinamento', true, 1)
ON CONFLICT DO NOTHING;