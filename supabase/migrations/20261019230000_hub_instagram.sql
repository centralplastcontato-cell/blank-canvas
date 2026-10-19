-- Instagram automatico da Celebrei (@hubcelebrei).
--
-- O que este SQL faz (pode rodar mais de uma vez, nao apaga nada):
--   1. cria as tabelas hub_instagram_posts (os posts gerados) e hub_instagram_config (liga/desliga);
--   2. cria o segredo do cron (cron_segredo, gerado aqui mesmo: ninguem precisa copiar nada);
--   3. cria o balde publico hub-instagram (as artes; o Postai e o Instagram baixam de la);
--   4. agenda o job hub-instagram-rodada (a cada 10 min) que chama a Edge Function "hub-instagram".
--
-- A automacao NASCE PAUSADA: nada e gerado nem publicado ate alguem ligar no painel
-- (Hub -> Instagram). Aprovacao manual comeca DESLIGADA.
-- Ver docs/INSTAGRAM.md.

CREATE TABLE IF NOT EXISTS public.hub_instagram_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vaga timestamptz NOT NULL,                  -- horario de publicacao
  tipo text NOT NULL CHECK (tipo IN ('foto', 'pergunta', 'carrossel')),
  publico text NOT NULL,                      -- assunto: vendas | gestao
  tema text NOT NULL,
  cenario text NOT NULL DEFAULT '',
  titulo text NOT NULL DEFAULT '',
  legenda text NOT NULL DEFAULT '',
  hashtags text NOT NULL DEFAULT '',
  plano jsonb NOT NULL DEFAULT '[]'::jsonb,   -- o que cada imagem vai ter
  midias jsonb NOT NULL DEFAULT '[]'::jsonb,  -- links das imagens prontas
  status text NOT NULL DEFAULT 'gerando',
  motivo text,
  nota text,
  tentativas int NOT NULL DEFAULT 0,
  gerando_desde timestamptz,                  -- reserva de uma etapa de imagem em andamento
  teste boolean NOT NULL DEFAULT false,
  postai_id text,
  instagram_url text,
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_hub_instagram_posts_vaga ON public.hub_instagram_posts (vaga);
CREATE INDEX IF NOT EXISTS idx_hub_instagram_posts_status ON public.hub_instagram_posts (status);
-- Um post ativo por horario (recusado/refazer liberam o horario para outro post).
CREATE UNIQUE INDEX IF NOT EXISTS hub_instagram_posts_vaga_ativa ON public.hub_instagram_posts (vaga)
  WHERE status NOT IN ('recusado', 'refazer');

CREATE TABLE IF NOT EXISTS public.hub_instagram_config (
  chave text PRIMARY KEY,
  valor text NOT NULL,
  booleano boolean
);

-- So a Edge Function (chave de servico) le e escreve. Sem politicas = navegador nao acessa.
ALTER TABLE public.hub_instagram_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hub_instagram_config ENABLE ROW LEVEL SECURITY;

INSERT INTO public.hub_instagram_config (chave, valor, booleano) VALUES
  ('aprovacao_manual', 'nao', false),
  ('pausado', 'sim', true),
  ('rodada_em', '1970-01-01T00:00:00.000Z', NULL),
  -- Segredo que o cron manda no header x-cron-secret (64 caracteres aleatorios).
  ('cron_segredo', replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', ''), NULL)
ON CONFLICT (chave) DO NOTHING;

-- Artes dos posts: balde publico (o Postai e o Instagram precisam baixar sem login).
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('hub-instagram', 'hub-instagram', true, 10485760)
ON CONFLICT (id) DO NOTHING;

-- Rodada a cada 10 min. O segredo vem da propria tabela de config (o cron roda como postgres).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'hub-instagram-rodada') THEN
    PERFORM cron.unschedule('hub-instagram-rodada');
  END IF;
END;
$$;

SELECT cron.schedule(
  'hub-instagram-rodada',
  '*/10 * * * *',
  $cron$
  SELECT net.http_post(
    url := 'https://rsezgnkfhodltrsewlhz.supabase.co/functions/v1/hub-instagram',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (SELECT valor FROM public.hub_instagram_config WHERE chave = 'cron_segredo')
    ),
    body := jsonb_build_object('acao', 'rodada')
  ) AS request_id;
  $cron$
);
