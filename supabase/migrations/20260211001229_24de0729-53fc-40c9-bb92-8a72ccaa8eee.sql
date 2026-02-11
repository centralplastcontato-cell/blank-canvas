UPDATE wapi_bot_questions
SET question_text = E'Você já é nosso cliente e tem uma festa agendada, ou gostaria de receber um orçamento? 🎉\n\nResponda com o *número*:\n\n*1* - Já sou cliente\n*2* - Quero um orçamento\n*3* - Trabalhe no Castelo'
WHERE step = 'tipo'
AND instance_id IN (
  '9b846163-9580-436b-a33e-1e0eca106514',
  '3f39419e-e7f5-4c3b-8ebd-1703e6c7a0c7'
);