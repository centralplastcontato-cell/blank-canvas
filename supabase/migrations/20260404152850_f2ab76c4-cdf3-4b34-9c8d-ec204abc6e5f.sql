UPDATE contract_models 
SET conteudo_template = REPLACE(
  conteudo_template,
  E'****BRINDE: {{brindes}}\n**',
  E'****BRINDE: {{brindes}}\n\nOPCIONAIS: {{opcionais}}\n**'
),
updated_at = now()
WHERE id = '3cc6428e-6b52-44b6-8719-cc350ef0d374'