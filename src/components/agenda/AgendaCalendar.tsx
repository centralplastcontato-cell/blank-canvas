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
  confirmado: "bg-green-500",
  pendente: "bg-yellow-500",
  cancelado: "bg-red-500",
};

export function AgendaCalendar({ events, month, onMonthChange, onDayClick, selectedDate, checklistProgress = {} }: AgendaCalendarProps) {
  // Group events by date string
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
      className="p-3 lg:p-5"
      classNames={{
        months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
        month: "space-y-4 w-full",
        caption: "flex justify-center pt-1 relative items-center",
        caption_label: "text-sm lg:text-base font-medium capitalize",
        nav: "space-x-1 flex items-center",
        nav_button: cn(buttonVariants({ variant: "outline" }), "h-7 w-7 lg:h-9 lg:w-9 bg-transparent p-0 opacity-50 hover:opacity-100"),
        nav_button_previous: "absolute left-1",
        nav_button_next: "absolute right-1",
        table: "w-full border-collapse",
        head_row: "flex",
        head_cell: "text-muted-foreground rounded-md flex-1 font-normal text-[0.8rem] lg:text-sm text-center",
        row: "flex w-full mt-1 lg:mt-2",
        cell: "flex-1 text-center text-sm p-0 relative focus-within:relative focus-within:z-20",
        day: cn(buttonVariants({ variant: "ghost" }), "h-10 lg:h-20 w-full p-0 font-normal aria-selected:opacity-100 relative"),
        day_range_end: "day-range-end",
        day_selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
        day_today: "bg-accent text-accent-foreground",
        day_outside: "day-outside text-muted-foreground opacity-50",
        day_disabled: "text-muted-foreground opacity-50",
        day_hidden: "invisible",
      }}
      components={{
        IconLeft: () => <ChevronLeft className="h-4 w-4" />,
        IconRight: () => <ChevronRight className="h-4 w-4" />,
        DayContent: ({ date }) => {
          const dateKey = format(date, "yyyy-MM-dd");
          const dayEvents = eventsByDate.get(dateKey) || [];
          // Check if any event on this day has pending checklist items
          const hasPending = dayEvents.some((ev) => {
            const p = checklistProgress[ev.id];
            return p && p.total > 0 && p.completed < p.total;
          });
          return (
            <div className="flex flex-col items-center gap-0.5">
              <span className="lg:text-base">{date.getDate()}</span>
              {dayEvents.length > 0 && (
                <div className="flex gap-0.5 lg:gap-1 justify-center items-center">
                  {dayEvents.slice(0, 3).map((ev) => (
                    <span
                      key={ev.id}
                      className={cn("h-1.5 w-1.5 lg:h-2 lg:w-2 rounded-full", STATUS_COLORS[ev.status] || "bg-muted-foreground")}
                    />
                  ))}
                  {dayEvents.length > 3 && (
                    <span className="text-[8px] text-muted-foreground leading-none">+{dayEvents.length - 3}</span>
                  )}
                </div>
              )}
              {hasPending && (
                <span className="text-[7px] text-orange-500 font-medium leading-none">📋</span>
              )}
            </div>
          );
        },
      }}
    />
  );
}
