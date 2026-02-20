import React, { useState, useEffect, useRef } from 'react';
import { FlowNode, FlowNodeOption, ActionType, NODE_TYPE_LABELS, ACTION_TYPE_LABELS, EXTRACT_FIELD_LABELS } from './types';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { Plus, Trash2, GripVertical, X, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';


interface FlowNodeEditorProps {
  node: FlowNode | null;
  onUpdate: (updates: Partial<FlowNode>) => void;
  onAddOption: (label: string, value: string) => void;
  onUpdateOption: (optionId: string, updates: Partial<FlowNodeOption>) => void;
  onDeleteOption: (optionId: string) => void;
  onReorderOptions: (orderedIds: string[]) => void;
  onClose: () => void;
  isMobile?: boolean;
}

// Sortable option item component
function SortableOptionItem({
  option,
  onUpdateOption,
  onDeleteOption,
}: {
  option: FlowNodeOption;
  onUpdateOption: (optionId: string, updates: Partial<FlowNodeOption>) => void;
  onDeleteOption: (optionId: string) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: option.id });

  const style: React.CSSProperties = {
    transform: transform ? `translate3d(0, ${transform.y}px, 0)` : undefined,
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : 'auto',
    position: 'relative' as const,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center gap-2 bg-background rounded-lg p-1",
        isDragging && "shadow-lg ring-2 ring-primary"
      )}
    >
      <button
        {...attributes}
        {...listeners}
        className="touch-none p-1 cursor-grab active:cursor-grabbing hover:bg-muted rounded"
        type="button"
      >
        <GripVertical className="w-4 h-4 text-muted-foreground" />
      </button>
      <Input
        value={option.label}
        onChange={(e) => onUpdateOption(option.id, { label: e.target.value })}
        placeholder="Texto do botão"
        className="flex-1"
      />
      <Button
        variant="ghost"
        size="icon"
        onClick={() => onDeleteOption(option.id)}
        className="flex-shrink-0 text-destructive hover:text-destructive"
      >
        <Trash2 className="w-4 h-4" />
      </Button>
    </div>
  );
}

export function FlowNodeEditor({
  node,
  onUpdate,
  onAddOption,
  onUpdateOption,
  onDeleteOption,
  onReorderOptions,
  onClose,
  isMobile = false,
}: FlowNodeEditorProps) {
  const [newOptionLabel, setNewOptionLabel] = useState('');
  const [_newOptionValue, setNewOptionValue] = useState('');
  
  // Local state for text fields to prevent re-render issues on mobile
  const [localTitle, setLocalTitle] = useState(node?.title || '');
  const [localMessage, setLocalMessage] = useState(node?.message_template || '');
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // DnD sensors with touch support
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 150, tolerance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Handle drag end for reordering options
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id && node?.options) {
      const oldIndex = node.options.findIndex(o => o.id === active.id);
      const newIndex = node.options.findIndex(o => o.id === over.id);
      
      if (oldIndex !== -1 && newIndex !== -1) {
        const newOrder = arrayMove(node.options.map(o => o.id), oldIndex, newIndex);
        onReorderOptions(newOrder);
      }
    }
  };

  // Sync local state when node changes (different node selected)
  useEffect(() => {
    if (node) {
      setLocalTitle(node.title);
      setLocalMessage(node.message_template || '');
    }
  }, [node?.id]); // Only sync when node ID changes, not on every update

  // Debounced update function
  const debouncedUpdate = (field: 'title' | 'message_template', value: string) => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      onUpdate({ [field]: value });
    }, 500);
  };

  const handleTitleChange = (value: string) => {
    setLocalTitle(value);
    debouncedUpdate('title', value);
  };

  const handleMessageChange = (value: string) => {
    setLocalMessage(value);
    debouncedUpdate('message_template', value);
  };

  if (!node) {
    if (isMobile) {
      return null;
    }
    return (
      <div className="w-80 border-l bg-background p-4 flex items-center justify-center text-muted-foreground">
        <p>Selecione uma etapa para editar</p>
      </div>
    );
  }

  const handleAddOption = () => {
    if (newOptionLabel.trim()) {
      onAddOption(
        newOptionLabel.trim(),
        newOptionLabel.toLowerCase().trim()
      );
      setNewOptionLabel('');
      setNewOptionValue('');
    }
  };

  const showMessageField = ['start', 'message', 'question', 'action', 'end', 'timer', 'qualify'].includes(node.node_type);
  const showActionField = node.node_type === 'action';
  const showExtractField = ['question', 'action'].includes(node.node_type);
  const showOptionsField = node.node_type === 'question';
  const showQualifyField = node.node_type === 'qualify';
  const showDelayField = node.node_type === 'delay';
  const showTimerField = node.node_type === 'timer';

  const content = (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {/* Title */}
      <div className="space-y-2">
        <Label>Título da Etapa</Label>
        <Input
          value={localTitle}
          onChange={(e) => handleTitleChange(e.target.value)}
          placeholder="Ex: Perguntar nome"
        />
      </div>

      {/* Node Type (read only) */}
      <div className="space-y-2">
        <Label>Tipo</Label>
        <div className="text-sm text-muted-foreground bg-muted rounded px-3 py-2">
          {NODE_TYPE_LABELS[node.node_type]}
        </div>
      </div>

      {/* Message Template */}
      {showMessageField && (
        <div className="space-y-2">
          <Label>Mensagem</Label>
          <Textarea
            value={localMessage}
            onChange={(e) => handleMessageChange(e.target.value)}
            placeholder="Digite a mensagem que será enviada..."
            rows={isMobile ? 6 : 8}
            className="resize-y min-h-[120px]"
          />
          <p className="text-xs text-muted-foreground">
            Use {'{'}nome{'}'} para variáveis dinâmicas
          </p>
        </div>
      )}

      {/* Delay config */}
      {showDelayField && (
        <div className="space-y-2">
          <Label>Tempo de Espera (segundos)</Label>
          <Input
            type="number"
            min={1}
            max={300}
            value={node.action_config?.delay_seconds || 5}
            onChange={(e) => onUpdate({ action_config: { ...node.action_config, delay_seconds: parseInt(e.target.value) || 5 } })}
          />
          <p className="text-xs text-muted-foreground">
            O bot aguardará este tempo antes de seguir para a próxima etapa
          </p>
        </div>
      )}

      {/* Timer config */}
      {showTimerField && (
        <div className="space-y-2">
          <Label>Timeout de Inatividade (minutos)</Label>
          <Input
            type="number"
            min={1}
            max={1440}
            value={node.action_config?.timeout_minutes || 10}
            onChange={(e) => onUpdate({ action_config: { ...node.action_config, timeout_minutes: parseInt(e.target.value) || 10 } })}
          />
          <p className="text-xs text-muted-foreground">
            Se o lead não responder neste tempo, segue pelo caminho "Timeout". As saídas "Respondeu" e "Timeout" são criadas automaticamente.
          </p>
        </div>
      )}

      {/* Action Type */}
      {showActionField && (
        <div className="space-y-2">
          <Label>Tipo de Ação</Label>
          <Select
            value={node.action_type || ''}
            onValueChange={(value) => onUpdate({ action_type: value as ActionType })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione a ação" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(ACTION_TYPE_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          {/* Contextual hints for specific action types */}
          {(node.action_type === 'check_party_availability' || node.action_type === 'check_visit_availability') && (
            <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-3 text-sm">
              <p className="font-medium text-amber-700 dark:text-amber-300 mb-1">
                📅 Verificação de Disponibilidade
              </p>
              <p className="text-amber-600 dark:text-amber-400 text-xs">
                {node.action_type === 'check_party_availability' 
                  ? 'Verifica se a data/turno da festa está disponível no calendário.'
                  : 'Verifica se o horário da visita está disponível.'
                }
              </p>
            </div>
          )}
          
          {node.action_type === 'disable_ai' && (
            <div className="bg-destructive/10 rounded-lg p-3 text-sm">
              <p className="font-medium text-destructive mb-1">🤖 Desativar IA</p>
              <p className="text-destructive/80 text-xs">
                Desativa a IA para esta conversa. O cliente não receberá mais respostas automáticas.
              </p>
            </div>
          )}
          
          {node.action_type === 'handoff' && (
            <div className="bg-primary/10 rounded-lg p-3 text-sm">
              <p className="font-medium text-primary mb-1">👤 Transbordo Humano</p>
              <p className="text-primary/80 text-xs">
                Desativa o bot e transfere a conversa para atendimento humano.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Extract Fields */}
      {showExtractField && (
        <div className="space-y-2">
          <Label>Extrair Dados (opcional)</Label>
          <p className="text-xs text-muted-foreground mb-2">
            Selecione os dados que a IA tentará extrair da resposta
          </p>
          <div className="space-y-2 border rounded-lg p-3 bg-muted/30">
            {Object.entries(EXTRACT_FIELD_LABELS).map(([value, label]) => {
              const currentFields = node.extract_field 
                ? node.extract_field.split(',').map(f => f.trim())
                : [];
              const isSelected = currentFields.includes(value);
              
              return (
                <label 
                  key={value} 
                  className="flex items-center gap-2 cursor-pointer hover:bg-muted rounded px-2 py-1.5 transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={(e) => {
                      let newFields: string[];
                      if (e.target.checked) {
                        newFields = [...currentFields, value];
                      } else {
                        newFields = currentFields.filter(f => f !== value);
                      }
                      onUpdate({ 
                        extract_field: newFields.length > 0 ? newFields.join(',') : null 
                      });
                    }}
                    className="rounded border-input text-primary focus:ring-primary"
                  />
                  <span className="text-sm">{label}</span>
                </label>
              );
            })}
          </div>
          
          {/* Require Extraction Toggle */}
          {node.extract_field && (
            <div className="mt-3 pt-3 border-t border-dashed">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="require-extraction" className="text-sm">
                    Campo obrigatório
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Repete a pergunta se não conseguir extrair
                  </p>
                </div>
                <Switch
                  id="require-extraction"
                  checked={(node as any).require_extraction || false}
                  onCheckedChange={(checked) => onUpdate({ require_extraction: checked } as any)}
                />
              </div>
            </div>
          )}
          
          <p className="text-xs text-muted-foreground">
            Se o lead fornecer múltiplas informações numa resposta, todas serão extraídas
          </p>
        </div>
      )}

      {/* Quick Reply Options with Drag and Drop */}
      {showOptionsField && node.options && (
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-sm">Opções de Resposta Rápida</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={node.options.map(o => o.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-2">
                  {node.options.map((option) => (
                    <SortableOptionItem
                      key={option.id}
                      option={option}
                      onUpdateOption={onUpdateOption}
                      onDeleteOption={onDeleteOption}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>

            <div className="pt-2 border-t space-y-2">
              <Input
                value={newOptionLabel}
                onChange={(e) => setNewOptionLabel(e.target.value)}
                placeholder="Nova opção (ex: Sim)"
                onKeyDown={(e) => e.key === 'Enter' && handleAddOption()}
              />
              <Button
                variant="outline"
                size="sm"
                onClick={handleAddOption}
                disabled={!newOptionLabel.trim()}
                className="w-full"
              >
                <Plus className="w-4 h-4 mr-2" />
                Adicionar Opção
              </Button>
            </div>

            <p className="text-xs text-muted-foreground">
              Cada opção pode ser conectada a uma próxima etapa diferente
            </p>
          </CardContent>
        </Card>
      )}

      {/* AI Interpretation Toggle */}
      {showOptionsField && (
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              Interpretação IA
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="ai-interpretation" className="text-sm">
                  Permitir IA interpretar
                </Label>
                <p className="text-xs text-muted-foreground">
                  Quando ativado, a IA tenta entender respostas livres
                </p>
              </div>
              <Switch
                id="ai-interpretation"
                checked={(node as any).allow_ai_interpretation || false}
                onCheckedChange={(checked) => onUpdate({ allow_ai_interpretation: checked } as any)}
              />
            </div>
            
            {(node as any).allow_ai_interpretation ? (
              <div className="bg-primary/10 rounded-lg p-3 text-sm">
                <p className="text-primary text-xs">
                  ✅ A IA tentará classificar respostas livres nas opções disponíveis.
                </p>
              </div>
            ) : (
              <div className="bg-muted rounded-lg p-3 text-sm">
                <p className="text-muted-foreground text-xs">
                  ⚠️ Apenas respostas que correspondam exatamente às opções serão aceitas.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Qualify Node Configuration */}
      {showQualifyField && node.options && (
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-violet-500" />
              Opções de Qualificação
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Configure as opções possíveis. A IA vai interpretar a resposta livre do lead e mapear para a opção correta.
            </p>
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={node.options.map(o => o.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-2">
                  {node.options.map((option) => (
                    <SortableOptionItem
                      key={option.id}
                      option={option}
                      onUpdateOption={onUpdateOption}
                      onDeleteOption={onDeleteOption}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>

            <div className="pt-2 border-t space-y-2">
              <Input
                value={newOptionLabel}
                onChange={(e) => setNewOptionLabel(e.target.value)}
                placeholder="Nova opção (ex: Manhã)"
                onKeyDown={(e) => e.key === 'Enter' && handleAddOption()}
              />
              <Button
                variant="outline"
                size="sm"
                onClick={handleAddOption}
                disabled={!newOptionLabel.trim()}
                className="w-full"
              >
                <Plus className="w-4 h-4 mr-2" />
                Adicionar Opção
              </Button>
            </div>

            <div className="mt-2 bg-violet-50 dark:bg-violet-900/20 rounded-lg p-3 text-xs text-violet-700 dark:text-violet-300">
              <p className="font-medium mb-1">🧠 Como funciona:</p>
              <p>O lead pode responder livremente (ex: "prefiro de manhã") e a IA classifica automaticamente na opção correta. O label legível (ex: "Manhã") é salvo no CRM.</p>
            </div>

            {/* Context hint field */}
            <div className="space-y-1.5 pt-2 border-t">
              <Label className="text-xs">Dica de contexto para a IA (opcional)</Label>
              <Input
                value={(node.action_config as any)?.qualify_context || ''}
                onChange={(e) => onUpdate({ action_config: { ...(node.action_config as any), qualify_context: e.target.value } })}
                placeholder="Ex: turno do dia, dia da semana, faixa de convidados"
                className="text-xs"
              />
              <p className="text-xs text-muted-foreground">Contexto adicional que ajuda a IA a classificar melhor.</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Qualify extract field */}
      {showQualifyField && (
        <div className="space-y-2">
          <Label>Salvar resultado em</Label>
          <div className="space-y-2 border rounded-lg p-3 bg-muted/30">
            {Object.entries(EXTRACT_FIELD_LABELS).map(([value, label]) => {
              const isSelected = node.extract_field === value;
              return (
                <label
                  key={value}
                  className="flex items-center gap-2 cursor-pointer hover:bg-muted rounded px-2 py-1.5 transition-colors"
                >
                  <input
                    type="radio"
                    name="qualify_extract_field"
                    checked={isSelected}
                    onChange={() => onUpdate({ extract_field: value })}
                    className="rounded-full border-input text-primary focus:ring-primary"
                  />
                  <span className="text-sm">{label}</span>
                </label>
              );
            })}
          </div>
          <p className="text-xs text-muted-foreground">O label da opção classificada será salvo neste campo do CRM.</p>
        </div>
      )}

      {/* Global keywords hint */}
      <div className="bg-primary/10 rounded-lg p-3 text-sm">
        <p className="font-medium text-primary mb-1">
          🔑 Palavras-chave Globais
        </p>
        <p className="text-primary/80 text-xs">
          "humano", "cancelar", "ajuda" sempre funcionam em qualquer etapa.
        </p>
      </div>
    </div>

  );

  // Mobile layout
  if (isMobile) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-background z-10">
          <h3 className="font-semibold">Editar Etapa</h3>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>
        <ScrollArea className="flex-1">
          {content}
        </ScrollArea>
      </div>
    );
  }

  // Desktop layout
  return (
    <div className={cn(
      "border-l bg-background flex flex-col h-full",
      isMobile ? "w-full" : "w-96"
    )}>
      <div className="flex items-center justify-between p-4 border-b">
        <h3 className="font-semibold">Editar Etapa</h3>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </div>
      {content}
    </div>
  );
}
