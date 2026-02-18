
INSERT INTO public.permission_definitions (code, name, description, category, sort_order, is_active)
VALUES
  ('operacoes.view', 'Acessar Operações', 'Permite acessar a seção de Operações', 'Operações', 1, true),
  ('operacoes.formularios', 'Formulários', 'Acesso às sub-abas de formulários (Avaliações, Pré-Festa, Contrato, Cardápio)', 'Operações', 2, true),
  ('operacoes.checklist', 'Checklist', 'Acesso à aba Checklist (Equipe, Manutenção, Acompanhamento, Presença, Informações)', 'Operações', 3, true),
  ('operacoes.pacotes', 'Pacotes', 'Acesso à aba Pacotes', 'Operações', 4, true),
  ('operacoes.freelancer', 'Freelancer', 'Acesso à aba Freelancer (Cadastro)', 'Operações', 5, true),
  ('operacoes.avaliacoes', 'Avaliações Freelancer', 'Acesso às avaliações de freelancers', 'Operações', 6, true);
