import { useEffect, useMemo, useRef, useState } from "react";
import { Lock, Loader2, Check, Save } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface InternalQuestion {
  id: string;
  text: string;
  type?: string;
  internal?: boolean;
  step?: number;
}

interface PreFestaInternalAnswersProps {
  responseId: string;
  answers: any; // array of { questionId, value } OR object
  questions: InternalQuestion[];
  onSaved?: () => void;
}

/**
 * Renders only `internal: true` questions from the template, allowing the buffet
 * to fill them in even after the client has already submitted the form.
 * Auto-saves with debounce (1s).
 */
export function PreFestaInternalAnswers({ responseId, answers, questions, onSaved }: PreFestaInternalAnswersProps) {
  const internalQs = useMemo(
    () => (questions || []).filter((q) => q?.internal === true),
    [questions],
  );

  // Build initial draft from existing answers
  const initialDraft = useMemo(() => {
    const map: Record<string, any> = {};
    if (Array.isArray(answers)) {
      answers.forEach((a: any) => {
        if (a && typeof a === "object" && "questionId" in a) {
          map[a.questionId] = a.value;
        }
      });
    } else if (answers && typeof answers === "object") {
      Object.entries(answers).forEach(([k, v]) => { map[k] = v; });
    }
    return map;
  }, [answers, responseId]);

  const [draft, setDraft] = useState<Record<string, any>>(initialDraft);
  const [savingState, setSavingState] = useState<"idle" | "saving" | "saved">("idle");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync when responseId changes
  useEffect(() => { setDraft(initialDraft); }, [responseId]);

  const persist = async (next: Record<string, any>) => {
    setSavingState("saving");
    try {
      // Merge draft into answers preserving original ordering and non-internal entries
      let payload: any;
      if (Array.isArray(answers)) {
        const seen = new Set<string>();
        const merged = answers.map((a: any) => {
          if (a && typeof a === "object" && "questionId" in a) {
            seen.add(a.questionId);
            return next[a.questionId] !== undefined ? { ...a, value: next[a.questionId] } : a;
          }
          return a;
        });
        // Append internal answers that didn't exist yet
        Object.entries(next).forEach(([qid, val]) => {
          if (!seen.has(qid) && val !== undefined && val !== "") {
            merged.push({ questionId: qid, value: val });
          }
        });
        payload = merged;
      } else {
        payload = { ...(answers || {}), ...next };
      }

      const { error } = await (supabase as any)
        .from("prefesta_responses")
        .update({ answers: payload })
        .eq("id", responseId);
      if (error) throw error;

      setSavingState("saved");
      onSaved?.();
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
      savedTimerRef.current = setTimeout(() => setSavingState("idle"), 1500);
    } catch (err: any) {
      setSavingState("idle");
      toast({ title: "Erro ao salvar anotação interna", description: err?.message, variant: "destructive" });
    }
  };

  const handleChange = (qid: string, value: any) => {
    const next = { ...draft, [qid]: value };
    setDraft(next);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => persist(next), 1000);
  };

  if (internalQs.length === 0) return null;

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-3 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Lock className="h-3.5 w-3.5 text-amber-700" />
          <span className="text-[11px] font-semibold uppercase tracking-wider text-amber-800">
            Anotações internas do buffet
          </span>
        </div>
        <div className="text-[10px] text-amber-700 flex items-center gap-1">
          {savingState === "saving" && (<><Loader2 className="h-3 w-3 animate-spin" /> salvando…</>)}
          {savingState === "saved" && (<><Check className="h-3 w-3" /> salvo</>)}
        </div>
      </div>
      <p className="text-[10px] text-amber-700/80 -mt-1">Visível apenas para a equipe — o cliente não vê.</p>

      <div className="space-y-3">
        {internalQs.map((q) => {
          const value = draft[q.id] ?? "";
          const isYesNo = q.type === "yesno";
          const isLong = q.type === "textarea" || (typeof value === "string" && (value.length > 60 || value.includes("\n")));

          return (
            <div key={q.id} className="space-y-1">
              <Label className="text-xs text-foreground">{q.text}</Label>
              {isYesNo ? (
                <div className="flex gap-2">
                  {[
                    { label: "👍 Sim", val: true },
                    { label: "👎 Não", val: false },
                  ].map((opt) => (
                    <button
                      key={String(opt.val)}
                      onClick={() => handleChange(q.id, opt.val)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                        value === opt.val
                          ? "bg-primary text-primary-foreground"
                          : "bg-white border border-border text-muted-foreground hover:bg-muted"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              ) : isLong ? (
                <Textarea
                  value={typeof value === "string" ? value : value == null ? "" : String(value)}
                  onChange={(e) => handleChange(q.id, e.target.value)}
                  placeholder="Escreva aqui..."
                  className="bg-white text-sm rounded-lg min-h-[70px]"
                />
              ) : (
                <Input
                  value={typeof value === "string" ? value : value == null ? "" : String(value)}
                  onChange={(e) => handleChange(q.id, e.target.value)}
                  placeholder="Digite aqui..."
                  className="bg-white text-sm rounded-lg"
                />
              )}
            </div>
          );
        })}
      </div>

      <div className="flex justify-end pt-1">
        <Button
          size="sm"
          variant="default"
          className="h-8 px-3 gap-1.5 text-xs"
          disabled={savingState === "saving"}
          onClick={() => {
            if (debounceRef.current) clearTimeout(debounceRef.current);
            persist(draft);
          }}
        >
          {savingState === "saving" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
          Salvar
        </Button>
      </div>
    </div>
  );
}
