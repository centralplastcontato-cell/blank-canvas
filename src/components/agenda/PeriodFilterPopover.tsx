import { useState } from "react";
import { format, startOfQuarter, endOfQuarter, addQuarters, startOfYear, endOfYear, subQuarters, startOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarRange, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import type { DateRange } from "react-day-picker";

interface PeriodFilterPopoverProps {
  onConfirm: (range: { from: Date; to: Date }) => void;
  activePeriod: { from: Date; to: Date } | null;
  onClear: () => void;
}

const now = new Date();

function getPresets() {
  const currentYear = now.getFullYear();
  return [
    { label: "Último trimestre", from: startOfQuarter(subQuarters(now, 1)), to: endOfQuarter(subQuarters(now, 1)) },
    { label: "Próximo trimestre", from: startOfQuarter(addQuarters(now, 1)), to: endOfQuarter(addQuarters(now, 1)) },
    { label: "Semestre atual", from: startOfMonth(now), to: endOfQuarter(addQuarters(startOfQuarter(now), 1)) },
    { label: `Ano ${currentYear} inteiro`, from: startOfYear(now), to: endOfYear(now) },
  ];
}

export function PeriodFilterPopover({ onConfirm, activePeriod, onClear }: PeriodFilterPopoverProps) {
  const [range, setRange] = useState<DateRange | undefined>(
    activePeriod ? { from: activePeriod.from, to: activePeriod.to } : undefined
  );
  const [open, setOpen] = useState(false);
  const presets = getPresets();

  const handleConfirm = () => {
    if (range?.from && range?.to) {
      onConfirm({ from: range.from, to: range.to });
      setOpen(false);
    }
  };

  const handlePreset = (preset: { from: Date; to: Date }) => {
    setRange({ from: preset.from, to: preset.to });
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="gap-1.5 text-xs">
            <CalendarRange className="h-3.5 w-3.5" />
            Consultar período
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start" side="bottom">
          <div className="p-4 space-y-3">
            <p className="text-sm font-semibold text-foreground">Selecione o período</p>

            {/* Presets */}
            <div className="flex flex-wrap gap-1.5">
              {presets.map((p) => (
                <Button
                  key={p.label}
                  variant="secondary"
                  size="sm"
                  className="text-xs h-7"
                  onClick={() => handlePreset(p)}
                >
                  {p.label}
                </Button>
              ))}
            </div>

            {/* Range calendar */}
            <Calendar
              mode="range"
              selected={range}
              onSelect={setRange}
              numberOfMonths={2}
              locale={ptBR}
              className={cn("p-3 pointer-events-auto")}
            />

            {/* Selected range display + confirm */}
            <div className="flex items-center justify-between gap-2 pt-1 border-t border-border/40">
              <p className="text-xs text-muted-foreground">
                {range?.from && range?.to
                  ? `${format(range.from, "dd/MM/yyyy")} – ${format(range.to, "dd/MM/yyyy")}`
                  : "Selecione início e fim"}
              </p>
              <Button size="sm" disabled={!range?.from || !range?.to} onClick={handleConfirm}>
                Consultar
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {/* Active period badge */}
      {activePeriod && (
        <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 border border-primary/20 px-3 py-1 text-xs font-medium text-primary">
          <CalendarRange className="h-3 w-3" />
          {format(activePeriod.from, "dd/MM")} – {format(activePeriod.to, "dd/MM/yyyy")}
          <button
            onClick={onClear}
            className="ml-1 rounded-full p-0.5 hover:bg-primary/20 transition-colors"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      )}
    </div>
  );
}
