import { useState, useRef, useCallback, ReactNode } from "react";
import { RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

interface PullToRefreshProps {
  onRefresh: () => Promise<void> | void;
  children: ReactNode;
  className?: string;
  threshold?: number;
  maxPull?: number;
}

export function PullToRefresh({
  onRefresh,
  children,
  className,
  threshold = 80,
  maxPull = 120,
}: PullToRefreshProps) {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isPulling, setIsPulling] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const startY = useRef(0);
  const currentY = useRef(0);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const container = containerRef.current;
    if (!container || isRefreshing) return;
    
    // Only enable pull-to-refresh when scrolled to top
    if (container.scrollTop <= 0) {
      startY.current = e.touches[0].clientY;
      setIsPulling(true);
    }
  }, [isRefreshing]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isPulling || isRefreshing) return;
    
    const container = containerRef.current;
    if (!container || container.scrollTop > 0) {
      setIsPulling(false);
      setPullDistance(0);
      return;
    }

    currentY.current = e.touches[0].clientY;
    const diff = currentY.current - startY.current;
    
    if (diff > 0) {
      // Apply resistance - the further you pull, the harder it gets
      const resistance = 0.5;
      const distance = Math.min(diff * resistance, maxPull);
      setPullDistance(distance);
      
      // Prevent default scroll when pulling down
      if (distance > 10) {
        e.preventDefault();
      }
    }
  }, [isPulling, isRefreshing, maxPull]);

  const handleTouchEnd = useCallback(async () => {
    if (!isPulling) return;
    
    setIsPulling(false);
    
    if (pullDistance >= threshold && !isRefreshing) {
      setIsRefreshing(true);
      setPullDistance(threshold); // Keep indicator visible during refresh
      
      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
        setPullDistance(0);
      }
    } else {
      setPullDistance(0);
    }
  }, [isPulling, pullDistance, threshold, isRefreshing, onRefresh]);

  const progress = Math.min(pullDistance / threshold, 1);
  const rotation = progress * 180;
  const showIndicator = pullDistance > 10 || isRefreshing;

  return (
    <div
      ref={containerRef}
      className={cn("relative overflow-y-auto", className)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Pull indicator */}
      <div
        className={cn(
          "absolute left-0 right-0 flex items-center justify-center transition-opacity duration-200 z-10",
          showIndicator ? "opacity-100" : "opacity-0"
        )}
        style={{
          top: 0,
          height: `${Math.max(pullDistance, isRefreshing ? threshold : 0)}px`,
          transform: `translateY(-${isRefreshing ? 0 : Math.max(0, threshold - pullDistance)}px)`,
        }}
      >
        <div
          className={cn(
            "flex flex-col items-center justify-center gap-1 transition-all duration-200",
            isRefreshing && "animate-pulse"
          )}
        >
          <RefreshCw
            className={cn(
              "w-6 h-6 text-primary transition-transform duration-200",
              isRefreshing && "animate-spin"
            )}
            style={{
              transform: isRefreshing ? undefined : `rotate(${rotation}deg)`,
            }}
          />
          <span className="text-xs text-muted-foreground font-medium">
            {isRefreshing
              ? "Atualizando..."
              : progress >= 1
              ? "Solte para atualizar"
              : "Puxe para atualizar"}
          </span>
        </div>
      </div>

      {/* Content with transform */}
      <div
        className="transition-transform duration-200"
        style={{
          transform: showIndicator
            ? `translateY(${Math.max(pullDistance, isRefreshing ? threshold : 0)}px)`
            : undefined,
        }}
      >
        {children}
      </div>
    </div>
  );
}
