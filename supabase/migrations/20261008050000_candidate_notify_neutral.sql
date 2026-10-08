-- Aviso de candidato novo: "veio pela IA" (neutro; o nome da assistente é
-- configurável por empresa)
CREATE OR REPLACE FUNCTION public.notify_new_freelancer_candidate()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_purpose text;
  v_roles text;
  v_name text;
  v_msg text;
  v_ids uuid[];
BEGIN
  SELECT purpose INTO v_purpose FROM public.freelancer_templates WHERE id = NEW.template_id;
  IF coalesce(v_purpose, 'cadastro') <> 'candidatura' THEN
    RETURN NEW;
  END IF;

  BEGIN
    SELECT string_agg(r, ', ') INTO v_roles
    FROM (
      SELECT jsonb_array_elements_text(CASE WHEN jsonb_typeof(a->'value') = 'array' THEN a->'value' ELSE '[]'::jsonb END) AS r
      FROM jsonb_array_elements(CASE WHEN jsonb_typeof(NEW.answers) = 'array' THEN NEW.answers ELSE '[]'::jsonb END) a
      WHERE a->>'questionId' = 'funcao'
    ) x;

    v_name := coalesce(nullif(trim(NEW.respondent_name), ''), 'Sem nome');
    v_msg := array_to_string(array_remove(ARRAY[
      v_roles,
      CASE WHEN NEW.distance_km IS NOT NULL THEN replace(to_char(NEW.distance_km, 'FM9990.0'), '.', ',') || ' km do buffet' END,
      nullif(trim(NEW.bairro), ''),
      CASE WHEN NEW.source = 'bia' THEN 'veio pela IA' END
    ], NULL), ' · ');

    SELECT array_agg(DISTINCT uc.user_id) INTO v_ids
    FROM public.user_companies uc
    WHERE uc.company_id = NEW.company_id
      AND (
        uc.role IN ('owner', 'admin')
        OR EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = uc.user_id AND ur.role = 'admin')
        OR EXISTS (
          SELECT 1 FROM public.user_permissions up
          WHERE up.user_id = uc.user_id AND up.granted = true AND up.permission = 'operacoes.freelancer'
        )
      );
    IF v_ids IS NULL THEN
      -- Ninguém com essa função: avisa a empresa toda (nunca em silêncio)
      SELECT array_agg(DISTINCT uc.user_id) INTO v_ids FROM public.user_companies uc WHERE uc.company_id = NEW.company_id;
    END IF;
    IF v_ids IS NULL THEN
      RETURN NEW;
    END IF;

    INSERT INTO public.notifications (user_id, company_id, type, title, message, data, read)
    SELECT u, NEW.company_id, 'new_candidate', '👷 Novo candidato: ' || v_name, nullif(v_msg, ''),
      jsonb_build_object('response_id', NEW.id, 'source', NEW.source, 'photo_url', NEW.photo_url),
      false
    FROM unnest(v_ids) u;
  EXCEPTION WHEN others THEN
    RAISE WARNING 'notify_new_freelancer_candidate: %', SQLERRM;
  END;
  RETURN NEW;
END;
$$;
