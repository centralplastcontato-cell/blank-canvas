import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Clock } from "lucide-react";
import type { TimelineEntry } from "@/hooks/useEventFinancial";

const TYPE_ICONS: Record<string, string> = {
  payment_created: "💳",
  payment_paid: "✅",
  payment_deleted: "🗑️",
  extra_added: "➕",
  extra_removed: "➖",
  discount_applied: "🏷️",
  discount_removed: "❌",
};

interface Props {
  timeline: TimelineEntry[];
}

export function FinancialTimeline({ timeline }: Props) {
  if (!timeline.length) {
    return (
      <div className="text-center py-6 text-muted-foreground text-sm">
        <Clock className="h-5 w-5 mx-auto mb-2 opacity-50" />
        Nenhum registro financeiro ainda
      </div>
    );
  }

  return (
    <div className="space-y-2 max-h-60 overflow-y-auto">
      {timeline.map(entry => (
        <div key={entry.id} className="flex items-start gap-3 text-sm py-2 border-b border-border last:border-0">
          <span className="text-base mt-0.5">{TYPE_ICONS[entry.type] || "📌"}</span>
          <div className="flex-1 min-w-0">
            <p className="text-foreground">{entry.description}</p>
            <p className="text-xs text-muted-foreground">
              {format(new Date(entry.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
