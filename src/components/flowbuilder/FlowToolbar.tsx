import React from 'react';
import { NodeType, NODE_TYPE_LABELS, NODE_TYPE_COLORS } from './types';
import { Button } from '@/components/ui/button';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { 
  Save,
  Eye,
  RotateCcw,
  Plus,
  Undo2
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface FlowToolbarProps {
  onAddNode: (type: NodeType) => void;
  onSave: () => void;
  onPreview: () => void;
  onReset: () => void;
  onUndo?: () => void;
  isSaving: boolean;
  hasChanges: boolean;
  canUndo?: boolean;
  isMobile?: boolean;
}

const NODE_BUTTONS: { type: NodeType; disabled?: boolean }[] = [
  { type: 'start', disabled: true },
  { type: 'message' },
  { type: 'question' },
  { type: 'action' },
  { type: 'condition' },
  { type: 'end' },
];

export function FlowToolbar({
  onAddNode,
  onSave,
  onPreview,
  onReset,
  onUndo,
  isSaving,
  hasChanges,
  canUndo = false,
  isMobile = false,
}: FlowToolbarProps) {
  if (isMobile) {
    return (
      <div className="flex flex-col gap-2 p-2 border-b bg-background">
        {/* Top row: Add node buttons with horizontal scroll */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground whitespace-nowrap flex items-center gap-1">
            <Plus className="w-3 h-3" />
            Adicionar:
          </span>
          <ScrollArea className="flex-1">
            <div className="flex gap-1.5 pb-2">
              {NODE_BUTTONS.map(({ type, disabled }) => (
                <Button
                  key={type}
                  variant="outline"
                  size="sm"
                  onClick={() => onAddNode(type)}
                  disabled={disabled}
                  className={cn(
                    "gap-1 h-8 px-2 text-xs whitespace-nowrap flex-shrink-0",
                    !disabled && "hover:bg-opacity-20",
                    type === 'start' && "opacity-50"
                  )}
                  title={NODE_TYPE_LABELS[type]}
                >
                  <div className={cn(
                    "w-2 h-2 rounded-full flex-shrink-0",
                    NODE_TYPE_COLORS[type]
                  )} />
                  {NODE_TYPE_LABELS[type]}
                </Button>
              ))}
            </div>
            <ScrollBar orientation="horizontal" className="h-1.5" />
          </ScrollArea>
        </div>

        {/* Bottom row: Action buttons */}
        <div className="flex items-center justify-end gap-2">
          {/* Undo button */}
          {onUndo && (
            <Button
              variant="outline"
              size="sm"
              onClick={onUndo}
              disabled={!canUndo}
              className="h-8 px-2 text-xs"
              title="Desfazer última exclusão"
            >
              <Undo2 className="w-3.5 h-3.5 mr-1" />
              Desfazer
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={onReset}
            disabled={!hasChanges}
            className="h-8 px-2 text-xs"
          >
            <RotateCcw className="w-3.5 h-3.5 mr-1" />
            Resetar
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={onPreview}
            className="h-8 px-2 text-xs"
          >
            <Eye className="w-3.5 h-3.5 mr-1" />
            Testar
          </Button>

          <Button
            size="sm"
            onClick={onSave}
            disabled={isSaving || !hasChanges}
            className="h-8 px-3 text-xs"
          >
            <Save className="w-3.5 h-3.5 mr-1" />
            {isSaving ? 'Salvando...' : 'Salvar'}
          </Button>
        </div>
      </div>
    );
  }

  // Desktop layout
  return (
    <div className="flex items-center justify-between p-3 border-b bg-background">
      {/* Left: Add node buttons */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground mr-2">Adicionar:</span>
        {NODE_BUTTONS.map(({ type, disabled }) => (
          <Button
            key={type}
            variant="outline"
            size="sm"
            onClick={() => onAddNode(type)}
            disabled={disabled}
            className={cn(
              "gap-1.5",
              !disabled && "hover:bg-opacity-20",
              type === 'start' && "opacity-50"
            )}
            title={NODE_TYPE_LABELS[type]}
          >
            <div className={cn(
              "w-2 h-2 rounded-full",
              NODE_TYPE_COLORS[type]
            )} />
            {NODE_TYPE_LABELS[type]}
          </Button>
        ))}
      </div>

      {/* Right: Action buttons */}
      <div className="flex items-center gap-2">
        {/* Undo button */}
        {onUndo && (
          <Button
            variant="outline"
            size="sm"
            onClick={onUndo}
            disabled={!canUndo}
            title="Desfazer última exclusão"
          >
            <Undo2 className="w-4 h-4 mr-1.5" />
            Desfazer
          </Button>
        )}

        <Button
          variant="outline"
          size="sm"
          onClick={onReset}
          disabled={!hasChanges}
        >
          <RotateCcw className="w-4 h-4 mr-1.5" />
          Resetar
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={onPreview}
        >
          <Eye className="w-4 h-4 mr-1.5" />
          Testar
        </Button>

        <Button
          size="sm"
          onClick={onSave}
          disabled={isSaving || !hasChanges}
        >
          <Save className="w-4 h-4 mr-1.5" />
          {isSaving ? 'Salvando...' : 'Salvar'}
        </Button>
      </div>
    </div>
  );
}