import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Star, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const CRITERIA_LABELS: Record<string, string> = {
  pontualidade: "Pontualidade",
  aparencia: "Aparência",
  proatividade: "Proatividade",
  relacionamento: "Relacionamento",
  geral: "Geral",
};

interface Evaluation {
  id: string;
  scores: Record<string, number>;
  observations: string | null;
  created_at: string;
  event_id: string | null;
}

interface Props {
  freelancerName: string;
  companyId: string;
}

export function FreelancerEvaluationHistory({ freelancerName, companyId }: Props) {
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!freelancerName || !companyId) return;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("freelancer_evaluations")
        .select("id, scores, observations, created_at, event_id")
        .eq("company_id", companyId)
        .ilike("freelancer_name", freelancerName)
        .order("created_at", { ascending: false });
      setEvaluations((data as Evaluation[]) || []);
      setLoading(false);
    })();
  }, [freelancerName, companyId]);

  if (loading) {
    return <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;
  }

  if (evaluations.length === 0) {
    return <p className="text-xs text-muted-foreground py-2">Nenhuma avaliação registrada.</p>;
  }

  // Calculate averages per criterion
  const avgScores: Record<string, number> = {};
  const keys = Object.keys(CRITERIA_LABELS);
  keys.forEach(key => {
    const vals = evaluations.map(e => (e.scores as any)?.[key]).filter((v): v is number => typeof v === "number" && v > 0);
    avgScores[key] = vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
  });

  return (
    <div className="space-y-3">
      {/* Averages */}
      <div className="bg-muted/40 rounded-lg p-3 space-y-1.5">
        <p className="text-xs font-semibold text-muted-foreground mb-2">Média ({evaluations.length} avaliações)</p>
        {keys.map(key => (
          <div key={key} className="flex items-center justify-between gap-2">
            <span className="text-xs text-muted-foreground">{CRITERIA_LABELS[key]}</span>
            <div className="flex items-center gap-1">
              <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
              <span className="text-xs font-semibold">{avgScores[key] > 0 ? avgScores[key].toFixed(1) : "—"}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Individual evaluations */}
      <div className="space-y-2">
        {evaluations.map(ev => (
          <div key={ev.id} className="border border-border rounded-lg p-3 space-y-1">
            <p className="text-xs text-muted-foreground">
              {format(new Date(ev.created_at), "dd/MM/yyyy", { locale: ptBR })}
            </p>
            <div className="flex items-center gap-1">
              <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
              <span className="text-sm font-semibold">
                {(ev.scores as any)?.geral || "—"}
              </span>
              <span className="text-xs text-muted-foreground">/5</span>
            </div>
            {ev.observations && (
              <p className="text-xs text-muted-foreground mt-1">📝 {ev.observations}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/** Tiny badge showing avg score inline */
export function FreelancerAvgBadge({ freelancerName, companyId }: Props) {
  const [avg, setAvg] = useState<number | null>(null);

  useEffect(() => {
    if (!freelancerName || !companyId) return;
    (async () => {
      const { data } = await supabase
        .from("freelancer_evaluations")
        .select("scores")
        .eq("company_id", companyId)
        .ilike("freelancer_name", freelancerName);
      if (data && data.length > 0) {
        const scores = data.map(d => (d.scores as any)?.geral).filter((v): v is number => typeof v === "number" && v > 0);
        if (scores.length > 0) setAvg(scores.reduce((a, b) => a + b, 0) / scores.length);
      }
    })();
  }, [freelancerName, companyId]);

  if (avg === null) return null;

  return (
    <span className="inline-flex items-center gap-0.5 text-xs font-semibold ml-1.5">
      <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
      {avg.toFixed(1)}
    </span>
  );
}
