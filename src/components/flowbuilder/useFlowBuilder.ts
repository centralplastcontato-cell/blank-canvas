import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  ConversationFlow, 
  FlowNode, 
  FlowEdge, 
  FlowNodeOption,
  NodeType
} from './types';

// Undo action types
interface UndoAction {
  type: 'delete_node' | 'delete_edge' | 'delete_option' | 'move_node';
  data: any;
  timestamp: number;
}

export function useFlowBuilder(flowId?: string) {
  const [flow, setFlow] = useState<ConversationFlow | null>(null);
  const [nodes, setNodes] = useState<FlowNode[]>([]);
  const [edges, setEdges] = useState<FlowEdge[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  
  // Undo stack
  const [undoStack, setUndoStack] = useState<UndoAction[]>([]);
  const maxUndoActions = 20;

  const pushUndo = useCallback((action: Omit<UndoAction, 'timestamp'>) => {
    setUndoStack(prev => {
      const newStack = [...prev, { ...action, timestamp: Date.now() }];
      return newStack.slice(-maxUndoActions);
    });
  }, []);

  const undo = useCallback(async () => {
    if (undoStack.length === 0) {
      toast.info('Nada para desfazer');
      return;
    }

    const lastAction = undoStack[undoStack.length - 1];
    
    try {
      switch (lastAction.type) {
        case 'delete_node': {
          const { node, relatedEdges, relatedOptions } = lastAction.data;
          
          const { data: restoredNode, error: nodeError } = await supabase
            .from('flow_nodes')
            .insert({
              id: node.id,
              flow_id: node.flow_id,
              node_type: node.node_type,
              title: node.title,
              message_template: node.message_template,
              action_type: node.action_type,
              action_config: node.action_config,
              extract_field: node.extract_field,
              position_x: Math.round(node.position_x),
              position_y: Math.round(node.position_y),
              display_order: node.display_order,
            })
            .select()
            .single();
          
          if (nodeError) throw nodeError;
          
          if (relatedOptions && relatedOptions.length > 0) {
            for (const option of relatedOptions) {
              await supabase
                .from('flow_node_options')
                .insert({
                  id: option.id,
                  node_id: option.node_id,
                  label: option.label,
                  value: option.value,
                  display_order: option.display_order,
                });
            }
          }
          
          if (relatedEdges && relatedEdges.length > 0) {
            for (const edge of relatedEdges) {
              await supabase
                .from('flow_edges')
                .insert({
                  id: edge.id,
                  flow_id: edge.flow_id,
                  source_node_id: edge.source_node_id,
                  target_node_id: edge.target_node_id,
                  source_option_id: edge.source_option_id,
                  condition_type: edge.condition_type,
                  condition_value: edge.condition_value,
                  display_order: edge.display_order,
                });
            }
          }
          
          const restoredNodeWithOptions = { ...restoredNode, options: relatedOptions || [] };
          setNodes(prev => [...prev, restoredNodeWithOptions]);
          setEdges(prev => [...prev, ...(relatedEdges || [])]);
          toast.success('Etapa restaurada!');
          break;
        }
        
        case 'delete_edge': {
          const edge = lastAction.data;
          const { data: restoredEdge, error } = await supabase
            .from('flow_edges')
            .insert(edge)
            .select()
            .single();
          
          if (error) throw error;
          setEdges(prev => [...prev, restoredEdge]);
          toast.success('Conexão restaurada!');
          break;
        }
        
        case 'delete_option': {
          const { option, nodeId } = lastAction.data;
          const { data: restoredOption, error } = await supabase
            .from('flow_node_options')
            .insert(option)
            .select()
            .single();
          
          if (error) throw error;
          setNodes(prev => prev.map(n => 
            n.id === nodeId 
              ? { ...n, options: [...(n.options || []), restoredOption] }
              : n
          ));
          toast.success('Opção restaurada!');
          break;
        }
      }
      
      setUndoStack(prev => prev.slice(0, -1));
      setHasChanges(true);
    } catch (error: any) {
      console.error('Error undoing action:', error);
      toast.error('Erro ao desfazer: ' + error.message);
    }
  }, [undoStack]);

  // Load flow data
  const loadFlow = useCallback(async () => {
    if (!flowId) {
      setIsLoading(false);
      return;
    }

    try {
      const { data: flowData, error: flowError } = await supabase
        .from('conversation_flows')
        .select('*')
        .eq('id', flowId)
        .single();

      if (flowError) throw flowError;
      setFlow(flowData);

      const { data: nodesData, error: nodesError } = await supabase
        .from('flow_nodes')
        .select(`
          *,
          options:flow_node_options(*)
        `)
        .eq('flow_id', flowId)
        .order('display_order');

      if (nodesError) throw nodesError;
      
      const nodesWithSortedOptions = (nodesData || []).map(node => ({
        ...node,
        options: (node.options || []).sort((a: any, b: any) => a.display_order - b.display_order)
      }));
      setNodes(nodesWithSortedOptions);

      const { data: edgesData, error: edgesError } = await supabase
        .from('flow_edges')
        .select('*')
        .eq('flow_id', flowId)
        .order('display_order');

      if (edgesError) throw edgesError;
      setEdges(edgesData || []);

    } catch (error: any) {
      console.error('Error loading flow:', error);
      toast.error('Erro ao carregar fluxo');
    } finally {
      setIsLoading(false);
    }
  }, [flowId]);

  useEffect(() => {
    loadFlow();
  }, [loadFlow]);

  // Calculate smart position for new node
  const getSmartPosition = useCallback((nearNodeId?: string): { x: number; y: number } => {
    if (nearNodeId) {
      const refNode = nodes.find(n => n.id === nearNodeId);
      if (refNode) {
        return {
          x: refNode.position_x + 350,
          y: refNode.position_y + 50,
        };
      }
    }
    
    if (nodes.length > 0) {
      const rightmostNode = nodes.reduce((max, node) => 
        node.position_x > max.position_x ? node : max
      );
      return {
        x: rightmostNode.position_x + 350,
        y: rightmostNode.position_y,
      };
    }
    
    return { x: 400, y: 100 };
  }, [nodes]);

  // Add node
  const addNode = useCallback(async (type: NodeType, x?: number, y?: number) => {
    if (!flow) return;

    const position = (x !== undefined && y !== undefined) 
      ? { x: Math.round(x), y: Math.round(y) } 
      : getSmartPosition(selectedNodeId || undefined);

    const titleMap: Record<string, string> = {
      message: 'Mensagem', question: 'Pergunta', action: 'Ação',
      condition: 'Condição', end: 'Fim', delay: 'Espera', timer: 'Timer',
    };

    const nodeInsert: Record<string, any> = {
      flow_id: flow.id,
      node_type: type,
      title: `Novo ${titleMap[type] || type}`,
      position_x: Math.round(position.x),
      position_y: Math.round(position.y),
      display_order: nodes.length,
      message_template: (type === 'message' || type === 'question' || type === 'timer') ? '' : null,
    };

    if (type === 'delay') {
      nodeInsert.action_config = { delay_seconds: 5 };
    } else if (type === 'timer') {
      nodeInsert.action_config = { timeout_minutes: 10 };
    }

    try {
      const { data, error } = await supabase
        .from('flow_nodes')
        .insert(nodeInsert as any)
        .select()
        .single();

      if (error) throw error;

      let options: FlowNodeOption[] = [];

      // For timer nodes, create two fixed options: "Respondeu" and "Timeout"
      if (type === 'timer') {
        const optionsToCreate = [
          { node_id: data.id, label: 'Respondeu', value: 'responded', display_order: 0 },
          { node_id: data.id, label: 'Timeout', value: 'timeout', display_order: 1 },
        ];
        for (const opt of optionsToCreate) {
          const { data: optData, error: optError } = await supabase
            .from('flow_node_options')
            .insert(opt)
            .select()
            .single();
          if (!optError && optData) options.push(optData);
        }
      }

      const newNode: FlowNode = { ...data, options };
      setNodes(prev => [...prev, newNode]);
      setSelectedNodeId(data.id);
      setHasChanges(true);
      toast.success('Etapa adicionada!');
    } catch (error: any) {
      console.error('Error adding node:', error);
      toast.error('Erro ao adicionar etapa');
    }
  }, [flow, nodes.length, getSmartPosition, selectedNodeId]);

  // Duplicate node
  const duplicateNode = useCallback(async (nodeId: string) => {
    if (!flow) return;
    
    const nodeToDuplicate = nodes.find(n => n.id === nodeId);
    if (!nodeToDuplicate) return;
    
    const newPosition = {
      x: Math.round(nodeToDuplicate.position_x + 50),
      y: Math.round(nodeToDuplicate.position_y + 80),
    };

    try {
      const insertData: any = {
        flow_id: flow.id,
        node_type: nodeToDuplicate.node_type,
        title: `${nodeToDuplicate.title} (cópia)`,
        position_x: newPosition.x,
        position_y: newPosition.y,
        display_order: nodes.length,
      };
      
      if (nodeToDuplicate.message_template) insertData.message_template = nodeToDuplicate.message_template;
      if (nodeToDuplicate.action_type) insertData.action_type = nodeToDuplicate.action_type;
      if (nodeToDuplicate.action_config) insertData.action_config = nodeToDuplicate.action_config;
      if (nodeToDuplicate.extract_field) insertData.extract_field = nodeToDuplicate.extract_field;
      if (nodeToDuplicate.allow_ai_interpretation !== undefined) insertData.allow_ai_interpretation = nodeToDuplicate.allow_ai_interpretation;

      const { data: newNode, error: nodeError } = await supabase
        .from('flow_nodes')
        .insert(insertData)
        .select()
        .single();

      if (nodeError) throw nodeError;

      let duplicatedOptions: FlowNodeOption[] = [];
      if (nodeToDuplicate.options && nodeToDuplicate.options.length > 0) {
        for (const option of nodeToDuplicate.options) {
          const { data: newOption, error: optionError } = await supabase
            .from('flow_node_options')
            .insert({
              node_id: newNode.id,
              label: option.label,
              value: option.value,
              display_order: option.display_order,
            })
            .select()
            .single();
          
          if (!optionError && newOption) {
            duplicatedOptions.push(newOption);
          }
        }
      }

      const fullNewNode: FlowNode = { ...newNode, options: duplicatedOptions };
      setNodes(prev => [...prev, fullNewNode]);
      setSelectedNodeId(newNode.id);
      setHasChanges(true);
      toast.success('Etapa duplicada!');
    } catch (error: any) {
      console.error('Error duplicating node:', error);
      toast.error('Erro ao duplicar etapa');
    }
  }, [flow, nodes]);

  // Update node
  const updateNode = useCallback(async (nodeId: string, updates: Partial<FlowNode>) => {
    try {
      const { options: _options, ...dbUpdates } = updates;
      
      const { error } = await supabase
        .from('flow_nodes')
        .update(dbUpdates)
        .eq('id', nodeId);

      if (error) throw error;

      setNodes(prev => prev.map(n => 
        n.id === nodeId ? { ...n, ...updates } : n
      ));
      setHasChanges(true);
    } catch (error: any) {
      console.error('Error updating node:', error);
      toast.error('Erro ao atualizar etapa');
    }
  }, []);

  // Delete node
  const deleteNode = useCallback(async (nodeId: string) => {
    const nodeToDelete = nodes.find(n => n.id === nodeId);
    if (!nodeToDelete) return;

    const relatedEdges = edges.filter(e => 
      e.source_node_id === nodeId || e.target_node_id === nodeId
    );
    const relatedOptions = nodeToDelete.options || [];

    try {
      const { error } = await supabase
        .from('flow_nodes')
        .delete()
        .eq('id', nodeId);

      if (error) throw error;

      pushUndo({
        type: 'delete_node',
        data: { node: nodeToDelete, relatedEdges, relatedOptions }
      });

      setNodes(prev => prev.filter(n => n.id !== nodeId));
      setEdges(prev => prev.filter(e => 
        e.source_node_id !== nodeId && e.target_node_id !== nodeId
      ));
      setSelectedNodeId(null);
      setHasChanges(true);
      toast.success('Etapa excluída');
    } catch (error: any) {
      console.error('Error deleting node:', error);
      toast.error('Erro ao excluir etapa');
    }
  }, [nodes, edges, pushUndo]);

  // Move node
  const moveNode = useCallback((nodeId: string, x: number, y: number) => {
    setNodes(prev => prev.map(n => 
      n.id === nodeId ? { ...n, position_x: x, position_y: y } : n
    ));
    setHasChanges(true);
  }, []);

  // Add edge
  const addEdge = useCallback(async (
    sourceNodeId: string, 
    targetNodeId: string, 
    sourceOptionId?: string
  ) => {
    if (!flow) return;
    if (sourceNodeId === targetNodeId) return;

    const exists = edges.some(e => 
      e.source_node_id === sourceNodeId && 
      e.target_node_id === targetNodeId &&
      e.source_option_id === (sourceOptionId || null)
    );
    if (exists) return;

    try {
      const sourceNode = nodes.find(n => n.id === sourceNodeId);
      const isAvailabilityCheck = sourceNode?.node_type === 'action' && 
        (sourceNode?.action_type === 'check_party_availability' || sourceNode?.action_type === 'check_visit_availability');
      
      let conditionType = sourceOptionId ? 'option_selected' : 'fallback';
      let conditionValue: string | null = null;
      
      if (isAvailabilityCheck && !sourceOptionId) {
        const existingEdgesFromSource = edges.filter(e => e.source_node_id === sourceNodeId);
        const hasAvailableEdge = existingEdgesFromSource.some(e => e.condition_value === 'available');
        const hasUnavailableEdge = existingEdgesFromSource.some(e => e.condition_value === 'unavailable');
        
        conditionType = 'availability';
        if (!hasAvailableEdge) {
          conditionValue = 'available';
        } else if (!hasUnavailableEdge) {
          conditionValue = 'unavailable';
        } else {
          conditionType = 'fallback';
        }
      }
      
      const edgeInsert: Record<string, any> = {
        flow_id: flow.id,
        source_node_id: sourceNodeId,
        target_node_id: targetNodeId,
        source_option_id: sourceOptionId || null,
        condition_type: conditionType,
        display_order: edges.length,
      };
      
      if (conditionValue) {
        edgeInsert.condition_value = conditionValue;
      }

      const { data, error } = await supabase
        .from('flow_edges')
        .insert(edgeInsert as any)
        .select()
        .single();

      if (error) throw error;

      const newEdge: FlowEdge = data;
      setEdges(prev => [...prev, newEdge]);
      setHasChanges(true);
    } catch (error: any) {
      console.error('Error adding edge:', error);
      toast.error('Erro ao criar conexão');
    }
  }, [flow, edges, nodes]);

  // Delete edge
  const deleteEdge = useCallback(async (edgeId: string) => {
    const edgeToDelete = edges.find(e => e.id === edgeId);
    if (!edgeToDelete) return;

    try {
      const { error } = await supabase
        .from('flow_edges')
        .delete()
        .eq('id', edgeId);

      if (error) throw error;

      pushUndo({ type: 'delete_edge', data: edgeToDelete });
      setEdges(prev => prev.filter(e => e.id !== edgeId));
      setHasChanges(true);
    } catch (error: any) {
      console.error('Error deleting edge:', error);
      toast.error('Erro ao excluir conexão');
    }
  }, [edges, pushUndo]);

  // Add option
  const addOption = useCallback(async (nodeId: string, label: string, value: string) => {
    try {
      const node = nodes.find(n => n.id === nodeId);
      const displayOrder = (node?.options?.length || 0);

      const { data, error } = await supabase
        .from('flow_node_options')
        .insert({
          node_id: nodeId,
          label,
          value,
          display_order: displayOrder,
        })
        .select()
        .single();

      if (error) throw error;

      setNodes(prev => prev.map(n => 
        n.id === nodeId 
          ? { ...n, options: [...(n.options || []), data] }
          : n
      ));
      setHasChanges(true);
    } catch (error: any) {
      console.error('Error adding option:', error);
      toast.error('Erro ao adicionar opção');
    }
  }, [nodes]);

  // Update option
  const updateOption = useCallback(async (optionId: string, updates: Partial<FlowNodeOption>) => {
    try {
      const { error } = await supabase
        .from('flow_node_options')
        .update(updates)
        .eq('id', optionId);

      if (error) throw error;

      setNodes(prev => prev.map(n => ({
        ...n,
        options: n.options?.map(o => 
          o.id === optionId ? { ...o, ...updates } : o
        )
      })));
      setHasChanges(true);
    } catch (error: any) {
      console.error('Error updating option:', error);
      toast.error('Erro ao atualizar opção');
    }
  }, []);

  // Delete option
  const deleteOption = useCallback(async (optionId: string) => {
    let optionToDelete: FlowNodeOption | undefined;
    let parentNodeId: string | undefined;
    
    for (const node of nodes) {
      const option = node.options?.find(o => o.id === optionId);
      if (option) {
        optionToDelete = option;
        parentNodeId = node.id;
        break;
      }
    }

    if (!optionToDelete || !parentNodeId) return;

    try {
      const { error } = await supabase
        .from('flow_node_options')
        .delete()
        .eq('id', optionId);

      if (error) throw error;

      await supabase
        .from('flow_edges')
        .delete()
        .eq('source_option_id', optionId);

      pushUndo({
        type: 'delete_option',
        data: { option: optionToDelete, nodeId: parentNodeId }
      });

      setNodes(prev => prev.map(n => ({
        ...n,
        options: n.options?.filter(o => o.id !== optionId)
      })));
      setEdges(prev => prev.filter(e => e.source_option_id !== optionId));
      setHasChanges(true);
    } catch (error: any) {
      console.error('Error deleting option:', error);
      toast.error('Erro ao excluir opção');
    }
  }, [nodes, pushUndo]);

  // Reorder options
  const reorderOptions = useCallback(async (nodeId: string, orderedOptionIds: string[]) => {
    try {
      const updatePromises = orderedOptionIds.map((optionId, index) => 
        supabase
          .from('flow_node_options')
          .update({ display_order: index })
          .eq('id', optionId)
      );

      await Promise.all(updatePromises);

      setNodes(prev => prev.map(n => {
        if (n.id !== nodeId || !n.options) return n;
        
        const reorderedOptions = orderedOptionIds
          .map(id => n.options!.find(o => o.id === id))
          .filter(Boolean) as FlowNodeOption[];
        
        return { ...n, options: reorderedOptions };
      }));
      
      setHasChanges(true);
    } catch (error: any) {
      console.error('Error reordering options:', error);
      toast.error('Erro ao reordenar opções');
    }
  }, []);

  // Save positions
  const savePositions = useCallback(async () => {
    setIsSaving(true);
    try {
      const updatePromises = nodes.map(node => 
        supabase
          .from('flow_nodes')
          .update({ 
            position_x: Math.round(node.position_x), 
            position_y: Math.round(node.position_y) 
          })
          .eq('id', node.id)
      );

      const results = await Promise.all(updatePromises);
      
      const errors = results.filter(r => r.error);
      if (errors.length > 0) {
        throw new Error(`${errors.length} posições falharam ao salvar`);
      }

      setHasChanges(false);
      toast.success('Fluxo salvo com sucesso!');
    } catch (error: any) {
      console.error('Error saving positions:', error);
      toast.error('Erro ao salvar: ' + (error.message || 'Tente novamente'));
    } finally {
      setIsSaving(false);
    }
  }, [nodes]);

  // Reset changes
  const resetChanges = useCallback(() => {
    loadFlow();
    setHasChanges(false);
    setUndoStack([]);
  }, [loadFlow]);

  const selectedNode = nodes.find(n => n.id === selectedNodeId) || null;
  const canUndo = undoStack.length > 0;

  return {
    flow,
    nodes,
    edges,
    isLoading,
    isSaving,
    hasChanges,
    selectedNodeId,
    selectedNode,
    canUndo,
    setSelectedNodeId,
    addNode,
    duplicateNode,
    updateNode,
    deleteNode,
    moveNode,
    addEdge,
    deleteEdge,
    addOption,
    updateOption,
    deleteOption,
    reorderOptions,
    savePositions,
    resetChanges,
    loadFlow,
    undo,
  };
}
