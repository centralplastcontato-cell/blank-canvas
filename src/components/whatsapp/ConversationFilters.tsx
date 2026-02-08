import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Collapsible, 
  CollapsibleContent, 
  CollapsibleTrigger 
} from "@/components/ui/collapsible";
import { ChevronDown, Filter } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  horizontalListSortingStrategy,
} from "@dnd-kit/sortable";
import { DraggableFilterButton, FILTER_CONFIGS } from "./DraggableFilterButton";

interface Conversation {
  id: string;
  unread_count: number;
  is_favorite: boolean;
  is_closed: boolean;
  has_scheduled_visit: boolean;
  is_freelancer: boolean;
  is_equipe: boolean;
  remote_jid: string;
}

export type FilterType = 'all' | 'unread' | 'closed' | 'fechados' | 'visitas' | 'freelancer' | 'equipe' | 'oe' | 'favorites' | 'grupos';

interface ConversationFiltersProps {
  filter: FilterType;
  onFilterChange: (filter: FilterType) => void;
  conversations: Conversation[];
  closedLeadCount: number;
  orcamentoEnviadoCount: number;
  collapsible?: boolean;
  defaultOpen?: boolean;
  filterOrder: string[];
  onFilterOrderChange: (newOrder: string[]) => void;
}

const FILTER_LABELS: Record<string, string> = {
  all: 'Tudo',
  unread: 'Não lidas',
  closed: 'Encerradas',
  fechados: 'Fechados',
  oe: 'O.E',
  visitas: 'Visitas',
  freelancer: 'Freelancer',
  equipe: 'Equipe',
  favorites: 'Favoritos',
  grupos: 'Grupos',
};

export function ConversationFilters({
  filter,
  onFilterChange,
  conversations,
  closedLeadCount,
  orcamentoEnviadoCount,
  collapsible = false,
  defaultOpen = false,
  filterOrder,
  onFilterOrderChange,
}: ConversationFiltersProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Calculate counts
  const counts = useMemo(() => ({
    unread: conversations.filter(c => c.unread_count > 0).length,
    closed: conversations.filter(c => c.is_closed).length,
    visitas: conversations.filter(c => c.has_scheduled_visit).length,
    freelancer: conversations.filter(c => c.is_freelancer).length,
    equipe: conversations.filter(c => c.is_equipe).length,
    grupos: conversations.filter(c => c.remote_jid?.endsWith('@g.us')).length,
    fechados: closedLeadCount,
    oe: orcamentoEnviadoCount,
  }), [conversations, closedLeadCount, orcamentoEnviadoCount]);

  const hasActiveFilter = filter !== 'all';

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = filterOrder.indexOf(active.id as string);
      const newIndex = filterOrder.indexOf(over.id as string);
      const newOrder = arrayMove(filterOrder, oldIndex, newIndex);
      onFilterOrderChange(newOrder);
    }
  }

  const filterButtons = (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={filterOrder} strategy={horizontalListSortingStrategy}>
        <div className="flex gap-1 flex-wrap">
          {filterOrder.map((filterId) => {
            const config = FILTER_CONFIGS[filterId];
            if (!config) return null;

            return (
              <DraggableFilterButton
                key={filterId}
                filter={{
                  id: filterId,
                  ...config,
                  count: counts[filterId as keyof typeof counts] ?? 0,
                }}
                isActive={filter === filterId}
                onClick={() => onFilterChange(filterId as FilterType)}
              />
            );
          })}
        </div>
      </SortableContext>
    </DndContext>
  );

  if (!collapsible) {
    return filterButtons;
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          className={cn(
            "w-full justify-between h-8 text-xs",
            hasActiveFilter && "border-primary/50 bg-primary/5"
          )}
        >
          <span className="flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5" />
            Filtros
            {hasActiveFilter && (
              <Badge variant="secondary" className="h-5 px-1.5 text-[10px] bg-primary/20 text-primary">
                {FILTER_LABELS[filter]}
              </Badge>
            )}
          </span>
          <ChevronDown className={cn(
            "w-4 h-4 text-muted-foreground transition-transform",
            isOpen && "rotate-180"
          )} />
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="pt-2 overflow-hidden data-[state=open]:animate-accordion-down data-[state=closed]:animate-accordion-up">
        {filterButtons}
      </CollapsibleContent>
    </Collapsible>
  );
}
