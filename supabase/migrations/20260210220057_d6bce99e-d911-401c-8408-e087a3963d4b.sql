
-- Align flow_nodes columns with component expectations
ALTER TABLE public.flow_nodes RENAME COLUMN type TO node_type;
ALTER TABLE public.flow_nodes RENAME COLUMN label TO title;
ALTER TABLE public.flow_nodes RENAME COLUMN content TO message_template;
ALTER TABLE public.flow_nodes RENAME COLUMN sort_order TO display_order;
ALTER TABLE public.flow_nodes ADD COLUMN action_config JSONB;
ALTER TABLE public.flow_nodes ADD COLUMN extract_field TEXT;
ALTER TABLE public.flow_nodes ADD COLUMN require_extraction BOOLEAN DEFAULT false;
ALTER TABLE public.flow_nodes ADD COLUMN allow_ai_interpretation BOOLEAN DEFAULT false;

-- Drop the old CHECK constraint and recreate with correct column name
ALTER TABLE public.flow_nodes DROP CONSTRAINT IF EXISTS flow_nodes_type_check;
ALTER TABLE public.flow_nodes ADD CONSTRAINT flow_nodes_node_type_check CHECK (node_type IN ('start', 'message', 'question', 'action', 'condition', 'end'));

-- Align flow_node_options columns
ALTER TABLE public.flow_node_options RENAME COLUMN sort_order TO display_order;

-- Align flow_edges columns
ALTER TABLE public.flow_edges RENAME COLUMN source_handle TO source_option_id;
ALTER TABLE public.flow_edges ADD COLUMN condition_type TEXT;
ALTER TABLE public.flow_edges ADD COLUMN display_order INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.flow_edges RENAME COLUMN label TO condition_value_label;
-- The existing condition_value stays as is

-- Align flow_lead_state columns
ALTER TABLE public.flow_lead_state RENAME COLUMN waiting_for_input TO waiting_for_reply;
ALTER TABLE public.flow_lead_state ADD COLUMN last_sent_at TIMESTAMPTZ;
