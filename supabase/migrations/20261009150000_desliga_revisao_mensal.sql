-- Desliga o agendamento da revisão mensal da Inteligência. A aba que mostrava
-- a revisão foi escondida e a função monthly-review passou a exigir login
-- (out/2026), então o agendamento, que chama com a chave pública, só falharia
-- todo dia 1º. Pode rodar mais de uma vez.
SELECT cron.unschedule('monthly-review-generator')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'monthly-review-generator');
