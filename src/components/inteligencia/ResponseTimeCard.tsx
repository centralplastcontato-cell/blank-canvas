import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ResponseTimeData, formatResponseTime } from "@/hooks/useResponseTime";
import { Clock, Zap, AlertTriangle, TrendingUp } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from "recharts";

interface ResponseTimeCardProps {
  data?: ResponseTimeData;
  isLoading: boolean;
}

export function ResponseTimeCard({ data, isLoading }: ResponseTimeCardProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Tempo de Resposta</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-20 rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data || data.totalAnalyzed === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary" />
            Tempo de Resposta
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Dados insuficientes. As métricas aparecerão quando houver leads com conversas no WhatsApp.
          </p>
        </CardContent>
      </Card>
    );
  }

  const metrics = [
    {
      label: "Tempo Médio",
      value: formatResponseTime(data.averageHours),
      icon: Clock,
      color: data.averageHours <= 1 ? "text-emerald-600" : data.averageHours <= 4 ? "text-amber-600" : "text-rose-600",
      bgColor: data.averageHours <= 1 ? "bg-emerald-500/10" : data.averageHours <= 4 ? "bg-amber-500/10" : "bg-rose-500/10",
    },
    {
      label: "Mediana",
      value: formatResponseTime(data.medianHours),
      icon: TrendingUp,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      label: "Respondidos < 1h",
      value: `${data.respondedIn1h}%`,
      icon: Zap,
      color: data.respondedIn1h >= 50 ? "text-emerald-600" : "text-amber-600",
      bgColor: data.respondedIn1h >= 50 ? "bg-emerald-500/10" : "bg-amber-500/10",
    },
    {
      label: "Sem resposta",
      value: String(data.pendingResponse),
      icon: AlertTriangle,
      color: data.pendingResponse > 0 ? "text-rose-600" : "text-muted-foreground",
      bgColor: data.pendingResponse > 0 ? "bg-rose-500/10" : "bg-muted/50",
    },
  ];

  const chartData = data.byPeriod.map(p => ({
    name: p.period,
    horas: Math.round(p.avgHours * 10) / 10,
  }));

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary" />
            Tempo de Resposta ao Lead
          </CardTitle>
          <span className="text-xs text-muted-foreground">
            {data.totalAnalyzed} leads analisados
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Metric cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {metrics.map((m) => (
            <div
              key={m.label}
              className={`rounded-xl p-3 ${m.bgColor} border border-border/30`}
            >
              <div className="flex items-center gap-1.5 mb-1">
                <m.icon className={`h-3.5 w-3.5 ${m.color}`} />
                <span className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide">
                  {m.label}
                </span>
              </div>
              <p className={`text-xl font-bold ${m.color}`}>{m.value}</p>
            </div>
          ))}
        </div>

        {/* Period chart */}
        {chartData.length > 0 && (
          <div>
            <p className="text-xs text-muted-foreground mb-2 font-medium">
              Tempo médio por período do dia (horas)
            </p>
            <div className="h-40">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} layout="vertical">
                  <XAxis type="number" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                  <YAxis
                    dataKey="name"
                    type="category"
                    width={110}
                    tick={{ fontSize: 11 }}
                    className="fill-muted-foreground"
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                    formatter={(value: number) => [`${formatResponseTime(value)}`, 'Tempo médio']}
                  />
                  <Bar
                    dataKey="horas"
                    fill="hsl(var(--primary) / 0.6)"
                    radius={[0, 4, 4, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* SLA hint */}
        {data.respondedIn1h < 50 && (
          <p className="text-xs text-amber-600 bg-amber-500/10 rounded-lg px-3 py-2">
            💡 Apenas {data.respondedIn1h}% dos leads são respondidos em até 1h. Responder em menos de 5 minutos aumenta 21x a chance de conversão.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
