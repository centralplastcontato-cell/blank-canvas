import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { HubLayout } from "@/components/hub/HubLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Brain, Zap, Coins, Hash, TrendingUp } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { toast } from "sonner";
import type { Json } from "@/integrations/supabase/types";

interface UsageRow {
  company_id: string;
  function_name: string;
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  estimated_cost_usd: number;
  created_at: string;
}

interface CompanyInfo {
  id: string;
  name: string;
  settings: Json | null;
}

export default function HubAIUsage() {
  const [period, setPeriod] = useState("30");
  const [selectedCompany, setSelectedCompany] = useState("all");
  const [logs, setLogs] = useState<UsageRow[]>([]);
  const [companies, setCompanies] = useState<CompanyInfo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [period, selectedCompany]);

  async function fetchData() {
    setLoading(true);
    const daysAgo = new Date();
    daysAgo.setDate(daysAgo.getDate() - parseInt(period));

    const [logsRes, companiesRes] = await Promise.all([
      supabase
        .from("ai_usage_logs")
        .select("company_id, function_name, prompt_tokens, completion_tokens, total_tokens, estimated_cost_usd, created_at")
        .gte("created_at", daysAgo.toISOString())
        .order("created_at", { ascending: false })
        .limit(1000) as any,
      supabase.from("companies").select("id, name, settings").eq("is_active", true).order("name"),
    ]);

    setLogs(logsRes.data || []);
    setCompanies(companiesRes.data || []);
    setLoading(false);
  }

  const filteredLogs = selectedCompany === "all" ? logs : logs.filter(l => l.company_id === selectedCompany);

  // KPIs
  const totalCalls = filteredLogs.length;
  const totalTokens = filteredLogs.reduce((s, l) => s + (l.total_tokens || 0), 0);
  const totalCost = filteredLogs.reduce((s, l) => s + Number(l.estimated_cost_usd || 0), 0);

  // By function
  const byFunction = filteredLogs.reduce((acc, l) => {
    acc[l.function_name] = (acc[l.function_name] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const functionLabels: Record<string, string> = {
    "lead-summary": "Resumo Lead",
    "daily-summary": "Resumo Diário",
    "fix-text": "Correção Texto",
    "wapi-webhook": "Qualificação IA",
    "support-chat": "Chat Suporte",
  };

  const chartData = Object.entries(byFunction).map(([fn, count]) => ({
    name: functionLabels[fn] || fn,
    chamadas: count,
  }));

  // By company
  const byCompany = filteredLogs.reduce((acc, l) => {
    if (!acc[l.company_id]) acc[l.company_id] = { calls: 0, tokens: 0, cost: 0, lastCall: l.created_at };
    acc[l.company_id].calls++;
    acc[l.company_id].tokens += l.total_tokens || 0;
    acc[l.company_id].cost += Number(l.estimated_cost_usd || 0);
    if (l.created_at > acc[l.company_id].lastCall) acc[l.company_id].lastCall = l.created_at;
    return acc;
  }, {} as Record<string, { calls: number; tokens: number; cost: number; lastCall: string }>);

  const companyMap = new Map(companies.map(c => [c.id, c]));

  const companyRows = Object.entries(byCompany)
    .map(([companyId, data]) => ({
      companyId,
      companyName: companyMap.get(companyId)?.name || "Desconhecida",
      ...data,
    }))
    .sort((a, b) => b.calls - a.calls);

  async function toggleAI(companyId: string, enabled: boolean) {
    const company = companyMap.get(companyId);
    const currentSettings = (company?.settings || {}) as Record<string, unknown>;
    const { error } = await supabase
      .from("companies")
      .update({ settings: { ...currentSettings, ai_enabled: enabled } })
      .eq("id", companyId);

    if (error) {
      toast.error("Erro ao atualizar configuração");
    } else {
      toast.success(enabled ? "IA ativada" : "IA desativada");
      setCompanies(prev => prev.map(c => c.id === companyId ? { ...c, settings: { ...currentSettings, ai_enabled: enabled } } : c));
    }
  }

  function isAIEnabled(companyId: string): boolean {
    const company = companyMap.get(companyId);
    const settings = company?.settings as Record<string, unknown> | null;
    return settings?.ai_enabled !== false; // default true
  }

  function formatCost(usd: number): string {
    return `$${usd.toFixed(4)}`;
  }

  function formatDate(iso: string): string {
    return new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
  }

  return (
    <HubLayout currentPage="consumo-ia" header={<h2 className="font-semibold text-lg">Consumo IA</h2>}>
      {() => (<div className="space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Brain className="h-6 w-6 text-primary" />
              Consumo de IA
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Monitoramento de chamadas OpenAI por empresa e função
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">7 dias</SelectItem>
                <SelectItem value="30">30 dias</SelectItem>
                <SelectItem value="90">90 dias</SelectItem>
              </SelectContent>
            </Select>
            <Select value={selectedCompany} onValueChange={setSelectedCompany}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Todas empresas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas empresas</SelectItem>
                {companies.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Zap className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total de chamadas</p>
                  {loading ? <Skeleton className="h-7 w-20" /> : (
                    <p className="text-2xl font-bold">{totalCalls.toLocaleString("pt-BR")}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/10">
                  <Hash className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Tokens consumidos</p>
                  {loading ? <Skeleton className="h-7 w-20" /> : (
                    <p className="text-2xl font-bold">{totalTokens.toLocaleString("pt-BR")}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-500/10">
                  <Coins className="h-5 w-5 text-emerald-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Custo estimado</p>
                  {loading ? <Skeleton className="h-7 w-20" /> : (
                    <p className="text-2xl font-bold">{formatCost(totalCost)}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Chart */}
        {chartData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Chamadas por função
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} className="fill-muted-foreground" />
                  <YAxis tick={{ fontSize: 12 }} className="fill-muted-foreground" />
                  <RechartsTooltip />
                  <Bar dataKey="chamadas" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Table by company */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Consumo por empresa</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            ) : companyRows.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                Nenhum dado de consumo registrado no período selecionado.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Empresa</TableHead>
                      <TableHead className="text-right">Chamadas</TableHead>
                      <TableHead className="text-right">Tokens</TableHead>
                      <TableHead className="text-right">Custo</TableHead>
                      <TableHead className="text-right">Última chamada</TableHead>
                      <TableHead className="text-center">IA Ativa</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {companyRows.map(row => (
                      <TableRow key={row.companyId}>
                        <TableCell className="font-medium">{row.companyName}</TableCell>
                        <TableCell className="text-right">
                          <Badge variant="secondary">{row.calls}</Badge>
                        </TableCell>
                        <TableCell className="text-right">{row.tokens.toLocaleString("pt-BR")}</TableCell>
                        <TableCell className="text-right">{formatCost(row.cost)}</TableCell>
                        <TableCell className="text-right text-muted-foreground text-xs">
                          {formatDate(row.lastCall)}
                        </TableCell>
                        <TableCell className="text-center">
                          <Switch
                            checked={isAIEnabled(row.companyId)}
                            onCheckedChange={(checked) => toggleAI(row.companyId, checked)}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>)}
    </HubLayout>
  );
}
