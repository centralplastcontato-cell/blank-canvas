import { Bot, Clock } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { getAutomationLabel, isAutomationMessage } from "./FollowUpChip";
import { formatMessageContent } from "@/lib/format-message";

interface AutomationMessage {
  id: string;
  content: string | null;
  timestamp: string;
  metadata?: Record<string, string> | null;
}

interface AutomationTimelineSheetProps {
  isOpen: boolean;
  onClose: () => void;
  messages: AutomationMessage[];
  contactName: string;
}

export function AutomationTimelineSheet({
  isOpen,
  onClose,
  messages,
  contactName,
}: AutomationTimelineSheetProps) {
  const automationMessages = messages
    .filter((m) => isAutomationMessage(m.metadata as Record<string, string> | null))
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="w-[95vw] sm:max-w-md p-0 flex flex-col">
        <SheetHeader className="px-4 pt-4 pb-3 border-b border-border/50">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center">
              <Bot className="w-5 h-5 text-primary" />
            </div>
            <div className="min-w-0">
              <SheetTitle className="text-base">Automações</SheetTitle>
              <p className="text-xs text-muted-foreground truncate">{contactName}</p>
            </div>
            <Badge variant="secondary" className="ml-auto shrink-0">
              {automationMessages.length}
            </Badge>
          </div>
        </SheetHeader>

        <ScrollArea className="flex-1">
          {automationMessages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center px-6">
              <Bot className="w-10 h-10 text-muted-foreground/50 mb-3" />
              <p className="text-sm text-muted-foreground">
                Nenhuma automação enviada nesta conversa
              </p>
            </div>
          ) : (
            <div className="relative px-4 py-4">
              {/* Timeline line */}
              <div className="absolute left-[2.15rem] top-6 bottom-6 w-px bg-border/60" />

              <div className="space-y-4">
                {automationMessages.map((msg, idx) => {
                  const meta = msg.metadata as Record<string, string> | null;
                  const label = getAutomationLabel(meta?.type);
                  const date = new Date(msg.timestamp);

                  return (
                    <div key={msg.id} className="relative flex gap-3">
                      {/* Timeline dot */}
                      <div className="relative z-10 mt-1">
                        <div className={cn(
                          "w-3 h-3 rounded-full border-2 border-background",
                          idx === automationMessages.length - 1
                            ? "bg-primary"
                            : "bg-muted-foreground/40"
                        )} />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0 pb-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-semibold text-foreground">{label}</span>
                          <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                            <Clock className="w-2.5 h-2.5" />
                            {format(date, "dd/MM/yy 'às' HH:mm", { locale: ptBR })}
                          </div>
                        </div>
                        {msg.content && (
                          <div className="text-xs text-muted-foreground whitespace-pre-wrap break-words bg-muted/40 rounded-lg px-3 py-2 border border-border/30">
                            {formatMessageContent(msg.content)}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
