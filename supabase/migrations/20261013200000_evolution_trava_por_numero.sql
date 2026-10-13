-- Trava por número da Evolution Go: só uma checagem por vez conversa com a
-- Evolution sobre cada número (monitor e tela de Conexão). Duas chamadas
-- juntas durante a reconexão automática abriram uma 2ª conexão do mesmo
-- aparelho ("StreamReplaced") e derrubaram a sessão do VENDAS 1 (13/10 18:47).
ALTER TABLE public.provider_health ADD COLUMN IF NOT EXISTS lock_until timestamptz;
