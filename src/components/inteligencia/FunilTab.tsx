import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LEAD_STATUS_LABELS, LeadStatus } from "@/types/crm";
import { LeadIntelligence } from "@/hooks/useLeadIntelligence";
import { ArrowDown } from "lucide-react";

interface FunilTabProps {
  data: LeadIntelligence[];
}

const FUNNEL_STEPS: LeadStatus[] = [
  'novo',
  'em_contato',
  'orcamento_enviado',
  'aguardando_resposta',
  'fechado',
  'perdido',
];

export function FunilTab({ data }: FunilTabProps) {
  const counts: Record<string, number> = {};
  FUNNEL_STEPS.forEach(s => { counts[s] = 0; });
  
  data.forEach(d => {
    const status = d.lead_status as string;
    if (status in counts) {
      counts[status]++;
    }
  });

  const total = data.length || 1;
  const maxCount = Math.max(...Object.values(counts), 1);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Funil de Conversão</CardTitle>
      </CardHeader>
      <CardContent className="space-y-1">
        {FUNNEL_STEPS.map((status, idx) => {
          const count = counts[status] || 0;
          const pct = ((count / total) * 100).toFixed(1);
          const barWidth = Math.max((count / maxCount) * 100, 4);
          const isLoss = status === 'perdido';

          // Conversion rate from previous step
          let conversionNote = '';
          if (idx > 0) {
            const convRate = ((count / total) * 100).toFixed(0);
            conversionNote = `${convRate}% do total`;
          }

          return (
            <div key={status}>
              {idx > 0 && idx < FUNNEL_STEPS.length && (
                <div className="flex justify-center py-1">
                  <ArrowDown className="h-4 w-4 text-muted-foreground/40" />
                </div>
              )}
              <div className="flex items-center gap-3 p-3 rounded-lg bg-card/50 border">
                <div className="w-28 shrink-0">
                  <p className="text-sm font-medium">
                    {LEAD_STATUS_LABELS[status]}
                  </p>
                  {conversionNote && (
                    <p className="text-xs text-muted-foreground">{conversionNote}</p>
                  )}
                </div>
                <div className="flex-1">
                  <div className="h-6 rounded-full bg-muted/50 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        isLoss ? 'bg-red-500/60' : 'bg-primary/60'
                      }`}
                      style={{ width: `${barWidth}%` }}
                    />
                  </div>
                </div>
                <div className="w-20 text-right shrink-0">
                  <span className="text-sm font-semibold">{count}</span>
                  <span className="text-xs text-muted-foreground ml-1">({pct}%)</span>
                </div>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
