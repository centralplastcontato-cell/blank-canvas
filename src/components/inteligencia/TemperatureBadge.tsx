import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

const TEMP_CONFIG: Record<string, { label: string; className: string; tooltip: string }> = {
  frio: { label: '❄️ Frio', className: 'bg-blue-500/15 text-blue-700 border-blue-500/30', tooltip: 'Baixo engajamento. O lead não interagiu recentemente ou tem poucas interações registradas.' },
  morno: { label: '🌤️ Morno', className: 'bg-yellow-500/15 text-yellow-700 border-yellow-500/30', tooltip: 'Engajamento moderado. O lead respondeu mas ainda não avançou para visita ou orçamento.' },
  quente: { label: '🔥 Quente', className: 'bg-orange-500/15 text-orange-700 border-orange-500/30', tooltip: 'Alto engajamento. O lead pediu visita, orçamento ou demonstrou forte interesse.' },
  pronto: { label: '🎯 Pronto', className: 'bg-green-500/15 text-green-700 border-green-500/30', tooltip: 'Pronto para fechar! Lead com score máximo, orçamento enviado ou visita agendada.' },
};

interface TemperatureBadgeProps {
  temperature: string;
  className?: string;
}

export function TemperatureBadge({ temperature, className }: TemperatureBadgeProps) {
  const config = TEMP_CONFIG[temperature] || TEMP_CONFIG.frio;
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant="outline" className={cn(config.className, "cursor-help", className)}>
            {config.label}
          </Badge>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-[240px] text-xs">
          {config.tooltip}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
