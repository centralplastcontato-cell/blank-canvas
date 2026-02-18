import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { Star, Loader2, CheckCircle } from "lucide-react";

interface StaffRole {
  roleTitle: string;
  entries: { name: string; pix_type: string; pix_key: string; value: string }[];
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
  recordId: string;
  companyId: string;
  eventId: string | null;
  staffData: StaffRole[];
}

export function PublicStaffEvaluation({ recordId, companyId, eventId, staffData }: Props) {
  const [evals, setEvals] = useState<FreelancerEval[]>([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitted, setSubmitted] = useState(false);

  const freelancerNames = staffData
    .filter(role => !role.roleTitle.toLowerCase().includes("gerente"))
    .flatMap(role => role.entries)
    .map(e => e.name.trim())
    .filter(Boolean)
    .filter((v, i, a) => a.indexOf(v) === i);

  useEffect(() => {
    loadExisting();
  }, [recordId]);

  const loadExisting = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("freelancer_evaluations")
      .select("*")
      .eq("event_staff_entry_id", recordId)
      .eq("company_id", companyId);

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
    const incomplete = evals.filter(e => !e.scores.geral || e.scores.geral === 0);
    if (incomplete.length > 0) {
      toast({ title: "Preencha ao menos a Avaliação Geral de cada freelancer", variant: "destructive" });
      return;
    }

    setSaving(true);

    for (const ev of evals) {
      const payload = {
        company_id: companyId,
        event_staff_entry_id: recordId,
        event_id: eventId,
        freelancer_name: ev.name,
        evaluated_by: null,
        scores: ev.scores,
        observations: ev.observations || null,
      };

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
    setSubmitted(true);
    toast({ title: "Avaliações salvas! ✅" });
  };

  if (submitted) {
    return (
      <div className="py-12 text-center space-y-3">
        <CheckCircle className="h-14 w-14 mx-auto text-primary" />
        <h2 className="text-lg font-semibold">Avaliações enviadas! ✅</h2>
        <p className="text-muted-foreground text-sm">Obrigado por avaliar a equipe.</p>
        <Button variant="outline" onClick={() => setSubmitted(false)}>Editar avaliações</Button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (freelancerNames.length === 0) {
    return (
      <p className="text-center text-muted-foreground py-12 text-sm">
        Nenhum freelancer com nome preenchido. Preencha os nomes na aba "Equipe / Financeiro" primeiro.
      </p>
    );
  }

  return (
    <div className="space-y-5">
      {evals.map((ev, idx) => (
        <div key={ev.name} className="space-y-3 border rounded-lg p-3">
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
      ))}

      <Button onClick={handleSave} disabled={saving} className="w-full h-12 text-base gap-2">
        {saving && <Loader2 className="h-4 w-4 animate-spin" />}
        Salvar Avaliações
      </Button>
    </div>
  );
}
