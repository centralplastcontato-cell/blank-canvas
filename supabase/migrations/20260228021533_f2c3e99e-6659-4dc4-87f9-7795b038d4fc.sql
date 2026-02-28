-- Move all 15 responses from Template 1 (old) to Template 2 (definitive)
UPDATE freelancer_responses 
SET template_id = '155a74c1-02a5-4ae6-ae17-fe16bae257b1' 
WHERE template_id = '8a785022-4bd9-46fe-9f39-e08bfd6d2b72';

-- Delete the old duplicate template
DELETE FROM freelancer_templates 
WHERE id = '8a785022-4bd9-46fe-9f39-e08bfd6d2b72';