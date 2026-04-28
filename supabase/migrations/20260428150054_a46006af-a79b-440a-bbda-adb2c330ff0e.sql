UPDATE lp_bot_settings
SET 
  welcome_message = replace(welcome_message, '\n', E'\n'),
  completion_message = replace(completion_message, '\n', E'\n')
WHERE company_id = (SELECT id FROM companies WHERE slug = 'espaco-carrossel');