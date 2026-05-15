-- =====================================================================
-- ETAPA A (re-execução): backup + limpeza com checagens relativas
-- =====================================================================

-- Snapshot inicial
CREATE TEMP TABLE _etapa_a_snapshot ON COMMIT DROP AS
SELECT
  (SELECT COUNT(*) FROM public.wapi_messages) AS total_before,
  (SELECT COUNT(*) FROM (
    SELECT 1 FROM public.wapi_messages
    WHERE message_id IS NOT NULL
    GROUP BY conversation_id, message_id HAVING COUNT(*) > 1
  ) x) AS dup_groups_before;

-- 1) BACKUP (idempotente — se já existir da tentativa anterior, mantemos)
CREATE TABLE IF NOT EXISTS public.wapi_messages_dedup_backup_20260514 AS
SELECT m.*
FROM public.wapi_messages m
WHERE (m.conversation_id, m.message_id) IN (
  SELECT conversation_id, message_id
  FROM public.wapi_messages
  WHERE message_id IS NOT NULL
  GROUP BY conversation_id, message_id
  HAVING COUNT(*) > 1
);

-- 2) Validar backup
DO $$
DECLARE v_b int; v_g int; v_expected_rows int;
BEGIN
  SELECT COUNT(*) INTO v_b FROM public.wapi_messages_dedup_backup_20260514;
  SELECT COUNT(DISTINCT (conversation_id, message_id)) INTO v_g FROM public.wapi_messages_dedup_backup_20260514;
  -- Esperamos cobrir os 474 grupos atuais
  IF v_g < 474 THEN
    RAISE EXCEPTION 'Backup cobre apenas % grupos (esperado >= 474). Abortando.', v_g;
  END IF;
  RAISE NOTICE 'Backup: % linhas / % grupos', v_b, v_g;
END $$;

-- 3) DELETE com ranking aprovado
WITH ranked AS (
  SELECT id,
    ROW_NUMBER() OVER (
      PARTITION BY conversation_id, message_id
      ORDER BY
        (media_url IS NOT NULL) DESC,
        (message_type = 'text') ASC,
        (COALESCE(content,'') = '') ASC,
        length(COALESCE(content,'')) DESC,
        CASE status WHEN 'read' THEN 1 WHEN 'delivered' THEN 2
                    WHEN 'sent' THEN 3 WHEN 'received' THEN 4 ELSE 5 END ASC,
        created_at ASC,
        id ASC
    ) AS rn
  FROM public.wapi_messages
  WHERE message_id IS NOT NULL
    AND (conversation_id, message_id) IN (
      SELECT conversation_id, message_id
      FROM public.wapi_messages
      WHERE message_id IS NOT NULL
      GROUP BY conversation_id, message_id
      HAVING COUNT(*) > 1
    )
)
DELETE FROM public.wapi_messages
WHERE id IN (SELECT id FROM ranked WHERE rn > 1);

-- 4) Verificações relativas
DO $$
DECLARE
  v_total_before int; v_dup_before int;
  v_total_after int; v_dup_after int;
  v_winners int; v_orphan_convs int;
  v_delta int;
BEGIN
  SELECT total_before, dup_groups_before INTO v_total_before, v_dup_before FROM _etapa_a_snapshot;

  SELECT COUNT(*) INTO v_total_after FROM public.wapi_messages;
  SELECT COUNT(*) INTO v_dup_after FROM (
    SELECT 1 FROM public.wapi_messages
    WHERE message_id IS NOT NULL
    GROUP BY conversation_id, message_id HAVING COUNT(*) > 1
  ) x;

  v_delta := v_total_before - v_total_after;

  IF v_dup_after > 0 THEN
    RAISE EXCEPTION 'Pós-limpeza: % grupos duplicados restantes — rollback.', v_dup_after;
  END IF;

  IF v_delta <> 1055 THEN
    RAISE EXCEPTION 'Delta de remoção inesperado: % (esperado 1055). before=% after=% — rollback.',
      v_delta, v_total_before, v_total_after;
  END IF;

  -- 474 vencedoras devem existir (uma por grupo do backup)
  SELECT COUNT(*) INTO v_winners
  FROM public.wapi_messages m
  WHERE (m.conversation_id, m.message_id) IN (
    SELECT DISTINCT conversation_id, message_id FROM public.wapi_messages_dedup_backup_20260514
  );
  IF v_winners <> 474 THEN
    RAISE EXCEPTION 'Vencedoras presentes: % (esperado 474) — rollback.', v_winners;
  END IF;

  -- Nenhuma conversa do backup ficou sem mensagem
  SELECT COUNT(DISTINCT b.conversation_id) INTO v_orphan_convs
  FROM public.wapi_messages_dedup_backup_20260514 b
  WHERE NOT EXISTS (SELECT 1 FROM public.wapi_messages m WHERE m.conversation_id = b.conversation_id);
  IF v_orphan_convs > 0 THEN
    RAISE EXCEPTION '% conversa(s) ficaram sem mensagem — rollback.', v_orphan_convs;
  END IF;

  RAISE NOTICE 'OK: total %->% (delta=%), grupos dup %->%, vencedoras=%, órfãs=0',
    v_total_before, v_total_after, v_delta, v_dup_before, v_dup_after, v_winners;
END $$;