import { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, ChevronRight, ChevronLeft, CheckCircle2, Camera, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { toast } from "@/hooks/use-toast";

interface FreelancerQuestion {
  id: string;
  type: "text" | "textarea" | "yesno" | "select" | "multiselect" | "photo";
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
  thank_you_message: string | null;
  questions: FreelancerQuestion[];
}

export default function PublicFreelancer() {
  const { templateId, companySlug, templateSlug } = useParams<{ templateId: string; companySlug: string; templateSlug: string }>();
  const [template, setTemplate] = useState<TemplateData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoQuestionId, setPhotoQuestionId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function load() {
      let data: any, error: any;
      if (companySlug && templateSlug) {
        const res = await supabase.rpc("get_freelancer_template_by_slugs", { _company_slug: companySlug, _template_slug: templateSlug });
        data = res.data; error = res.error;
      } else if (templateId) {
        const res = await supabase.rpc("get_freelancer_template_public", { _template_id: templateId });
        data = res.data; error = res.error;
      } else { setNotFound(true); setLoading(false); return; }
      if (error || !data || (data as any[]).length === 0) { setNotFound(true); setLoading(false); return; }
      const row = (data as any[])[0];
      const questions = Array.isArray(row.questions) ? (row.questions as FreelancerQuestion[]) : [];
      setTemplate({
        id: row.id,
        company_id: row.company_id,
        company_name: row.company_name,
        company_logo: row.company_logo,
        company_slug: row.company_slug || null,
        template_name: row.template_name,
        description: row.description,
        thank_you_message: row.thank_you_message,
        questions,
      });
      setLoading(false);
    }
    load();
  }, [templateId, companySlug, templateSlug]);

  useEffect(() => {
    if (!submitted || !template) return;
    const timer = setTimeout(() => {
      if (template.company_slug) window.location.href = `/lp/${template.company_slug}`;
    }, 5000);
    return () => clearTimeout(timer);
  }, [submitted, template]);

  const formatPhone = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 11);
    if (digits.length <= 2) return digits;
    if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "Foto muito grande", description: "Máximo 5MB", variant: "destructive" });
      return;
    }
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const setAnswer = (questionId: string, value: any) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }));
  };

  const totalSteps = template ? Math.max(...template.questions.map(q => q.step), 1) : 1;
  const questionsForStep = (step: number) => template?.questions.filter(q => q.step === step) || [];

  const canAdvance = () => {
    const stepQuestions = questionsForStep(currentStep);
    for (const q of stepQuestions) {
      if (!q.required) continue;
      const val = answers[q.id];
      if (q.type === "photo") continue; // photo is never blocking
      if (q.type === "yesno" && val === undefined) return false;
      if (q.type === "multiselect" && (!Array.isArray(val) || val.length === 0)) return false;
      if (q.type === "select" && !val) return false;
      if ((q.type === "text" || q.type === "textarea") && (!val || String(val).trim().length === 0)) return false;
    }
    return true;
  };

  const handleNext = () => {
    if (currentStep < totalSteps) setCurrentStep(currentStep + 1);
    else handleSubmit();
  };

  const handleBack = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  };

  const handleSubmit = async () => {
    if (!template) return;
    setSubmitting(true);

    let photoUrl: string | null = null;
    if (photoFile && template.company_id) {
      const ext = photoFile.name.split(".").pop();
      const path = `freelancer/${template.company_id}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("onboarding-uploads").upload(path, photoFile);
      if (!upErr) {
        const { data: urlData } = supabase.storage.from("onboarding-uploads").getPublicUrl(path);
        photoUrl = urlData.publicUrl;
      }
    }

    const answersArray = template.questions.map(q => ({
      questionId: q.id,
      value: q.type === "photo" ? (photoUrl || null) : (answers[q.id] ?? null),
    }));

    // Try to find name from first text field
    const nameQuestion = template.questions.find(q => q.type === "text");
    const respondentName = nameQuestion ? String(answers[nameQuestion.id] || "").trim() || null : null;

    const { error } = await supabase.from("freelancer_responses").insert({
      template_id: template.id,
      company_id: template.company_id,
      respondent_name: respondentName,
      answers: answersArray,
      photo_url: photoUrl,
    });

    setSubmitting(false);
    if (!error) setSubmitted(true);
    else toast({ title: "Erro ao enviar", variant: "destructive" });
  };

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

  const progress = (currentStep / totalSteps) * 100;

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-accent/5 p-4">
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center space-y-6 max-w-md">
          {template.company_logo && <img src={template.company_logo} alt={template.company_name} className="h-40 w-auto mx-auto" />}
          <CheckCircle2 className="h-16 w-16 text-accent mx-auto" />
          <h1 className="text-2xl font-bold text-foreground">{template.thank_you_message || "Obrigado! 🎉"}</h1>
          <p className="text-muted-foreground">Seu cadastro foi enviado com sucesso.</p>
        </motion.div>
      </div>
    );
  }

  const renderQuestion = (q: FreelancerQuestion) => {
    const val = answers[q.id];

    if (q.type === "text") {
      const isPhone = q.text.toLowerCase().includes("telefone") || q.text.toLowerCase().includes("whatsapp");
      return (
        <div key={q.id} className="bg-card rounded-2xl p-5 shadow-card space-y-3">
          <label className="text-sm font-medium text-foreground">
            {q.text} {q.required && <span className="text-destructive">*</span>}
          </label>
          <Input
            value={val || ""}
            onChange={(e) => setAnswer(q.id, isPhone ? formatPhone(e.target.value) : e.target.value)}
            placeholder={isPhone ? "(00) 00000-0000" : ""}
            className="rounded-xl"
            inputMode={isPhone ? "tel" : "text"}
          />
        </div>
      );
    }

    if (q.type === "textarea") {
      return (
        <div key={q.id} className="bg-card rounded-2xl p-5 shadow-card space-y-3">
          <label className="text-sm font-medium text-foreground">
            {q.text} {q.required && <span className="text-destructive">*</span>}
          </label>
          <Textarea
            value={val || ""}
            onChange={(e) => setAnswer(q.id, e.target.value)}
            className="rounded-xl resize-none"
            rows={4}
          />
        </div>
      );
    }

    if (q.type === "yesno") {
      return (
        <div key={q.id} className="bg-card rounded-2xl p-5 shadow-card space-y-3">
          <label className="text-sm font-medium text-foreground">
            {q.text} {q.required && <span className="text-destructive">*</span>}
          </label>
          <div className="flex gap-3">
            {[{ label: "👍 Sim", v: true }, { label: "👎 Não", v: false }].map(opt => (
              <button
                key={String(opt.v)}
                onClick={() => setAnswer(q.id, opt.v)}
                className={`flex-1 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                  val === opt.v
                    ? "bg-primary text-primary-foreground scale-105"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      );
    }

    if (q.type === "select") {
      const options = q.options || [];
      return (
        <div key={q.id} className="bg-card rounded-2xl p-5 shadow-card space-y-3">
          <label className="text-sm font-medium text-foreground">
            {q.text} {q.required && <span className="text-destructive">*</span>}
          </label>
          <div className="grid grid-cols-2 gap-2">
            {options.map(opt => (
              <button
                key={opt}
                onClick={() => setAnswer(q.id, opt)}
                className={`px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                  val === opt
                    ? "bg-primary text-primary-foreground scale-105"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>
      );
    }

    if (q.type === "multiselect") {
      const options = q.options || [];
      const selected: string[] = Array.isArray(val) ? val : [];
      return (
        <div key={q.id} className="bg-card rounded-2xl p-5 shadow-card space-y-3">
          <label className="text-sm font-medium text-foreground">
            {q.text} <span className="text-muted-foreground text-xs font-normal">(pode selecionar mais de uma)</span>
            {q.required && <span className="text-destructive"> *</span>}
          </label>
          <div className="grid grid-cols-2 gap-2">
            {options.map(opt => (
              <button
                key={opt}
                onClick={() => setAnswer(q.id, selected.includes(opt) ? selected.filter(s => s !== opt) : [...selected, opt])}
                className={`px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                  selected.includes(opt)
                    ? "bg-primary text-primary-foreground scale-105"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>
      );
    }

    if (q.type === "photo") {
      return (
        <div key={q.id} className="bg-card rounded-2xl p-5 shadow-card space-y-3">
          <label className="text-sm font-medium text-foreground">
            {q.text} {q.required && <span className="text-destructive">*</span>}
          </label>
          <input type="file" ref={fileInputRef} accept="image/*" onChange={handlePhotoChange} className="hidden" />
          {photoPreview ? (
            <div className="flex items-center gap-3">
              <img src={photoPreview} alt="" className="h-20 w-20 rounded-full object-cover" />
              <Button variant="ghost" size="sm" onClick={() => { setPhotoFile(null); setPhotoPreview(null); setPhotoQuestionId(null); }}>
                <X className="h-4 w-4 mr-1" /> Remover
              </Button>
            </div>
          ) : (
            <Button variant="outline" className="rounded-xl w-full gap-2" onClick={() => { setPhotoQuestionId(q.id); fileInputRef.current?.click(); }}>
              <Camera className="h-4 w-4" /> Tirar ou enviar foto
            </Button>
          )}
        </div>
      );
    }

    return null;
  };

  const stepQuestions = questionsForStep(currentStep);

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5 flex flex-col">
      <Helmet>
        <title>{template.template_name} | {template.company_name}</title>
        <meta name="description" content={template.description || `Cadastre-se como freelancer em ${template.company_name}`} />
      </Helmet>

      <header className="p-4 flex items-center justify-center gap-3 border-b border-border bg-card/80 backdrop-blur-sm">
        {template.company_logo && <img src={template.company_logo} alt={template.company_name} className="h-10 w-auto" />}
        <h1 className="font-display font-bold text-foreground">{template.company_name}</h1>
      </header>

      <div className="px-4 pt-4 max-w-lg mx-auto w-full">
        <Progress value={progress} className="h-2" />
        <p className="text-xs text-muted-foreground mt-1 text-center">Etapa {currentStep} de {totalSteps}</p>
      </div>

      <div className="flex-1 flex items-start justify-center p-4 pt-6">
        <div className="w-full max-w-lg">
          <AnimatePresence mode="wait">
            <motion.div key={`step${currentStep}`} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} className="space-y-4">
              {currentStep === 1 && (
                <div className="text-center space-y-2">
                  <h2 className="text-xl font-bold text-foreground">{template.template_name}</h2>
                  {template.description && <p className="text-muted-foreground text-sm">{template.description}</p>}
                </div>
              )}
              {stepQuestions.map(renderQuestion)}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      <div className="p-4 border-t border-border bg-card/80 backdrop-blur-sm">
        <div className="max-w-lg mx-auto flex items-center justify-between gap-3">
          <Button variant="outline" onClick={handleBack} disabled={currentStep === 1} className="rounded-xl">
            <ChevronLeft className="h-4 w-4 mr-1" /> Voltar
          </Button>
          <Button onClick={handleNext} disabled={!canAdvance() || submitting} className="rounded-xl">
            {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {currentStep === totalSteps ? "Enviar" : "Próximo"}
            {!submitting && <ChevronRight className="h-4 w-4 ml-1" />}
          </Button>
        </div>
      </div>
    </div>
  );
}
