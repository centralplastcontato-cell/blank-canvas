import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LEAD_STATUS_LABELS, LeadStatus } from "@/types/crm";
import { LeadIntelligence } from "@/hooks/useLeadIntelligence";
import { formatDuration } from "@/hooks/useLeadStageDurations";
import { useScoreSnapshots } from "@/hooks/useScoreSnapshots";
import { ArrowDown, Clock } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
  AreaChart, Area, CartesianGrid, ReferenceLine,
} from "recharts";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

interface FunilTabProps {
  data: LeadIntelligence[];
  stageDurations?: Record<string, number>;
}

const FUNNEL_STEPS: LeadStatus[] = [
  'novo',
  'em_contato',
  'orcamento_enviado',
  'aguardando_resposta',
  'fechado',
  'perdido',
];

const TEMP_COLORS: Record<string, string> = {
  frio: 'hsl(210, 70%, 55%)',
  morno: 'hsl(40, 90%, 55%)',
  quente: 'hsl(20, 90%, 55%)',
  pronto: 'hsl(140, 60%, 45%)',
};

const TEMP_LABELS: Record<string, string> = {
  frio: '❄️ Frio',
  morno: '🌤️ Morno',
  quente: '🔥 Quente',
  pronto: '🎯 Pronto',
};

const SCORE_RANGES = [
  { label: '0-20', min: 0, max: 20 },
  { label: '21-40', min: 21, max: 40 },
  { label: '41-60', min: 41, max: 60 },
  { label: '61-80', min: 61, max: 80 },
  { label: '81-100', min: 81, max: 100 },
];

export function FunilTab({ data, stageDurations }: FunilTabProps) {
  const [trendDays, setTrendDays] = useState<number>(14);
  const { data: scoreTrend = [], isLoading: trendLoading } = useScoreSnapshots(trendDays);

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

  // Score distribution data
  const scoreDistribution = useMemo(() => {
    return SCORE_RANGES.map(range => {
      const count = data.filter(d => d.score >= range.min && d.score <= range.max).length;
      return { name: range.label, leads: count };
    });
  }, [data]);

  // Temperature breakdown
  const temperatureData = useMemo(() => {
    const tempCounts: Record<string, number> = {};
    data.forEach(d => {
      const t = d.temperature || 'frio';
      tempCounts[t] = (tempCounts[t] || 0) + 1;
    });
    return Object.entries(tempCounts)
      .filter(([, v]) => v > 0)
      .map(([key, value]) => ({
        name: TEMP_LABELS[key] || key,
        value,
        color: TEMP_COLORS[key] || 'hsl(var(--muted))',
      }));
  }, [data]);

  // Period options for trend chart
  const periodOptions = [
    { value: 7, label: '7d' },
    { value: 14, label: '14d' },
    { value: 30, label: '30d' },
  ];

  return (
    <div className="space-y-4">
      {/* Trend chart */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Evolução do Score</CardTitle>
            <ToggleGroup type="single" value={String(trendDays)} onValueChange={v => v && setTrendDays(Number(v))} size="sm">
              {periodOptions.map(p => (
                <ToggleGroupItem key={p.value} value={String(p.value)} className="text-xs px-2.5">
                  {p.label}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </div>
        </CardHeader>
        <CardContent>
          {trendLoading ? (
            <div className="h-48 flex items-center justify-center text-sm text-muted-foreground">Carregando...</div>
          ) : (
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={scoreTrend}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                    formatter={(value: number | null, name: string) => {
                      if (name === 'avgScore') return [value ?? '—', 'Score médio'];
                      return [value, 'Leads'];
                    }}
                  />
                  <ReferenceLine y={50} stroke="hsl(var(--muted-foreground))" strokeDasharray="6 4" strokeOpacity={0.5} label={{ value: 'Meta', position: 'right', fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                  <Area
                    type="monotone"
                    dataKey="avgScore"
                    stroke="hsl(var(--primary))"
                    fill="hsl(var(--primary) / 0.15)"
                    strokeWidth={2}
                    connectNulls={false}
                    dot={{ r: 3, fill: 'hsl(var(--primary))' }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Score distribution + Temperature */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Distribuição de Score</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={scoreDistribution}>
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                    formatter={(value: number) => [value, 'Leads']}
                  />
                  <Bar dataKey="leads" fill="hsl(var(--primary) / 0.7)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Temperatura dos Leads</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={temperatureData}
                    cx="50%"
                    cy="50%"
                    innerRadius={35}
                    outerRadius={60}
                    dataKey="value"
                    nameKey="name"
                    label={({ name, value }) => `${name} (${value})`}
                    labelLine={false}
                  >
                    {temperatureData.map((entry, idx) => (
                      <Cell key={idx} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Original funnel */}
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
            const avgHours = stageDurations?.[status];

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
                    {avgHours != null && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                        <Clock className="h-3 w-3" />
                        ~{formatDuration(avgHours)}
                      </p>
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="h-6 rounded-full bg-muted/50 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          isLoss ? 'bg-destructive/60' : 'bg-primary/60'
                        }`}
                        style={{ width: `${barWidth}%` }}
                      />
                    </div>
                  </div>
                  <div className="w-20 text-right shrink-0">
                    <span className="text-base font-bold">{count}</span>
                    <span className="text-xs text-muted-foreground ml-1">({pct}%)</span>
                  </div>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
