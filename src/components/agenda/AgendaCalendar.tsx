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

const STATUS_COLORS: Record<string, string> = {
  confirmado: "bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.4)]",
  pendente: "bg-amber-500 shadow-[0_0_6px_rgba(245,158,11,0.4)]",
  cancelado: "bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.3)]",
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
        caption: "flex justify-center pt-2 lg:pt-4 relative items-center mb-2",
        caption_label: "text-base lg:text-xl font-bold capitalize tracking-tight text-foreground",
        nav: "space-x-1 flex items-center",
        nav_button: cn(
          buttonVariants({ variant: "ghost" }),
          "h-8 w-8 lg:h-10 lg:w-10 p-0 text-muted-foreground hover:text-foreground hover:bg-primary/10 rounded-xl transition-all duration-200"
        ),
        nav_button_previous: "absolute left-1",
        nav_button_next: "absolute right-1",
        table: "w-full border-collapse",
        head_row: "flex",
        head_cell: "text-muted-foreground/70 rounded-md flex-1 font-semibold text-[0.7rem] lg:text-xs text-center uppercase tracking-widest py-2",
        row: "flex w-full mt-0.5 lg:mt-1",
        cell: "flex-1 text-center text-sm p-0.5 lg:p-1 relative focus-within:relative focus-within:z-20",
        day: cn(
          buttonVariants({ variant: "ghost" }),
          "h-12 lg:h-[4.5rem] w-full p-0 font-normal aria-selected:opacity-100 relative rounded-xl",
          "hover:bg-muted/60 hover:shadow-sm transition-all duration-200"
        ),
        day_range_end: "day-range-end",
        day_selected: cn(
          "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
          "ring-2 ring-primary/30 ring-offset-2 ring-offset-background shadow-[0_0_12px_rgba(var(--primary-rgb,99,102,241),0.25)]"
        ),
        day_today: cn(
          "bg-primary/10 text-primary font-bold",
          "ring-1 ring-primary/20"
        ),
        day_outside: "day-outside text-muted-foreground/40 opacity-50",
        day_disabled: "text-muted-foreground opacity-50",
        day_hidden: "invisible",
      }}
      components={{
        IconLeft: () => <ChevronLeft className="h-4 w-4" />,
        IconRight: () => <ChevronRight className="h-4 w-4" />,
        DayContent: ({ date }) => {
          const dateKey = format(date, "yyyy-MM-dd");
          const dayEvents = eventsByDate.get(dateKey) || [];
          const hasPending = dayEvents.some((ev) => {
            const p = checklistProgress[ev.id];
            return p && p.total > 0 && p.completed < p.total;
          });
          const hasEvents = dayEvents.length > 0;

          return (
            <div className={cn(
              "flex flex-col items-center gap-0.5 lg:gap-1 w-full h-full justify-center",
              hasEvents && "relative"
            )}>
              <span className={cn(
                "lg:text-lg transition-all duration-200",
                hasEvents ? "font-semibold text-foreground" : "text-foreground/80"
              )}>
                {date.getDate()}
              </span>
              {hasEvents && (
                <div className="flex gap-[3px] lg:gap-1 justify-center items-center">
                  {dayEvents.slice(0, 3).map((ev) => (
                    <span
                      key={ev.id}
                      className={cn(
                        "h-1.5 w-1.5 lg:h-2.5 lg:w-2.5 rounded-full transition-all duration-300",
                        STATUS_COLORS[ev.status] || "bg-muted-foreground"
                      )}
                    />
                  ))}
                  {dayEvents.length > 3 && (
                    <span className="text-[7px] lg:text-[9px] text-muted-foreground font-semibold leading-none ml-0.5">
                      +{dayEvents.length - 3}
                    </span>
                  )}
                </div>
              )}
              {hasPending && (
                <span className="text-[7px] text-amber-500 font-medium leading-none">📋</span>
              )}
            </div>
          );
        },
      }}
    />
  );
}
