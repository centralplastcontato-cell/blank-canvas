import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, ChevronRight, ChevronLeft, CheckCircle2, Check, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

interface CardapioSection {
  id: string;
  emoji: string;
  title: string;
  instruction: string;
  max_selections: number | null;
  options: string[];
}

interface TemplateData {
  id: string;
  company_id: string;
  company_name: string;
  company_logo: string | null;
  company_slug: string | null;
  template_name: string;
  description: string | null;
  sections: CardapioSection[];
  thank_you_message: string | null;
}

interface EventOption {
  event_id: string;
  event_title: string;
  event_date: string;
  lead_name: string;
}

export default function PublicCardapio() {
  const { templateId, companySlug, templateSlug } = useParams<{ templateId?: string; companySlug?: string; templateSlug?: string }>();
  const [template, setTemplate] = useState<TemplateData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [selections, setSelections] = useState<Record<string, string[]>>({});
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [respondentName, setRespondentName] = useState("");
  const [events, setEvents] = useState<EventOption[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [loadingEvents, setLoadingEvents] = useState(false);

  useEffect(() => {
    async function load() {
      let data: any = null;
      let error: any = null;

      if (companySlug && templateSlug) {
        // Slug-based route
        const res = await supabase.rpc("get_cardapio_template_by_slugs", { _company_slug: companySlug, _template_slug: templateSlug });
        data = res.data;
        error = res.error;
      } else if (templateId) {
        // UUID-based route (legacy)
        const res = await supabase.rpc("get_cardapio_template_public", { _template_id: templateId });
        data = res.data;
        error = res.error;
      } else {
        setNotFound(true); setLoading(false); return;
      }

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
        sections: row.sections as CardapioSection[],
        thank_you_message: row.thank_you_message,
      });

      // Fetch events with linked leads for this company
      setLoadingEvents(true);
      const { data: eventsData } = await supabase.rpc("get_company_events_for_cardapio", { _company_id: row.company_id });
      setEvents((eventsData as EventOption[]) || []);
      setLoadingEvents(false);

      setLoading(false);
    }
    load();
  }, [templateId, companySlug, templateSlug]);

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

  const totalSteps = template.sections.length;
  const isNameStep = currentStep === 0;
  const sectionIndex = currentStep - 1;
  const currentSection = isNameStep ? null : template.sections[sectionIndex];
  const progress = (currentStep / (totalSteps + 1)) * 100;

  const toggleOption = (sectionId: string, option: string, maxSelections: number | null) => {
    setSelections(prev => {
      const current = prev[sectionId] || [];
      if (current.includes(option)) {
        return { ...prev, [sectionId]: current.filter(o => o !== option) };
      }
      if (maxSelections && current.length >= maxSelections) {
        return prev; // limit reached
      }
      return { ...prev, [sectionId]: [...current, option] };
    });
  };

  const canAdvance = () => {
    if (isNameStep) return selectedEventId !== null || respondentName.trim().length > 0;
    if (!currentSection) return false;
    const selected = selections[currentSection.id] || [];
    if (currentSection.max_selections) return selected.length === currentSection.max_selections;
    return selected.length > 0;
  };

  const handleNext = () => {
    if (currentStep < totalSteps) setCurrentStep(currentStep + 1);
    else handleSubmit();
  };

  const handleBack = () => {
    if (currentStep > 0) setCurrentStep(currentStep - 1);
  };

  const handleSubmit = async () => {
    if (!template) return;
    setSubmitting(true);

    const answers = template.sections.map(sec => ({
      sectionId: sec.id,
      sectionTitle: sec.title,
      selected: selections[sec.id] || [],
    }));

    const { error } = await supabase.from("cardapio_responses").insert({
      template_id: template.id,
      company_id: template.company_id,
      respondent_name: respondentName.trim() || null,
      event_id: selectedEventId || null,
      answers: answers as any,
    });

    setSubmitting(false);
    if (!error) setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-accent/5 p-4">
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center space-y-6 max-w-md">
          {template.company_logo && <img src={template.company_logo} alt={template.company_name} className="h-40 w-auto mx-auto" />}
          <CheckCircle2 className="h-16 w-16 text-accent mx-auto" />
          <h1 className="text-2xl font-bold text-foreground">{template.thank_you_message || "Obrigado! 🎉"}</h1>
          <p className="text-muted-foreground">Suas escolhas foram enviadas com sucesso.</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5 flex flex-col">
      <Helmet>
        <title>{template.template_name} | {template.company_name}</title>
        <meta name="description" content={template.description || `Escolha o cardápio para a sua festa!`} />
      </Helmet>

      <header className="p-4 flex items-center justify-center gap-3 border-b border-border bg-card/80 backdrop-blur-sm">
        {template.company_logo && <img src={template.company_logo} alt={template.company_name} className="h-10 w-auto" />}
        <h1 className="font-display font-bold text-foreground">{template.company_name}</h1>
      </header>

      <div className="px-4 pt-4 max-w-lg mx-auto w-full">
        <Progress value={progress} className="h-2" />
        <p className="text-xs text-muted-foreground mt-1 text-center">
          {isNameStep ? "Identificação" : `${currentSection?.emoji} ${currentSection?.title} (${sectionIndex + 1}/${totalSteps})`}
        </p>
      </div>

      <div className="flex-1 flex items-start justify-center p-4 pt-6">
        <div className="w-full max-w-lg">
          <AnimatePresence mode="wait">
            {isNameStep ? (
              <motion.div key="name-step" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} className="space-y-4">
                <div className="text-center space-y-2">
                  <h2 className="text-xl font-bold text-foreground">{template.template_name}</h2>
                  {template.description && <p className="text-muted-foreground text-sm">{template.description}</p>}
                </div>
                <div className="bg-card rounded-2xl p-5 shadow-card space-y-3">
                  <label className="text-sm font-medium text-foreground">Selecione sua festa</label>
                  {loadingEvents ? (
                    <div className="flex items-center justify-center py-6">
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    </div>
                  ) : events.length > 0 ? (
                    <div className="grid gap-2">
                      {events.map((evt) => {
                        const isSelected = selectedEventId === evt.event_id;
                        return (
                          <button
                            key={evt.event_id}
                            type="button"
                            onClick={() => {
                              setSelectedEventId(evt.event_id);
                              setRespondentName(evt.lead_name);
                            }}
                            className={`w-full text-left px-4 py-3 rounded-xl text-sm transition-all flex items-center gap-3 ${
                              isSelected
                                ? "bg-primary text-primary-foreground shadow-md scale-[1.02]"
                                : "bg-muted text-foreground hover:bg-muted/80"
                            }`}
                          >
                            <CalendarDays className={`h-5 w-5 shrink-0 ${isSelected ? "text-primary-foreground" : "text-muted-foreground"}`} />
                            <div className="flex-1 min-w-0">
                              <p className="font-medium truncate">{evt.lead_name}</p>
                              <p className={`text-xs ${isSelected ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                                {format(parseISO(evt.event_date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                              </p>
                            </div>
                            <span className={`h-5 w-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                              isSelected ? "border-primary-foreground bg-primary-foreground/20" : "border-muted-foreground/30"
                            }`}>
                              {isSelected && <Check className="h-3 w-3" />}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <p className="text-xs text-muted-foreground">Nenhuma festa encontrada.</p>
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
                  )}
                </div>
              </motion.div>
            ) : currentSection ? (
              <motion.div key={`section-${sectionIndex}`} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} className="space-y-4">
                <div className="bg-card rounded-2xl p-5 shadow-card space-y-4">
                  <div className="text-center space-y-1">
                    <p className="text-3xl">{currentSection.emoji}</p>
                    <h3 className="font-bold text-foreground text-lg">{currentSection.title}</h3>
                    <p className="text-muted-foreground text-sm">{currentSection.instruction}</p>
                    {currentSection.max_selections && (
                      <p className="text-xs text-primary font-medium">
                        {(selections[currentSection.id] || []).length}/{currentSection.max_selections} selecionados
                      </p>
                    )}
                  </div>
                  <div className="grid gap-2">
                    {currentSection.options.map((opt) => {
                      const selected = (selections[currentSection.id] || []).includes(opt);
                      const atLimit = currentSection.max_selections
                        ? (selections[currentSection.id] || []).length >= currentSection.max_selections
                        : false;
                      const disabled = !selected && atLimit;
                      return (
                        <button
                          key={opt}
                          type="button"
                          disabled={disabled}
                          onClick={() => toggleOption(currentSection.id, opt, currentSection.max_selections)}
                          className={`w-full text-left px-4 py-3 rounded-xl text-sm font-medium transition-all flex items-center gap-3 ${
                            selected
                              ? "bg-primary text-primary-foreground shadow-md scale-[1.02]"
                              : disabled
                                ? "bg-muted/50 text-muted-foreground cursor-not-allowed opacity-50"
                                : "bg-muted text-foreground hover:bg-muted/80"
                          }`}
                        >
                          <span className={`h-5 w-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                            selected ? "border-primary-foreground bg-primary-foreground/20" : "border-muted-foreground/30"
                          }`}>
                            {selected && <Check className="h-3 w-3" />}
                          </span>
                          {opt}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      </div>

      <div className="p-4 border-t border-border bg-card/80 backdrop-blur-sm">
        <div className="max-w-lg mx-auto flex items-center justify-between gap-3">
          <Button variant="outline" onClick={handleBack} disabled={isNameStep} className="rounded-xl">
            <ChevronLeft className="h-4 w-4 mr-1" /> Voltar
          </Button>
          <Button onClick={handleNext} disabled={!canAdvance() || submitting} className="rounded-xl">
            {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {!isNameStep && currentStep === totalSteps ? "Enviar" : "Próximo"}
            {!submitting && <ChevronRight className="h-4 w-4 ml-1" />}
          </Button>
        </div>
      </div>
    </div>
  );
}
