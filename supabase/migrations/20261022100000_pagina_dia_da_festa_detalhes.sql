-- Página do dia da festa (nova): o que a equipe precisa ver sem login.
-- Devolve só o necessário: se o cliente respondeu Pré-Festa / Cardápio /
-- Avaliação (data, e no cardápio os itens escolhidos), nome e função de quem
-- está na equipe (sem PIX nem valores) e os ids das fichas do dia, para os
-- botões abrirem a ficha certa.
CREATE OR REPLACE FUNCTION public.get_party_day_details(_event_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT jsonb_build_object(
    'prefesta', (SELECT jsonb_build_object('responded_at', r.created_at)
                 FROM prefesta_responses r WHERE r.event_id = _event_id
                 ORDER BY r.created_at DESC LIMIT 1),
    'cardapio', (SELECT jsonb_build_object(
                   'responded_at', r.created_at,
                   'template_name', t.name,
                   'items', COALESCE((
                     SELECT jsonb_agg(s.value)
                     FROM jsonb_array_elements(CASE WHEN jsonb_typeof(r.answers) = 'array' THEN r.answers ELSE '[]'::jsonb END) a,
                          jsonb_array_elements_text(CASE WHEN jsonb_typeof(a.value->'selected') = 'array' THEN a.value->'selected' ELSE '[]'::jsonb END) s
                   ), '[]'::jsonb))
                 FROM cardapio_responses r LEFT JOIN cardapio_templates t ON t.id = r.template_id
                 WHERE r.event_id = _event_id
                 ORDER BY r.created_at DESC LIMIT 1),
    'avaliacao', (SELECT jsonb_build_object('responded_at', r.created_at, 'score', r.overall_score)
                  FROM evaluation_responses r WHERE r.event_id = _event_id
                  ORDER BY r.created_at DESC LIMIT 1),
    'staff_id', (SELECT id FROM event_staff_entries WHERE event_id = _event_id ORDER BY created_at DESC LIMIT 1),
    'staff', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('name', e.value->>'name', 'role', role.value->>'roleTitle'))
      FROM (SELECT staff_data FROM event_staff_entries WHERE event_id = _event_id ORDER BY created_at DESC LIMIT 1) se,
           jsonb_array_elements(CASE WHEN jsonb_typeof(se.staff_data) = 'array' THEN se.staff_data ELSE '[]'::jsonb END) role,
           jsonb_array_elements(CASE WHEN jsonb_typeof(role.value->'entries') = 'array' THEN role.value->'entries' ELSE '[]'::jsonb END) e
      WHERE COALESCE(e.value->>'name', '') <> ''
    ), '[]'::jsonb),
    'maintenance_id', (SELECT id FROM maintenance_entries WHERE event_id = _event_id ORDER BY created_at DESC LIMIT 1),
    'monitoring_id', (SELECT id FROM party_monitoring_entries WHERE event_id = _event_id ORDER BY created_at DESC LIMIT 1),
    'attendance_id', (SELECT id FROM attendance_entries WHERE event_id = _event_id ORDER BY created_at DESC LIMIT 1)
  );
$function$;

GRANT EXECUTE ON FUNCTION public.get_party_day_details(uuid) TO anon, authenticated;
