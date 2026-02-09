import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { TrendingUp, PieChart as PieChartIcon } from "lucide-react";

interface LeadRecord {
  company_id: string;
  company_name: string;
  status: string;
  created_at: string;
}

interface HubChartsProps {
  leads: LeadRecord[];
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

export function HubCharts({ leads, isLoading }: HubChartsProps) {
  // Monthly evolution data (last 6 months)
  const monthlyData = useMemo(() => {
    if (!leads.length) return [];

    const now = new Date();
    const months: { month: string; key: string }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({
        month: `${MONTH_LABELS[d.getMonth()]}/${String(d.getFullYear()).slice(2)}`,
        key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
      });
    }

    // Get unique companies
    const companies = [...new Set(leads.map(l => l.company_name))];

    return months.map(({ month, key }) => {
      const row: Record<string, string | number> = { month };
      let total = 0;
      companies.forEach(company => {
        const count = leads.filter(l => l.company_name === company && l.created_at.startsWith(key)).length;
        row[company] = count;
        total += count;
      });
      row["Total"] = total;
      return row;
    });
  }, [leads]);

  // Company comparison data
  const companyComparison = useMemo(() => {
    if (!leads.length) return [];
    const companies = [...new Set(leads.map(l => l.company_name))];
    return companies.map(name => {
      const companyLeads = leads.filter(l => l.company_name === name);
      return {
        name,
        total: companyLeads.length,
        fechados: companyLeads.filter(l => l.status === "fechado").length,
        perdidos: companyLeads.filter(l => l.status === "perdido").length,
        novos: companyLeads.filter(l => l.status === "novo").length,
      };
    });
  }, [leads]);

  // Status distribution (pie chart)
  const statusDistribution = useMemo(() => {
    if (!leads.length) return [];
    const counts: Record<string, number> = {};
    leads.forEach(l => {
      counts[l.status] = (counts[l.status] || 0) + 1;
    });
    return Object.entries(counts).map(([status, value]) => ({
      name: STATUS_LABELS[status] || status,
      value,
      color: STATUS_COLORS[status] || "hsl(var(--muted))",
    }));
  }, [leads]);

  const uniqueCompanies = useMemo(() => [...new Set(leads.map(l => l.company_name))], [leads]);

  if (isLoading) return null;
  if (!leads.length) return null;

  return (
    <div className="space-y-6">
      {/* Monthly Evolution - Line Chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Evolução de Leads (Últimos 6 meses)
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

      <div className="grid gap-4 md:grid-cols-2">
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
