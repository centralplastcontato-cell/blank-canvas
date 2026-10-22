-- Usuários (22/10): tira da tela de permissões as que nenhuma parte do sistema
-- confere (o dono desligava achando que bloqueava, e não bloqueava nada) e as de
-- telas que saíram (Avançado, VIP, Fluxos). Só esconde: nada é apagado, e as
-- permissões já dadas continuam guardadas.
UPDATE public.permission_definitions
SET is_active = false
WHERE code IN (
  'agenda.view', 'agenda.manage',
  'b2b.view', 'b2b.leads.manage', 'b2b.proposals.create', 'b2b.proposals.edit',
  'campanhas.view', 'campanhas.create', 'campanhas.send', 'campanhas.gallery',
  'config.bot', 'config.templates', 'config.materials', 'config.vip', 'config.connection',
  'config.whatsapp.advanced',
  'dashboard.view', 'dashboard.metrics',
  'parceiro.view', 'parceiro.catalogo', 'parceiro.pedidos',
  'treinamento.view',
  'visitas.view', 'visitas.manage',
  'whatsapp.view',
  'flowbuilder.manage'
);
