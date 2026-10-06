-- IA (beta): horários de festa, feriados locais e trava de escrita no banco.

-- 1) Horários de festa que a IA usa para dizer as datas livres
--    (vazio = "13:00-17:00, 19:00-23:00")
ALTER TABLE public.ai_agent_settings ADD COLUMN IF NOT EXISTS party_slots text;

-- 2) A IA NÃO altera festas, pré-reservas, contratos, pagamentos nem financeiro.
--    O cliente da IA (wapi-webhook) manda o cabeçalho x-celebrei-actor:
--    ai-agent; este gatilho recusa insert/update/delete vindos dele nessas
--    tabelas. Telas e demais automações não mandam o cabeçalho e seguem iguais.
CREATE OR REPLACE FUNCTION public.block_ai_agent_writes()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  headers text := current_setting('request.headers', true);
BEGIN
  IF headers IS NOT NULL AND headers <> ''
     AND (headers::json ->> 'x-celebrei-actor') = 'ai-agent' THEN
    RAISE EXCEPTION 'IA (beta) não tem permissão para alterar %', TG_TABLE_NAME
      USING ERRCODE = '42501';
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DO $$
DECLARE
  t text;
  protected text[] := ARRAY[
    'company_events', 'pre_reservations',
    'generated_contracts', 'contract_models', 'contract_model_versions', 'contract_signatures',
    'contract_audit_logs', 'contract_message_settings', 'lead_contract_data',
    'event_payments', 'event_payment_entries', 'event_financial_timeline', 'event_discounts',
    'event_extras', 'company_expenses', 'expense_subcategories', 'financial_consents',
    'company_packages', 'package_price_tiers'
  ];
BEGIN
  FOREACH t IN ARRAY protected LOOP
    IF to_regclass('public.' || t) IS NOT NULL THEN
      EXECUTE format('DROP TRIGGER IF EXISTS trg_block_ai_agent_writes ON public.%I', t);
      EXECUTE format(
        'CREATE TRIGGER trg_block_ai_agent_writes BEFORE INSERT OR UPDATE OR DELETE ON public.%I '
        'FOR EACH ROW EXECUTE FUNCTION public.block_ai_agent_writes()', t);
    END IF;
  END LOOP;
END;
$$;

-- 3) Castelo da Diversão: feriado estadual de SP (9/7) e municipal de Sorocaba
--    (15/8) na grade de preços e na agenda (só se ainda não houver lista).
UPDATE public.companies
SET settings = COALESCE(settings, '{}'::jsonb) || '{"local_holidays": ["07-09", "08-15"]}'::jsonb
WHERE id = 'a0000000-0000-0000-0000-000000000001'
  AND NOT (COALESCE(settings, '{}'::jsonb) ? 'local_holidays');
