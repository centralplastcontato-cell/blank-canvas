import { useCallback, useEffect, useState } from "react";
import { CalendarSync, Check, ChevronDown, ClipboardCheck, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { PENDING_VISIT_STATUSES, brtNow, describeVisitWhen, isVisitOutcomeDue } from "@/lib/visitOutcome";
import { cn } from "@/lib/utils";

interface PendingVisit {
  id: string;
  lead_id: string;
  data_visita: string;
  horario_visita: string | null;
  unit: string | null;
  lead_name: string;
}

interface Props {
  companyId: string;
  /** abre a visita na aba (com a remarcação aberta quando reschedule) */
  onOpenVisit: (visitId: string, reschedule: boolean) => void;
  /** depois de marcar o resultado (a aba recarrega o mês) */
  onChanged: () => void;
  /** muda quando a aba recarrega as visitas */
  reloadKey: number;
  /** unidades que a pessoa pode ver (mesma regra da aba) */
  canSeeUnit?: (unit: string | null) => boolean;
}

const MAX_VISITS = 300;
const PREVIEW_ROWS = 5;

// Visitas que já passaram e ainda não têm resultado. Marcar aqui alimenta o
// comparecimento da Inteligência. Atendimento (entrega/retirada) não entra.
export function PendingVisitOutcomesCard({ companyId, onOpenVisit, onChanged, reloadKey, canSeeUnit }: Props) {
  const [pending, setPending] = useState<PendingVisit[]>([]);
  const [open, setOpen] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data: visits, error } = await supabase
      .from("lead_visits")
      .select("id, lead_id, data_visita, horario_visita, unit")
      .eq("company_id", companyId)
      .in("status_visita", [...PENDING_VISIT_STATUSES])
      .neq("visit_type", "atendimento")
      .lte("data_visita", brtNow().date)
      .order("data_visita", { ascending: false })
      .order("horario_visita", { ascending: false })
      .limit(MAX_VISITS);
    if (error) return;
    const due = (visits || []).filter((v) => isVisitOutcomeDue(v.data_visita, v.horario_visita));
    const leadIds = [...new Set(due.map((v) => v.lead_id))];
    const names = new Map<string, string>();
    for (let i = 0; i < leadIds.length; i += 100) {
      const { data: leads } = await supabase.from("campaign_leads").select("id, name").in("id", leadIds.slice(i, i + 100));
      for (const l of leads || []) names.set(l.id, l.name);
    }
    setPending(due.map((v) => ({ ...v, lead_name: names.get(v.lead_id) || "Cliente" })));
  }, [companyId]);

  useEffect(() => {
    load();
  }, [load, reloadKey]);

  const answer = async (visit: PendingVisit, status: "realizada" | "nao_compareceu" | "cancelada") => {
    setSavingId(visit.id);
    const { error } = await supabase.from("lead_visits").update({ status_visita: status }).eq("id", visit.id);
    setSavingId(null);
    if (error) {
      toast({ title: "Não consegui salvar", description: error.message, variant: "destructive" });
      return;
    }
    setPending((prev) => prev.filter((p) => p.id !== visit.id));
    onChanged();
  };

  const mine = canSeeUnit ? pending.filter((v) => canSeeUnit(v.unit)) : pending;
  if (mine.length === 0) return null;
  const visible = showAll ? mine : mine.slice(0, PREVIEW_ROWS);
  const total = pending.length >= MAX_VISITS ? `${mine.length}+` : String(mine.length);

  return (
    <div className="rounded-2xl border border-amber-500/30 bg-amber-500/[0.04] shadow-sm">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-3 p-3 md:p-4 text-left"
        aria-expanded={open}
      >
        <div className="h-10 w-10 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-400 flex items-center justify-center shrink-0">
          <ClipboardCheck className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold">
            Visitas sem resultado <span className="text-muted-foreground font-medium">· {total}</span>
          </p>
          <p className="text-[11px] text-muted-foreground">Marque se o cliente veio. Isso mostra o comparecimento certo na Inteligência.</p>
        </div>
        <ChevronDown className={cn("h-5 w-5 text-muted-foreground shrink-0 transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="px-3 pb-3 md:px-4 md:pb-4 space-y-2">
          {visible.map((v) => (
            <div key={v.id} className="rounded-xl border border-border/60 bg-card p-3">
              <p className="text-sm font-semibold truncate">{v.lead_name}</p>
              <p className="text-[11px] text-muted-foreground">
                {describeVisitWhen(v.data_visita, v.horario_visita)}
                {v.unit ? ` · ${v.unit}` : ""}
              </p>
              <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                <Button size="sm" disabled={savingId === v.id} className="h-8 rounded-full gap-1 bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => answer(v, "realizada")}>
                  <Check className="h-4 w-4" /> Veio
                </Button>
                <Button size="sm" disabled={savingId === v.id} variant="outline" className="h-8 rounded-full gap-1 border-red-300 text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30" onClick={() => answer(v, "nao_compareceu")}>
                  <X className="h-4 w-4" /> Não veio
                </Button>
                <Button size="sm" disabled={savingId === v.id} variant="outline" className="h-8 rounded-full gap-1" onClick={() => onOpenVisit(v.id, true)}>
                  <CalendarSync className="h-4 w-4" /> Remarcou
                </Button>
                <Button size="sm" disabled={savingId === v.id} variant="ghost" className="h-8 rounded-full text-muted-foreground bg-muted/60" onClick={() => answer(v, "cancelada")}>
                  Cancelou
                </Button>
              </div>
            </div>
          ))}
          {mine.length > PREVIEW_ROWS && (
            <button
              type="button"
              onClick={() => setShowAll((v) => !v)}
              className="w-full h-9 rounded-full text-xs font-semibold text-primary hover:bg-primary/5"
            >
              {showAll ? "Mostrar menos" : `Ver todas (${total})`}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
