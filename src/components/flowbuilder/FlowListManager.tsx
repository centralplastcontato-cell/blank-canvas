import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/contexts/CompanyContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { 
  Plus, 
  Pencil, 
  Trash2, 
  GitBranch, 
  Loader2,
  Star,
  Eye,
  Copy,
} from 'lucide-react';
import { FlowBuilder } from './FlowBuilder';

interface ConversationFlow {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export function FlowListManager() {
  const queryClient = useQueryClient();
  const { currentCompany } = useCompany();
  const companyId = currentCompany?.id;
  const [searchParams, setSearchParams] = useSearchParams();
  
  const selectedFlowId = searchParams.get('flowId');
  
  const setSelectedFlowId = (flowId: string | null) => {
    if (flowId) {
      setSearchParams({ flowId });
    } else {
      setSearchParams({});
    }
  };
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingFlow, setEditingFlow] = useState<ConversationFlow | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
  });
  const [flowToDelete, setFlowToDelete] = useState<ConversationFlow | null>(null);

  // Fetch flows filtered by company
  const { data: flows, isLoading } = useQuery({
    queryKey: ['conversation-flows', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .from('conversation_flows')
        .select('*')
        .eq('company_id', companyId)
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as ConversationFlow[];
    },
    enabled: !!companyId,
  });

  // Create flow
  const createMutation = useMutation({
    mutationFn: async (data: { name: string; description: string }) => {
      if (!companyId) throw new Error('Empresa não selecionada');
      
      const { data: flow, error: flowError } = await supabase
        .from('conversation_flows')
        .insert({
          company_id: companyId,
          name: data.name,
          description: data.description || null,
          is_active: true,
          is_default: !flows || flows.length === 0,
        })
        .select()
        .single();

      if (flowError) throw flowError;

      // Create initial "Start" node
      const { error: nodeError } = await supabase
        .from('flow_nodes')
        .insert({
          flow_id: flow.id,
          node_type: 'start',
          title: 'Início',
          message_template: 'O lead enviou uma mensagem',
          position_x: 400,
          position_y: 50,
          display_order: 0,
        });

      if (nodeError) throw nodeError;

      return flow;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversation-flows', companyId] });
      toast.success('Fluxo criado com sucesso!');
      setDialogOpen(false);
      setFormData({ name: '', description: '' });
    },
    onError: (error: any) => {
      toast.error('Erro ao criar fluxo: ' + error.message);
    },
  });

  // Update flow
  const updateMutation = useMutation({
    mutationFn: async (data: { id: string; name: string; description: string }) => {
      const { error } = await supabase
        .from('conversation_flows')
        .update({
          name: data.name,
          description: data.description || null,
        })
        .eq('id', data.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversation-flows', companyId] });
      toast.success('Fluxo atualizado!');
      setDialogOpen(false);
      setEditingFlow(null);
      setFormData({ name: '', description: '' });
    },
    onError: (error: any) => {
      toast.error('Erro ao atualizar: ' + error.message);
    },
  });

  // Delete flow
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('conversation_flows')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversation-flows', companyId] });
      toast.success('Fluxo excluído!');
      setFlowToDelete(null);
    },
    onError: (error: any) => {
      toast.error('Erro ao excluir: ' + error.message);
    },
  });

  // Duplicate flow
  const duplicateMutation = useMutation({
    mutationFn: async (flowId: string) => {
      const { data: originalFlow, error: flowError } = await supabase
        .from('conversation_flows')
        .select('*')
        .eq('id', flowId)
        .single();

      if (flowError) throw flowError;

      const { data: newFlow, error: newFlowError } = await supabase
        .from('conversation_flows')
        .insert({
          name: `${originalFlow.name} (Cópia)`,
          description: originalFlow.description,
          is_active: false,
          is_default: false,
          company_id: originalFlow.company_id,
        })
        .select()
        .single();

      if (newFlowError) throw newFlowError;

      // Fetch and duplicate nodes
      const { data: originalNodes, error: nodesError } = await supabase
        .from('flow_nodes')
        .select('*')
        .eq('flow_id', flowId);

      if (nodesError) throw nodesError;

      if (!originalNodes || originalNodes.length === 0) {
        return newFlow;
      }

      const nodeIdMap: Record<string, string> = {};
      const allOptionIdMaps: Record<string, Record<string, string>> = {};

      for (const node of originalNodes) {
        const { data: newNode, error: newNodeError } = await supabase
          .from('flow_nodes')
          .insert({
            flow_id: newFlow.id,
            node_type: node.node_type,
            title: node.title,
            message_template: node.message_template,
            position_x: node.position_x,
            position_y: node.position_y,
            display_order: node.display_order,
            action_type: node.action_type,
            action_config: node.action_config,
            extract_field: node.extract_field,
            require_extraction: node.require_extraction,
            allow_ai_interpretation: node.allow_ai_interpretation,
          })
          .select()
          .single();

        if (newNodeError) throw newNodeError;
        nodeIdMap[node.id] = newNode.id;

        const { data: originalOptions, error: optionsError } = await supabase
          .from('flow_node_options')
          .select('*')
          .eq('node_id', node.id);

        if (optionsError) throw optionsError;

        if (originalOptions && originalOptions.length > 0) {
          const optionIdMap: Record<string, string> = {};
          
          for (const option of originalOptions) {
            const { data: newOption, error: newOptionError } = await supabase
              .from('flow_node_options')
              .insert({
                node_id: newNode.id,
                label: option.label,
                value: option.value,
                display_order: option.display_order,
              })
              .select()
              .single();

            if (newOptionError) throw newOptionError;
            optionIdMap[option.id] = newOption.id;
          }

          allOptionIdMaps[node.id] = optionIdMap;
        }
      }

      // Duplicate edges
      const { data: originalEdges, error: edgesError } = await supabase
        .from('flow_edges')
        .select('*')
        .eq('flow_id', flowId);

      if (edgesError) throw edgesError;

      if (originalEdges && originalEdges.length > 0) {
        for (const edge of originalEdges) {
          const newSourceNodeId = nodeIdMap[edge.source_node_id];
          const newTargetNodeId = nodeIdMap[edge.target_node_id];
          
          if (!newSourceNodeId || !newTargetNodeId) continue;
          
          let newOptionId: string | null = null;
          if (edge.source_option_id) {
            const optionMap = allOptionIdMaps[edge.source_node_id];
            if (optionMap && optionMap[edge.source_option_id]) {
              newOptionId = optionMap[edge.source_option_id];
            }
          }
          
          await supabase
            .from('flow_edges')
            .insert({
              flow_id: newFlow.id,
              source_node_id: newSourceNodeId,
              target_node_id: newTargetNodeId,
              source_option_id: newOptionId,
              condition_type: edge.condition_type,
              condition_value: edge.condition_value,
              display_order: edge.display_order,
            });
        }
      }

      return newFlow;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversation-flows', companyId] });
      toast.success('Fluxo duplicado com sucesso!');
    },
    onError: (error: any) => {
      toast.error('Erro ao duplicar fluxo: ' + error.message);
    },
  });

  // Toggle active
  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from('conversation_flows')
        .update({ is_active })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversation-flows', companyId] });
    },
  });

  // Set default
  const setDefaultMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!companyId) throw new Error('Empresa não selecionada');
      const { error: unsetError } = await supabase
        .from('conversation_flows')
        .update({ is_default: false })
        .eq('company_id', companyId)
        .neq('id', id);

      if (unsetError) throw unsetError;

      const { error } = await supabase
        .from('conversation_flows')
        .update({ is_default: true })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversation-flows', companyId] });
      toast.success('Fluxo definido como padrão!');
    },
    onError: (error: any) => {
      toast.error('Erro ao definir padrão: ' + error.message);
    },
  });

  const handleOpenDialog = (flow?: ConversationFlow) => {
    if (flow) {
      setEditingFlow(flow);
      setFormData({
        name: flow.name,
        description: flow.description || '',
      });
    } else {
      setEditingFlow(null);
      setFormData({ name: '', description: '' });
    }
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!formData.name.trim()) {
      toast.error('Nome é obrigatório');
      return;
    }

    if (editingFlow) {
      updateMutation.mutate({
        id: editingFlow.id,
        name: formData.name,
        description: formData.description,
      });
    } else {
      createMutation.mutate({
        name: formData.name,
        description: formData.description,
      });
    }
  };

  const handleDeleteRequest = (flow: ConversationFlow) => {
    setFlowToDelete(flow);
  };

  const handleConfirmDelete = () => {
    if (flowToDelete) {
      deleteMutation.mutate(flowToDelete.id);
    }
  };

  // If a flow is selected, show the builder
  if (selectedFlowId) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelectedFlowId(null)}
          >
            ← Voltar
          </Button>
          <span className="text-muted-foreground">|</span>
          <span className="font-medium">
            {flows?.find(f => f.id === selectedFlowId)?.name}
          </span>
        </div>
        <FlowBuilder flowId={selectedFlowId} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Fluxos de Conversa</h3>
          <p className="text-sm text-muted-foreground">
            Crie fluxos visuais para guiar as conversas
          </p>
        </div>
        <Button onClick={() => handleOpenDialog()} className="gap-2">
          <Plus className="h-4 w-4" />
          Novo Fluxo
        </Button>
      </div>

      {/* Flow List */}
      {isLoading ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : !flows || flows.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center h-48 text-center">
            <GitBranch className="h-10 w-10 text-muted-foreground mb-3" />
            <p className="text-muted-foreground mb-3">
              Nenhum fluxo criado ainda
            </p>
            <Button onClick={() => handleOpenDialog()} variant="outline" className="gap-2">
              <Plus className="h-4 w-4" />
              Criar Primeiro Fluxo
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {flows.map((flow) => (
            <Card 
              key={flow.id}
              className={`transition-all hover:shadow-md ${!flow.is_active ? 'opacity-60' : ''}`}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      flow.is_active 
                        ? 'bg-gradient-to-br from-primary/20 to-primary/10' 
                        : 'bg-muted'
                    }`}>
                      <GitBranch className={`h-4 w-4 ${flow.is_active ? 'text-primary' : 'text-muted-foreground'}`} />
                    </div>
                    <div className="min-w-0">
                      <CardTitle className="text-sm font-semibold truncate">{flow.name}</CardTitle>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        {flow.is_default && (
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                            <Star className="h-2.5 w-2.5 mr-0.5 fill-current" />
                            Padrão
                          </Badge>
                        )}
                        <Badge variant={flow.is_active ? "default" : "secondary"} className="text-[10px] px-1.5 py-0">
                          {flow.is_active ? "Ativo" : "Inativo"}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>
                {flow.description && (
                  <CardDescription className="text-xs mt-2 line-clamp-2">
                    {flow.description}
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent className="pt-0 pb-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={flow.is_active}
                      onCheckedChange={(checked) => 
                        toggleActiveMutation.mutate({ id: flow.id, is_active: checked })
                      }
                      className="scale-90"
                    />
                    <span className="text-xs text-muted-foreground">
                      {flow.is_active ? 'Ativo' : 'Inativo'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    {!flow.is_default && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => setDefaultMutation.mutate(flow.id)}
                        title="Definir como padrão"
                      >
                        <Star className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => duplicateMutation.mutate(flow.id)}
                      disabled={duplicateMutation.isPending}
                      title="Duplicar fluxo"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => handleOpenDialog(flow)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive hover:text-destructive"
                      onClick={() => handleDeleteRequest(flow)}
                      disabled={flow.is_default}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="sm"
                      className="h-7 text-xs gap-1"
                      onClick={() => setSelectedFlowId(flow.id)}
                    >
                      <Eye className="h-3 w-3" />
                      Editar
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingFlow ? 'Editar Fluxo' : 'Novo Fluxo'}</DialogTitle>
            <DialogDescription>
              {editingFlow 
                ? 'Atualize as informações do fluxo'
                : 'Crie um novo fluxo de conversa para guiar seus leads'
              }
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nome do Fluxo</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Ex: Fluxo de Qualificação"
              />
            </div>
            <div className="space-y-2">
              <Label>Descrição (opcional)</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Descreva o objetivo deste fluxo..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleSave}
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {(createMutation.isPending || updateMutation.isPending) && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              {editingFlow ? 'Salvar' : 'Criar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!flowToDelete} onOpenChange={(open) => !open && setFlowToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir fluxo?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o fluxo "{flowToDelete?.name}"? 
              Esta ação não pode ser desfeita e todas as etapas do fluxo serão perdidas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setFlowToDelete(null)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmDelete} 
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
