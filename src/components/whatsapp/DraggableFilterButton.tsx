import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  X, Star, CheckCircle, CalendarCheck, Briefcase, Users, FileCheck, UsersRound, GripVertical
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface FilterConfig {
  id: string;
  label: string;
  icon?: ReactNode;
  activeClass: string;
  inactiveClass: string;
  count?: number;
  showBadge?: boolean;
}

interface DraggableFilterButtonProps {
  filter: FilterConfig;
  isActive: boolean;
  onClick: () => void;
}

export function DraggableFilterButton({ 
  filter, 
  isActive, 
  onClick,
}: DraggableFilterButtonProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({ id: filter.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isSortableDragging ? 100 : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center group touch-none",
        isSortableDragging && "opacity-50"
      )}
    >
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing p-1 opacity-0 group-hover:opacity-60 transition-opacity -mr-1"
      >
        <GripVertical className="w-3 h-3 text-muted-foreground" />
      </div>
      <Button 
        variant="ghost"
        size="sm" 
        className={cn(
          "h-8 px-3 text-xs font-semibold rounded-xl transition-all duration-200",
          isActive ? filter.activeClass : filter.inactiveClass
        )}
        onClick={onClick}
      >
        {filter.icon}
        {filter.label}
        {filter.showBadge && filter.count !== undefined && filter.count > 0 && (
          <Badge className={cn(
            "ml-1.5 h-5 min-w-5 px-1.5 text-[11px] font-bold",
            isActive 
              ? "bg-white/20 text-white" 
              : filter.inactiveClass.includes('destructive') 
                ? "bg-destructive text-destructive-foreground"
                : "bg-current/25"
          )}>
            {filter.count}
          </Badge>
        )}
      </Button>
    </div>
  );
}

export const FILTER_CONFIGS: Record<string, Omit<FilterConfig, 'id' | 'count'>> = {
  all: {
    label: 'Tudo',
    activeClass: 'bg-primary text-primary-foreground shadow-md hover:bg-primary/90',
    inactiveClass: 'bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20',
    showBadge: false,
  },
  unread: {
    label: 'Não lidas',
    activeClass: 'bg-destructive text-destructive-foreground shadow-md hover:bg-destructive/90',
    inactiveClass: 'bg-destructive/10 text-destructive hover:bg-destructive/20 border border-destructive/20',
    showBadge: true,
  },
  closed: {
    label: 'Encerradas',
    icon: <X className="w-3.5 h-3.5 mr-1" />,
    activeClass: 'bg-muted-foreground text-white shadow-md hover:bg-muted-foreground/90',
    inactiveClass: 'bg-muted-foreground/10 text-muted-foreground hover:bg-muted-foreground/20 border border-muted-foreground/20',
    showBadge: true,
  },
  fechados: {
    label: 'Fechados',
    icon: <CheckCircle className="w-3.5 h-3.5 mr-1" />,
    activeClass: 'bg-green-600 text-white shadow-md hover:bg-green-600/90',
    inactiveClass: 'bg-green-500/10 text-green-700 dark:text-green-400 hover:bg-green-500/20 border border-green-500/20',
    showBadge: true,
  },
  oe: {
    label: 'O.E',
    icon: <FileCheck className="w-3.5 h-3.5 mr-1" />,
    activeClass: 'bg-purple-600 text-white shadow-md hover:bg-purple-600/90',
    inactiveClass: 'bg-purple-500/10 text-purple-700 dark:text-purple-400 hover:bg-purple-500/20 border border-purple-500/20',
    showBadge: true,
  },
  visitas: {
    label: 'Visitas',
    icon: <CalendarCheck className="w-3.5 h-3.5 mr-1" />,
    activeClass: 'bg-blue-600 text-white shadow-md hover:bg-blue-600/90',
    inactiveClass: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 hover:bg-blue-500/20 border border-blue-500/20',
    showBadge: true,
  },
  freelancer: {
    label: 'Freelancer',
    icon: <Briefcase className="w-3.5 h-3.5 mr-1" />,
    activeClass: 'bg-orange-600 text-white shadow-md hover:bg-orange-600/90',
    inactiveClass: 'bg-orange-500/10 text-orange-700 dark:text-orange-400 hover:bg-orange-500/20 border border-orange-500/20',
    showBadge: true,
  },
  equipe: {
    label: 'Equipe',
    icon: <Users className="w-3.5 h-3.5 mr-1" />,
    activeClass: 'bg-cyan-600 text-white shadow-md hover:bg-cyan-600/90',
    inactiveClass: 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 hover:bg-cyan-500/20 border border-cyan-500/20',
    showBadge: true,
  },
  favorites: {
    label: 'Favoritos',
    icon: <Star className="w-3.5 h-3.5 mr-1" />,
    activeClass: 'bg-amber-500 text-white shadow-md hover:bg-amber-500/90',
    inactiveClass: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 hover:bg-amber-500/20 border border-amber-500/20',
    showBadge: false,
  },
  grupos: {
    label: 'Grupos',
    icon: <UsersRound className="w-3.5 h-3.5 mr-1" />,
    activeClass: 'bg-indigo-600 text-white shadow-md hover:bg-indigo-600/90',
    inactiveClass: 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 hover:bg-indigo-500/20 border border-indigo-500/20',
    showBadge: true,
  },
};
