-- Add new "tipo" step question after "nome" for all instances
-- First, update sort_order of existing questions to make room
UPDATE public.wapi_bot_questions
SET sort_order = sort_order + 1
WHERE step IN ('mes', 'dia', 'convidados');

-- Insert new "tipo" question for each instance
INSERT INTO public.wapi_bot_questions (instance_id, step, question_text, confirmation_text, sort_order, is_active)
SELECT 
  id as instance_id,
  'tipo' as step,
  'Você já é nosso cliente e tem uma festa agendada, ou gostaria de receber um orçamento? 🎉

Responda com o *número*:

*1* - Já sou cliente
*2* - Quero um orçamento' as question_text,
  NULL as confirmation_text,
  1 as sort_order,
  true as is_active
FROM public.wapi_instances
ON CONFLICT DO NOTHING;