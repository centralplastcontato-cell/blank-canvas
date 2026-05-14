-- Etapa 1: Backfill dos nomes editados pelo buffet no chat
-- Copia campaign_leads.name -> wapi_conversations.contact_name
-- APENAS para nomes claramente digitados manualmente (impossível vir do pushName do WhatsApp)

UPDATE public.wapi_conversations wc
SET contact_name = cl.name,
    updated_at = now()
FROM public.campaign_leads cl
WHERE wc.lead_id = cl.id
  AND cl.name IS NOT NULL
  AND length(trim(cl.name)) > 0
  AND cl.name IS DISTINCT FROM wc.contact_name
  AND (
    -- Contém '/' (ex: "Daniela/ Gael")
    cl.name LIKE '%/%'
    -- Contém código alfanumérico tipo "150526J", "P12-A"
    OR cl.name ~ '[0-9]{3,}[A-Za-z]'
    OR cl.name ~ '[A-Za-z][0-9]{2,}'
    -- Contém '+' separando partes (ex: "Maria + João")
    OR cl.name LIKE '% + %'
    -- Contém '-' entre palavras (ex: "Ana - 15 anos")
    OR cl.name ~ '[A-Za-zÀ-ÿ]+\s*-\s*[A-Za-z0-9]'
  );