// Flow Builder Types
// Using string types for database compatibility

export type NodeType = 'start' | 'message' | 'question' | 'action' | 'condition' | 'end';

export type ActionType = 'send_media' | 'send_pdf' | 'send_video' | 'extract_data' | 'schedule_visit' | 'handoff' | 'ai_response' | 'check_party_availability' | 'check_visit_availability' | 'disable_followup' | 'disable_ai' | 'mark_existing_customer';

export type ConditionType = 'option_selected' | 'keyword_match' | 'fallback' | 'timeout' | null;

export type ExtractField = 
  | 'customer_name' 
  | 'event_date' 
  | 'visit_date'
  | 'guest_count' 
  | 'child_name' 
  | 'child_age' 
  | 'preferred_slot'
  | 'event_type'
  | null;

export interface FlowNodeOption {
  id: string;
  node_id: string;
  label: string;
  value: string;
  display_order: number;
}

export interface FlowNode {
  id: string;
  flow_id: string;
  node_type: string;
  title: string;
  message_template: string | null;
  action_type: string | null;
  action_config: any;
  extract_field: string | null;
  position_x: number;
  position_y: number;
  display_order: number;
  allow_ai_interpretation?: boolean;
  require_extraction?: boolean;
  options?: FlowNodeOption[];
}

export interface FlowEdge {
  id: string;
  flow_id: string;
  source_node_id: string;
  target_node_id: string;
  source_option_id: string | null;
  condition_type: string | null;
  condition_value: string | null;
  display_order: number;
}

export interface ConversationFlow {
  id: string;
  company_id: string | null;
  name: string;
  description: string | null;
  is_active: boolean;
  is_default: boolean;
  created_at: string;
  updated_at: string;
  nodes?: FlowNode[];
  edges?: FlowEdge[];
}

export interface FlowLeadState {
  id: string;
  conversation_id: string;
  flow_id: string;
  current_node_id: string | null;
  waiting_for_reply: boolean;
  last_sent_at: string | null;
  collected_data: Record<string, any>;
}

// UI Types
export interface NodePosition {
  x: number;
  y: number;
}

export interface DragState {
  isDragging: boolean;
  nodeId: string | null;
  startX: number;
  startY: number;
}

export interface ConnectionState {
  isConnecting: boolean;
  sourceNodeId: string | null;
  sourceOptionId: string | null;
}

export const NODE_TYPE_LABELS: Record<NodeType, string> = {
  start: 'Início',
  message: 'Mensagem',
  question: 'Pergunta',
  action: 'Ação',
  condition: 'Condição',
  end: 'Fim',
};

export const NODE_TYPE_COLORS: Record<NodeType, string> = {
  start: 'bg-green-500',
  message: 'bg-blue-500',
  question: 'bg-yellow-500',
  action: 'bg-purple-500',
  condition: 'bg-orange-500',
  end: 'bg-red-500',
};

export const ACTION_TYPE_LABELS: Record<ActionType, string> = {
  send_media: 'Enviar Galeria',
  send_pdf: 'Enviar PDF',
  send_video: 'Enviar Vídeo',
  extract_data: 'Extrair Dados',
  schedule_visit: 'Agendar Visita',
  handoff: 'Transbordo Humano',
  ai_response: 'Resposta IA',
  check_party_availability: 'Verificar Agenda Festas',
  check_visit_availability: 'Verificar Agenda Visitas',
  disable_followup: 'Desativar Follow-ups',
  disable_ai: 'Desativar IA',
  mark_existing_customer: 'Marcar como Cliente',
};

export const EXTRACT_FIELD_LABELS: Record<ExtractField, string> = {
  customer_name: 'Nome do Cliente',
  event_date: 'Data da Festa',
  visit_date: 'Data da Visita',
  guest_count: 'Qtd. Convidados',
  child_name: 'Nome da Criança',
  child_age: 'Idade da Criança',
  preferred_slot: 'Turno Preferido',
  event_type: 'Tipo de Evento',
};
