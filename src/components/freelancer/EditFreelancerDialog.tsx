import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

interface FreelancerQuestion {
  id: string;
  type: "text" | "textarea" | "yesno" | "select" | "multiselect" | "photo" | "date";
  text: string;
  step: number;
  required?: boolean;
  options?: string[];
}

interface FreelancerTemplate {
  id: string;
  company_id: string;
  name: string;
  slug: string | null;
  description: string | null;
  questions: FreelancerQuestion[];
  thank_you_message: string | null;
  is_active: boolean;
  created_at: string;
}

export const DEFAULT_QUESTIONS: FreelancerQuestion[] = [
  { id: "nome", type: "text", text: "Como você se chama?", step: 1, required: true },
  { id: "foto", type: "photo", text: "Foto", step: 1, required: true },
  { id: "data_nascimento", type: "date", text: "Data de nascimento", step: 1, required: true },
  { id: "telefone", type: "text", text: "Telefone", step: 1, required: true },
  { id: "endereco", type: "text", text: "Endereço", step: 1, required: true },
  { id: "ja_trabalha", type: "yesno", text: "Já trabalha no buffet?", step: 2, required: true },
  { id: "tempo_trabalho", type: "text", text: "Há quanto tempo?", step: 2 },
  { id: "pix_tipo", type: "select", text: "Tipo de chave PIX", step: 1, options: ["CPF", "CNPJ", "E-mail", "Telefone", "Chave aleatória"] },
  { id: "pix_chave", type: "text", text: "Chave PIX", step: 1 },
  { id: "funcao", type: "multiselect", text: "Qual é a sua função?", step: 2, required: true, options: ["Gerente", "Segurança", "Garçom", "Monitor", "Cozinha"] },
  { id: "sobre", type: "textarea", text: "Fale um pouco sobre você", step: 3 },
];

interface EditFreelancerDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  response: any;
  template?: FreelancerTemplate | null;
  onSaved: () => void;
}

export function EditFreelancerDialog({ open, onOpenChange, response, template, onSaved }: EditFreelancerDialogProps) {
  const [answers, setAnswers] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);

  // If no template provided, use default questions as a fallback template
  const effectiveQuestions = template?.questions || DEFAULT_QUESTIONS;

  useEffect(() => {
    if (open && response) {
      setAnswers(Array.isArray(response.answers) ? JSON.parse(JSON.stringify(response.answers)) : []);
    }
  }, [open, response]);

  const updateAnswer = (questionId: string, value: any) => {
    setAnswers(prev => prev.map(a => a.questionId === questionId ? { ...a, value } : a));
  };

  const handleSave = async () => {
    setSaving(true);
    const respondentName = answers.find((a: any) => a.questionId === "nome")?.value || response.respondent_name;
    const pixType = answers.find((a: any) => a.questionId === "pix_tipo")?.value || null;
    const pixKey = answers.find((a: any) => a.questionId === "pix_chave")?.value || null;
    
    const { error } = await supabase
      .from("freelancer_responses")
      .update({ answers, respondent_name: respondentName, pix_type: pixType, pix_key: pixKey })
      .eq("id", response.id);
    
    setSaving(false);
    if (error) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Cadastro atualizado!" });
      onOpenChange(false);
      onSaved();
    }
  };

  const formatDateDisplay = (val: string) => {
    if (!val) return "";
    const match = String(val).match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (match) return `${match[3]}/${match[2]}/${match[1]}`;
    return String(val);
  };

  const handleDateInput = (qId: string, display: string) => {
    const clean = display.replace(/\D/g, "").slice(0, 8);
    let formatted = clean;
    if (clean.length > 2) formatted = clean.slice(0, 2) + "/" + clean.slice(2);
    if (clean.length > 4) formatted = clean.slice(0, 2) + "/" + clean.slice(2, 4) + "/" + clean.slice(4);
    if (clean.length === 8) {
      const iso = `${clean.slice(4)}-${clean.slice(2, 4)}-${clean.slice(0, 2)}`;
      updateAnswer(qId, iso);
    } else {
      updateAnswer(qId, formatted);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Cadastro</DialogTitle>
          <DialogDescription>Corrija os dados do freelancer conforme necessário.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          {effectiveQuestions.filter(q => q.type !== "photo").map((q) => {
            const answer = answers.find((a: any) => a.questionId === q.id);
            const value = answer?.value ?? "";
            return (
              <div key={q.id} className="rounded-xl border border-border p-4 space-y-2">
                <Label className="text-sm font-medium">{q.text}</Label>
                {q.type === "date" ? (
                  <Input
                    value={formatDateDisplay(String(value || ""))}
                    onChange={(e) => handleDateInput(q.id, e.target.value)}
                    placeholder="dd/mm/aaaa"
                    className="text-sm"
                    maxLength={10}
                  />
                ) : q.type === "text" ? (
                  <Input value={String(value || "")} onChange={(e) => updateAnswer(q.id, e.target.value)} className="text-sm" />
                ) : q.type === "textarea" ? (
                  <Textarea value={String(value || "")} onChange={(e) => updateAnswer(q.id, e.target.value)} className="text-sm" rows={2} />
                ) : q.type === "yesno" ? (
                  <Select value={value === true ? "sim" : value === false ? "nao" : ""} onValueChange={(v) => updateAnswer(q.id, v === "sim")}>
                    <SelectTrigger className="text-sm"><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sim">Sim</SelectItem>
                      <SelectItem value="nao">Não</SelectItem>
                    </SelectContent>
                  </Select>
                ) : q.type === "select" ? (
                  <Select value={String(value || "")} onValueChange={(v) => updateAnswer(q.id, v)}>
                    <SelectTrigger className="text-sm"><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      {(q.options || []).map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
                    </SelectContent>
                  </Select>
                ) : q.type === "multiselect" ? (
                  <div className="flex flex-wrap gap-1.5">
                    {(q.options || []).map(opt => {
                      const selected = Array.isArray(value) && value.includes(opt);
                      return (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => {
                            const arr = Array.isArray(value) ? [...value] : [];
                            updateAnswer(q.id, selected ? arr.filter(v => v !== opt) : [...arr, opt]);
                          }}
                          className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                            selected ? "bg-primary text-primary-foreground border-primary" : "bg-muted/40 text-muted-foreground border-border"
                          }`}
                        >
                          {opt}
                        </button>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving} className="gap-2">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
