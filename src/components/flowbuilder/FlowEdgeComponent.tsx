import React, { useState } from 'react';
import { FlowEdge } from './types';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FlowEdgeComponentProps {
  edge: FlowEdge;
  sourceX: number;
  sourceY: number;
  targetX: number;
  targetY: number;
  onDelete: () => void;
  isValid?: boolean; // true = blue (connected), false = red (error)
}

export function FlowEdgeComponent({
  edge,
  sourceX,
  sourceY,
  targetX,
  targetY,
  onDelete,
  isValid = true,
}: FlowEdgeComponentProps) {
  const [isHovered, setIsHovered] = useState(false);

  // Colors based on validity
  const baseColor = isValid ? '#3b82f6' : '#ef4444'; // blue-500 or red-500
  const hoverColor = isValid ? '#2563eb' : '#dc2626'; // blue-600 or red-600
  const glowColor = isValid ? 'rgba(59, 130, 246, 0.3)' : 'rgba(239, 68, 68, 0.3)';

  // Calculate control points for a smooth horizontal bezier curve
  const dx = Math.abs(targetX - sourceX);
  
  // Dynamic curve offset based on distance
  const curveOffset = Math.max(60, dx / 2.5);

  // Create a smooth horizontal S-curve path
  const path = `
    M ${sourceX} ${sourceY}
    C ${sourceX + curveOffset} ${sourceY},
      ${targetX - curveOffset} ${targetY},
      ${targetX} ${targetY}
  `;

  // Midpoint for delete button
  const buttonX = (sourceX + targetX) / 2;
  const buttonY = (sourceY + targetY) / 2;

  // Unique IDs for this edge
  const markerId = `arrowhead-${edge.id}`;
  const gradientId = `gradient-${edge.id}`;

  return (
    <g
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="pointer-events-auto cursor-pointer"
    >
      {/* Definitions for gradients and markers */}
      <defs>
        {/* Gradient for the line */}
        <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor={isHovered ? hoverColor : baseColor} />
          <stop offset="100%" stopColor={isHovered ? hoverColor : baseColor} stopOpacity={0.7} />
        </linearGradient>
        
        {/* Arrow marker */}
        <marker
          id={markerId}
          markerWidth="8"
          markerHeight="8"
          refX="6"
          refY="4"
          orient="auto"
          markerUnits="strokeWidth"
        >
          <path
            d="M0,0 L8,4 L0,8 L2,4 Z"
            fill={isHovered ? hoverColor : baseColor}
          />
        </marker>
      </defs>

      {/* Invisible wider path for easier hover */}
      <path
        d={path}
        fill="none"
        stroke="transparent"
        strokeWidth={20}
      />

      {/* Main dotted/dashed path with animation */}
      <path
        d={path}
        fill="none"
        stroke={`url(#${gradientId})`}
        strokeWidth={isHovered ? 3 : 2.5}
        strokeLinecap="round"
        strokeDasharray="8 6"
        markerEnd={`url(#${markerId})`}
        style={{
          transition: 'stroke-width 0.2s ease',
        }}
      >
        {/* Animated dash offset for flowing effect */}
        <animate
          attributeName="stroke-dashoffset"
          from="28"
          to="0"
          dur="0.8s"
          repeatCount="indefinite"
        />
      </path>

      {/* Glow effect on hover */}
      {isHovered && (
        <path
          d={path}
          fill="none"
          stroke={glowColor}
          strokeWidth={8}
          strokeLinecap="round"
          strokeDasharray="8 6"
          style={{ filter: 'blur(2px)' }}
        >
          <animate
            attributeName="stroke-dashoffset"
            from="28"
            to="0"
            dur="0.8s"
            repeatCount="indefinite"
          />
        </path>
      )}

      {/* Source connection point */}
      <circle
        cx={sourceX}
        cy={sourceY}
        r={isHovered ? 5 : 4}
        fill={isHovered ? hoverColor : baseColor}
        stroke="white"
        strokeWidth={2}
        style={{ transition: 'all 0.2s ease' }}
      />

      {/* Target connection point */}
      <circle
        cx={targetX}
        cy={targetY}
        r={isHovered ? 5 : 4}
        fill={isHovered ? hoverColor : baseColor}
        stroke="white"
        strokeWidth={2}
        style={{ transition: 'all 0.2s ease' }}
      />

      {/* Delete button on hover */}
      {isHovered && (
        <g
          transform={`translate(${buttonX - 10}, ${buttonY - 10})`}
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="cursor-pointer"
        >
          <circle
            cx="10"
            cy="10"
            r="10"
            fill="hsl(var(--destructive))"
            style={{ transition: 'opacity 0.2s ease' }}
          />
          <foreignObject x="2" y="2" width="16" height="16">
            <X className="w-4 h-4 text-destructive-foreground" />
          </foreignObject>
        </g>
      )}

      {/* Condition label */}
      {edge.condition_type === 'keyword_match' && edge.condition_value && (
        <foreignObject
          x={buttonX - 50}
          y={buttonY + 15}
          width="100"
          height="24"
        >
          <div className="text-xs text-center bg-background/95 rounded-full px-2 py-1 border shadow-sm truncate font-medium">
            {edge.condition_value}
          </div>
        </foreignObject>
      )}

      {/* Timer edge labels (Respondeu / Timeout) */}
      {edge.condition_type === 'option_selected' && edge.condition_value && ['responded', 'timeout'].includes(edge.condition_value) && (
        <foreignObject
          x={buttonX - 45}
          y={buttonY + 15}
          width="90"
          height="24"
        >
          <div className={cn(
            "text-xs text-center rounded-full px-2 py-1 border shadow-sm font-medium",
            edge.condition_value === 'responded'
              ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-300 dark:border-green-700"
              : "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-700"
          )}>
            {edge.condition_value === 'responded' ? '✅ Respondeu' : '⏰ Timeout'}
          </div>
        </foreignObject>
      )}
    </g>
  );
}
