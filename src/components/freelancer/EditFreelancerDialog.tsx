import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { Loader2, User, KeyRound, Briefcase } from "lucide-react";

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

// Section definitions for grouping questions
const SECTIONS = [
  { key: "dados", label: "DADOS PESSOAIS", icon: User, questionIds: ["nome", "data_nascimento", "telefone", "endereco"] },
  { key: "pix", label: "DADOS PIX", icon: KeyRound, questionIds: ["pix_tipo", "pix_chave"] },
  { key: "trabalho", label: "INFORMAÇÕES PROFISSIONAIS", icon: Briefcase, questionIds: ["ja_trabalha", "tempo_trabalho", "funcao", "sobre"] },
];

export function EditFreelancerDialog({ open, onOpenChange, response, template, onSaved }: EditFreelancerDialogProps) {
  const [answers, setAnswers] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);

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

  const renderField = (q: FreelancerQuestion) => {
    const answer = answers.find((a: any) => a.questionId === q.id);
    const value = answer?.value ?? "";

    if (q.type === "date") {
      return (
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">{q.text}{q.required && " *"}</Label>
          <Input
            value={formatDateDisplay(String(value || ""))}
            onChange={(e) => handleDateInput(q.id, e.target.value)}
            placeholder="dd/mm/aaaa"
            className="text-sm"
            maxLength={10}
          />
        </div>
      );
    }
    if (q.type === "text") {
      return (
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">{q.text}{q.required && " *"}</Label>
          <Input value={String(value || "")} onChange={(e) => updateAnswer(q.id, e.target.value)} className="text-sm" />
        </div>
      );
    }
    if (q.type === "textarea") {
      return (
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">{q.text}{q.required && " *"}</Label>
          <Textarea value={String(value || "")} onChange={(e) => updateAnswer(q.id, e.target.value)} className="text-sm" rows={2} />
        </div>
      );
    }
    if (q.type === "yesno") {
      return (
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">{q.text}{q.required && " *"}</Label>
          <Select value={value === true ? "sim" : value === false ? "nao" : ""} onValueChange={(v) => updateAnswer(q.id, v === "sim")}>
            <SelectTrigger className="text-sm"><SelectValue placeholder="Selecione" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="sim">Sim</SelectItem>
              <SelectItem value="nao">Não</SelectItem>
            </SelectContent>
          </Select>
        </div>
      );
    }
    if (q.type === "select") {
      return (
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">{q.text}{q.required && " *"}</Label>
          <Select value={String(value || "")} onValueChange={(v) => updateAnswer(q.id, v)}>
            <SelectTrigger className="text-sm"><SelectValue placeholder="Selecione" /></SelectTrigger>
            <SelectContent>
              {(q.options || []).map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      );
    }
    if (q.type === "multiselect") {
      return (
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">{q.text}{q.required && " *"}</Label>
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
        </div>
      );
    }
    return null;
  };

  // Group questions into sections; ungrouped questions go at the end
  const groupedSectionIds = SECTIONS.flatMap(s => s.questionIds);
  const ungroupedQuestions = effectiveQuestions.filter(q => q.type !== "photo" && !groupedSectionIds.includes(q.id));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90dvh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-4">
          <DialogTitle>Editar Cadastro</DialogTitle>
          <DialogDescription>Corrija os dados do freelancer conforme necessário.</DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 pb-4 space-y-5">
          {SECTIONS.map(section => {
            const sectionQuestions = section.questionIds
              .map(id => effectiveQuestions.find(q => q.id === id))
              .filter((q): q is FreelancerQuestion => !!q && q.type !== "photo");
            if (sectionQuestions.length === 0) return null;

            const Icon = section.icon;
            return (
              <div key={section.key} className="rounded-xl border border-border bg-card p-4 space-y-4">
                {/* Section header */}
                <div className="flex items-center gap-2">
                  <Icon className="w-4 h-4 text-primary" />
                  <span className="text-xs font-bold tracking-wide text-muted-foreground">{section.label}</span>
                  <div className="flex-1 h-px bg-border/50" />
                </div>

                {/* Fields grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {sectionQuestions.map(q => {
                    // Full width for textarea, address, multiselect
                    const fullWidth = q.type === "textarea" || q.type === "multiselect" || q.id === "endereco";
                    return (
                      <div key={q.id} className={fullWidth ? "sm:col-span-2" : ""}>
                        {renderField(q)}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {/* Ungrouped questions (from custom templates) */}
          {ungroupedQuestions.length > 0 && (
            <div className="rounded-xl border border-border bg-card p-4 space-y-4">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-primary" />
                <span className="text-xs font-bold tracking-wide text-muted-foreground">OUTROS DADOS</span>
                <div className="flex-1 h-px bg-border/50" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {ungroupedQuestions.map(q => (
                  <div key={q.id} className={q.type === "textarea" || q.type === "multiselect" ? "sm:col-span-2" : ""}>
                    {renderField(q)}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sticky footer */}
        <div className="sticky bottom-0 border-t border-border bg-background/80 backdrop-blur-sm px-6 py-4 flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving} className="gap-2">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Salvar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}