import { DayPicker } from "react-day-picker";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface CalendarEvent {
  id: string;
  event_date: string;
  status: string;
  title: string;
}

interface ChecklistProgress {
  [eventId: string]: { total: number; completed: number };
}

interface PreReservationCalendar {
  id: string;
  event_date: string;
  status: string;
}

interface AgendaCalendarProps {
  events: CalendarEvent[];
  month: Date;
  onMonthChange: (month: Date) => void;
  onDayClick: (date: Date) => void;
  selectedDate: Date | null;
  checklistProgress?: ChecklistProgress;
  preReservations?: PreReservationCalendar[];
}

const STATUS_DOT: Record<string, string> = {
  confirmado: "bg-emerald-500 shadow-[0_0_4px_rgba(16,185,129,0.4)]",
  pendente: "bg-amber-400 shadow-[0_0_4px_rgba(251,191,36,0.4)]",
  cancelado: "bg-red-400 shadow-[0_0_4px_rgba(248,113,113,0.3)]",
};

export function AgendaCalendar({ events, month, onMonthChange, onDayClick, selectedDate, checklistProgress = {}, preReservations = [] }: AgendaCalendarProps) {
  const eventsByDate = new Map<string, CalendarEvent[]>();
  events.forEach((ev) => {
    const key = ev.event_date;
    if (!eventsByDate.has(key)) eventsByDate.set(key, []);
    eventsByDate.get(key)!.push(ev);
  });

  const preResByDate = new Map<string, PreReservationCalendar[]>();
  preReservations.forEach((pr) => {
    const key = pr.event_date;
    if (!preResByDate.has(key)) preResByDate.set(key, []);
    preResByDate.get(key)!.push(pr);
  });

  return (
    <div className="flex flex-col">
    <DayPicker
      mode="single"
      selected={selectedDate ?? undefined}
      onSelect={(date) => date && onDayClick(date)}
      month={month}
      onMonthChange={onMonthChange}
      locale={ptBR}
      showOutsideDays
      className="p-3 lg:p-6"
      classNames={{
        months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
        month: "space-y-5 w-full",
        caption: "flex justify-center pt-2 lg:pt-3 relative items-center mb-3",
        caption_label: "text-base lg:text-xl font-bold capitalize tracking-tight text-foreground",
        nav: "space-x-1 flex items-center",
        nav_button: cn(
          buttonVariants({ variant: "ghost" }),
          "h-9 w-9 lg:h-10 lg:w-10 p-0 text-muted-foreground/50 hover:text-foreground hover:bg-primary/[0.06] rounded-xl transition-all duration-200 hover:shadow-sm"
        ),
        nav_button_previous: "absolute left-0",
        nav_button_next: "absolute right-0",
        table: "w-full border-collapse",
        head_row: "flex",
        head_cell: "text-muted-foreground/40 flex-1 font-semibold text-[0.6rem] lg:text-[0.65rem] text-center uppercase tracking-[0.2em] pb-3",
        row: "flex w-full",
        cell: "flex-1 text-center text-sm p-[2px] lg:p-1 relative focus-within:relative focus-within:z-20",
        day: cn(
          buttonVariants({ variant: "ghost" }),
          "h-14 lg:h-[5rem] w-full p-0 font-normal aria-selected:opacity-100 relative rounded-2xl",
          "hover:bg-primary/[0.04] hover:shadow-[inset_0_0_0_1px_hsl(var(--primary)/0.08)] transition-all duration-200 cursor-pointer"
        ),
        day_range_end: "day-range-end",
        day_selected: cn(
          "bg-gradient-to-br from-primary via-primary to-primary/85 text-primary-foreground",
          "hover:from-primary hover:to-primary/85 hover:text-primary-foreground",
          "focus:from-primary focus:to-primary/85 focus:text-primary-foreground",
          "shadow-[0_4px_20px_rgba(0,0,0,0.15),0_0_0_2px_hsl(var(--primary)/0.15)] scale-[1.02]"
        ),
        day_today: cn(
          "bg-accent/60 text-foreground font-bold",
          "ring-2 ring-primary/20 shadow-[inset_0_0_0_1px_hsl(var(--primary)/0.1)]"
        ),
        day_outside: "day-outside text-muted-foreground/20",
        day_disabled: "text-muted-foreground/20",
        day_hidden: "invisible",
      }}
      components={{
        IconLeft: () => <ChevronLeft className="h-4 w-4" />,
        IconRight: () => <ChevronRight className="h-4 w-4" />,
        DayContent: ({ date }) => {
          const dateKey = format(date, "yyyy-MM-dd");
          const dayEvents = eventsByDate.get(dateKey) || [];
          const dayPreRes = preResByDate.get(dateKey) || [];
          const hasEvents = dayEvents.length > 0;
          const hasPreRes = dayPreRes.filter(pr => pr.status === "ativa").length > 0;
          const eventCount = dayEvents.length;

          const hasPending = dayEvents.some((ev) => {
            const p = checklistProgress[ev.id];
            return p && p.total > 0 && p.completed < p.total;
          });

          return (
            <div className="flex flex-col items-center gap-0.5 lg:gap-1.5 w-full h-full justify-center relative">
              <span className={cn(
                "text-sm lg:text-[15px] transition-all duration-200 leading-none",
                (hasEvents || hasPreRes) ? "font-bold text-foreground" : "text-foreground/55 font-medium"
              )}>
                {date.getDate()}
              </span>

              {(hasEvents || hasPreRes) && (
                <div className="flex items-center gap-[3px] lg:gap-1 justify-center">
                  {/* Pre-reservation pink dots */}
                  {hasPreRes && (
                    <span className="h-[5px] w-[5px] lg:h-[6px] lg:w-[6px] rounded-full bg-pink-400 shadow-[0_0_4px_rgba(244,114,182,0.4)]" />
                  )}
                  {/* Show up to 3 status dots */}
                  {dayEvents.slice(0, 3).map((ev) => (
                    <span
                      key={ev.id}
                      className={cn(
                        "h-[5px] w-[5px] lg:h-[6px] lg:w-[6px] rounded-full transition-all duration-200",
                        STATUS_DOT[ev.status] || "bg-muted-foreground/30"
                      )}
                    />
                  ))}
                  {/* Counter for 4+ events */}
                  {eventCount > 3 && (
                    <span className="text-[7px] lg:text-[8px] font-bold text-muted-foreground/60 leading-none ml-0.5">
                      +{eventCount - 3}
                    </span>
                  )}
                </div>
              )}

              {/* Checklist pending indicator */}
              {hasPending && (
                <span className="text-[6px] lg:text-[7px] text-amber-500/70 leading-none">📋</span>
              )}

              {/* Event count badge for days with many events */}
              {eventCount >= 2 && (
                <span className="absolute -top-0.5 -right-0.5 lg:top-0 lg:right-0 h-4 w-4 lg:h-[18px] lg:w-[18px] rounded-full bg-gradient-to-br from-primary to-primary/80 text-primary-foreground text-[7px] lg:text-[8px] font-bold flex items-center justify-center leading-none shadow-[0_2px_8px_rgba(0,0,0,0.15)]">
                  {eventCount}
                </span>
              )}
            </div>
          );
        },
      }}
    />

      {/* Legend */}
      <div className="flex flex-wrap items-center justify-center gap-2 pt-4 pb-2 px-3 border-t border-border/30 mt-2">
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[11px] font-medium">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          Confirmado
        </span>
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-[11px] font-medium">
          <span className="w-2 h-2 rounded-full bg-amber-400" />
          Pendente
        </span>
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-50 border border-red-200 text-red-700 text-[11px] font-medium">
          <span className="w-2 h-2 rounded-full bg-red-400" />
          Cancelado
        </span>
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-pink-50 border border-pink-200 text-pink-700 text-[11px] font-medium">
          <span className="w-2 h-2 rounded-full bg-pink-400" />
          Pré-reserva
        </span>
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted border border-border text-muted-foreground text-[11px] font-medium">
          <span className="text-[9px] leading-none">📋</span>
          Checklist
        </span>
      </div>
    </div>
  );
}
