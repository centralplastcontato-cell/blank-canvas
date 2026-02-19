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

interface AgendaCalendarProps {
  events: CalendarEvent[];
  month: Date;
  onMonthChange: (month: Date) => void;
  onDayClick: (date: Date) => void;
  selectedDate: Date | null;
  checklistProgress?: ChecklistProgress;
}

const STATUS_DOT: Record<string, string> = {
  confirmado: "bg-emerald-500",
  pendente: "bg-amber-400",
  cancelado: "bg-red-400",
};

export function AgendaCalendar({ events, month, onMonthChange, onDayClick, selectedDate, checklistProgress = {} }: AgendaCalendarProps) {
  const eventsByDate = new Map<string, CalendarEvent[]>();
  events.forEach((ev) => {
    const key = ev.event_date;
    if (!eventsByDate.has(key)) eventsByDate.set(key, []);
    eventsByDate.get(key)!.push(ev);
  });

  return (
    <DayPicker
      mode="single"
      selected={selectedDate ?? undefined}
      onSelect={(date) => date && onDayClick(date)}
      month={month}
      onMonthChange={onMonthChange}
      locale={ptBR}
      showOutsideDays
      className="p-2 lg:p-5"
      classNames={{
        months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
        month: "space-y-4 w-full",
        caption: "flex justify-center pt-2 lg:pt-3 relative items-center mb-2",
        caption_label: "text-base lg:text-lg font-semibold capitalize tracking-tight text-foreground",
        nav: "space-x-1 flex items-center",
        nav_button: cn(
          buttonVariants({ variant: "ghost" }),
          "h-8 w-8 lg:h-9 lg:w-9 p-0 text-muted-foreground/60 hover:text-foreground hover:bg-accent rounded-xl transition-all duration-150"
        ),
        nav_button_previous: "absolute left-1",
        nav_button_next: "absolute right-1",
        table: "w-full border-collapse",
        head_row: "flex",
        head_cell: "text-muted-foreground/50 flex-1 font-medium text-[0.65rem] lg:text-[0.7rem] text-center uppercase tracking-[0.15em] pb-2",
        row: "flex w-full",
        cell: "flex-1 text-center text-sm p-0.5 lg:p-[3px] relative focus-within:relative focus-within:z-20",
        day: cn(
          buttonVariants({ variant: "ghost" }),
          "h-12 lg:h-[4.5rem] w-full p-0 font-normal aria-selected:opacity-100 relative rounded-xl",
          "hover:bg-primary/[0.06] transition-all duration-150 cursor-pointer"
        ),
        day_range_end: "day-range-end",
        day_selected: cn(
          "bg-gradient-to-br from-primary to-primary/90 text-primary-foreground",
          "hover:from-primary hover:to-primary/90 hover:text-primary-foreground",
          "focus:from-primary focus:to-primary/90 focus:text-primary-foreground",
          "shadow-[0_2px_12px_rgba(0,0,0,0.12)] ring-1 ring-primary/20"
        ),
        day_today: cn(
          "bg-accent text-foreground font-semibold",
          "ring-1 ring-border"
        ),
        day_outside: "day-outside text-muted-foreground/30",
        day_disabled: "text-muted-foreground/30",
        day_hidden: "invisible",
      }}
      components={{
        IconLeft: () => <ChevronLeft className="h-4 w-4" />,
        IconRight: () => <ChevronRight className="h-4 w-4" />,
        DayContent: ({ date }) => {
          const dateKey = format(date, "yyyy-MM-dd");
          const dayEvents = eventsByDate.get(dateKey) || [];
          const hasEvents = dayEvents.length > 0;
          const eventCount = dayEvents.length;

          const hasPending = dayEvents.some((ev) => {
            const p = checklistProgress[ev.id];
            return p && p.total > 0 && p.completed < p.total;
          });

          return (
            <div className="flex flex-col items-center gap-0.5 lg:gap-1 w-full h-full justify-center relative">
              <span className={cn(
                "text-sm lg:text-base transition-colors duration-150",
                hasEvents ? "font-semibold text-foreground" : "text-foreground/65"
              )}>
                {date.getDate()}
              </span>

              {hasEvents && (
                <div className="flex items-center gap-[2px] lg:gap-[3px] justify-center">
                  {/* Show up to 3 status dots */}
                  {dayEvents.slice(0, 3).map((ev) => (
                    <span
                      key={ev.id}
                      className={cn(
                        "h-[5px] w-[5px] lg:h-[6px] lg:w-[6px] rounded-full",
                        STATUS_DOT[ev.status] || "bg-muted-foreground/40"
                      )}
                    />
                  ))}
                  {/* Counter for 4+ events */}
                  {eventCount > 3 && (
                    <span className="text-[7px] lg:text-[8px] font-bold text-muted-foreground/70 leading-none ml-0.5">
                      +{eventCount - 3}
                    </span>
                  )}
                </div>
              )}

              {/* Checklist pending indicator */}
              {hasPending && (
                <span className="text-[6px] lg:text-[7px] text-amber-500/80 leading-none">📋</span>
              )}

              {/* Event count badge for days with many events */}
              {eventCount >= 2 && (
                <span className="absolute top-0 right-0 lg:top-0.5 lg:right-0.5 h-3.5 w-3.5 lg:h-4 lg:w-4 rounded-full bg-primary/90 text-primary-foreground text-[7px] lg:text-[8px] font-bold flex items-center justify-center leading-none">
                  {eventCount}
                </span>
              )}
            </div>
          );
        },
      }}
    />
  );
}
