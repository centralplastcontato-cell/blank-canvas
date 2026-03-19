import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  useCommercialReports, getDefaultFilters, buildDateRange,
  type CommercialFilters, type PeriodPreset,
} from "@/hooks/useCommercialReports";
import { useCompanyUnits } from "@/hooks/useCompanyUnits";
import { useCompany } from "@/contexts/CompanyContext";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Users, TrendingUp, Eye, DollarSign, Target, Calendar as CalendarIcon,
  ArrowDown, BarChart3, X, UserCheck, UserX,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import type { DateRange } from "react-day-picker";

const PERIOD_OPTIONS: { value: PeriodPreset; label: string }[] = [
  { value: "today", label: "Hoje" },
  { value: "7d", label: "7 dias" },
  { value: "30d", label: "30 dias" },
  { value: "month", label: "Mês atual" },
  { value: "custom", label: "Período" },
];

const FUNNEL_COLORS: Record<string, string> = {
  novo: "hsl(210,70%,55%)",
  em_contato: "hsl(45,90%,50%)",
  orcamento_enviado: "hsl(270,60%,55%)",
  aguardando_resposta: "hsl(30,90%,55%)",
  fechado: "hsl(140,60%,45%)",
  perdido: "hsl(0,70%,55%)",
};

function formatBRL(value: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

interface RelatoriosProps {
  selectedUnit?: string;
  canViewRevenue?: boolean;
}

export function RelatoriosComerciais({ selectedUnit: externalUnit, canViewRevenue = true }: RelatoriosProps) {
  const { currentCompany } = useCompany();
  const { units } = useCompanyUnits(currentCompany?.id);
  const physicalUnits = units.filter(u => u.slug !== "trabalhe-conosco");

  const [filters, setFilters] = useState<CommercialFilters>(getDefaultFilters());
  const [customRange, setCustomRange] = useState<DateRange | undefined>();
  const [calendarOpen, setCalendarOpen] = useState(false);

  // Sync external unit filter
  const activeUnit = externalUnit && externalUnit !== "all" ? externalUnit : filters.unit;

  const activeFilters = useMemo<CommercialFilters>(() => ({
    ...filters,
    unit: activeUnit,
  }), [filters, activeUnit]);

  const { data, isLoading, isError } = useCommercialReports(activeFilters);

  const handlePresetChange = (preset: PeriodPreset) => {
    if (preset === "custom") {
      setFilters(f => ({ ...f, preset }));
      return;
    }
    const range = buildDateRange(preset);
    setFilters(f => ({ ...f, preset, from: range.from, to: range.to }));
  };

  const handleCustomConfirm = () => {
    if (customRange?.from && customRange?.to) {
      const range = buildDateRange("custom", customRange.from, customRange.to);
      setFilters(f => ({ ...f, preset: "custom", from: range.from, to: range.to }));
      setCalendarOpen(false);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Array.from({ length: 7 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-64 rounded-xl" />
        <Skeleton className="h-48 rounded-xl" />
      </div>
    );
  }

  // Error state
  if (isError || !data) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">Erro ao carregar relatórios. Tente novamente.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters bar */}
      <div className="flex flex-wrap items-center gap-2">
        <ToggleGroup
          type="single"
          value={filters.preset}
          onValueChange={(v) => v && handlePresetChange(v as PeriodPreset)}
          size="sm"
        >
          {PERIOD_OPTIONS.map(p => (
            <ToggleGroupItem key={p.value} value={p.value} className="text-xs px-2.5">
              {p.label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>

        {filters.preset === "custom" && (
          <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                <CalendarIcon className="h-3.5 w-3.5" />
                {customRange?.from && customRange?.to
                  ? `${format(customRange.from, "dd/MM")} – ${format(customRange.to, "dd/MM")}`
                  : "Selecionar datas"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-3" align="start">
              <Calendar
                mode="range"
                selected={customRange}
                onSelect={setCustomRange}
                numberOfMonths={2}
                locale={ptBR}
                className="pointer-events-auto"
              />
              <div className="flex justify-end pt-2 border-t border-border/40">
                <Button size="sm" disabled={!customRange?.from || !customRange?.to} onClick={handleCustomConfirm}>
                  Aplicar
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        )}

        {/* Period badge */}
        <Badge variant="secondary" className="text-xs gap-1">
          <CalendarIcon className="h-3 w-3" />
          {format(filters.from, "dd/MM/yy")} – {format(filters.to, "dd/MM/yy")}
        </Badge>

        {/* Unit filter (only if not controlled externally) */}
        {!externalUnit && physicalUnits.length > 1 && (
          <Select value={filters.unit} onValueChange={v => setFilters(f => ({ ...f, unit: v }))}>
            <SelectTrigger className="w-[160px] h-8 text-xs">
              <SelectValue placeholder="Todas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as unidades</SelectItem>
              {physicalUnits.map(u => (
                <SelectItem key={u.id} value={u.name}>{u.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
        <SummaryCard
          icon={<Users className="h-4 w-4" />}
          label="Leads recebidos"
          value={String(data.leadsReceived)}
        />
        <SummaryCard
          icon={<Target className="h-4 w-4" />}
          label="Leads fechados"
          value={String(data.leadsClosed)}
        />
        <SummaryCard
          icon={<TrendingUp className="h-4 w-4" />}
          label="Conversão"
          value={`${data.conversionRate.toFixed(1)}%`}
          highlight={data.conversionRate >= 15}
        />
        <SummaryCard
          icon={<Eye className="h-4 w-4" />}
          label="Visitas realizadas"
          value={String(data.visitsRealized)}
        />
        <SummaryCard
          icon={<UserCheck className="h-4 w-4" />}
          label="Comparecimento"
          value={`${data.attendanceRate.toFixed(0)}%`}
          highlight={data.attendanceRate >= 70}
        />
        {canViewRevenue && (
          <SummaryCard
            icon={<DollarSign className="h-4 w-4" />}
            label="Faturamento vendido"
            value={formatBRL(data.salesTotal)}
          />
        )}
        {canViewRevenue && (
          <SummaryCard
            icon={<BarChart3 className="h-4 w-4" />}
            label="Ticket médio"
            value={formatBRL(data.ticketMedio)}
          />
        )}
      </div>

      {/* Funnel */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Funil de Conversão por Etapa</CardTitle>
        </CardHeader>
        <CardContent>
          {data.leadsReceived === 0 ? (
            <EmptyState message="Nenhum lead no período selecionado." />
          ) : (
            <div className="space-y-1">
              {data.funnelSteps.map((step, idx) => {
                const maxCount = Math.max(...data.funnelSteps.map(s => s.count), 1);
                const barWidth = Math.max((step.count / maxCount) * 100, 4);
                return (
                  <div key={step.status}>
                    {idx > 0 && (
                      <div className="flex justify-center py-0.5">
                        <ArrowDown className="h-3.5 w-3.5 text-muted-foreground/40" />
                      </div>
                    )}
                    <div className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 rounded-lg bg-card/50 border transition-all duration-200">
                      <div className="w-20 sm:w-28 shrink-0">
                        <p className="text-sm font-medium">{step.label}</p>
                      </div>
                      <div className="flex-1">
                        <div className="h-6 rounded-full bg-muted/50 overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-300"
                            style={{
                              width: `${barWidth}%`,
                              backgroundColor: FUNNEL_COLORS[step.status] || "hsl(var(--primary))",
                              opacity: 0.7,
                            }}
                          />
                        </div>
                      </div>
                      <div className="w-16 sm:w-24 text-right shrink-0">
                        <span className="text-sm sm:text-base font-bold">{step.count}</span>
                        <span className="text-[10px] sm:text-xs text-muted-foreground ml-0.5">({step.pct}%)</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Visits + Sales side by side */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Visits */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Comparecimento em Visitas</CardTitle>
          </CardHeader>
          <CardContent>
            {data.visitsTotal === 0 && data.visitsCancelled === 0 && data.visitsRescheduled === 0 ? (
              <EmptyState message="Nenhuma visita registrada no período." />
            ) : (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <MiniStat label="Visitas previstas" value={data.visitsTotal} />
                  <MiniStat label="Realizadas" value={data.visitsRealized} color="text-green-600" />
                  <MiniStat label="Não compareceu" value={data.visitsNoShow} color="text-red-600" />
                  <MiniStat label="Remarcadas" value={data.visitsRescheduled} color="text-amber-600" />
                  <MiniStat label="Canceladas" value={data.visitsCancelled} color="text-muted-foreground" />
                  <MiniStat
                    label="Taxa de comparecimento"
                    value={`${data.attendanceRate.toFixed(0)}%`}
                    color={data.attendanceRate >= 70 ? "text-green-600" : "text-amber-600"}
                  />
                </div>
                {/* Mini bar chart */}
                <div className="h-40">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={[
                      { name: "Realizadas", value: data.visitsRealized, fill: "hsl(140,60%,45%)" },
                      { name: "Não comp.", value: data.visitsNoShow, fill: "hsl(0,70%,55%)" },
                      { name: "Remarcadas", value: data.visitsRescheduled, fill: "hsl(40,90%,55%)" },
                      { name: "Canceladas", value: data.visitsCancelled, fill: "hsl(var(--muted-foreground))" },
                    ]}>
                      <XAxis dataKey="name" tick={{ fontSize: 10 }} className="fill-muted-foreground" />
                      <YAxis allowDecimals={false} tick={{ fontSize: 10 }} className="fill-muted-foreground" />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                          fontSize: "12px",
                        }}
                      />
                      <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                        {[
                          { fill: "hsl(140,60%,45%)" },
                          { fill: "hsl(0,70%,55%)" },
                          { fill: "hsl(40,90%,55%)" },
                          { fill: "hsl(220,10%,60%)" },
                        ].map((entry, idx) => (
                          <Cell key={idx} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Sales */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Vendas por Período</CardTitle>
          </CardHeader>
          <CardContent>
            {data.salesCount === 0 ? (
              <EmptyState message="Nenhuma venda com data de fechamento no período." />
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-3">
                  <div className="p-4 rounded-xl bg-primary/5 border border-primary/10">
                    <p className="text-xs text-muted-foreground mb-1">Festas fechadas</p>
                    <p className="text-2xl font-bold text-foreground">{data.salesCount}</p>
                  </div>
                  <div className="p-4 rounded-xl bg-green-500/5 border border-green-500/10">
                    <p className="text-xs text-muted-foreground mb-1">Faturamento vendido</p>
                    <p className="text-2xl font-bold text-green-600">{formatBRL(data.salesTotal)}</p>
                  </div>
                  <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/10">
                    <p className="text-xs text-muted-foreground mb-1">Ticket médio</p>
                    <p className="text-2xl font-bold text-amber-600">{formatBRL(data.ticketMedio)}</p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// --- Sub-components ---

function SummaryCard({ icon, label, value, highlight }: { icon: React.ReactNode; label: string; value: string; highlight?: boolean }) {
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-3 sm:p-4">
        <div className="flex items-center gap-2 mb-1.5">
          <div className={`p-1.5 rounded-lg ${highlight ? "bg-green-500/10 text-green-600" : "bg-primary/10 text-primary"}`}>
            {icon}
          </div>
        </div>
        <p className={`text-lg sm:text-xl font-bold ${highlight ? "text-green-600" : "text-foreground"}`}>{value}</p>
        <p className="text-[10px] sm:text-xs text-muted-foreground leading-tight">{label}</p>
      </CardContent>
    </Card>
  );
}

function MiniStat({ label, value, color }: { label: string; value: number | string; color?: string }) {
  return (
    <div className="p-2 rounded-lg bg-muted/30 border border-border/40">
      <p className="text-[10px] text-muted-foreground mb-0.5">{label}</p>
      <p className={`text-sm font-bold ${color || "text-foreground"}`}>{value}</p>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="py-8 text-center">
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}
