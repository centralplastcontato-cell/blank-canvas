
UPDATE user_permissions 
SET granted = true, updated_at = now()
WHERE permission = 'leads.unit.trabalhe-conosco' 
  AND user_id IN ('fcb0aba4-cef8-4b94-b8bb-b0b777b81286', '1bb1b5c0-2f66-415f-b9d6-70ea81a25de9');
