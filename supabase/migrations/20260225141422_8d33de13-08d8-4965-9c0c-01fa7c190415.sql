UPDATE companies
SET
  custom_domain = 'aventurakids.online',
  settings = '{"enabled_modules":{"whatsapp":true,"crm":true,"dashboard":true,"sales_materials":true,"config":true,"automations":true,"data_import":true,"advanced":true,"messages":true,"comercial_b2b":true,"flow_builder":true,"inteligencia":true,"agenda":true,"operacoes":true},"party_control_modules":{"checklist":true,"staff":true,"maintenance":true,"monitoring":true,"attendance":true,"info":true,"prefesta":true,"cardapio":true,"avaliacao":true},"ai_enabled":true}'::jsonb
WHERE id = 'eb1776f0-142e-41db-9134-7d352d02c5bd';