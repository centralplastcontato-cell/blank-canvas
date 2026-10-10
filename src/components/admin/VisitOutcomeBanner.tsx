import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { CalendarClock, Check, X, CalendarSync } from "lucide-react";
import {
  PENDING_VISIT_STATUSES,
  VISIT_OUTCOME_LOOKBACK_DAYS,
  brtDateDaysAgo,
  brtNow,
  describeVisitWhen,
  isVisitOutcomeDue,
} from "@/lib/visitOutcome";

interface PendingVisit {
  id: string;
  lead_id: string;
  data_visita: string;
  horario_visita: string | null;
  lead_name: string;
}

// "Depois" esconde a pergunta desta visita por 3 h, só neste aparelho
const SNOOZE_KEY = "visit-outcome-snooze";
const SNOOZE_MS = 3 * 60 * 60 * 1000;

function readSnoozed(): Record<string, number> {
  try {
    return JSON.parse(localStorage.getItem(SNOOZE_KEY) || "{}") || {};
  } catch {
    return {};
  }
}

function snooze(visitId: string) {
  try {
    const all = readSnoozed();
    all[visitId] = Date.now();
    localStorage.setItem(SNOOZE_KEY, JSON.stringify(all));
  } catch {
    // sem armazenamento: a pergunta volta na próxima atualização
  }
}

/**
 * Pergunta se a visita aconteceu depois do horário marcado. A resposta grava
 * o resultado da visita (realizada / não compareceu) — é o que alimenta o
 * comparecimento da Inteligência.
 */
export function VisitOutcomeBanner() {
  const navigate = useNavigate();
  const { currentCompany } = useCompany();
  const companyId = currentCompany?.id;
  const [pending, setPending] = useState<PendingVisit[]>([]);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!companyId) return;
    const { data: visits } = await supabase
      .from("lead_visits")
      .select("id, lead_id, data_visita, horario_visita")
      .eq("company_id", companyId)
      .in("status_visita", [...PENDING_VISIT_STATUSES])
      // Atendimento (entrega/retirada) não é visita: não pergunta se "veio"
      .neq("visit_type", "atendimento")
      .gte("data_visita", brtDateDaysAgo(VISIT_OUTCOME_LOOKBACK_DAYS))
      .lte("data_visita", brtNow().date)
      .order("data_visita", { ascending: false })
      .order("horario_visita", { ascending: false })
      .limit(50);

    const snoozed = readSnoozed();
    const due = (visits || []).filter(
      (v) => isVisitOutcomeDue(v.data_visita, v.horario_visita) && !(snoozed[v.id] && Date.now() - snoozed[v.id] < SNOOZE_MS),
    );
    if (due.length === 0) {
      setPending([]);
      return;
    }
    const leadIds = [...new Set(due.map((v) => v.lead_id))];
    const { data: leads } = await supabase.from("campaign_leads").select("id, name").in("id", leadIds);
    const names = new Map((leads || []).map((l) => [l.id, l.name]));
    setPending(due.map((v) => ({ ...v, lead_name: names.get(v.lead_id) || "Cliente" })));
  }, [companyId]);

  useEffect(() => {
    load();
    const timer = setInterval(load, 5 * 60 * 1000);
    window.addEventListener("focus", load);
    return () => {
      clearInterval(timer);
      window.removeEventListener("focus", load);
    };
  }, [load]);

  if (pending.length === 0) return null;
  const visit = pending[0];
  const others = pending.length - 1;

  const answer = async (status: "realizada" | "nao_compareceu") => {
    setSaving(true);
    const { error } = await supabase.from("lead_visits").update({ status_visita: status }).eq("id", visit.id);
    setSaving(false);
    if (error) {
      toast({ title: "Não consegui salvar", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: status === "realizada" ? "Visita marcada como realizada" : "Marcado: não compareceu" });
    setPending((prev) => prev.filter((p) => p.id !== visit.id));
  };

  const later = () => {
    snooze(visit.id);
    setPending((prev) => prev.filter((p) => p.id !== visit.id));
  };

  return (
    <VisitOutcomeBar
      leadName={visit.lead_name}
      when={describeVisitWhen(visit.data_visita, visit.horario_visita)}
      others={others}
      saving={saving}
      onCame={() => answer("realizada")}
      onNoShow={() => answer("nao_compareceu")}
      onRescheduled={() => navigate(`/agenda?tab=visitas&visita=${visit.id}&remarcar=1`)}
      onLater={later}
    />
  );
}

interface VisitOutcomeBarProps {
  leadName: string;
  when: string;
  others: number;
  saving: boolean;
  onCame: () => void;
  onNoShow: () => void;
  onRescheduled: () => void;
  onLater: () => void;
}

/** A faixa em si. No celular o texto fica em cima e os botões embaixo. */
export function VisitOutcomeBar({ leadName, when, others, saving, onCame, onNoShow, onRescheduled, onLater }: VisitOutcomeBarProps) {
  return (
    <div className="bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 border-b-2 border-amber-300 px-3 py-2.5 sm:px-4 sm:py-3 shadow-md shadow-amber-500/30">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white/25 shrink-0">
            <CalendarClock className="w-5 h-5 text-amber-950" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-extrabold text-amber-950 leading-snug break-words">
              A visita de <span className="underline decoration-amber-950/40">{leadName}</span> aconteceu?
            </p>
            <p className="text-xs text-amber-950/80">
              Marcada para {when}
              {others > 0 && ` · mais ${others} ${others === 1 ? "visita" : "visitas"} sem resposta`}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 sm:shrink-0">
          <Button size="sm" disabled={saving} className="h-8 px-2.5 sm:px-3 gap-1 bg-emerald-700 hover:bg-emerald-800 text-white font-bold" onClick={onCame}>
            <Check className="w-4 h-4" /> Veio
          </Button>
          <Button size="sm" disabled={saving} variant="outline" className="h-8 px-2.5 sm:px-3 gap-1 bg-white/90 border-red-300 text-red-700 hover:bg-white font-bold" onClick={onNoShow}>
            <X className="w-4 h-4" /> Não veio
          </Button>
          <Button size="sm" disabled={saving} variant="ghost" className="h-8 px-2 sm:px-3 gap-1 text-amber-950 hover:bg-white/30" onClick={onRescheduled}>
            <CalendarSync className="w-4 h-4" /> Remarcou
          </Button>
          <Button size="sm" variant="ghost" className="h-8 px-2 sm:px-3 text-amber-950/80 hover:bg-white/30" onClick={onLater}>
            Depois
          </Button>
        </div>
      </div>
    </div>
  );
}
