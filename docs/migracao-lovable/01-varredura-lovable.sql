-- ============================================================
-- VARREDURA: procura qualquer resquício da Lovable no banco
-- ============================================================
-- Rode no Supabase Dashboard > SQL Editor.
-- É 100% SOMENTE LEITURA. Não altera nada.
--
-- Objetivo: achar TODA coluna de texto/JSON, em TODA tabela do
-- schema public, que contenha a string "lovable". A chave pública
-- (anon) só enxerga dados públicos; isto aqui roda com privilégio
-- total e cobre também materiais, contratos, mensagens etc.
-- ============================================================

CREATE OR REPLACE FUNCTION pg_temp.varre_lovable()
RETURNS TABLE(tabela text, coluna text, ocorrencias bigint)
LANGUAGE plpgsql AS $$
DECLARE
  r record;
  n bigint;
BEGIN
  FOR r IN
    SELECT c.table_name, c.column_name
    FROM information_schema.columns c
    JOIN information_schema.tables t
      ON t.table_schema = c.table_schema
     AND t.table_name  = c.table_name
    WHERE c.table_schema = 'public'
      AND t.table_type   = 'BASE TABLE'
      AND c.data_type IN ('text', 'character varying', 'json', 'jsonb')
  LOOP
    EXECUTE format(
      'SELECT count(*) FROM public.%I WHERE %I::text ILIKE %L',
      r.table_name, r.column_name, '%lovable%'
    ) INTO n;

    IF n > 0 THEN
      tabela := r.table_name;
      coluna := r.column_name;
      ocorrencias := n;
      RETURN NEXT;
    END IF;
  END LOOP;
END $$;

SELECT * FROM pg_temp.varre_lovable() ORDER BY ocorrencias DESC, tabela, coluna;

-- ============================================================
-- COMO LER O RESULTADO
--
-- Esperado (o que já mapeamos pela API pública):
--   company_landing_pages | hero  | 1
--   company_landing_pages | video | 1
--
-- Se aparecer QUALQUER outra linha, PARE e me mostre.
-- Significa que há mais coisa presa na Lovable além do que
-- eu consegui enxergar de fora, e precisamos tratar antes de
-- cancelar a assinatura.
--
-- Se vier vazio além dessas duas, o script 02 resolve tudo.
-- ============================================================
