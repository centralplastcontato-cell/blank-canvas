import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";

import { ChevronDown, ChevronUp, BarChart3, Clock, Target, Trophy } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";
import type { CompanyTask } from "@/hooks/useTasks";
import { useTaskMetrics } from "@/hooks/useTaskMetrics";

interface Props {
  tasks: CompanyTask[];
}

export function TaskProductivityDashboard({ tasks }: Props) {
  const [expanded, setExpanded] = useState(false);
  const metrics = useTaskMetrics(tasks);

  const formatTime = (hours: number | null) => {
    if (hours === null) return "—";
    if (hours < 1) return `${Math.round(hours * 60)}min`;
    if (hours < 24) return `${Math.round(hours)}h`;
    return `${Math.round(hours / 24)}d`;
  };

  return (
    <Card className="border-border/30 overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-muted/30 transition-colors"
      >
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-primary/10">
            <BarChart3 className="h-4 w-4 text-primary" />
          </div>
          <span className="text-sm font-semibold">Dashboard de Produtividade</span>
        </div>
        {expanded ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        )}
      </button>

      {expanded && (
        <CardContent className="pt-0 pb-4 px-4 space-y-4">
          {/* Metric cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200/50 dark:border-emerald-800/30">
              <div className="flex items-center gap-1.5 mb-1">
                <Target className="h-3.5 w-3.5 text-emerald-600" />
                <span className="text-[10px] text-emerald-600 font-medium">7 dias</span>
              </div>
              <p className="text-xl font-bold text-emerald-700 dark:text-emerald-400">{metrics.completedLast7Days}</p>
              <p className="text-[10px] text-emerald-600/70">concluídas</p>
            </div>
            <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200/50 dark:border-blue-800/30">
              <div className="flex items-center gap-1.5 mb-1">
                <Target className="h-3.5 w-3.5 text-blue-600" />
                <span className="text-[10px] text-blue-600 font-medium">30 dias</span>
              </div>
              <p className="text-xl font-bold text-blue-700 dark:text-blue-400">{metrics.completedLast30Days}</p>
              <p className="text-[10px] text-blue-600/70">concluídas</p>
            </div>
            <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200/50 dark:border-amber-800/30">
              <div className="flex items-center gap-1.5 mb-1">
                <Clock className="h-3.5 w-3.5 text-amber-600" />
                <span className="text-[10px] text-amber-600 font-medium">Tempo médio</span>
              </div>
              <p className="text-xl font-bold text-amber-700 dark:text-amber-400">{formatTime(metrics.avgCompletionTimeHours)}</p>
              <p className="text-[10px] text-amber-600/70">para concluir</p>
            </div>
            <div className="p-3 rounded-xl bg-purple-50 dark:bg-purple-950/30 border border-purple-200/50 dark:border-purple-800/30">
              <div className="flex items-center gap-1.5 mb-1">
                <Trophy className="h-3.5 w-3.5 text-purple-600" />
                <span className="text-[10px] text-purple-600 font-medium">No prazo</span>
              </div>
              <p className="text-xl font-bold text-purple-700 dark:text-purple-400">{Math.round(metrics.onTimeRate)}%</p>
              <p className="text-[10px] text-purple-600/70">taxa de conclusão</p>
            </div>
          </div>

          {/* Weekly chart */}
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">Concluídas por semana</p>
            <div className="h-32">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={metrics.weeklyData}>
                  <XAxis dataKey="week" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 10 }} tickLine={false} axisLine={false} width={20} />
                  <Tooltip
                    contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid hsl(var(--border))" }}
                    formatter={(value: number) => [`${value} tarefas`, "Concluídas"]}
                  />
                  <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Ranking */}
          {metrics.rankingByAssignee.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">🏆 Ranking de conclusões</p>
              <div className="space-y-1.5">
                {metrics.rankingByAssignee.map((entry, i) => (
                  <div key={entry.name} className="flex items-center gap-2 text-xs">
                    <span className="w-4 text-center font-bold text-muted-foreground">{i + 1}</span>
                    <span className="flex-1 truncate">{entry.name}</span>
                    <span className="font-semibold">{entry.count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}
