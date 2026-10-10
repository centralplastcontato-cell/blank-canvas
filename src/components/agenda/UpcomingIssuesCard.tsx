import { useEffect, useMemo, useState } from "react";
import { addDays, format } from "date-fns";
import { ChevronDown, ClipboardList } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  EVENT_ISSUE_LABEL,
  UPCOMING_ISSUE_DAYS,
  countIssues,
  eventIssues,
  type EventIssue,
  type IssueEvent,
} from "@/lib/agendaIssues";
import { cn } from "@/lib/utils";

type UpcomingEvent = IssueEvent & { id: string; title: string; event_date: string; [key: string]: unknown };

interface Props {
  companyId: string;
  /** mesmas regras de unidade da agenda (permissão e unidade escolhida) */
  filterEvent: (ev: { unit: string | null }) => boolean;
  /** a empresa tem unidades de festa (aí "sem unidade" conta) */
  hasUnits: boolean;
  /** muda quando uma festa é salva ou excluída */
  reloadKey: number;
  onOpenEvent: (ev: UpcomingEvent) => void;
}

const ISSUE_TONE: Record<EventIssue, string> = {
  parcela_vencida: "bg-red-500/10 text-red-700 dark:text-red-400",
  pendente: "bg-amber-500/15 text-amber-800 dark:text-amber-400",
  sem_valor: "bg-orange-500/10 text-orange-700 dark:text-orange-400",
  sem_horario: "bg-sky-500/10 text-sky-700 dark:text-sky-400",
  sem_unidade: "bg-violet-500/10 text-violet-700 dark:text-violet-400",
};

const PREVIEW_ROWS = 5;

// Lista das próximas festas com algo para resolver (parcela vencida, ainda
// pendente, sem valor, sem horário, sem unidade). Tocar abre a festa.
export function UpcomingIssuesCard({ companyId, filterEvent, hasUnits, reloadKey, onOpenEvent }: Props) {
  const [events, setEvents] = useState<UpcomingEvent[]>([]);
  const [overdueIds, setOverdueIds] = useState<Set<string>>(new Set());
  const [open, setOpen] = useState(false);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const today = format(new Date(), "yyyy-MM-dd");
      const until = format(addDays(new Date(), UPCOMING_ISSUE_DAYS), "yyyy-MM-dd");
      const { data: evs, error } = await supabase
        .from("company_events")
        .select("*")
        .eq("company_id", companyId)
        .neq("status", "cancelado")
        .gte("event_date", today)
        .lte("event_date", until)
        .order("event_date")
        .order("start_time");
      if (cancelled || error) return;
      const list = (evs || []) as unknown as UpcomingEvent[];

      // Parcela vencida = venceu antes de hoje e o que foi recebido não cobre
      const overdue = new Set<string>();
      const ids = list.map((e) => e.id);
      if (ids.length > 0) {
        const { data: pays } = await supabase
          .from("event_payments")
          .select("id, event_id, amount")
          .in("event_id", ids)
          .neq("status", "paid")
          .lt("due_date", today);
        const late = pays || [];
        if (late.length > 0) {
          const { data: entries } = await supabase
            .from("event_payment_entries")
            .select("payment_id, amount")
            .in("payment_id", late.map((p) => p.id));
          const received: Record<string, number> = {};
          for (const e of entries || []) received[e.payment_id] = (received[e.payment_id] || 0) + Number(e.amount || 0);
          for (const p of late) {
            if ((received[p.id] || 0) + 0.01 < Number(p.amount || 0)) overdue.add(p.event_id);
          }
        }
      }
      if (cancelled) return;
      setEvents(list);
      setOverdueIds(overdue);
    })();
    return () => { cancelled = true; };
  }, [companyId, reloadKey]);

  const rows = useMemo(
    () =>
      events
        .filter(filterEvent)
        .map((ev) => ({ ev, issues: eventIssues(ev, { hasUnits, hasOverduePayment: overdueIds.has(ev.id) }) }))
        .filter((r) => r.issues.length > 0),
    [events, filterEvent, hasUnits, overdueIds],
  );

  if (rows.length === 0) return null;
  const summary = countIssues(rows.map((r) => r.issues));
  const visible = showAll ? rows : rows.slice(0, PREVIEW_ROWS);

  return (
    <div className="rounded-2xl border border-amber-500/30 bg-amber-500/[0.04] shadow-sm">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-3 p-3 md:p-4 text-left"
        aria-expanded={open}
      >
        <div className="h-10 w-10 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-400 flex items-center justify-center shrink-0">
          <ClipboardList className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold">
            O que falta resolver <span className="text-muted-foreground font-medium">· {rows.length} festa{rows.length > 1 ? "s" : ""}</span>
          </p>
          <p className="text-[11px] text-muted-foreground">Próximos {UPCOMING_ISSUE_DAYS} dias</p>
          <div className="mt-1.5 flex flex-wrap gap-1">
            {summary.map(({ issue, count }) => (
              <span key={issue} className={cn("rounded-full px-2 py-0.5 text-[11px] font-medium", ISSUE_TONE[issue])}>
                {count} {EVENT_ISSUE_LABEL[issue].toLowerCase()}
              </span>
            ))}
          </div>
        </div>
        <ChevronDown className={cn("h-5 w-5 text-muted-foreground shrink-0 transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="px-3 pb-3 md:px-4 md:pb-4 space-y-2">
          {visible.map(({ ev, issues }) => (
            <button
              key={ev.id}
              type="button"
              onClick={() => onOpenEvent(ev)}
              className="w-full text-left rounded-xl border border-border/60 bg-card p-3 hover:shadow-sm transition-shadow"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-xs font-bold tabular-nums text-muted-foreground shrink-0">
                  {format(new Date(ev.event_date + "T12:00:00"), "dd/MM")}
                </span>
                <span className="text-sm font-semibold truncate">{ev.title}</span>
              </div>
              <div className="mt-1.5 flex flex-wrap gap-1">
                {issues.map((issue) => (
                  <span key={issue} className={cn("rounded-full px-2 py-0.5 text-[11px] font-medium", ISSUE_TONE[issue])}>
                    {EVENT_ISSUE_LABEL[issue]}
                  </span>
                ))}
              </div>
            </button>
          ))}
          {rows.length > PREVIEW_ROWS && (
            <button
              type="button"
              onClick={() => setShowAll((v) => !v)}
              className="w-full h-9 rounded-full text-xs font-semibold text-primary hover:bg-primary/5"
            >
              {showAll ? "Mostrar menos" : `Ver todas (${rows.length})`}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
