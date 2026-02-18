import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { Star, Loader2 } from "lucide-react";

interface StaffEntry {
  name: string;
  pix_type: string;
  pix_key: string;
  value: string;
}

interface StaffRole {
  roleTitle: string;
  entries: StaffEntry[];
}

interface EvalRecord {
  id: string;
  event_id: string | null;
  company_id: string;
  event_staff_entry_id?: string;
  staff_data: StaffRole[];
}

const CRITERIA = [
  { key: "pontualidade", label: "Pontualidade" },
  { key: "aparencia", label: "Aparência e Uniforme" },
  { key: "proatividade", label: "Proatividade" },
  { key: "relacionamento", label: "Relacionamento com Convidados" },
  { key: "geral", label: "Avaliação Geral" },
] as const;

type Scores = Record<string, number>;

interface FreelancerEval {
  name: string;
  scores: Scores;
  observations: string;
}

function StarRating({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(n => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          className="p-0.5 hover:scale-110 transition-transform"
        >
          <Star
            className={`h-5 w-5 ${n <= value ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/40"}`}
          />
        </button>
      ))}
    </div>
  );
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  record: EvalRecord;
}

export function FreelancerEvaluationDialog({ open, onOpenChange, record }: Props) {
  const [evals, setEvals] = useState<FreelancerEval[]>([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  // Extract freelancer names from staff_data
  const freelancerNames = record.staff_data
    .flatMap(role => role.entries)
    .map(e => e.name.trim())
    .filter(Boolean)
    .filter((v, i, a) => a.indexOf(v) === i); // unique

  useEffect(() => {
    if (!open) return;
    loadExisting();
  }, [open]);

  const loadExisting = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("freelancer_evaluations")
      .select("*")
      .eq("event_staff_entry_id", record.id)
      .eq("company_id", record.company_id);

    const existingMap = new Map(
      (data || []).map((d: any) => [d.freelancer_name, d])
    );

    setEvals(
      freelancerNames.map(name => {
        const existing = existingMap.get(name);
        return {
          name,
          scores: existing?.scores
            ? (existing.scores as Scores)
            : Object.fromEntries(CRITERIA.map(c => [c.key, 0])),
          observations: existing?.observations || "",
        };
      })
    );
    setLoading(false);
  };

  const updateScore = (idx: number, key: string, value: number) => {
    setEvals(prev => prev.map((e, i) =>
      i === idx ? { ...e, scores: { ...e.scores, [key]: value } } : e
    ));
  };

  const updateObs = (idx: number, value: string) => {
    setEvals(prev => prev.map((e, i) =>
      i === idx ? { ...e, observations: value } : e
    ));
  };

  const handleSave = async () => {
    // Validate all have at least "geral" rated
    const incomplete = evals.filter(e => !e.scores.geral || e.scores.geral === 0);
    if (incomplete.length > 0) {
      toast({ title: "Preencha ao menos a Avaliação Geral de cada freelancer", variant: "destructive" });
      return;
    }

    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();

    for (const ev of evals) {
      // Auto-match freelancer_response_id
      const { data: matchData } = await supabase
        .from("freelancer_responses")
        .select("id")
        .eq("company_id", record.company_id)
        .ilike("respondent_name", ev.name)
        .limit(1);

      const payload = {
        company_id: record.company_id,
        event_staff_entry_id: record.id,
        event_id: record.event_id,
        freelancer_name: ev.name,
        freelancer_response_id: matchData?.[0]?.id || null,
        evaluated_by: user?.id || null,
        scores: ev.scores,
        observations: ev.observations || null,
      };

      // Use upsert with the unique constraint
      const { error } = await (supabase as any)
        .from("freelancer_evaluations")
        .upsert(payload, { onConflict: "event_staff_entry_id,freelancer_name" });

      if (error) {
        toast({ title: `Erro ao salvar avaliação de ${ev.name}`, description: error.message, variant: "destructive" });
        setSaving(false);
        return;
      }
    }

    setSaving(false);
    toast({ title: "Avaliações salvas!" });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85dvh] flex flex-col p-0 gap-0 overflow-hidden">
        <DialogHeader className="p-4 pb-2 shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Star className="h-5 w-5 text-yellow-500" />
            Avaliar Equipe
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto px-4 pb-4 space-y-6" style={{ WebkitOverflowScrolling: "touch" }}>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : freelancerNames.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Nenhum freelancer com nome preenchido nesta equipe.
            </p>
          ) : (
            evals.map((ev, idx) => (
              <div key={ev.name} className="space-y-3 border-b border-border pb-4 last:border-0">
                <h4 className="font-semibold text-sm">{ev.name}</h4>
                <div className="space-y-2">
                  {CRITERIA.map(c => (
                    <div key={c.key} className="flex items-center justify-between gap-2">
                      <Label className="text-xs text-muted-foreground flex-1">{c.label}</Label>
                      <StarRating
                        value={ev.scores[c.key] || 0}
                        onChange={v => updateScore(idx, c.key, v)}
                      />
                    </div>
                  ))}
                </div>
                <Textarea
                  placeholder="Observações (opcional)"
                  value={ev.observations}
                  onChange={e => updateObs(idx, e.target.value)}
                  className="min-h-[60px] text-sm"
                />
              </div>
            ))
          )}
        </div>

        <DialogFooter className="p-4 pt-2 shrink-0">
          <Button onClick={handleSave} disabled={saving || freelancerNames.length === 0} className="w-full gap-2">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Salvar Avaliações
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
