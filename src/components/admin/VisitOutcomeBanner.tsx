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
    <div className="bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 border-b-2 border-amber-300 px-4 py-3 shadow-md shadow-amber-500/30">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-white/25 shrink-0">
            <CalendarClock className="w-5 h-5 text-amber-950" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-extrabold text-amber-950">
              A visita de <span className="underline decoration-amber-950/40">{visit.lead_name}</span> aconteceu?
            </p>
            <p className="text-xs text-amber-950/80">
              Marcada para {describeVisitWhen(visit.data_visita, visit.horario_visita)}
              {others > 0 && ` · mais ${others} ${others === 1 ? "visita" : "visitas"} sem resposta`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button size="sm" disabled={saving} className="h-8 gap-1 bg-emerald-700 hover:bg-emerald-800 text-white font-bold" onClick={() => answer("realizada")}>
            <Check className="w-4 h-4" /> Veio
          </Button>
          <Button size="sm" disabled={saving} variant="outline" className="h-8 gap-1 bg-white/90 border-red-300 text-red-700 hover:bg-white font-bold" onClick={() => answer("nao_compareceu")}>
            <X className="w-4 h-4" /> Não veio
          </Button>
          <Button size="sm" disabled={saving} variant="ghost" className="h-8 gap-1 text-amber-950 hover:bg-white/30" onClick={() => navigate("/agenda?tab=visitas")}>
            <CalendarSync className="w-4 h-4" /> Remarcou
          </Button>
          <Button size="sm" variant="ghost" className="h-8 text-amber-950/80 hover:bg-white/30" onClick={later}>
            Depois
          </Button>
        </div>
      </div>
    </div>
  );
}
