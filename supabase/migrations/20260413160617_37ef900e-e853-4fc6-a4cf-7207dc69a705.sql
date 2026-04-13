ALTER TABLE public.form_automation_settings DROP CONSTRAINT IF EXISTS form_automation_settings_form_type_check;

ALTER TABLE public.form_automation_settings ADD CONSTRAINT form_automation_settings_form_type_check CHECK (form_type IN ('prefesta', 'cardapio', 'avaliacao', 'contrato', 'contrato_envio', 'contrato_whatsapp'));