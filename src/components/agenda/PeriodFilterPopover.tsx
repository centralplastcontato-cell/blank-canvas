import { useState } from "react";
import { format } from "date-fns";
import { getPeriodPresets } from "@/lib/periodPresets";
import { ptBR } from "date-fns/locale";
import { CalendarRange, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import type { DateRange } from "react-day-picker";

interface PeriodFilterPopoverProps {
  onConfirm: (range: { from: Date; to: Date }) => void;
  activePeriod: { from: Date; to: Date } | null;
  onClear: () => void;
  /** "icon": só o botão com o ícone (no celular, ao lado da busca) */
  variant?: "full" | "icon";
}

export function PeriodFilterPopover({ onConfirm, activePeriod, onClear, variant = "full" }: PeriodFilterPopoverProps) {
  const [range, setRange] = useState<DateRange | undefined>(
    activePeriod ? { from: activePeriod.from, to: activePeriod.to } : undefined
  );
  const [open, setOpen] = useState(false);
  const presets = getPeriodPresets();
  const isMobile = useIsMobile();

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
          {variant === "icon" ? (
            <button
              type="button"
              aria-label="Consultar período"
              title="Consultar período"
              className="relative h-11 w-11 shrink-0 rounded-2xl border border-border/40 bg-card shadow-sm flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
            >
              <CalendarRange className="h-5 w-5" />
              {activePeriod && <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-primary" />}
            </button>
          ) : (
            <Button variant="outline" size="sm" className="gap-1.5 text-xs">
              <CalendarRange className="h-3.5 w-3.5" />
              Consultar período
            </Button>
          )}
        </PopoverTrigger>
        <PopoverContent 
          className={cn("p-0", isMobile ? "w-[calc(100vw-2rem)] max-w-sm" : "w-auto")} 
          align={isMobile ? "center" : "start"} 
          side="bottom"
          sideOffset={8}
        >
          <div className="p-4 space-y-3">
            <p className="text-sm font-semibold text-foreground">Selecione o período</p>

            {/* Presets */}
            <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
              {presets.map((p) => (
                <Button
                  key={p.label}
                  variant="secondary"
                  size="sm"
                  className="text-xs h-7 whitespace-nowrap shrink-0"
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
              numberOfMonths={isMobile ? 1 : 2}
              locale={ptBR}
              className={cn("p-0 pointer-events-auto w-full [&_.rdp-month]:w-full [&_.rdp-table]:w-full")}
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
      {variant === "full" && activePeriod && (
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
