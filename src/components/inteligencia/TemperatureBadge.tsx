import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const TEMP_CONFIG: Record<string, { label: string; className: string }> = {
  frio: { label: '❄️ Frio', className: 'bg-blue-500/20 text-blue-300 border-blue-500/30' },
  morno: { label: '🌤️ Morno', className: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30' },
  quente: { label: '🔥 Quente', className: 'bg-orange-500/20 text-orange-300 border-orange-500/30' },
  pronto: { label: '🎯 Pronto', className: 'bg-green-500/20 text-green-300 border-green-500/30' },
};

interface TemperatureBadgeProps {
  temperature: string;
  className?: string;
}

export function TemperatureBadge({ temperature, className }: TemperatureBadgeProps) {
  const config = TEMP_CONFIG[temperature] || TEMP_CONFIG.frio;
  return (
    <Badge variant="outline" className={cn(config.className, className)}>
      {config.label}
    </Badge>
  );
}
