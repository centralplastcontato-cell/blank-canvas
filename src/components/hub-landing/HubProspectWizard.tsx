import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ArrowRight, ArrowLeft, Send, Loader2, CheckCircle2, BarChart3, Users, DollarSign, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface ProspectData {
  buffet_name: string;
  contact_name: string;
  whatsapp: string;
  email: string;
  city: string;
  state: string;
  instagram: string;
  monthly_leads: string;
  lead_cost: string;
  has_lead_clarity: string;
  lead_organization: string;
}

interface HubProspectWizardProps {
  isOpen: boolean;
  onClose: () => void;
}

const STEPS = [
  { title: "Sobre seu buffet", icon: BarChart3 },
  { title: "Gestão de leads", icon: Target },
  { title: "Seus dados", icon: Users },
];

const MONTHLY_LEADS_OPTIONS = [
  "Menos de 30",
  "30 a 80",
  "80 a 150",
  "150 a 300",
  "Mais de 300",
  "Não sei dizer",
];

const LEAD_COST_OPTIONS = [
  "Menos de R$ 5",
  "R$ 5 a R$ 15",
  "R$ 15 a R$ 30",
  "Mais de R$ 30",
  "Não sei quanto pago",
];

const LEAD_CLARITY_OPTIONS = [
  "Sim, tenho total controle",
  "Mais ou menos, perco alguns",
  "Não, muitos se perdem",
  "Nem sei quantos recebo",
];

const LEAD_ORGANIZATION_OPTIONS = [
  "Planilha / caderno",
  "WhatsApp mesmo",
  "Outro CRM",
  "Não tenho organização",
];

const STATES = [
  "AC","AL","AM","AP","BA","CE","DF","ES","GO","MA","MG","MS","MT",
  "PA","PB","PE","PI","PR","RJ","RN","RO","RR","RS","SC","SE","SP","TO",
];

export default function HubProspectWizard({ isOpen, onClose }: HubProspectWizardProps) {
  const [step, setStep] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [data, setData] = useState<ProspectData>({
    buffet_name: "",
    contact_name: "",
    whatsapp: "",
    email: "",
    city: "",
    state: "",
    instagram: "",
    monthly_leads: "",
    lead_cost: "",
    has_lead_clarity: "",
    lead_organization: "",
  });

  const updateField = (field: keyof ProspectData, value: string) => {
    setData((prev) => ({ ...prev, [field]: value }));
  };

  const canProceed = () => {
    switch (step) {
      case 0:
        return data.buffet_name.trim().length >= 2 && data.city.trim().length >= 2 && data.state.length > 0;
      case 1:
        return data.monthly_leads && data.lead_cost && data.has_lead_clarity && data.lead_organization;
      case 2:
        return (
          data.contact_name.trim().length >= 2 &&
          data.whatsapp.replace(/\D/g, "").length >= 10 &&
          /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email.trim())
        );
      default:
        return false;
    }
  };

  const handleSubmit = async () => {
    if (isSaving) return;
    setIsSaving(true);

    try {
      const { error } = await supabase.functions.invoke("submit-b2b-lead", {
        body: {
          company_name: data.buffet_name.trim(),
          contact_name: data.contact_name.trim(),
          email: data.email.trim(),
          phone: data.whatsapp,
          city: data.city.trim(),
          state: data.state,
          instagram: data.instagram.trim() || null,
          monthly_leads: data.monthly_leads,
          lead_cost: data.lead_cost,
          has_lead_clarity: data.has_lead_clarity === "Sim, tenho total controle",
          lead_organization: data.lead_organization,
          source: "hub_landing",
        },
      });

      if (error) throw error;
      setIsComplete(true);
    } catch (err) {
      console.error("Error submitting prospect:", err);
      toast({
        title: "Erro ao enviar",
        description: "Tente novamente em alguns instantes.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    setStep(0);
    setData({
      buffet_name: "", contact_name: "", whatsapp: "", email: "",
      city: "", state: "", instagram: "", monthly_leads: "",
      lead_cost: "", has_lead_clarity: "", lead_organization: "",
    });
    setIsComplete(false);
    setIsSaving(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-foreground/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={handleClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="bg-card rounded-3xl shadow-floating w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-primary to-primary/80 p-5 relative">
            <button
              onClick={handleClose}
              className="absolute top-4 right-4 w-8 h-8 bg-primary-foreground/20 rounded-full flex items-center justify-center hover:bg-primary-foreground/30 transition-colors"
            >
              <X className="w-5 h-5 text-primary-foreground" />
            </button>
            {!isComplete ? (
              <>
                <h3 className="font-display text-lg font-bold text-primary-foreground">
                  Diagnóstico gratuito
                </h3>
                <p className="text-sm text-primary-foreground/80 mt-1">
                  Descubra quanto seu buffet pode crescer
                </p>
                {/* Progress */}
                <div className="flex gap-2 mt-4">
                  {STEPS.map((s, i) => (
                    <div key={i} className="flex-1 flex items-center gap-2">
                      <div
                        className={`h-1.5 flex-1 rounded-full transition-colors ${
                          i <= step ? "bg-primary-foreground" : "bg-primary-foreground/30"
                        }`}
                      />
                    </div>
                  ))}
                </div>
                <div className="flex items-center gap-2 mt-2">
                  {(() => {
                    const StepIcon = STEPS[step].icon;
                    return <StepIcon className="h-4 w-4 text-primary-foreground/80" />;
                  })()}
                  <span className="text-xs text-primary-foreground/80 font-medium">
                    {step + 1}/{STEPS.length} — {STEPS[step].title}
                  </span>
                </div>
              </>
            ) : (
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-8 w-8 text-primary-foreground" />
                <div>
                  <h3 className="font-display text-lg font-bold text-primary-foreground">
                    Recebemos seus dados!
                  </h3>
                  <p className="text-sm text-primary-foreground/80">
                    Entraremos em contato em breve
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-5">
            <AnimatePresence mode="wait">
              {isComplete ? (
                <motion.div
                  key="complete"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-center py-8 space-y-4"
                >
                  <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center mx-auto">
                    <CheckCircle2 className="h-8 w-8 text-accent" />
                  </div>
                  <h4 className="text-xl font-display font-bold text-foreground">
                    Obrigado, {data.contact_name.split(" ")[0]}! 🎉
                  </h4>
                  <p className="text-muted-foreground leading-relaxed">
                    Nosso time vai analisar o perfil do <strong>{data.buffet_name}</strong> e
                    entrar em contato pelo WhatsApp com uma proposta personalizada.
                  </p>
                  <Button onClick={handleClose} className="mt-4 rounded-xl">
                    Fechar
                  </Button>
                </motion.div>
              ) : step === 0 ? (
                <motion.div
                  key="step-0"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-4"
                >
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1.5 block">
                      Nome do buffet *
                    </label>
                    <input
                      type="text"
                      value={data.buffet_name}
                      onChange={(e) => updateField("buffet_name", e.target.value)}
                      placeholder="Ex: Buffet Encantado"
                      className="w-full bg-muted border border-border rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                      maxLength={150}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-sm font-medium text-foreground mb-1.5 block">
                        Cidade *
                      </label>
                      <input
                        type="text"
                        value={data.city}
                        onChange={(e) => updateField("city", e.target.value)}
                        placeholder="Sorocaba"
                        className="w-full bg-muted border border-border rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                        maxLength={100}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-foreground mb-1.5 block">
                        Estado *
                      </label>
                      <select
                        value={data.state}
                        onChange={(e) => updateField("state", e.target.value)}
                        className="w-full bg-muted border border-border rounded-xl px-4 py-3 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                      >
                        <option value="">Selecione</option>
                        {STATES.map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1.5 block">
                      Instagram (opcional)
                    </label>
                    <input
                      type="text"
                      value={data.instagram}
                      onChange={(e) => updateField("instagram", e.target.value)}
                      placeholder="@seubuffet"
                      className="w-full bg-muted border border-border rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                      maxLength={100}
                    />
                  </div>
                </motion.div>
              ) : step === 1 ? (
                <motion.div
                  key="step-1"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-5"
                >
                  <div>
                    <label className="text-sm font-medium text-foreground mb-2 block flex items-center gap-2">
                      <Users className="h-4 w-4 text-primary" />
                      Quantos leads/contatos você recebe por mês?
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {MONTHLY_LEADS_OPTIONS.map((opt) => (
                        <button
                          key={opt}
                          onClick={() => updateField("monthly_leads", opt)}
                          className={`text-sm px-3 py-2.5 rounded-xl border transition-all text-left ${
                            data.monthly_leads === opt
                              ? "border-primary bg-primary/10 text-primary font-medium"
                              : "border-border bg-muted text-foreground hover:border-primary/50"
                          }`}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground mb-2 block flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-primary" />
                      Quanto custa cada lead hoje?
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {LEAD_COST_OPTIONS.map((opt) => (
                        <button
                          key={opt}
                          onClick={() => updateField("lead_cost", opt)}
                          className={`text-sm px-3 py-2.5 rounded-xl border transition-all text-left ${
                            data.lead_cost === opt
                              ? "border-primary bg-primary/10 text-primary font-medium"
                              : "border-border bg-muted text-foreground hover:border-primary/50"
                          }`}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground mb-2 block flex items-center gap-2">
                      <Target className="h-4 w-4 text-primary" />
                      Você tem clareza de todos os leads que recebe?
                    </label>
                    <div className="space-y-2">
                      {LEAD_CLARITY_OPTIONS.map((opt) => (
                        <button
                          key={opt}
                          onClick={() => updateField("has_lead_clarity", opt)}
                          className={`w-full text-sm px-3 py-2.5 rounded-xl border transition-all text-left ${
                            data.has_lead_clarity === opt
                              ? "border-primary bg-primary/10 text-primary font-medium"
                              : "border-border bg-muted text-foreground hover:border-primary/50"
                          }`}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground mb-2 block flex items-center gap-2">
                      <BarChart3 className="h-4 w-4 text-primary" />
                      Como você organiza seus leads hoje?
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {LEAD_ORGANIZATION_OPTIONS.map((opt) => (
                        <button
                          key={opt}
                          onClick={() => updateField("lead_organization", opt)}
                          className={`text-sm px-3 py-2.5 rounded-xl border transition-all text-left ${
                            data.lead_organization === opt
                              ? "border-primary bg-primary/10 text-primary font-medium"
                              : "border-border bg-muted text-foreground hover:border-primary/50"
                          }`}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="step-2"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-4"
                >
                  <p className="text-sm text-muted-foreground">
                    Quase lá! Deixe seus dados para recebermos o diagnóstico personalizado.
                  </p>
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1.5 block">
                      Seu nome *
                    </label>
                    <input
                      type="text"
                      value={data.contact_name}
                      onChange={(e) => updateField("contact_name", e.target.value)}
                      placeholder="Nome completo"
                      className="w-full bg-muted border border-border rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                      maxLength={100}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1.5 block">
                      WhatsApp *
                    </label>
                    <input
                      type="tel"
                      value={data.whatsapp}
                      onChange={(e) => updateField("whatsapp", e.target.value)}
                      placeholder="(11) 99999-9999"
                      className="w-full bg-muted border border-border rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                      maxLength={20}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1.5 block">
                      E-mail *
                    </label>
                    <input
                      type="email"
                      value={data.email}
                      onChange={(e) => updateField("email", e.target.value)}
                      placeholder="contato@seubuffet.com.br"
                      className="w-full bg-muted border border-border rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                      maxLength={255}
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Footer */}
          {!isComplete && (
            <div className="p-5 border-t border-border flex items-center justify-between gap-3">
              {step > 0 ? (
                <Button
                  variant="ghost"
                  onClick={() => setStep((s) => s - 1)}
                  className="rounded-xl"
                >
                  <ArrowLeft className="h-4 w-4 mr-1" />
                  Voltar
                </Button>
              ) : (
                <div />
              )}
              {step < STEPS.length - 1 ? (
                <Button
                  onClick={() => setStep((s) => s + 1)}
                  disabled={!canProceed()}
                  className="rounded-xl px-6"
                >
                  Próximo
                  <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              ) : (
                <Button
                  onClick={handleSubmit}
                  disabled={!canProceed() || isSaving}
                  className="rounded-xl px-6"
                >
                  {isSaving ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4 mr-2" />
                  )}
                  Enviar
                </Button>
              )}
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
