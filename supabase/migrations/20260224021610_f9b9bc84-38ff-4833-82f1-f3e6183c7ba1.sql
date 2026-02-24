-- Fix Manchester: sort_order nome=1, tipo=2 (estava conflitando ambos em 1)
UPDATE wapi_bot_questions SET sort_order = 2 WHERE id = 'fb08d910-bf7c-461c-8473-5b7f55566015';

-- Fix Trujillo: sort_order nome=1, tipo=2
UPDATE wapi_bot_questions SET sort_order = 2 WHERE id = 'd9e5a9df-8bfb-4d9d-bd08-3c79d78fe1b2';

-- Trujillo: tipo com emojis
UPDATE wapi_bot_questions SET question_text = E'Você já é nosso cliente e tem uma festa agendada, ou gostaria de receber um orçamento? 🎉\n\nResponda com o *número*:\n\n1️⃣ - Já sou cliente.\n2️⃣ - Quero um orçamento.\n3️⃣ - Trabalhe no Castelo.' WHERE id = 'd9e5a9df-8bfb-4d9d-bd08-3c79d78fe1b2';

-- Trujillo: mês com emojis
UPDATE wapi_bot_questions SET question_text = E'Que legal! 🎉 E pra qual mês você tá pensando em fazer essa festa incrível?\n\n📅 Responda com o *número*:\n\n2️⃣ Fevereiro\n3️⃣ Março\n4️⃣ Abril\n5️⃣ Maio\n6️⃣ Junho\n7️⃣ Julho\n8️⃣ Agosto\n9️⃣ Setembro\n🔟 Outubro\n1️⃣1️⃣ Novembro\n1️⃣2️⃣ Dezembro' WHERE id = '45b48b6b-0fb9-4c8a-905b-520775a8243b';

-- Trujillo: dia com emojis
UPDATE wapi_bot_questions SET question_text = E'Maravilha! Tem preferência de dia da semana? 🗓️\n\nResponda com o *número*:\n\n1️⃣ - Segunda a Quinta\n2️⃣ - Sexta\n3️⃣ - Sábado\n4️⃣ - Domingo' WHERE id = 'b2353f59-ac94-48a5-ae45-7be531a079ed';

-- Trujillo: convidados com emojis
UPDATE wapi_bot_questions SET question_text = E'E quantos convidados você pretende chamar pra essa festa mágica? 🎈\n\n👥 Responda com o *número*:\n\n1️⃣ - 50 pessoas\n2️⃣ - 60 pessoas\n3️⃣ - 70 pessoas\n4️⃣ - 80 pessoas\n5️⃣ - 90 pessoas\n6️⃣ - 100 pessoas' WHERE id = '92a8be4e-b3d4-4a0e-97b2-af3abc98e731';