
## Diagnóstico: Lembrete de Visitas NÃO está funcionando

### Problema encontrado

A Edge Function `visit-confirmation` **existe e está correta**, e as configurações estão **habilitadas** no banco (`is_enabled: true`), MAS:

1. **Não existe um cron job agendado para executá-la.** Os cron jobs ativos são: `follow-up-check`, `rotate-months`, `reactivation-engine`, `monthly-review`. A `visit-confirmation` não está na lista.
2. **O histórico está vazio** (`visit_confirmation_history` = 0 registros) — confirma que a função nunca foi chamada automaticamente.
3. **Sem logs** — nenhuma execução registrada.

### Como a função funciona (quando chamada)

1. Busca `visit_confirmation_settings` habilitadas por empresa
2. Respeita janela de envio (08h-22h SP)
3. Encontra visitas com status "agendada" que ocorrem nas próximas X horas (configurável, padrão 24h)
4. Verifica se já enviou confirmação (via `visit_confirmation_history`)
5. Envia 1ª mensagem de confirmação via W-API
6. Opcionalmente envia 2ª mensagem (lembrete) após X horas se não houve resposta
7. Registra histórico e salva mensagem no chat

### Plano de Correção

**1 ação necessária:** Criar o cron job para chamar `visit-confirmation` periodicamente (a cada 30 minutos é ideal para capturar visitas na janela correta).

```sql
SELECT cron.schedule(
  'visit-confirmation-every-30min',
  '*/30 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://rsezgnkfhodltrsewlhz.supabase.co/functions/v1/visit-confirmation',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJzZXpnbmtmaG9kbHRyc2V3bGh6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA1Nzc2NjcsImV4cCI6MjA4NjE1MzY2N30.FIgluyyGXUIbwfYMxUeyQHHnH-_EgmqpVGXZByjVkMw"}'::jsonb,
    body := '{"time": "scheduled"}'::jsonb
  ) AS request_id;
  $$
);
```

### Resultado esperado

Após criar o cron, a função será executada a cada 30 minutos e enviará automaticamente:
- **Mensagem 1** (confirmação): 24h antes da visita
- **Mensagem 2** (lembrete): 2h depois da primeira, se não houve resposta

### Arquivos afetados
- Nenhuma alteração de código necessária — apenas a criação do cron job via SQL
