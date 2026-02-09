import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface CompanyMetrics {
  companyId: string;
  companyName: string;
  logoUrl: string | null;
  totalLeads: number;
  leadsClosed: number;
  leadsLost: number;
  leadsNew: number;
  totalConversations: number;
  activeConversations: number;
  totalMessages: number;
}

interface HubUnitRankingProps {
  metrics: CompanyMetrics[];
}

const MEDAL_COLORS = ["text-amber-500", "text-slate-400", "text-orange-700"];

export function HubUnitRanking({ metrics }: HubUnitRankingProps) {
  const ranked = useMemo(() => {
    return metrics
      .map(m => {
        const conversionRate = m.totalLeads > 0 ? (m.leadsClosed / m.totalLeads) * 100 : 0;
        const lossRate = m.totalLeads > 0 ? (m.leadsLost / m.totalLeads) * 100 : 0;
        // Score: weighted by conversion, penalized by loss
        const score = conversionRate * 2 + m.leadsClosed * 3 - lossRate;
        return { ...m, conversionRate, lossRate, score };
      })
      .sort((a, b) => b.score - a.score);
  }, [metrics]);

  if (!metrics.length) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Trophy className="h-4 w-4" />
          Ranking de Unidades
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {ranked.map((unit, i) => (
            <div
              key={unit.companyId}
              className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                i === 0 ? "bg-amber-500/5 border-amber-500/20" : "border-border/50"
              }`}
            >
              <span className={`text-lg font-bold w-6 text-center ${MEDAL_COLORS[i] || "text-muted-foreground"}`}>
                {i + 1}º
              </span>

              {unit.logoUrl ? (
                <img src={unit.logoUrl} alt={unit.companyName} className="h-8 w-8 rounded-lg object-contain bg-muted shrink-0" />
              ) : (
                <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 text-xs font-bold text-primary">
                  {unit.companyName.charAt(0)}
                </div>
              )}

              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">{unit.companyName}</p>
                <p className="text-xs text-muted-foreground">
                  {unit.totalLeads} leads · {unit.totalConversations} conversas
                </p>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <div className="text-center">
                  <p className="text-xs text-muted-foreground">Conversão</p>
                  <Badge
                    variant={unit.conversionRate > 20 ? "default" : "secondary"}
                    className="text-xs"
                  >
                    {unit.conversionRate.toFixed(1)}%
                  </Badge>
                </div>
                <div className="text-center">
                  <p className="text-xs text-muted-foreground">Fechados</p>
                  <p className="text-sm font-bold text-emerald-600">{unit.leadsClosed}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
