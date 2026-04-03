import { useState } from "react";
import { Bot, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { formatMessageContent } from "@/lib/format-message";

interface FollowUpChipProps {
  content: string | null;
  timestamp: string;
  metadataType?: string;
}

export function isAutomationMessage(metadata: Record<string, string> | null | undefined): boolean {
  const source = metadata?.source;
  return source === 'auto_reminder' || source === 'reactivation_engine';
}

function getAutomationLabel(type?: string, source?: string): string {
  if (source === 'reactivation_engine') {
    switch (type) {
      case 'reactivation_stage_1': return 'Reativação 1 mês';
      case 'reactivation_stage_2': return 'Reativação 2 meses';
      case 'reactivation_stage_3': return 'Reativação 3 meses';
      default: return 'Reativação automática';
    }
  }
  switch (type) {
    case 'next_step_reminder': return 'Lembrete automático';
    case 'follow_up_1': return 'Follow-up automático';
    case 'follow_up_2': return '2º Follow-up';
    case 'follow_up_3': return '3º Follow-up';
    case 'follow_up_4': return '4º Follow-up';
    case 'bot_inactive': return 'Reenvio por inatividade';
    default: return 'Automação';
  }
}

export function FollowUpChip({ content, timestamp, metadataType }: FollowUpChipProps) {
  const [expanded, setExpanded] = useState(false);

  const time = format(new Date(timestamp), "HH:mm", { locale: ptBR });
  const label = getAutomationLabel(metadataType);

  return (
    <div className="flex justify-center my-1">
      <div
        className={cn(
          "max-w-[85%] sm:max-w-[70%] rounded-xl border border-dashed border-border/60 bg-muted/40 transition-all",
          expanded ? "px-3 py-2" : "px-3 py-1.5 cursor-pointer hover:bg-muted/60"
        )}
        onClick={() => !expanded && setExpanded(true)}
      >
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Bot className="w-3.5 h-3.5 shrink-0 text-primary/60" />
          <span className="font-medium">{label}</span>
          <span className="text-[10px] opacity-70">{time}</span>
          <button
            onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
            className="ml-auto p-0.5 rounded hover:bg-background/60 transition-colors"
          >
            {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        </div>
        {expanded && content && (
          <div className="mt-2 pt-2 border-t border-border/40 text-xs text-foreground/80 whitespace-pre-wrap break-words">
            {formatMessageContent(content)}
          </div>
        )}
      </div>
    </div>
  );
}

export { getAutomationLabel };
