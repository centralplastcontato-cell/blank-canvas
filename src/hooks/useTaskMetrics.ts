import { useMemo } from "react";
import type { CompanyTask } from "@/hooks/useTasks";

export interface TaskMetrics {
  completedLast7Days: number;
  completedLast30Days: number;
  avgCompletionTimeHours: number | null;
  onTimeRate: number;
  weeklyData: { week: string; count: number }[];
  rankingByAssignee: { name: string; count: number }[];
}

export function useTaskMetrics(tasks: CompanyTask[]): TaskMetrics {
  return useMemo(() => {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const completed = tasks.filter((t) => t.status === "concluida");

    const completedLast7Days = completed.filter(
      (t) => t.completed_at && new Date(t.completed_at) >= sevenDaysAgo
    ).length;

    const completedLast30Days = completed.filter(
      (t) => t.completed_at && new Date(t.completed_at) >= thirtyDaysAgo
    ).length;

    // Average completion time
    const completionTimes = completed
      .filter((t) => t.completed_at && t.created_at)
      .map((t) => {
        const created = new Date(t.created_at).getTime();
        const completedAt = new Date(t.completed_at!).getTime();
        return (completedAt - created) / (1000 * 60 * 60);
      })
      .filter((h) => h > 0 && h < 24 * 365);

    const avgCompletionTimeHours =
      completionTimes.length > 0
        ? completionTimes.reduce((a, b) => a + b, 0) / completionTimes.length
        : null;

    // On-time rate
    const withDueDate = completed.filter((t) => t.due_date && t.completed_at);
    const onTime = withDueDate.filter((t) => {
      const due = new Date(t.due_date! + "T23:59:59");
      const done = new Date(t.completed_at!);
      return done <= due;
    });
    const onTimeRate = withDueDate.length > 0 ? (onTime.length / withDueDate.length) * 100 : 0;

    // Weekly data (last 4 weeks)
    const weeklyData: { week: string; count: number }[] = [];
    for (let i = 3; i >= 0; i--) {
      const weekStart = new Date(now.getTime() - (i + 1) * 7 * 24 * 60 * 60 * 1000);
      const weekEnd = new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000);
      const count = completed.filter((t) => {
        if (!t.completed_at) return false;
        const d = new Date(t.completed_at);
        return d >= weekStart && d < weekEnd;
      }).length;
      const label = `Sem ${4 - i}`;
      weeklyData.push({ week: label, count });
    }

    // Ranking by assignee
    const assigneeCounts: Record<string, number> = {};
    completed.forEach((t) => {
      const key = t.assigned_to || "Sem responsável";
      assigneeCounts[key] = (assigneeCounts[key] || 0) + 1;
    });
    const rankingByAssignee = Object.entries(assigneeCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      completedLast7Days,
      completedLast30Days,
      avgCompletionTimeHours,
      onTimeRate,
      weeklyData,
      rankingByAssignee,
    };
  }, [tasks]);
}
