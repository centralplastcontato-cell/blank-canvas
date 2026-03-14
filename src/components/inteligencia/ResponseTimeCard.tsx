import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ResponseTimeData, formatResponseTime } from "@/hooks/useResponseTime";
import { LeadJourneyData } from "@/hooks/useLeadJourneyTimes";
import { Clock, Zap, AlertTriangle, TrendingUp, Route, ArrowRight } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from "recharts";

interface ResponseTimeCardProps {
  data?: ResponseTimeData;
  isLoading: boolean;
  journeyData?: LeadJourneyData;
  journeyLoading?: boolean;
}

export function ResponseTimeCard({ data, isLoading, journeyData, journeyLoading }: ResponseTimeCardProps) {
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

  const STAGE_COLORS: Record<string, string> = {
    'primeiro_contato': 'hsl(var(--primary) / 0.7)',
    'em_contato': 'hsl(210, 70%, 55%)',
    'orcamento_enviado': 'hsl(40, 90%, 50%)',
    'aguardando_resposta': 'hsl(20, 90%, 55%)',
    'fechado': 'hsl(140, 60%, 45%)',
  };

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
        <Tabs defaultValue="resposta" className="w-full">
          <TabsList className="w-full grid grid-cols-2">
            <TabsTrigger value="resposta" className="text-xs gap-1.5">
              <Zap className="h-3.5 w-3.5" />
              1ª Resposta
            </TabsTrigger>
            <TabsTrigger value="jornada" className="text-xs gap-1.5">
              <Route className="h-3.5 w-3.5" />
              Jornada do Lead
            </TabsTrigger>
          </TabsList>

          {/* Tab 1: Response Time (existing) */}
          <TabsContent value="resposta" className="space-y-4 mt-3">
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

            {data.respondedIn1h < 50 && (
              <p className="text-xs text-amber-600 bg-amber-500/10 rounded-lg px-3 py-2">
                💡 Apenas {data.respondedIn1h}% dos leads são respondidos em até 1h. Responder em menos de 5 minutos aumenta 21x a chance de conversão.
              </p>
            )}
          </TabsContent>

          {/* Tab 2: Lead Journey */}
          <TabsContent value="jornada" className="space-y-4 mt-3">
            {journeyLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 rounded-lg" />
                ))}
              </div>
            ) : !journeyData || journeyData.stages.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                Dados insuficientes. Necessário que leads tenham passado por mudanças de status.
              </p>
            ) : (
              <>
                <p className="text-xs text-muted-foreground">
                  Tempo médio que um lead leva desde a chegada até cada etapa do funil.
                  Baseado em <strong>{journeyData.totalLeadsAnalyzed}</strong> leads.
                </p>

                {/* Journey timeline */}
                <div className="space-y-2">
                  {journeyData.stages.map((stage, idx) => {
                    const color = STAGE_COLORS[stage.stage] || 'hsl(var(--primary))';
                    const isGood = stage.stage === 'primeiro_contato'
                      ? stage.medianHours <= 1
                      : stage.stage === 'orcamento_enviado'
                        ? stage.medianHours <= 48
                        : true;

                    return (
                      <div key={stage.stage}>
                        {idx > 0 && (
                          <div className="flex justify-center py-0.5">
                            <ArrowRight className="h-3 w-3 text-muted-foreground/40 rotate-90" />
                          </div>
                        )}
                        <div className="flex items-center gap-3 p-3 rounded-xl border border-border/30 bg-card/50">
                          <div
                            className="w-1.5 h-12 rounded-full shrink-0"
                            style={{ backgroundColor: color }}
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium">{stage.label}</p>
                            <p className="text-[11px] text-muted-foreground">
                              {stage.count} leads chegaram nessa etapa
                            </p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className={`text-lg font-bold ${isGood ? 'text-foreground' : 'text-amber-600'}`}>
                              {formatResponseTime(stage.medianHours)}
                            </p>
                            <p className="text-[10px] text-muted-foreground">
                              média: {formatResponseTime(stage.avgHours)}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Insight */}
                {journeyData.stages.find(s => s.stage === 'orcamento_enviado') && (
                  <p className="text-xs text-primary bg-primary/10 rounded-lg px-3 py-2">
                    📊 O lead leva em mediana{' '}
                    <strong>
                      {formatResponseTime(
                        journeyData.stages.find(s => s.stage === 'orcamento_enviado')!.medianHours
                      )}
                    </strong>{' '}
                    desde a chegada até receber o orçamento.
                  </p>
                )}
              </>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
