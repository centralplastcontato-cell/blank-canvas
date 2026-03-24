import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Clock } from "lucide-react";
import type { TimelineEntry } from "@/hooks/useEventFinancial";

const TYPE_CONFIG: Record<string, { icon: string; color: string }> = {
  payment_created: { icon: "💳", color: "border-l-primary/40" },
  payment_paid: { icon: "✅", color: "border-l-emerald-500/60" },
  payment_deleted: { icon: "🗑️", color: "border-l-red-500/40" },
  extra_added: { icon: "➕", color: "border-l-blue-500/40" },
  extra_removed: { icon: "➖", color: "border-l-muted-foreground/30" },
  discount_applied: { icon: "🏷️", color: "border-l-amber-500/40" },
  discount_removed: { icon: "❌", color: "border-l-red-500/40" },
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
    <div className="space-y-1 max-h-60 overflow-y-auto">
      {timeline.map(entry => {
        const config = TYPE_CONFIG[entry.type] || { icon: "📌", color: "border-l-border" };
        return (
          <div
            key={entry.id}
            className={`flex items-start gap-3 text-sm py-2.5 px-3 rounded-lg border-l-2 bg-muted/20 ${config.color}`}
          >
            <span className="text-base mt-0.5 shrink-0">{config.icon}</span>
            <div className="flex-1 min-w-0">
              <p className="text-foreground text-[13px]">{entry.description}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {format(new Date(entry.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
