import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, Filter, X } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { format, subDays, subMonths, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";

export interface DashboardFilters {
  dateRange: { from: Date; to: Date };
  companyId: string | null;
  status: string | null;
}

interface HubDashboardFiltersProps {
  companies: { id: string; name: string }[];
  filters: DashboardFilters;
  onFiltersChange: (filters: DashboardFilters) => void;
}

const PERIOD_PRESETS = [
  { label: "Últimos 7 dias", value: "7d" },
  { label: "Últimos 30 dias", value: "30d" },
  { label: "Últimos 90 dias", value: "90d" },
  { label: "Este mês", value: "this_month" },
  { label: "Mês passado", value: "last_month" },
  { label: "Personalizado", value: "custom" },
];

const STATUS_OPTIONS = [
  { label: "Todos", value: "all" },
  { label: "Novo", value: "novo" },
  { label: "Visita", value: "em_contato" },
  { label: "Orçamento Enviado", value: "orcamento_enviado" },
  { label: "Negociando", value: "aguardando_resposta" },
  { label: "Fechado", value: "fechado" },
  { label: "Perdido", value: "perdido" },
  { label: "Transferido", value: "transferido" },
];

function getDateRange(preset: string): { from: Date; to: Date } {
  const now = new Date();
  switch (preset) {
    case "7d": return { from: subDays(now, 7), to: now };
    case "30d": return { from: subDays(now, 30), to: now };
    case "90d": return { from: subDays(now, 90), to: now };
    case "this_month": return { from: startOfMonth(now), to: now };
    case "last_month": {
      const lastMonth = subMonths(now, 1);
      return { from: startOfMonth(lastMonth), to: endOfMonth(lastMonth) };
    }
    default: return { from: subDays(now, 30), to: now };
  }
}

export function getDefaultFilters(): DashboardFilters {
  return {
    dateRange: getDateRange("90d"),
    companyId: null,
    status: null,
  };
}

export function HubDashboardFilters({ companies, filters, onFiltersChange }: HubDashboardFiltersProps) {
  const [selectedPreset, setSelectedPreset] = useState("90d");
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [calendarDate, setCalendarDate] = useState<{ from?: Date; to?: Date }>({
    from: filters.dateRange.from,
    to: filters.dateRange.to,
  });

  const handlePresetChange = (preset: string) => {
    setSelectedPreset(preset);
    if (preset === "custom") {
      setCalendarOpen(true);
      return;
    }
    onFiltersChange({ ...filters, dateRange: getDateRange(preset) });
  };

  const hasActiveFilters = filters.companyId || filters.status;

  const clearFilters = () => {
    setSelectedPreset("90d");
    onFiltersChange(getDefaultFilters());
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Filter className="h-4 w-4 text-muted-foreground" />

      {/* Period */}
      <Select value={selectedPreset} onValueChange={handlePresetChange}>
        <SelectTrigger className="w-[160px] h-8 text-xs">
          <Calendar className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
          <SelectValue placeholder="Período" />
        </SelectTrigger>
        <SelectContent>
          {PERIOD_PRESETS.map(p => (
            <SelectItem key={p.value} value={p.value} className="text-xs">{p.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {selectedPreset === "custom" && (
        <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="h-8 text-xs">
              {calendarDate.from && calendarDate.to
                ? `${format(calendarDate.from, "dd/MM", { locale: ptBR })} - ${format(calendarDate.to, "dd/MM", { locale: ptBR })}`
                : "Selecionar datas"
              }
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <CalendarComponent
              mode="range"
              selected={calendarDate as any}
              onSelect={(range: any) => {
                setCalendarDate(range || {});
                if (range?.from && range?.to) {
                  onFiltersChange({ ...filters, dateRange: { from: range.from, to: range.to } });
                  setCalendarOpen(false);
                }
              }}
              locale={ptBR}
              numberOfMonths={2}
            />
          </PopoverContent>
        </Popover>
      )}

      {/* Company */}
      <Select
        value={filters.companyId || "all"}
        onValueChange={v => onFiltersChange({ ...filters, companyId: v === "all" ? null : v })}
      >
        <SelectTrigger className="w-[160px] h-8 text-xs">
          <SelectValue placeholder="Empresa" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all" className="text-xs">Todas empresas</SelectItem>
          {companies.map(c => (
            <SelectItem key={c.id} value={c.id} className="text-xs">{c.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Status */}
      <Select
        value={filters.status || "all"}
        onValueChange={v => onFiltersChange({ ...filters, status: v === "all" ? null : v })}
      >
        <SelectTrigger className="w-[140px] h-8 text-xs">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          {STATUS_OPTIONS.map(s => (
            <SelectItem key={s.value} value={s.value} className="text-xs">{s.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {hasActiveFilters && (
        <Button variant="ghost" size="sm" className="h-8 text-xs text-muted-foreground" onClick={clearFilters}>
          <X className="h-3.5 w-3.5 mr-1" /> Limpar
        </Button>
      )}

      <span className="text-xs text-muted-foreground ml-auto">
        {format(filters.dateRange.from, "dd/MM/yy", { locale: ptBR })} — {format(filters.dateRange.to, "dd/MM/yy", { locale: ptBR })}
      </span>
    </div>
  );
}
