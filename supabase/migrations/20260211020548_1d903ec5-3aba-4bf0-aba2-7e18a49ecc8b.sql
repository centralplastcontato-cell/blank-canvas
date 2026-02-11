
-- 1. Create permission definition for "Trabalhe Conosco" unit
INSERT INTO permission_definitions (code, name, description, category, sort_order, is_active)
VALUES ('leads.unit.trabalhe-conosco', 'Ver Unidade Trabalhe Conosco', 'Permite visualizar leads da unidade Trabalhe Conosco', 'Leads', 13, true);

-- 2. Grant this permission to users who have leads.unit.all = true
INSERT INTO user_permissions (user_id, permission, granted, granted_by)
SELECT up.user_id, 'leads.unit.trabalhe-conosco', true, up.granted_by
FROM user_permissions up
WHERE up.permission = 'leads.unit.all' AND up.granted = true
ON CONFLICT DO NOTHING;

-- 3. Also grant to users who have leads.unit.all = false but should see it 
-- (all users who have any unit permission, set to false by default - they can enable in settings)
INSERT INTO user_permissions (user_id, permission, granted)
SELECT DISTINCT up.user_id, 'leads.unit.trabalhe-conosco', false
FROM user_permissions up
WHERE up.permission = 'leads.unit.all' AND up.granted = false
  AND NOT EXISTS (
    SELECT 1 FROM user_permissions up2 
    WHERE up2.user_id = up.user_id AND up2.permission = 'leads.unit.trabalhe-conosco'
  );
