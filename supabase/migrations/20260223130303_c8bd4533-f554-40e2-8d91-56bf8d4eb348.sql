
DELETE FROM notifications
WHERE company_id IS NOT NULL
AND NOT EXISTS (
  SELECT 1 FROM user_companies uc
  WHERE uc.user_id = notifications.user_id AND uc.company_id = notifications.company_id
);
