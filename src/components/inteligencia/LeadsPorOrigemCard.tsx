import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { leadChannelColor, type ChannelBreakdownRow } from "@/lib/leadChannel";

interface Props {
  rows: ChannelBreakdownRow[];
}

function closedText(row: ChannelBreakdownRow): string {
  if (row.closed === 0) return "Nenhum fechou ainda";
  const conv = `${row.conversion.toFixed(0)}% de conversão`;
  return row.closed === 1 ? `1 fechou (${conv})` : `${row.closed} fecharam (${conv})`;
}

export function LeadsPorOrigemCard({ rows }: Props) {
  const maxCount = Math.max(...rows.map(r => r.count), 1);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Leads por Origem</CardTitle>
        <p className="text-xs text-muted-foreground">
          De onde vieram os leads do período — e quantos viraram festa
        </p>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Nenhum lead no período selecionado.</p>
        ) : (
          <div className="space-y-2">
            {rows.map(row => {
              const isTable = row.channel === "mesa";
              return (
                <div
                  key={row.channel}
                  className={`p-2 sm:p-3 rounded-lg border ${isTable ? "bg-pink-500/5 border-pink-500/30" : "bg-card/50"}`}
                >
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="text-sm font-semibold">{row.label}</p>
                    <p className="text-sm font-bold shrink-0">
                      {row.count}
                      <span className="text-xs font-normal text-muted-foreground ml-1">
                        {row.count === 1 ? "lead" : "leads"} · {row.pct.toFixed(0)}%
                      </span>
                    </p>
                  </div>
                  <div className="h-2.5 rounded-full bg-muted/50 overflow-hidden mt-2">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${Math.max((row.count / maxCount) * 100, 3)}%`,
                        backgroundColor: leadChannelColor(row.channel),
                      }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1.5">{closedText(row)}</p>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
