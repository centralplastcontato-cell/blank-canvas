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

interface TemplateData {
  id: string;
  company_id: string;
  company_name: string;
  company_logo: string | null;
  company_slug: string | null;
  template_name: string;
  description: string | null;
  thank_you_message: string | null;
}

const ROLES = [
  { value: "gerente", label: "Gerente" },
  { value: "seguranca", label: "Segurança" },
  { value: "garcom", label: "Garçom" },
  { value: "monitor", label: "Monitor" },
  { value: "cozinha", label: "Cozinha" },
];

export default function PublicFreelancer() {
  const { templateId, companySlug, templateSlug } = useParams<{ templateId: string; companySlug: string; templateSlug: string }>();
  const [template, setTemplate] = useState<TemplateData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form fields
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [endereco, setEndereco] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [jaTrabalha, setJaTrabalha] = useState<boolean | null>(null);
  const [tempoTrabalho, setTempoTrabalho] = useState("");
  const [funcoes, setFuncoes] = useState<string[]>([]);
  const [sobre, setSobre] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const totalSteps = 3;

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
      setTemplate({
        id: row.id,
        company_id: row.company_id,
        company_name: row.company_name,
        company_logo: row.company_logo,
        company_slug: row.company_slug || null,
        template_name: row.template_name,
        description: row.description,
        thank_you_message: row.thank_you_message,
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

  const canAdvance = () => {
    if (currentStep === 1) return nome.trim().length > 0 && telefone.replace(/\D/g, "").length >= 10 && endereco.trim().length > 0;
    if (currentStep === 2) return jaTrabalha !== null && funcoes.length > 0 && (jaTrabalha === false || tempoTrabalho.trim().length > 0);
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
    if (photoFile) {
      const ext = photoFile.name.split(".").pop();
      const path = `freelancer/${template.company_id}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("onboarding-uploads").upload(path, photoFile);
      if (!upErr) {
        const { data: urlData } = supabase.storage.from("onboarding-uploads").getPublicUrl(path);
        photoUrl = urlData.publicUrl;
      }
    }

    const answers = [
      { questionId: "nome", value: nome.trim() },
      { questionId: "telefone", value: telefone.trim() },
      { questionId: "endereco", value: endereco.trim() },
      { questionId: "ja_trabalha", value: jaTrabalha },
      ...(jaTrabalha ? [{ questionId: "tempo_trabalho", value: tempoTrabalho.trim() }] : []),
      { questionId: "funcao", value: funcoes },
      { questionId: "sobre", value: sobre.trim() },
    ];

    const { error } = await supabase.from("freelancer_responses").insert({
      template_id: template.id,
      company_id: template.company_id,
      respondent_name: nome.trim() || null,
      answers,
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
            {currentStep === 1 && (
              <motion.div key="step1" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} className="space-y-4">
                <div className="text-center space-y-2">
                  <h2 className="text-xl font-bold text-foreground">{template.template_name}</h2>
                  {template.description && <p className="text-muted-foreground text-sm">{template.description}</p>}
                </div>

                <div className="bg-card rounded-2xl p-5 shadow-card space-y-3">
                  <label className="text-sm font-medium text-foreground">Como você se chama? <span className="text-destructive">*</span></label>
                  <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Seu nome completo" className="rounded-xl" />
                </div>

                <div className="bg-card rounded-2xl p-5 shadow-card space-y-3">
                  <label className="text-sm font-medium text-foreground">Foto (opcional)</label>
                  <input type="file" ref={fileInputRef} accept="image/*" onChange={handlePhotoChange} className="hidden" />
                  {photoPreview ? (
                    <div className="flex items-center gap-3">
                      <img src={photoPreview} alt="" className="h-20 w-20 rounded-full object-cover" />
                      <Button variant="ghost" size="sm" onClick={() => { setPhotoFile(null); setPhotoPreview(null); }}>
                        <X className="h-4 w-4 mr-1" /> Remover
                      </Button>
                    </div>
                  ) : (
                    <Button variant="outline" className="rounded-xl w-full gap-2" onClick={() => fileInputRef.current?.click()}>
                      <Camera className="h-4 w-4" /> Tirar ou enviar foto
                    </Button>
                  )}
                </div>

                <div className="bg-card rounded-2xl p-5 shadow-card space-y-3">
                  <label className="text-sm font-medium text-foreground">Telefone <span className="text-destructive">*</span></label>
                  <Input value={telefone} onChange={(e) => setTelefone(formatPhone(e.target.value))} placeholder="(00) 00000-0000" className="rounded-xl" inputMode="tel" />
                </div>

                <div className="bg-card rounded-2xl p-5 shadow-card space-y-3">
                  <label className="text-sm font-medium text-foreground">Endereço <span className="text-destructive">*</span></label>
                  <Input value={endereco} onChange={(e) => setEndereco(e.target.value)} placeholder="Rua, número, bairro, cidade" className="rounded-xl" />
                </div>
              </motion.div>
            )}

            {currentStep === 2 && (
              <motion.div key="step2" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} className="space-y-4">
                <div className="bg-card rounded-2xl p-5 shadow-card space-y-3">
                  <label className="text-sm font-medium text-foreground">Já trabalha no buffet? <span className="text-destructive">*</span></label>
                  <div className="flex gap-3">
                    {[{ label: "👍 Sim", val: true }, { label: "👎 Não", val: false }].map(opt => (
                      <button
                        key={String(opt.val)}
                        onClick={() => { setJaTrabalha(opt.val); if (!opt.val) setTempoTrabalho(""); }}
                        className={`flex-1 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                          jaTrabalha === opt.val
                            ? "bg-primary text-primary-foreground scale-105"
                            : "bg-muted text-muted-foreground hover:bg-muted/80"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {jaTrabalha === true && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-card rounded-2xl p-5 shadow-card space-y-3">
                    <label className="text-sm font-medium text-foreground">Há quanto tempo? <span className="text-destructive">*</span></label>
                    <Input value={tempoTrabalho} onChange={(e) => setTempoTrabalho(e.target.value)} placeholder="Ex: 2 anos" className="rounded-xl" />
                  </motion.div>
                )}

                <div className="bg-card rounded-2xl p-5 shadow-card space-y-3">
                  <label className="text-sm font-medium text-foreground">Qual é a sua função? <span className="text-muted-foreground text-xs font-normal">(pode selecionar mais de uma)</span> <span className="text-destructive">*</span></label>
                  <div className="grid grid-cols-2 gap-2">
                    {ROLES.map(role => (
                      <button
                        key={role.value}
                        onClick={() => setFuncoes(prev => prev.includes(role.value) ? prev.filter(f => f !== role.value) : [...prev, role.value])}
                        className={`px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                          funcoes.includes(role.value)
                            ? "bg-primary text-primary-foreground scale-105"
                            : "bg-muted text-muted-foreground hover:bg-muted/80"
                        }`}
                      >
                        {role.label}
                      </button>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {currentStep === 3 && (
              <motion.div key="step3" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} className="space-y-4">
                <div className="bg-card rounded-2xl p-5 shadow-card space-y-3">
                  <label className="text-sm font-medium text-foreground">Fale um pouco sobre você</label>
                  <Textarea
                    value={sobre}
                    onChange={(e) => setSobre(e.target.value)}
                    placeholder="Conte sua experiência, habilidades, disponibilidade..."
                    className="rounded-xl resize-none"
                    rows={5}
                  />
                </div>
              </motion.div>
            )}
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
