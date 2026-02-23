-- Fix Planeta Divertido welcome_message (remove Castelo da Diversão reference)
UPDATE wapi_bot_settings
SET welcome_message = 'Olá! 👋 Bem-vindo ao Planeta Divertido! Para podermos te ajudar melhor, preciso de algumas informações.'
WHERE instance_id = 'ac422826-d1a9-40a6-8ce2-acc5a0c1cb64';

-- Reorder existing steps to make room for 'tipo' at sort_order=2
UPDATE wapi_bot_questions
SET sort_order = sort_order + 1
WHERE instance_id = 'ac422826-d1a9-40a6-8ce2-acc5a0c1cb64'
  AND sort_order >= 2;

-- Insert missing 'tipo' step
INSERT INTO wapi_bot_questions (instance_id, step, question_text, confirmation_text, sort_order, is_active)
VALUES (
  'ac422826-d1a9-40a6-8ce2-acc5a0c1cb64',
  'tipo',
  'Você já é nosso cliente ou gostaria de receber um orçamento? 😊

1️⃣ Já sou cliente
2️⃣ Quero um orçamento',
  null,
  2,
  true
);