
-- Fix V2 flow: remove "Dia da Semana" node and reconnect Mês → Número de Convidados

-- The node IDs identified:
-- Mês do Evento: e811533e-b67a-4acd-80af-28130781b381
-- Dia da Semana: 26d997a8-8120-45cd-92d3-a0d70af04778  (to be removed)
-- Número de Convidados: fbf6827e-39c1-45bc-a1c6-3d3cefc8dbfb

-- Step 1: Delete edges connected to "Dia da Semana" node
DELETE FROM flow_edges 
WHERE source_node_id = '26d997a8-8120-45cd-92d3-a0d70af04778'
   OR target_node_id = '26d997a8-8120-45cd-92d3-a0d70af04778';

-- Step 2: Delete the "Dia da Semana" node and its options
DELETE FROM flow_node_options WHERE node_id = '26d997a8-8120-45cd-92d3-a0d70af04778';
DELETE FROM flow_nodes WHERE id = '26d997a8-8120-45cd-92d3-a0d70af04778';

-- Step 3: Create new edge: Mês do Evento → Número de Convidados
-- (using the flow_id from conversation_flows for the V2 flow)
INSERT INTO flow_edges (id, flow_id, source_node_id, target_node_id, source_option_id, condition_type, condition_value, display_order)
SELECT 
  gen_random_uuid(),
  n.flow_id,
  'e811533e-b67a-4acd-80af-28130781b381',  -- Mês do Evento
  'fbf6827e-39c1-45bc-a1c6-3d3cefc8dbfb',  -- Número de Convidados
  NULL,
  NULL,
  NULL,
  3
FROM flow_nodes n
WHERE n.id = 'e811533e-b67a-4acd-80af-28130781b381';

-- Step 4: Update display_order of remaining nodes to fill the gap
UPDATE flow_nodes SET display_order = display_order - 1
WHERE flow_id = (SELECT flow_id FROM flow_nodes WHERE id = 'fbf6827e-39c1-45bc-a1c6-3d3cefc8dbfb')
  AND display_order >= 5;
