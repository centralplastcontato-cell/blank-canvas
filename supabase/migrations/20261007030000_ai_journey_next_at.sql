-- Jornada da Bia: quando vence o próximo lembrete antes da festa. Conversa
-- parada há meses volta a ser encontrada nesse dia, e a reativação fixa sabe
-- que o lembrete é da Bia. Coluna própria (não bot_data) para não disputar
-- escrita com a conversa.
alter table public.wapi_conversations
  add column if not exists ai_journey_next_at timestamptz;

create index if not exists wapi_conversations_ai_journey_next_at_idx
  on public.wapi_conversations (ai_journey_next_at)
  where ai_journey_next_at is not null;
