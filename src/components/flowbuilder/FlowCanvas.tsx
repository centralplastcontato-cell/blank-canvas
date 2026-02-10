import React, { useRef, useState, useCallback, useEffect } from 'react';
import { FlowNode, FlowEdge, DragState, ConnectionState } from './types';
import { FlowNodeComponent } from './FlowNodeComponent';
import { FlowEdgeComponent } from './FlowEdgeComponent';

interface FlowCanvasProps {
  nodes: FlowNode[];
  edges: FlowEdge[];
  selectedNodeId: string | null;
  onNodeSelect: (nodeId: string | null) => void;
  onNodeMove: (nodeId: string, x: number, y: number) => void;
  onNodeDelete: (nodeId: string) => void;
  onNodeDuplicate?: (nodeId: string) => void;
  onEdgeDelete: (edgeId: string) => void;
  onConnect: (sourceNodeId: string, targetNodeId: string, sourceOptionId?: string) => void;
  onAddNode: (type: string, x: number, y: number) => void;
  isMobile?: boolean;
}

export function FlowCanvas({
  nodes,
  edges,
  selectedNodeId,
  onNodeSelect,
  onNodeMove,
  onNodeDelete,
  onNodeDuplicate,
  onEdgeDelete,
  onConnect,
  onAddNode: _onAddNode,
  isMobile = false,
}: FlowCanvasProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    nodeId: null,
    startX: 0,
    startY: 0,
  });
  const [connectionState, setConnectionState] = useState<ConnectionState>({
    isConnecting: false,
    sourceNodeId: null,
    sourceOptionId: null,
  });
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [canvasOffset, setCanvasOffset] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  
  // Force re-render for edge positions when nodes change
  const [, setEdgeUpdateTrigger] = useState(0);
  
  // State for canvas panning (dragging the background)
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  // Touch state for mobile
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null);
  const [lastTouchDistance, setLastTouchDistance] = useState<number | null>(null);
  
  // Trigger edge position recalculation when nodes change
  useEffect(() => {
    // Small delay to ensure DOM has updated
    const timer = setTimeout(() => {
      setEdgeUpdateTrigger(prev => prev + 1);
    }, 50);
    return () => clearTimeout(timer);
  }, [nodes]);
  
  // Get actual DOM position of an option element relative to its node
  const getOptionDOMOffset = useCallback((nodeId: string, optionId: string): number | null => {
    if (!contentRef.current) return null;
    
    const nodeEl = contentRef.current.querySelector(`[data-node-id="${nodeId}"]`);
    const optionEl = contentRef.current.querySelector(`[data-option-id="${optionId}"]`);
    
    if (!nodeEl || !optionEl) return null;
    
    const nodeRect = nodeEl.getBoundingClientRect();
    const optionRect = optionEl.getBoundingClientRect();
    
    // Calculate the center Y of the option relative to the node's top
    const optionCenterY = (optionRect.top + optionRect.height / 2) - nodeRect.top;
    
    // Adjust for zoom
    return optionCenterY / zoom;
  }, [zoom]);

  // Prevent default wheel/touch behavior with native event listener (passive: false)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const preventWheelDefault = (e: WheelEvent) => {
      e.preventDefault();
    };

    const preventTouchDefault = (e: TouchEvent) => {
      if (e.touches.length > 1) {
        e.preventDefault(); // Prevent default pinch zoom
      }
    };

    canvas.addEventListener('wheel', preventWheelDefault, { passive: false });
    canvas.addEventListener('touchmove', preventTouchDefault, { passive: false });
    
    return () => {
      canvas.removeEventListener('wheel', preventWheelDefault);
      canvas.removeEventListener('touchmove', preventTouchDefault);
    };
  }, []);

  // Handle touch start for mobile - only pan when touching the canvas background
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const target = e.target as HTMLElement;
    
    // Don't start panning if touching a node
    if (target.closest('[data-node-id]')) {
      return;
    }
    
    if (e.touches.length === 1) {
      // Single finger on background - pan
      const touch = e.touches[0];
      setTouchStart({ x: touch.clientX, y: touch.clientY });
      setIsPanning(true);
      setPanStart({ x: touch.clientX, y: touch.clientY });
    } else if (e.touches.length === 2) {
      // Two fingers - pinch to zoom
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const distance = Math.hypot(touch2.clientX - touch1.clientX, touch2.clientY - touch1.clientY);
      setLastTouchDistance(distance);
    }
  }, []);

  // Handle touch move for mobile
  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    if (e.touches.length === 1) {
      const touch = e.touches[0];
      
      // Handle node dragging - priority over panning
      if (dragState.isDragging && dragState.nodeId) {
        e.preventDefault();
        const x = (touch.clientX - rect.left - canvasOffset.x) / zoom;
        const y = (touch.clientY - rect.top - canvasOffset.y) / zoom;
        requestAnimationFrame(() => {
          onNodeMove(dragState.nodeId!, x - dragState.startX, y - dragState.startY);
        });
        return;
      }
      
      // Handle panning only when not dragging a node
      if (isPanning && touchStart) {
        const dx = touch.clientX - panStart.x;
        const dy = touch.clientY - panStart.y;
        setCanvasOffset(prev => ({
          x: prev.x + dx,
          y: prev.y + dy,
        }));
        setPanStart({ x: touch.clientX, y: touch.clientY });
      }
    } else if (e.touches.length === 2 && lastTouchDistance !== null) {
      // Pinch to zoom
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const distance = Math.hypot(touch2.clientX - touch1.clientX, touch2.clientY - touch1.clientY);
      const scale = distance / lastTouchDistance;
      
      setZoom(z => Math.max(0.25, Math.min(2, z * scale)));
      setLastTouchDistance(distance);
    }
  }, [touchStart, isPanning, panStart, dragState, canvasOffset, zoom, onNodeMove, lastTouchDistance]);

  // Handle touch end for mobile
  const handleTouchEnd = useCallback(() => {
    setTouchStart(null);
    setLastTouchDistance(null);
    setIsPanning(false);
    setDragState({ isDragging: false, nodeId: null, startX: 0, startY: 0 });
  }, []);

  // Handle mouse move for dragging, panning and connecting
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    // Handle canvas panning
    if (isPanning) {
      const dx = e.clientX - panStart.x;
      const dy = e.clientY - panStart.y;
      setCanvasOffset(prev => ({
        x: prev.x + dx,
        y: prev.y + dy,
      }));
      setPanStart({ x: e.clientX, y: e.clientY });
      return;
    }

    const x = (e.clientX - rect.left - canvasOffset.x) / zoom;
    const y = (e.clientY - rect.top - canvasOffset.y) / zoom;
    
    setMousePos({ x, y });
    
    // Handle node dragging with smooth updates
    if (dragState.isDragging && dragState.nodeId) {
      requestAnimationFrame(() => {
        onNodeMove(dragState.nodeId!, x - dragState.startX, y - dragState.startY);
      });
    }
  }, [dragState, canvasOffset, zoom, onNodeMove, isPanning, panStart]);

  // Handle mouse up to end drag/connect/pan
  const handleMouseUp = useCallback(() => {
    setDragState({ isDragging: false, nodeId: null, startX: 0, startY: 0 });
    setIsPanning(false);
  }, []);

  // Handle canvas mouse down for panning
  const handleCanvasMouseDown = useCallback((e: React.MouseEvent) => {
    // Only pan when clicking directly on canvas background
    if (e.target === canvasRef.current || (e.target as HTMLElement).closest('.canvas-background')) {
      setIsPanning(true);
      setPanStart({ x: e.clientX, y: e.clientY });
      e.preventDefault();
    }
  }, []);

  // Handle node drag start - NOTE: Don't select node here, only start dragging
  // Selection for editing is done via the edit button on the node
  const handleNodeDragStart = useCallback((nodeId: string, offsetX: number, offsetY: number) => {
    setDragState({
      isDragging: true,
      nodeId,
      startX: offsetX,
      startY: offsetY,
    });
    // Don't call onNodeSelect here - let user tap edit button to open editor
  }, []);

  // Handle connection start
  const handleConnectionStart = useCallback((nodeId: string, optionId?: string) => {
    setConnectionState({
      isConnecting: true,
      sourceNodeId: nodeId,
      sourceOptionId: optionId || null,
    });
  }, []);

  // Handle connection end
  const handleConnectionEnd = useCallback((targetNodeId: string) => {
    if (connectionState.isConnecting && connectionState.sourceNodeId) {
      onConnect(
        connectionState.sourceNodeId,
        targetNodeId,
        connectionState.sourceOptionId || undefined
      );
    }
    setConnectionState({
      isConnecting: false,
      sourceNodeId: null,
      sourceOptionId: null,
    });
  }, [connectionState, onConnect]);

  // Handle canvas click to deselect
  const handleCanvasClick = useCallback((e: React.MouseEvent) => {
    if (e.target === canvasRef.current) {
      onNodeSelect(null);
      setConnectionState({
        isConnecting: false,
        sourceNodeId: null,
        sourceOptionId: null,
      });
    }
  }, [onNodeSelect]);

  // Handle zoom with wheel - scroll to zoom, shift+scroll to pan
  const handleWheel = useCallback((e: React.WheelEvent) => {
    // Stop propagation to prevent page scroll
    e.stopPropagation();
    
    // For React synthetic events, we need to use nativeEvent
    if (e.nativeEvent) {
      e.nativeEvent.stopPropagation();
      e.nativeEvent.stopImmediatePropagation();
    }
    
    if (e.shiftKey) {
      // Shift + scroll for horizontal pan
      setCanvasOffset(prev => ({
        x: prev.x - e.deltaY,
        y: prev.y,
      }));
    } else if (e.ctrlKey || e.metaKey) {
      // Ctrl/Cmd + scroll for zoom (legacy)
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      setZoom(z => Math.max(0.25, Math.min(2, z * delta)));
    } else {
      // Regular scroll for zoom
      const delta = e.deltaY > 0 ? 0.95 : 1.05;
      setZoom(z => Math.max(0.25, Math.min(2, z * delta)));
    }
  }, []);

  // Get node position for edge drawing - estimate node height based on content
  const getNodeHeight = useCallback((node: FlowNode) => {
    // Header: py-2 (8px*2) + content (~28px) = 44px
    let height = 44;
    // Content padding: p-3 = 12px * 2 = 24px
    height += 24;
    // Add height for message template (bg-muted/50 p-2 + line-clamp-3 approx 72px)
    if (node.message_template) height += 72;
    // Add height for action type badge (28px + space)
    if (node.action_type) height += 32;
    // Add height for extract field badge (28px + space)
    if (node.extract_field) height += 32;
    // Add height for each option (py-1 = 4px*2 + content ~20px = ~28px each) + border-t + label (16px)
    if (node.options && node.options.length > 0) {
      height += 24 + (node.options.length * 28);
    }
    return height;
  }, []);

  // Calculate Y offset for a specific option within a node
  // This must match the exact layout of FlowNodeComponent
  const getOptionYOffset = useCallback((node: FlowNode, optionId: string): number => {
    // Header: py-2 (8px*2) + text/icons (typically 20px) = 36px
    let offset = 36;
    
    // Content container starts with p-3 (12px padding)
    offset += 12;
    
    // Count content elements for space-y-2 (8px) gaps
    let contentElements = 0;
    
    // Message template: bg-muted/50 rounded p-2 (8px*2) + line-clamp-3 (max 3 lines ~18px each = ~54px)
    // Total: ~70px for message box
    if (node.message_template) {
      offset += 70;
      contentElements++;
    }
    
    // Action badge: inline-flex py-1 (4px*2) + text (~14px) = ~22px
    if (node.action_type) {
      if (contentElements > 0) offset += 8; // space-y-2 gap
      offset += 22;
      contentElements++;
    }
    
    // Extract badge: inline-flex py-1 (4px*2) + text (~14px) = ~22px + ml-1 
    if (node.extract_field) {
      if (contentElements > 0) offset += 8; // space-y-2 gap
      offset += 22;
      contentElements++;
    }
    
    // Options section gap from content above
    if (contentElements > 0) offset += 8; // space-y-2 gap
    
    // Options section layout:
    // - pt-2 (8px) + border-t (1px)
    // - "Opções:" label text-xs (~14px line-height)
    // - space-y-1 (4px gap between label and first option)
    offset += 9 + 14 + 4;
    
    // Find the option and calculate its center position
    const sortedOptions = [...(node.options || [])].sort((a, b) => a.display_order - b.display_order);
    const optionIndex = sortedOptions.findIndex(o => o.id === optionId);
    
    if (optionIndex >= 0) {
      // Each option: py-1 (4px*2) + text (~14px) + some extra = ~26px height
      // Plus space-y-1 (4px) gap between options
      const optionHeight = 26;
      const optionGap = 4;
      
      offset += optionIndex * (optionHeight + optionGap);
      offset += optionHeight / 2; // Center of this option (13px)
    }
    
    return offset;
  }, []);

  const getNodePosition = useCallback((nodeId: string) => {
    const node = nodes.find(n => n.id === nodeId);
    return node ? { x: node.position_x, y: node.position_y, height: getNodeHeight(node), node } : null;
  }, [nodes, getNodeHeight]);

  // Determine cursor based on state
  const getCursor = () => {
    if (isPanning) return 'grabbing';
    if (dragState.isDragging) return 'move';
    if (connectionState.isConnecting) return 'crosshair';
    return 'grab';
  };

  return (
    <div
      ref={canvasRef}
      className="relative w-full h-full overflow-hidden bg-muted/30 canvas-background touch-none"
      style={{
        backgroundImage: `
          radial-gradient(circle, hsl(var(--border)) 1px, transparent 1px)
        `,
        backgroundSize: `${20 * zoom}px ${20 * zoom}px`,
        backgroundPosition: `${canvasOffset.x}px ${canvasOffset.y}px`,
        cursor: isMobile ? 'default' : getCursor(),
      }}
      onMouseDown={handleCanvasMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onClick={handleCanvasClick}
      onWheel={handleWheel}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Zoom controls - responsive for mobile */}
      <div className={`absolute z-10 flex gap-1.5 bg-background/90 rounded-lg p-1.5 shadow-lg ${isMobile ? 'top-2 right-2' : 'top-4 right-4 gap-2 p-2'}`}>
        <button
          onClick={() => setZoom(z => Math.min(2, z * 1.2))}
          className={`rounded bg-muted hover:bg-muted/80 flex items-center justify-center text-lg ${isMobile ? 'w-8 h-8' : 'w-8 h-8'}`}
        >
          +
        </button>
        <span className={`text-center text-sm flex items-center justify-center ${isMobile ? 'w-12 text-xs' : 'w-16'}`}>
          {Math.round(zoom * 100)}%
        </span>
        <button
          onClick={() => setZoom(z => Math.max(0.25, z * 0.8))}
          className={`rounded bg-muted hover:bg-muted/80 flex items-center justify-center text-lg ${isMobile ? 'w-8 h-8' : 'w-8 h-8'}`}
        >
          −
        </button>
        <button
          onClick={() => { setZoom(1); setCanvasOffset({ x: 0, y: 0 }); }}
          className={`rounded bg-muted hover:bg-muted/80 flex items-center justify-center text-xs ${isMobile ? 'px-1.5 h-8' : 'px-2 h-8'}`}
        >
          Reset
        </button>
      </div>

      {/* Mobile hint */}
      {isMobile && (
        <div className="absolute bottom-2 left-2 z-10 bg-background/80 rounded-lg px-2 py-1 text-xs text-muted-foreground">
          👆 Toque para selecionar • ✌️ Pinça para zoom
        </div>
      )}

      {/* Canvas content with transform - must have overflow visible for edges */}
      <div
        ref={contentRef}
        className="absolute"
        style={{
          transform: `translate(${canvasOffset.x}px, ${canvasOffset.y}px) scale(${zoom})`,
          transformOrigin: '0 0',
          width: '10000px',
          height: '10000px',
        }}
      >
        {/* SVG layer for edges - using viewBox to handle negative coords */}
        <svg
          className="absolute pointer-events-none"
          style={{ 
            position: 'absolute',
            left: 0,
            top: 0,
            width: '10000px', 
            height: '10000px',
            overflow: 'visible',
            pointerEvents: 'none'
          }}
        >
        {edges.map(edge => {
            const sourcePos = getNodePosition(edge.source_node_id);
            const targetPos = getNodePosition(edge.target_node_id);
            if (!sourcePos || !targetPos) return null;

            // Node width: 220px on mobile, 300px on desktop
            const nodeWidth = isMobile ? 220 : 300;
            
            // Calculate source Y position - prefer DOM measurement, fallback to estimate
            let sourceY = sourcePos.y + 32; // Default: header center
            if (edge.source_option_id && sourcePos.node) {
              // Try to get actual DOM position first
              const domOffset = getOptionDOMOffset(edge.source_node_id, edge.source_option_id);
              if (domOffset !== null) {
                sourceY = sourcePos.y + domOffset;
              } else {
                // Fallback to estimate
                sourceY = sourcePos.y + getOptionYOffset(sourcePos.node, edge.source_option_id);
              }
            }

            // Determine if edge is valid (both nodes exist and are properly connected)
            const sourceNode = nodes.find(n => n.id === edge.source_node_id);
            const targetNode = nodes.find(n => n.id === edge.target_node_id);
            const isValid = !!(sourceNode && targetNode);

            return (
              <FlowEdgeComponent
                key={edge.id}
                edge={edge}
                sourceX={sourcePos.x + nodeWidth} // Right edge of node
                sourceY={sourceY}
                targetX={targetPos.x} // Left edge of node
                targetY={targetPos.y + 32} // Align with input handle center
                onDelete={() => onEdgeDelete(edge.id)}
                isValid={isValid}
              />
            );
          })}

          {/* Connection preview line */}
          {connectionState.isConnecting && connectionState.sourceNodeId && (() => {
            const pos = getNodePosition(connectionState.sourceNodeId);
            if (!pos) return null;
            const nodeWidth = isMobile ? 220 : 300;
            
            // Calculate Y position for connection preview - prefer DOM measurement
            let sourceY = pos.y + 32;
            if (connectionState.sourceOptionId && pos.node) {
              const domOffset = getOptionDOMOffset(connectionState.sourceNodeId, connectionState.sourceOptionId);
              if (domOffset !== null) {
                sourceY = pos.y + domOffset;
              } else {
                sourceY = pos.y + getOptionYOffset(pos.node, connectionState.sourceOptionId);
              }
            }
            
            return (
              <line
                x1={pos.x + nodeWidth}
                y1={sourceY}
                x2={mousePos.x}
                y2={mousePos.y}
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                strokeDasharray="8,4"
                className="pointer-events-none"
              />
            );
          })()}
        </svg>

        {/* Nodes */}
        {nodes.map(node => (
          <FlowNodeComponent
            key={node.id}
            node={node}
            isSelected={selectedNodeId === node.id}
            isConnecting={connectionState.isConnecting}
            isMobile={isMobile}
            onDragStart={handleNodeDragStart}
            onConnectionStart={handleConnectionStart}
            onConnectionEnd={handleConnectionEnd}
            onDelete={() => onNodeDelete(node.id)}
            onDuplicate={onNodeDuplicate ? () => onNodeDuplicate(node.id) : undefined}
            onEdit={() => onNodeSelect(node.id)}
          />
        ))}
      </div>
    </div>
  );
}
