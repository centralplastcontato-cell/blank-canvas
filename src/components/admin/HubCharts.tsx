import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { TrendingUp, PieChart as PieChartIcon } from "lucide-react";

interface LeadBucket {
  companyId: string;
  month: string;
  status: string;
  count: number;
}

interface HubChartsProps {
  buckets: LeadBucket[];
  companyNames: Map<string, string>;
  isLoading: boolean;
}

const MONTH_LABELS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

const COMPANY_COLORS = [
  "hsl(var(--primary))",
  "hsl(262, 80%, 55%)",
  "hsl(173, 58%, 39%)",
  "hsl(43, 96%, 56%)",
  "hsl(346, 87%, 60%)",
];

const STATUS_COLORS: Record<string, string> = {
  novo: "hsl(217, 91%, 60%)",
  em_contato: "hsl(45, 93%, 47%)",
  orcamento_enviado: "hsl(271, 91%, 65%)",
  aguardando_resposta: "hsl(24, 95%, 53%)",
  fechado: "hsl(142, 71%, 45%)",
  perdido: "hsl(0, 84%, 60%)",
  transferido: "hsl(187, 72%, 51%)",
};

const STATUS_LABELS: Record<string, string> = {
  novo: "Novo",
  em_contato: "Visita",
  orcamento_enviado: "Orçamento",
  aguardando_resposta: "Negociando",
  fechado: "Fechado",
  perdido: "Perdido",
  transferido: "Transferido",
};

export function HubCharts({ buckets, companyNames, isLoading }: HubChartsProps) {
  const nameOf = (id: string) => companyNames.get(id) || "—";
  const uniqueCompanies = useMemo(
    () => [...new Set(buckets.filter(b => b.count > 0).map(b => nameOf(b.companyId)))],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [buckets, companyNames]
  );

  // Evolução mensal: meses cobertos pelo período (até 12)
  const monthlyData = useMemo(() => {
    if (!buckets.length) return [];
    const keys = [...new Set(buckets.map(b => b.month))].sort();
    const [fy, fm] = keys[0].split("-").map(Number);
    const [ly, lm] = keys[keys.length - 1].split("-").map(Number);
    const span = Math.min((ly - fy) * 12 + (lm - fm), 11);
    const months: { month: string; key: string }[] = [];
    for (let i = span; i >= 0; i--) {
      const d = new Date(ly, lm - 1 - i, 1);
      months.push({
        month: `${MONTH_LABELS[d.getMonth()]}/${String(d.getFullYear()).slice(2)}`,
        key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
      });
    }
    return months.map(({ month, key }) => {
      const row: Record<string, string | number> = { month };
      let total = 0;
      uniqueCompanies.forEach(company => { row[company] = 0; });
      buckets.filter(b => b.month === key).forEach(b => {
        const name = nameOf(b.companyId);
        row[name] = (Number(row[name]) || 0) + b.count;
        total += b.count;
      });
      row["Total"] = total;
      return row;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [buckets, uniqueCompanies]);

  // Comparativo por empresa
  const companyComparison = useMemo(() => {
    const map = new Map<string, { name: string; total: number; fechados: number; perdidos: number; novos: number }>();
    buckets.forEach(b => {
      const name = nameOf(b.companyId);
      const row = map.get(name) || { name, total: 0, fechados: 0, perdidos: 0, novos: 0 };
      row.total += b.count;
      if (b.status === "fechado") row.fechados += b.count;
      if (b.status === "perdido") row.perdidos += b.count;
      if (b.status === "novo") row.novos += b.count;
      map.set(name, row);
    });
    return [...map.values()];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [buckets, companyNames]);

  // Distribuição por status
  const statusDistribution = useMemo(() => {
    const counts: Record<string, number> = {};
    buckets.forEach(b => { counts[b.status] = (counts[b.status] || 0) + b.count; });
    return Object.entries(counts).map(([status, value]) => ({
      name: STATUS_LABELS[status] || status,
      value,
      color: STATUS_COLORS[status] || "hsl(var(--muted))",
    }));
  }, [buckets]);

  if (isLoading) return null;
  if (!buckets.length) return null;

  return (
    <div className="space-y-6">
      {/* Monthly Evolution - Line Chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Evolução de Leads por mês
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="month" className="text-xs" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
              <YAxis className="text-xs" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                  fontSize: "13px",
                }}
              />
              <Legend />
              {uniqueCompanies.map((company, i) => (
                <Line
                  key={company}
                  type="monotone"
                  dataKey={company}
                  stroke={COMPANY_COLORS[i % COMPANY_COLORS.length]}
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                />
              ))}
              <Line
                type="monotone"
                dataKey="Total"
                stroke="hsl(var(--foreground))"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* Company Comparison - Bar Chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Comparativo por Empresa
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={companyComparison}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="name" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                    fontSize: "13px",
                  }}
                />
                <Legend />
                <Bar dataKey="novos" name="Novos" fill="hsl(217, 91%, 60%)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="fechados" name="Fechados" fill="hsl(142, 71%, 45%)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="perdidos" name="Perdidos" fill="hsl(0, 84%, 60%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Status Distribution - Pie Chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <PieChartIcon className="h-4 w-4" />
              Distribuição por Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={statusDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {statusDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                    fontSize: "13px",
                  }}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
