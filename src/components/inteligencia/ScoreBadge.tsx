import { Badge } from "@/components/ui/badge";
import { Flame, Circle } from "lucide-react";

interface ScoreBadgeProps {
  score: number;
  classificacao: 'alta' | 'media' | 'baixa';
  compact?: boolean;
}

const CONFIG = {
  alta: {
    label: 'Alta chance',
    icon: Flame,
    className: 'bg-green-500/15 text-green-700 dark:text-green-400 border-green-500/30',
    iconClass: 'text-green-600 dark:text-green-400',
  },
  media: {
    label: 'Chance média',
    icon: Circle,
    className: 'bg-yellow-500/15 text-yellow-700 dark:text-yellow-400 border-yellow-500/30',
    iconClass: 'text-yellow-500 dark:text-yellow-400',
  },
  baixa: {
    label: 'Baixa chance',
    icon: Circle,
    className: 'bg-muted text-muted-foreground border-border',
    iconClass: 'text-muted-foreground',
  },
} as const;

export function ScoreBadge({ score, classificacao, compact }: ScoreBadgeProps) {
  const cfg = CONFIG[classificacao];
  const Icon = cfg.icon;

  return (
    <Badge variant="outline" className={`gap-1.5 font-semibold ${cfg.className}`}>
      <Icon className={`h-3.5 w-3.5 ${cfg.iconClass} ${classificacao === 'alta' ? 'fill-current' : ''}`} />
      <span>{score}</span>
      {!compact && <span className="font-normal">· {cfg.label}</span>}
    </Badge>
  );
}
