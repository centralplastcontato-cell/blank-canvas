-- Sync tipo question
UPDATE wapi_bot_questions
SET question_text = E'Você já é nosso cliente ou gostaria de receber seu orçamento? 🤩\n\nResponda com o *número*:\n\n1️⃣ - Já sou cliente.\n2️⃣ - Quero um orçamento.\n3️⃣ - Trabalhe no conosco.',
    updated_at = now()
WHERE id = '3e022c54-bf68-48e8-bd4e-03682431b42c'
  AND instance_id = 'fff981eb-ebdd-49b6-9643-0251e252b586';

-- Sync convidados question
UPDATE wapi_bot_questions
SET question_text = E'Perfeito! Para finalizar  seu orçamento, me conta quantos convidados pretende chamar para sua festa mágica?\n\n\n👥 Responda com o *número*:\n\n1️⃣ 40 pessoas\n2️⃣ 50 pessoas\n3️⃣ 60 pessoas\n4️⃣ 70 pessoas\n5️⃣ 80 pessoas\n6️⃣ 90 pessoas\n7️⃣ 100 pessoas\n8️⃣ 110 pessoas\n9️⃣ 120 pessoas',
    confirmation_text = E'Ótimo! Uma festa para {convidados}, vai ser incrível! 🎉🥳',
    updated_at = now()
WHERE id = 'b77cf640-dd16-45df-828d-3bc9ac6c0a19'
  AND instance_id = 'fff981eb-ebdd-49b6-9643-0251e252b586';

-- Sync nome confirmation
UPDATE wapi_bot_questions
SET confirmation_text = E'Muito prazer, {nome}! 👑✨',
    updated_at = now()
WHERE id = 'a7c18f18-2f36-4678-abf9-d605acc8839a'
  AND instance_id = 'fff981eb-ebdd-49b6-9643-0251e252b586';

-- Sync mes confirmation
UPDATE wapi_bot_questions
SET confirmation_text = E'{mes}, ótima escolha! 🎊',
    updated_at = now()
WHERE id = 'ba872cf7-9664-4a09-8dff-4189ae71d257'
  AND instance_id = 'fff981eb-ebdd-49b6-9643-0251e252b586';

-- Sync dia confirmation
UPDATE wapi_bot_questions
SET confirmation_text = 'Anotado!',
    updated_at = now()
WHERE id = 'b2606259-6ca0-45f1-aee4-a0fdc83235f2'
  AND instance_id = 'fff981eb-ebdd-49b6-9643-0251e252b586';