-- Página do dia da festa (/festa/:id) aberta sem login: os botões de Pré-Festa,
-- Cardápio e Avaliação precisam saber qual modelo usar. As tabelas de modelos só
-- deixam a equipe logada ler; esta função devolve só id, nome e slug dos modelos
-- ATIVOS do buffet daquela festa (o mesmo que já aparece no link público).
CREATE OR REPLACE FUNCTION public.get_party_form_templates(_event_id uuid)
RETURNS TABLE(form_type text, id uuid, name text, slug text)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  WITH ev AS (SELECT company_id FROM public.company_events WHERE id = _event_id LIMIT 1)
  SELECT 'avaliacao', t.id, t.name, t.slug FROM public.evaluation_templates t, ev
    WHERE t.company_id = ev.company_id AND t.is_active
  UNION ALL
  SELECT 'prefesta', t.id, t.name, t.slug FROM public.prefesta_templates t, ev
    WHERE t.company_id = ev.company_id AND t.is_active
  UNION ALL
  SELECT 'cardapio', t.id, t.name, t.slug FROM public.cardapio_templates t, ev
    WHERE t.company_id = ev.company_id AND t.is_active;
$function$;

GRANT EXECUTE ON FUNCTION public.get_party_form_templates(uuid) TO anon, authenticated;
