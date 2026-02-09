-- Update Ana's role from admin to gestor (she's a child company admin, not global)
UPDATE user_roles SET role = 'gestor' WHERE user_id = 'f28484a6-4b59-4a4c-a7f6-8499ea64f90c';