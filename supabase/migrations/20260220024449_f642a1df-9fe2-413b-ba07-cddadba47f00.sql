-- Convert existing qualify nodes to question nodes with allow_ai_interpretation = true
UPDATE public.flow_nodes
SET 
  node_type = 'question',
  allow_ai_interpretation = true
WHERE node_type = 'qualify';