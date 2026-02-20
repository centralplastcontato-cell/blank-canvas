import React from 'react';
import { FlowNode, NODE_TYPE_COLORS, ACTION_TYPE_LABELS, EXTRACT_FIELD_LABELS } from './types';
import { 
  Play, 
  MessageCircle, 
  HelpCircle, 
  Zap, 
  GitBranch, 
  Square, 
  Trash2, 
  ArrowRight,
  GripVertical,
  Pencil,
  Copy,
  Clock,
  Timer,
  Brain,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface FlowNodeComponentProps {
  node: FlowNode;
  isSelected: boolean;
  isConnecting: boolean;
  isMobile?: boolean;
  onDragStart: (nodeId: string, offsetX: number, offsetY: number) => void;
  onConnectionStart: (nodeId: string, optionId?: string) => void;
  onConnectionEnd: (nodeId: string) => void;
  onDelete: () => void;
  onEdit: () => void;
  onDuplicate?: () => void;
}

const NODE_ICONS: Record<string, React.ReactNode> = {
  start: <Play className="w-4 h-4" />,
  message: <MessageCircle className="w-4 h-4" />,
  question: <HelpCircle className="w-4 h-4" />,
  action: <Zap className="w-4 h-4" />,
  condition: <GitBranch className="w-4 h-4" />,
  end: <Square className="w-4 h-4" />,
  delay: <Clock className="w-4 h-4" />,
  timer: <Timer className="w-4 h-4" />,
  qualify: <Brain className="w-4 h-4" />,
};

export function FlowNodeComponent({
  node,
  isSelected,
  isConnecting,
  isMobile: _isMobile = false,
  onDragStart,
  onConnectionStart,
  onConnectionEnd,
  onDelete,
  onEdit,
  onDuplicate,
}: FlowNodeComponentProps) {
  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.node-handle')) return;
    e.stopPropagation();
    e.preventDefault();
    
    const rect = e.currentTarget.getBoundingClientRect();
    const offsetX = e.clientX - rect.left;
    const offsetY = e.clientY - rect.top;
    onDragStart(node.id, offsetX, offsetY);
  };

  // Touch support for mobile - use GripVertical icon area as drag handle
  const handleTouchStart = (e: React.TouchEvent) => {
    const target = e.target as HTMLElement;
    // Allow drag from header or grip icon only
    if (target.closest('.node-handle')) return;
    if (target.closest('button')) return;
    
    // Only drag from header area for cleaner UX
    if (!target.closest('.node-header')) return;
    
    // Prevent canvas from starting pan
    e.stopPropagation();
    
    const touch = e.touches[0];
    const rect = e.currentTarget.getBoundingClientRect();
    const offsetX = touch.clientX - rect.left;
    const offsetY = touch.clientY - rect.top;
    onDragStart(node.id, offsetX, offsetY);
  };

  const handleConnectionClick = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    if (isConnecting) {
      onConnectionEnd(node.id);
    } else {
      onConnectionStart(node.id);
    }
  };

  const handleOptionConnectionClick = (e: React.MouseEvent | React.TouchEvent, optionId: string) => {
    e.stopPropagation();
    e.preventDefault();
    onConnectionStart(node.id, optionId);
  };

  // Allow clicking anywhere on node to complete connection when connecting
  const handleNodeClick = (e: React.MouseEvent) => {
    if (isConnecting) {
      e.stopPropagation();
      e.preventDefault();
      onConnectionEnd(node.id);
    }
  };

  // Touch support for completing connection
  const handleNodeTouch = (e: React.TouchEvent) => {
    if (isConnecting) {
      e.stopPropagation();
      e.preventDefault();
      onConnectionEnd(node.id);
    }
  };

  return (
    <div
      data-node-id={node.id}
      className={cn(
        "absolute bg-background rounded-lg shadow-lg border-2 transition-shadow cursor-move select-none",
        "w-[220px] sm:w-[300px]", // Smaller on mobile
        isSelected ? "border-primary ring-2 ring-primary/20" : "border-border",
        isConnecting && "cursor-crosshair ring-2 ring-green-500/50 hover:ring-green-500"
      )}
      style={{
        left: node.position_x,
        top: node.position_y,
        touchAction: 'none', // Prevent browser handling of touch
        willChange: 'transform, left, top', // Hint to browser for smoother performance
      }}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
      onClick={handleNodeClick}
      onTouchEnd={handleNodeTouch}
    >
      {/* Header - draggable area on mobile */}
      <div className={cn(
        "node-header flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-2 rounded-t-md text-white cursor-move",
        NODE_TYPE_COLORS[node.node_type]
      )}>
        <GripVertical className="w-4 h-4 opacity-70" />
        {NODE_ICONS[node.node_type]}
        <span className="font-medium text-sm flex-1 truncate">{node.title}</span>
        
        {/* Edit button - especially useful on mobile */}
        <button
          onClick={(e) => { e.stopPropagation(); e.preventDefault(); onEdit(); }}
          onTouchEnd={(e) => { e.stopPropagation(); e.preventDefault(); onEdit(); }}
          className="node-handle p-1.5 opacity-70 hover:opacity-100 transition-opacity bg-white/20 rounded"
          title="Editar"
        >
          <Pencil className="w-4 h-4" />
        </button>
        
        {/* Duplicate button */}
        {node.node_type !== 'start' && onDuplicate && (
          <button
            onClick={(e) => { e.stopPropagation(); e.preventDefault(); onDuplicate(); }}
            onTouchEnd={(e) => { e.stopPropagation(); e.preventDefault(); onDuplicate(); }}
            className="node-handle p-1.5 opacity-70 hover:opacity-100 transition-opacity bg-white/20 rounded"
            title="Duplicar"
          >
            <Copy className="w-4 h-4" />
          </button>
        )}
        
        {/* Delete button */}
        {node.node_type !== 'start' && (
          <button
            onClick={(e) => { e.stopPropagation(); e.preventDefault(); onDelete(); }}
            onTouchEnd={(e) => { e.stopPropagation(); e.preventDefault(); onDelete(); }}
            className="node-handle p-1.5 opacity-50 hover:opacity-100 transition-opacity bg-white/10 rounded"
            title="Excluir"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Content */}
      <div className="p-3 space-y-2">
        {/* Message preview */}
        {node.message_template && (
          <div className="text-sm text-muted-foreground bg-muted/50 rounded p-2 line-clamp-3">
            {node.message_template}
          </div>
        )}

        {/* Action type badge */}
        {node.action_type && (
          <div className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded text-xs">
            <Zap className="w-3 h-3" />
            {ACTION_TYPE_LABELS[node.action_type]}
          </div>
        )}

        {/* Extract field badge - supports multiple comma-separated fields */}
        {node.extract_field && (
          <div className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded text-xs ml-1 flex-wrap">
            📝 Extrai: {node.extract_field.split(',').map(f => EXTRACT_FIELD_LABELS[f.trim()] || f.trim()).join(', ')}
          </div>
        )}

        {/* Delay badge */}
        {node.node_type === 'delay' && (
          <div className="inline-flex items-center gap-1 px-2 py-1 bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-300 rounded text-xs">
            <Clock className="w-3 h-3" />
            Espera: {node.action_config?.delay_seconds || 5}s
          </div>
        )}

        {/* Timer badge */}
        {node.node_type === 'timer' && (
          <div className="inline-flex items-center gap-1 px-2 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 rounded text-xs">
            <Timer className="w-3 h-3" />
            Timeout: {node.action_config?.timeout_minutes || 10} min
          </div>
        )}

        {/* Qualify AI badge */}
        {node.node_type === 'qualify' && (
          <div className="inline-flex items-center gap-1 px-2 py-1 bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 rounded text-xs">
            <Brain className="w-3 h-3" />
            Resposta livre → IA classifica
          </div>
        )}

        {/* Quick reply options - each with its own connection handle */}
        {node.options && node.options.length > 0 && (
          <div className="space-y-1 pt-2 border-t relative">
            {node.node_type === 'qualify' ? (
              <div className="flex items-center gap-1 mb-1">
                <Brain className="w-3 h-3 text-violet-500" />
                <span className="text-xs text-violet-600 dark:text-violet-400 font-medium">Caminhos IA:</span>
              </div>
            ) : (
              <span className="text-xs text-muted-foreground">Opções:</span>
            )}
            {/* Sort options by display_order before rendering */}
            {[...node.options]
              .sort((a, b) => a.display_order - b.display_order)
              .map((option, index) => (
              <div
                key={option.id}
                data-option-id={option.id}
                data-option-index={index}
                className={cn(
                  "flex items-center gap-2 text-sm rounded px-2 py-1.5 relative",
                  node.node_type === 'qualify' 
                    ? "bg-violet-100 dark:bg-violet-900/30" 
                    : "bg-primary/10"
                )}
              >
                <span className="flex-1 leading-tight">{option.label}</span>
                {/* Connection handle for this option - centered vertically with the option */}
                <div
                  className={cn(
                    "node-handle absolute -right-5 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full border-2 bg-background flex items-center justify-center cursor-crosshair transition-all z-20",
                    isConnecting 
                      ? "border-primary bg-primary/20 scale-110" 
                      : node.node_type === 'qualify'
                        ? "border-violet-500 hover:border-violet-600 hover:scale-110 hover:bg-violet-500/20"
                        : "border-green-500 hover:border-green-600 hover:scale-110 hover:bg-green-500/20"
                  )}
                  onClick={(e) => handleOptionConnectionClick(e, option.id)}
                  onTouchEnd={(e) => handleOptionConnectionClick(e, option.id)}
                  title={node.node_type === 'qualify' ? "Caminho IA para esta opção" : "Conectar esta opção a outra etapa"}
                >
                  <ArrowRight className={cn("w-3 h-3", node.node_type === 'qualify' ? "text-violet-600" : "text-green-600")} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Output handle (right side) - only show if NO options (options have their own handles) */}
      {node.node_type !== 'end' && (!node.options || node.options.length === 0) && (
        <div
          className={cn(
            "node-handle absolute -right-3 w-6 h-6 rounded-full border-2 bg-background flex items-center justify-center cursor-crosshair transition-all z-10",
            isConnecting 
              ? "border-primary bg-primary/20 scale-110" 
              : "border-muted-foreground hover:border-primary hover:scale-110"
          )}
          style={{ top: '32px', transform: 'translateY(-50%)' }}
          onClick={handleConnectionClick}
          title={isConnecting ? "Clique na etapa destino" : "Clique para conectar"}
        >
          <ArrowRight className="w-3 h-3 text-muted-foreground" />
        </div>
      )}

      {/* Input handle (left side) - for receiving connections */}
      {node.node_type !== 'start' && (
        <div
          className={cn(
            "node-handle absolute -left-3 w-6 h-6 rounded-full border-2 bg-background flex items-center justify-center transition-all z-10",
            isConnecting 
              ? "border-green-500 bg-green-500/20 scale-110 cursor-pointer animate-pulse" 
              : "border-muted-foreground"
          )}
          style={{ top: '32px', transform: 'translateY(-50%)' }}
          onClick={isConnecting ? handleConnectionClick : undefined}
          title="Recebe conexão"
        >
          <div className="w-2 h-2 rounded-full bg-muted-foreground" />
        </div>
      )}
    </div>
  );
}
