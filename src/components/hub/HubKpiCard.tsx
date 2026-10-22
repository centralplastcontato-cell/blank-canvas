import { ArrowDownRight, ArrowUpRight, Minus, type LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export interface KpiDelta {
  /** Texto já formatado, ex.: "+12%" ou "+1,4 p.p." */
  label: string;
  direction: "up" | "down" | "flat";
  /** Se subir é bom (leads) ou ruim (tempo de resposta) */
  goodWhenUp?: boolean;
}

interface HubKpiCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  accent: string;
  delta?: KpiDelta | null;
  caption?: string;
  hint?: string;
}

// Card de número principal do Painel, com comparação ao período anterior
export function HubKpiCard({ title, value, icon: Icon, accent, delta, caption, hint }: HubKpiCardProps) {
  const good = delta && delta.direction !== "flat"
    ? (delta.direction === "up") === (delta.goodWhenUp ?? true)
    : null;
  const DeltaIcon = delta?.direction === "up" ? ArrowUpRight : delta?.direction === "down" ? ArrowDownRight : Minus;

  const card = (
    <Card className="overflow-hidden h-full">
      <CardContent className="p-4 md:p-5">
        <div className="flex items-center justify-between gap-2 mb-3">
          <span className="text-xs md:text-sm text-muted-foreground font-medium truncate">{title}</span>
          <div className={cn("p-1.5 rounded-lg shrink-0", accent)}>
            <Icon className="w-4 h-4" />
          </div>
        </div>
        <p className="text-2xl md:text-3xl font-bold text-foreground tracking-tight tabular-nums">{value}</p>
        <div className="mt-2 flex items-center gap-1.5 min-h-[20px] flex-wrap">
          {delta && (
            <span
              className={cn(
                "inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[11px] font-semibold tabular-nums",
                good === true && "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
                good === false && "bg-rose-500/10 text-rose-700 dark:text-rose-400",
                good === null && "bg-muted text-muted-foreground"
              )}
            >
              <DeltaIcon className="h-3 w-3" />
              {delta.label}
            </span>
          )}
          {caption && <span className="text-[11px] text-muted-foreground truncate">{caption}</span>}
        </div>
      </CardContent>
    </Card>
  );

  if (!hint) return card;
  return (
    <Tooltip>
      <TooltipTrigger asChild><div className="h-full">{card}</div></TooltipTrigger>
      <TooltipContent className="max-w-xs text-xs">{hint}</TooltipContent>
    </Tooltip>
  );
}

interface HubStatTileProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  hint?: string;
}

// Indicador secundário, discreto
export function HubStatTile({ label, value, icon: Icon, hint }: HubStatTileProps) {
  return (
    <div className="rounded-xl border border-border/60 bg-card px-3 py-2.5 min-w-0" title={hint}>
      <div className="flex items-center gap-1.5 text-muted-foreground">
        <Icon className="h-3.5 w-3.5 shrink-0" />
        <span className="text-[11px] font-medium truncate">{label}</span>
      </div>
      <p className="mt-1 text-lg font-semibold text-foreground tabular-nums truncate">{value}</p>
    </div>
  );
}
