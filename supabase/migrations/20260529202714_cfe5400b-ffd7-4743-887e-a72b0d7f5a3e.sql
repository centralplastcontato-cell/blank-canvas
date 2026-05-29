
-- Restringir Fernanda (Castelo) à instância VENDAS 4 + leads VENDAS 4
-- user_id: 745b62da-a15c-436d-aad9-994982a47263 (fernandacastelodadiversao@gmail.com)
-- instance VENDAS 4: 997eaddf-65fe-47bd-a489-70a7bae88a6b
-- granted_by: usar o próprio user_id (self) para não depender de admin específico

WITH target AS (
  SELECT '745b62da-a15c-436d-aad9-994982a47263'::uuid AS uid
),
perms(permission, granted) AS (
  VALUES
    ('whatsapp.instance.all', false),
    ('leads.unit.all', false),
    ('whatsapp.instance.997eaddf-65fe-47bd-a489-70a7bae88a6b', true),
    ('leads.unit.vendas-4', true)
)
INSERT INTO public.user_permissions (user_id, permission, granted, granted_by)
SELECT t.uid, p.permission, p.granted, t.uid
FROM target t, perms p
ON CONFLICT (user_id, permission)
DO UPDATE SET granted = EXCLUDED.granted, updated_at = now();
