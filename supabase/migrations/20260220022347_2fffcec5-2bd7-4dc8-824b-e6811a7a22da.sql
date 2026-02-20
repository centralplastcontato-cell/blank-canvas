ALTER TABLE public.flow_nodes
  DROP CONSTRAINT flow_nodes_node_type_check;

ALTER TABLE public.flow_nodes
  ADD CONSTRAINT flow_nodes_node_type_check 
  CHECK (node_type = ANY (ARRAY[
    'start'::text, 
    'message'::text, 
    'question'::text, 
    'action'::text, 
    'condition'::text, 
    'end'::text, 
    'delay'::text, 
    'timer'::text,
    'qualify'::text
  ]));