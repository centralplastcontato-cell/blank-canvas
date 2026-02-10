import React, { useState } from 'react';
import { FlowCanvas } from './FlowCanvas';
import { FlowToolbar } from './FlowToolbar';
import { FlowNodeEditor } from './FlowNodeEditor';
import { FlowPreviewDialog } from './FlowPreviewDialog';
import { useFlowBuilder } from './useFlowBuilder';
import { NodeType } from './types';
import { Loader2 } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  Dialog,
  DialogContent,
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

interface FlowBuilderProps {
  flowId: string;
}

export function FlowBuilder({ flowId }: FlowBuilderProps) {
  const isMobile = useIsMobile();
  const {
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
    undo,
  } = useFlowBuilder(flowId);

  const [showPreview, setShowPreview] = useState(false);
  const [nodeToDelete, setNodeToDelete] = useState<string | null>(null);

  const handleAddNode = (type: NodeType) => {
    // Use smart positioning - addNode now handles this automatically
    addNode(type);
  };

  // Handle node deletion with confirmation
  const handleDeleteNodeRequest = (nodeId: string) => {
    setNodeToDelete(nodeId);
  };

  const handleConfirmDelete = () => {
    if (nodeToDelete) {
      deleteNode(nodeToDelete);
      setNodeToDelete(null);
    }
  };

  const handleCancelDelete = () => {
    setNodeToDelete(null);
  };

  // Get node title for confirmation dialog
  const nodeToDeleteTitle = nodeToDelete 
    ? nodes.find(n => n.id === nodeToDelete)?.title || 'esta etapa'
    : '';

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!flow) {
    return (
      <div className="flex items-center justify-center h-96 text-muted-foreground">
        Fluxo não encontrado
      </div>
    );
  }

  // Mobile layout
  if (isMobile) {
    return (
      <div className="flex flex-col h-[calc(100vh-8rem)]">
        {/* Toolbar - scrollable on mobile */}
        <FlowToolbar
          onAddNode={handleAddNode}
          onSave={savePositions}
          onPreview={() => setShowPreview(true)}
          onReset={resetChanges}
          onUndo={undo}
          isSaving={isSaving}
          hasChanges={hasChanges}
          canUndo={canUndo}
          isMobile={true}
        />

        {/* Canvas - full screen on mobile */}
        <div className="flex-1 relative overflow-hidden">
          <FlowCanvas
            nodes={nodes}
            edges={edges}
            selectedNodeId={selectedNodeId}
            onNodeSelect={setSelectedNodeId}
            onNodeMove={moveNode}
            onNodeDelete={handleDeleteNodeRequest}
            onNodeDuplicate={duplicateNode}
            onEdgeDelete={deleteEdge}
            onConnect={addEdge}
            onAddNode={addNode}
            isMobile={true}
          />
        </div>

        {/* Editor as dialog on mobile - better keyboard support than drawer */}
        <Dialog 
          open={!!selectedNodeId} 
          onOpenChange={(open) => !open && setSelectedNodeId(null)}
        >
          <DialogContent className="max-h-[85vh] overflow-y-auto p-0 gap-0">
            <FlowNodeEditor
              node={selectedNode}
              onUpdate={(updates) => selectedNodeId && updateNode(selectedNodeId, updates)}
              onAddOption={(label, value) => selectedNodeId && addOption(selectedNodeId, label, value)}
              onUpdateOption={updateOption}
              onDeleteOption={deleteOption}
              onReorderOptions={(orderedIds) => selectedNodeId && reorderOptions(selectedNodeId, orderedIds)}
              onClose={() => setSelectedNodeId(null)}
              isMobile={true}
            />
          </DialogContent>
        </Dialog>

        {/* Preview dialog */}
        <FlowPreviewDialog
          open={showPreview}
          onOpenChange={setShowPreview}
          flow={flow}
          nodes={nodes}
          edges={edges}
        />

        {/* Delete confirmation dialog */}
        <AlertDialog open={!!nodeToDelete} onOpenChange={(open) => !open && handleCancelDelete()}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir etapa?</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja excluir "{nodeToDeleteTitle}"? 
                Esta ação pode ser desfeita com o botão "Desfazer".
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={handleCancelDelete}>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Excluir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    );
  }

  // Desktop layout
  return (
    <div className="flex flex-col h-[calc(100vh-12rem)]">
      {/* Toolbar */}
      <FlowToolbar
        onAddNode={handleAddNode}
        onSave={savePositions}
        onPreview={() => setShowPreview(true)}
        onReset={resetChanges}
        onUndo={undo}
        isSaving={isSaving}
        hasChanges={hasChanges}
        canUndo={canUndo}
        isMobile={false}
      />

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Canvas */}
        <div className="flex-1 relative">
          <FlowCanvas
            nodes={nodes}
            edges={edges}
            selectedNodeId={selectedNodeId}
            onNodeSelect={setSelectedNodeId}
            onNodeMove={moveNode}
            onNodeDelete={handleDeleteNodeRequest}
            onNodeDuplicate={duplicateNode}
            onEdgeDelete={deleteEdge}
            onConnect={addEdge}
            onAddNode={addNode}
            isMobile={false}
          />
        </div>

        {/* Editor sidebar */}
        <FlowNodeEditor
          node={selectedNode}
          onUpdate={(updates) => selectedNodeId && updateNode(selectedNodeId, updates)}
          onAddOption={(label, value) => selectedNodeId && addOption(selectedNodeId, label, value)}
          onUpdateOption={updateOption}
          onDeleteOption={deleteOption}
          onReorderOptions={(orderedIds) => selectedNodeId && reorderOptions(selectedNodeId, orderedIds)}
          onClose={() => setSelectedNodeId(null)}
          isMobile={false}
        />
      </div>

      {/* Preview dialog */}
      <FlowPreviewDialog
        open={showPreview}
        onOpenChange={setShowPreview}
        flow={flow}
        nodes={nodes}
        edges={edges}
      />

      {/* Delete confirmation dialog */}
      <AlertDialog open={!!nodeToDelete} onOpenChange={(open) => !open && handleCancelDelete()}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir etapa?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir "{nodeToDeleteTitle}"? 
              Esta ação pode ser desfeita com o botão "Desfazer".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelDelete}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}