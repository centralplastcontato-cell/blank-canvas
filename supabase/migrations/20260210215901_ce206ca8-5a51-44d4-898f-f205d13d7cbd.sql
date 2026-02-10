
-- =============================================
-- FLOW BUILDER: 5 tables + bot_settings column + permission
-- =============================================

-- 1. conversation_flows
CREATE TABLE public.conversation_flows (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT false,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.conversation_flows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view flows of their companies"
  ON public.conversation_flows FOR SELECT
  USING (company_id = ANY(public.get_user_company_ids(auth.uid())));

CREATE POLICY "Users can insert flows for their companies"
  ON public.conversation_flows FOR INSERT
  WITH CHECK (company_id = ANY(public.get_user_company_ids(auth.uid())));

CREATE POLICY "Users can update flows of their companies"
  ON public.conversation_flows FOR UPDATE
  USING (company_id = ANY(public.get_user_company_ids(auth.uid())));

CREATE POLICY "Users can delete flows of their companies"
  ON public.conversation_flows FOR DELETE
  USING (company_id = ANY(public.get_user_company_ids(auth.uid())));

CREATE INDEX idx_conversation_flows_company ON public.conversation_flows(company_id);

CREATE TRIGGER update_conversation_flows_updated_at
  BEFORE UPDATE ON public.conversation_flows
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. flow_nodes
CREATE TABLE public.flow_nodes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  flow_id UUID NOT NULL REFERENCES public.conversation_flows(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('start', 'message', 'question', 'action', 'condition', 'end')),
  label TEXT NOT NULL DEFAULT '',
  content TEXT,
  action_type TEXT,
  position_x REAL NOT NULL DEFAULT 0,
  position_y REAL NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.flow_nodes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage flow nodes via flow ownership"
  ON public.flow_nodes FOR ALL
  USING (
    flow_id IN (
      SELECT id FROM public.conversation_flows
      WHERE company_id = ANY(public.get_user_company_ids(auth.uid()))
    )
  );

CREATE INDEX idx_flow_nodes_flow ON public.flow_nodes(flow_id);

CREATE TRIGGER update_flow_nodes_updated_at
  BEFORE UPDATE ON public.flow_nodes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. flow_node_options
CREATE TABLE public.flow_node_options (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  node_id UUID NOT NULL REFERENCES public.flow_nodes(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  value TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.flow_node_options ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage node options via flow ownership"
  ON public.flow_node_options FOR ALL
  USING (
    node_id IN (
      SELECT fn.id FROM public.flow_nodes fn
      JOIN public.conversation_flows cf ON cf.id = fn.flow_id
      WHERE cf.company_id = ANY(public.get_user_company_ids(auth.uid()))
    )
  );

CREATE INDEX idx_flow_node_options_node ON public.flow_node_options(node_id);

-- 4. flow_edges
CREATE TABLE public.flow_edges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  flow_id UUID NOT NULL REFERENCES public.conversation_flows(id) ON DELETE CASCADE,
  source_node_id UUID NOT NULL REFERENCES public.flow_nodes(id) ON DELETE CASCADE,
  target_node_id UUID NOT NULL REFERENCES public.flow_nodes(id) ON DELETE CASCADE,
  source_handle TEXT,
  condition_value TEXT,
  label TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.flow_edges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage flow edges via flow ownership"
  ON public.flow_edges FOR ALL
  USING (
    flow_id IN (
      SELECT id FROM public.conversation_flows
      WHERE company_id = ANY(public.get_user_company_ids(auth.uid()))
    )
  );

CREATE INDEX idx_flow_edges_flow ON public.flow_edges(flow_id);
CREATE INDEX idx_flow_edges_source ON public.flow_edges(source_node_id);
CREATE INDEX idx_flow_edges_target ON public.flow_edges(target_node_id);

-- 5. flow_lead_state
CREATE TABLE public.flow_lead_state (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.wapi_conversations(id) ON DELETE CASCADE,
  flow_id UUID NOT NULL REFERENCES public.conversation_flows(id) ON DELETE CASCADE,
  current_node_id UUID REFERENCES public.flow_nodes(id) ON DELETE SET NULL,
  collected_data JSONB DEFAULT '{}'::jsonb,
  waiting_for_input BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(conversation_id, flow_id)
);

ALTER TABLE public.flow_lead_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage flow lead state via company"
  ON public.flow_lead_state FOR ALL
  USING (
    conversation_id IN (
      SELECT id FROM public.wapi_conversations
      WHERE company_id = ANY(public.get_user_company_ids(auth.uid()))
    )
  );

CREATE INDEX idx_flow_lead_state_conversation ON public.flow_lead_state(conversation_id);
CREATE INDEX idx_flow_lead_state_flow ON public.flow_lead_state(flow_id);

CREATE TRIGGER update_flow_lead_state_updated_at
  BEFORE UPDATE ON public.flow_lead_state
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 6. Add use_flow_builder column to wapi_bot_settings
ALTER TABLE public.wapi_bot_settings
  ADD COLUMN use_flow_builder BOOLEAN DEFAULT false;

-- 7. Add flowbuilder.manage permission
INSERT INTO public.permission_definitions (code, name, category, description, sort_order, is_active)
VALUES ('flowbuilder.manage', 'Gerenciar Flow Builder', 'Automações', 'Criar e editar fluxos de conversa no Flow Builder', 50, true);
