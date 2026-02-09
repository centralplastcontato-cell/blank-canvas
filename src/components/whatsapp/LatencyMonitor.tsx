import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, X, ChevronUp, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface LatencyEvent {
  id: string;
  timestamp: number;
  realtimeToUi: number;
  totalEndToEnd: number;
  fromMe: boolean;
}

interface LatencyStats {
  count: number;
  avgRealtimeToUi: number;
  avgTotal: number;
  peakRealtimeToUi: number;
  peakTotal: number;
  idealCount: number;
  acceptableCount: number;
  slowCount: number;
}

// Singleton store for latency events (persists across re-renders)
let latencyEvents: LatencyEvent[] = [];
let listeners: Set<() => void> = new Set();
let debounceTimer: ReturnType<typeof setTimeout> | null = null;

export function addLatencyEvent(event: Omit<LatencyEvent, "id" | "timestamp">) {
  const newEvent: LatencyEvent = {
    ...event,
    id: crypto.randomUUID(),
    timestamp: Date.now(),
  };
  
  latencyEvents = [newEvent, ...latencyEvents].slice(0, 20);
  
  // Debounce notifications to avoid excessive re-renders
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    listeners.forEach(listener => listener());
  }, 100); // Wait 100ms before notifying
  
  console.log(`[Latency] Added event: RT→UI: ${event.realtimeToUi}ms, Total: ${event.totalEndToEnd}ms`);
}

export function useLatencyEvents() {
  const [events, setEvents] = useState<LatencyEvent[]>(latencyEvents);
  
  useEffect(() => {
    const listener = () => setEvents([...latencyEvents]);
    listeners.add(listener);
    return () => { 
      listeners.delete(listener); 
    };
  }, []);
  
  return events;
}

function calculateStats(events: LatencyEvent[]): LatencyStats {
  if (events.length === 0) {
    return {
      count: 0,
      avgRealtimeToUi: 0,
      avgTotal: 0,
      peakRealtimeToUi: 0,
      peakTotal: 0,
      idealCount: 0,
      acceptableCount: 0,
      slowCount: 0,
    };
  }
  
  const sumRtUi = events.reduce((acc, e) => acc + e.realtimeToUi, 0);
  const sumTotal = events.reduce((acc, e) => acc + e.totalEndToEnd, 0);
  const peakRtUi = Math.max(...events.map(e => e.realtimeToUi));
  const peakTotal = Math.max(...events.map(e => e.totalEndToEnd));
  
  let ideal = 0, acceptable = 0, slow = 0;
  events.forEach(e => {
    if (e.totalEndToEnd <= 300) ideal++;
    else if (e.totalEndToEnd <= 700) acceptable++;
    else slow++;
  });
  
  return {
    count: events.length,
    avgRealtimeToUi: Math.round(sumRtUi / events.length),
    avgTotal: Math.round(sumTotal / events.length),
    peakRealtimeToUi: peakRtUi,
    peakTotal: peakTotal,
    idealCount: ideal,
    acceptableCount: acceptable,
    slowCount: slow,
  };
}

interface LatencyMonitorProps {
  isAdmin: boolean;
}

export function LatencyMonitor({ isAdmin }: LatencyMonitorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const events = useLatencyEvents();
  const stats = calculateStats(events);
  
  // Don't render if not admin
  if (!isAdmin) return null;
  
  // Floating button when closed
  if (!isOpen) {
    return (
      <Button
        onClick={() => setIsOpen(true)}
        size="sm"
        variant="outline"
        className="fixed bottom-20 right-4 z-50 h-10 w-10 rounded-full p-0 bg-background/95 backdrop-blur shadow-lg border-primary/20"
      >
        <Activity className="h-4 w-4" />
        {events.length > 0 && (
          <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center">
            {events.length}
          </span>
        )}
      </Button>
    );
  }
  
  // Status badge color
  const getStatusColor = () => {
    if (stats.count === 0) return "bg-muted text-muted-foreground";
    if (stats.avgTotal <= 300) return "bg-green-500 text-white";
    if (stats.avgTotal <= 700) return "bg-yellow-500 text-black";
    return "bg-red-500 text-white";
  };
  
  const getStatusText = () => {
    if (stats.count === 0) return "Sem dados";
    if (stats.avgTotal <= 300) return "Ideal";
    if (stats.avgTotal <= 700) return "Aceitável";
    return "Lento";
  };
  
  return (
    <Card className="fixed bottom-20 right-4 z-50 w-72 shadow-xl border-primary/20 bg-background/95 backdrop-blur">
      <CardHeader className="py-2 px-3 flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Activity className="h-4 w-4" />
          Latência
          <Badge className={cn("text-xs", getStatusColor())}>
            {getStatusText()}
          </Badge>
        </CardTitle>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => setIsMinimized(!isMinimized)}
          >
            {isMinimized ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => setIsOpen(false)}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      </CardHeader>
      
      {!isMinimized && (
        <CardContent className="py-2 px-3 space-y-3">
          {stats.count === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-2">
              Aguardando mensagens em tempo real...
            </p>
          ) : (
            <>
              {/* Main metrics */}
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-muted/50 rounded-lg p-2 text-center">
                  <div className="text-lg font-bold">{stats.avgTotal}ms</div>
                  <div className="text-xs text-muted-foreground">Média Total</div>
                </div>
                <div className="bg-muted/50 rounded-lg p-2 text-center">
                  <div className="text-lg font-bold">{stats.peakTotal}ms</div>
                  <div className="text-xs text-muted-foreground">Pico Total</div>
                </div>
              </div>
              
              {/* RT to UI metrics */}
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-muted/30 rounded-lg p-2 text-center">
                  <div className="text-sm font-semibold">{stats.avgRealtimeToUi}ms</div>
                  <div className="text-xs text-muted-foreground">Média RT→UI</div>
                </div>
                <div className="bg-muted/30 rounded-lg p-2 text-center">
                  <div className="text-sm font-semibold">{stats.peakRealtimeToUi}ms</div>
                  <div className="text-xs text-muted-foreground">Pico RT→UI</div>
                </div>
              </div>
              
              {/* Status breakdown */}
              <div className="flex items-center justify-center gap-2 text-xs">
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-green-500" />
                  {stats.idealCount} ideal
                </span>
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-yellow-500" />
                  {stats.acceptableCount} ok
                </span>
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-red-500" />
                  {stats.slowCount} lento
                </span>
              </div>
              
              {/* Recent events */}
              <div className="border-t pt-2">
                <div className="text-xs text-muted-foreground mb-1">Últimos eventos:</div>
                <div className="max-h-24 overflow-y-auto space-y-1">
                  {events.slice(0, 5).map((event) => (
                    <div
                      key={event.id}
                      className={cn(
                        "text-xs flex items-center justify-between px-2 py-1 rounded",
                        event.totalEndToEnd <= 300 ? "bg-green-500/10" :
                        event.totalEndToEnd <= 700 ? "bg-yellow-500/10" : "bg-red-500/10"
                      )}
                    >
                      <span className="text-muted-foreground">
                        {event.fromMe ? "↑" : "↓"} {new Date(event.timestamp).toLocaleTimeString()}
                      </span>
                      <span className="font-mono font-medium">
                        {event.totalEndToEnd}ms
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="text-xs text-muted-foreground text-center">
                {stats.count}/20 eventos
              </div>
            </>
          )}
        </CardContent>
      )}
    </Card>
  );
}

// Badge component to show on messages
interface LatencyBadgeProps {
  latencyMs: number;
}

export function LatencyBadge({ latencyMs }: LatencyBadgeProps) {
  const status = latencyMs <= 300 ? "ideal" : latencyMs <= 700 ? "acceptable" : "slow";
  
  return (
    <span
      className={cn(
        "inline-flex items-center text-[10px] px-1.5 py-0.5 rounded-full font-mono",
        status === "ideal" ? "bg-green-500/20 text-green-600" :
        status === "acceptable" ? "bg-yellow-500/20 text-yellow-600" :
        "bg-red-500/20 text-red-600"
      )}
    >
      {latencyMs}ms
    </span>
  );
}
