import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Helmet } from "react-helmet-async";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, ChevronRight, ChevronLeft, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";

interface ContratoQuestion {
  id: string;
  type: "text" | "yesno" | "select" | "textarea" | "date";
  text: string;
  step: number;
  required?: boolean;
  options?: string[];
}

interface TemplateData {
  id: string;
  company_id: string;
  company_name: string;
  company_logo: string | null;
  company_slug: string | null;
  template_name: string;
  description: string | null;
  questions: ContratoQuestion[];
  thank_you_message: string | null;
}

export default function PublicContrato() {
  const { templateId } = useParams<{ templateId: string }>();
  const [template, setTemplate] = useState<TemplateData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [respondentName, setRespondentName] = useState("");
  const [nameStep, setNameStep] = useState(true);

  useEffect(() => {
    async function load() {
      if (!templateId) { setNotFound(true); setLoading(false); return; }
      const { data, error } = await supabase.rpc("get_contrato_template_public", { _template_id: templateId });
      if (error || !data || (data as any[]).length === 0) { setNotFound(true); setLoading(false); return; }
      const row = (data as any[])[0];
      setTemplate({
        id: row.id,
        company_id: row.company_id,
        company_name: row.company_name,
        company_logo: row.company_logo,
        company_slug: row.company_slug || null,
        template_name: row.template_name,
        description: row.description,
        questions: row.questions as ContratoQuestion[],
        thank_you_message: row.thank_you_message,
      });
      setLoading(false);
    }
    load();
  }, [templateId]);

  useEffect(() => {
    if (!submitted || !template) return;
    const timer = setTimeout(() => {
      if (template.company_slug) {
        window.location.href = `/lp/${template.company_slug}`;
      }
    }, 5000);
    return () => clearTimeout(timer);
  }, [submitted, template]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-accent/5">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (notFound || !template) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="text-center space-y-2">
          <h1 className="text-xl font-bold text-foreground">Formulário não encontrado</h1>
          <p className="text-muted-foreground text-sm">Este link pode estar desativado ou não existe.</p>
        </div>
      </div>
    );
  }

  const totalSteps = Math.max(...template.questions.map(q => q.step), 1);
  const currentQuestions = template.questions.filter(q => q.step === currentStep);
  const progress = nameStep ? 0 : ((currentStep) / (totalSteps + 1)) * 100;

  const canAdvance = () => {
    if (nameStep) return respondentName.trim().length > 0;
    return currentQuestions.every(q => {
      if (q.required === false) return true;
      const ans = answers[q.id];
      return ans !== undefined && ans !== null && ans !== "";
    });
  };

  const handleNext = () => {
    if (nameStep) { setNameStep(false); return; }
    if (currentStep < totalSteps) setCurrentStep(currentStep + 1);
    else handleSubmit();
  };

  const handleBack = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
    else setNameStep(true);
  };

  const handleSubmit = async () => {
    if (!template) return;
    setSubmitting(true);
    const { error } = await supabase.from("contrato_responses" as any).insert({
      template_id: template.id,
      company_id: template.company_id,
      respondent_name: respondentName.trim() || null,
      answers: Object.entries(answers).map(([questionId, value]) => ({ questionId, value })),
    } as any);
    setSubmitting(false);
    if (!error) setSubmitted(true);
  };

  const setAnswer = (questionId: string, value: any) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }));
  };

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-accent/5 p-4">
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center space-y-6 max-w-md">
          {template.company_logo && <img src={template.company_logo} alt={template.company_name} className="h-40 w-auto mx-auto" />}
          <CheckCircle2 className="h-16 w-16 text-accent mx-auto" />
          <h1 className="text-2xl font-bold text-foreground">{template.thank_you_message || "Obrigado! 🎉"}</h1>
          <p className="text-muted-foreground">Suas informações foram enviadas com sucesso.</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5 flex flex-col">
      <Helmet>
        <title>{template.template_name} | {template.company_name}</title>
        <meta name="description" content={template.description || `Preencha os dados para o contrato`} />
        <meta property="og:title" content={`${template.template_name} | ${template.company_name}`} />
        <meta property="og:description" content={template.description || `Preencha os dados do contrato`} />
        {template.company_logo && <meta property="og:image" content={template.company_logo} />}
        <meta property="og:type" content="website" />
      </Helmet>

      <header className="p-4 flex items-center justify-center gap-3 border-b border-border bg-card/80 backdrop-blur-sm">
        {template.company_logo && <img src={template.company_logo} alt={template.company_name} className="h-10 w-auto" />}
        <h1 className="font-display font-bold text-foreground">{template.company_name}</h1>
      </header>

      <div className="px-4 pt-4 max-w-lg mx-auto w-full">
        <Progress value={progress} className="h-2" />
        <p className="text-xs text-muted-foreground mt-1 text-center">
          {nameStep ? "Identificação" : `Etapa ${currentStep} de ${totalSteps}`}
        </p>
      </div>

      <div className="flex-1 flex items-start justify-center p-4 pt-6">
        <div className="w-full max-w-lg">
          <AnimatePresence mode="wait">
            {nameStep ? (
              <motion.div key="name-step" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} className="space-y-4">
                <div className="text-center space-y-2">
                  <h2 className="text-xl font-bold text-foreground">{template.template_name}</h2>
                  {template.description && <p className="text-muted-foreground text-sm">{template.description}</p>}
                </div>
                <div className="bg-card rounded-2xl p-6 shadow-card space-y-3">
                  <label className="text-sm font-medium text-foreground">Qual o seu nome?</label>
                  <input
                    type="text"
                    value={respondentName}
                    onChange={(e) => setRespondentName(e.target.value)}
                    placeholder="Seu nome..."
                    className="w-full rounded-xl border border-input bg-background px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-ring"
                    autoFocus
                  />
                </div>
              </motion.div>
            ) : (
              <motion.div key={`step-${currentStep}`} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} className="space-y-4">
                {currentQuestions.map((q) => (
                  <div key={q.id} className="bg-card rounded-2xl p-5 shadow-card space-y-3">
                    <p className="font-medium text-foreground text-sm">{q.text}{q.required !== false && <span className="text-destructive ml-1">*</span>}</p>
                    <ContratoQuestionInput question={q} value={answers[q.id]} onChange={(v) => setAnswer(q.id, v)} />
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="p-4 border-t border-border bg-card/80 backdrop-blur-sm">
        <div className="max-w-lg mx-auto flex items-center justify-between gap-3">
          <Button variant="outline" onClick={handleBack} disabled={nameStep} className="rounded-xl">
            <ChevronLeft className="h-4 w-4 mr-1" /> Voltar
          </Button>
          <Button onClick={handleNext} disabled={!canAdvance() || submitting} className="rounded-xl">
            {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {!nameStep && currentStep === totalSteps ? "Enviar" : "Próximo"}
            {!submitting && <ChevronRight className="h-4 w-4 ml-1" />}
          </Button>
        </div>
      </div>
    </div>
  );
}

function isDateQuestion(q: ContratoQuestion): boolean {
  if (q.type === "date") return true;
  if (q.type === "text") {
    const t = q.text.toLowerCase();
    return t.includes("data de nascimento") || t.includes("data da festa") || t.includes("data do evento") || (t.includes("data") && (t.includes("nascimento") || t.includes("festa") || t.includes("evento") || t.includes("aniversário")));
  }
  return false;
}

function DateSelectInput({ value, onChange }: { value: any; onChange: (v: any) => void }) {
  const parsed = value ? new Date(value) : null;
  const [day, setDay] = useState(parsed ? parsed.getDate() : 0);
  const [month, setMonth] = useState(parsed ? parsed.getMonth() + 1 : 0);
  const [year, setYear] = useState(parsed ? parsed.getFullYear() : 0);

  const months = [
    "Janeiro","Fevereiro","Março","Abril","Maio","Junho",
    "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"
  ];
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: currentYear - 1930 + 6 }, (_, i) => 1930 + i);
  const daysInMonth = month && year ? new Date(year, month, 0).getDate() : 31;
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  useEffect(() => {
    if (day && month && year) {
      const d = new Date(year, month - 1, Math.min(day, daysInMonth));
      onChange(d.toISOString());
    }
  }, [day, month, year]);

  const selectClass = "w-full rounded-xl border border-input bg-background px-3 py-3 text-base focus:outline-none focus:ring-2 focus:ring-ring appearance-none";

  return (
    <div className="grid grid-cols-3 gap-2">
      <div>
        <label className="text-xs text-muted-foreground mb-1 block">Dia</label>
        <select value={day || ""} onChange={e => setDay(Number(e.target.value))} className={selectClass}>
          <option value="">--</option>
          {days.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
      </div>
      <div>
        <label className="text-xs text-muted-foreground mb-1 block">Mês</label>
        <select value={month || ""} onChange={e => setMonth(Number(e.target.value))} className={selectClass}>
          <option value="">--</option>
          {months.map((m, i) => <option key={i} value={i + 1}>{m.slice(0, 3)}</option>)}
        </select>
      </div>
      <div>
        <label className="text-xs text-muted-foreground mb-1 block">Ano</label>
        <select value={year || ""} onChange={e => setYear(Number(e.target.value))} className={selectClass}>
          <option value="">--</option>
          {years.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>
    </div>
  );
}

function ContratoQuestionInput({ question, value, onChange }: { question: ContratoQuestion; value: any; onChange: (v: any) => void }) {
  if (isDateQuestion(question)) {
    return <DateSelectInput value={value} onChange={onChange} />;
  }

  switch (question.type) {
    case "text":
      return (
        <input
          type="text"
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Digite aqui..."
          className="w-full rounded-xl border border-input bg-background px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-ring"
        />
      );
    case "textarea":
      return (
        <Textarea
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Escreva aqui..."
          className="rounded-xl resize-none"
          rows={3}
        />
      );
    case "yesno":
      return (
        <div className="flex gap-3 justify-center">
          {[{ label: "👍 Sim", val: true }, { label: "👎 Não", val: false }].map(opt => (
            <button
              key={String(opt.val)}
              onClick={() => onChange(opt.val)}
              className={`px-6 py-3 rounded-xl text-sm font-semibold transition-all ${
                value === opt.val
                  ? "bg-primary text-primary-foreground scale-105"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      );
    default:
      return null;
  }
}
