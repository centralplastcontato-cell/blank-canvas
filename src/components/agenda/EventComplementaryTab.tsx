import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import {
  Send, Loader2, Copy, ChevronDown, CheckCircle2, Clock,
  FileText, ClipboardList, UtensilsCrossed, ScrollText, ExternalLink, Star,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import type { EventFormData } from "./EventFormDialog";

interface FormTemplate {
  id: string;
  name: string;
  slug: string | null;
  questions?: any;
  sections?: any;
}

interface FormResponse {
  id: string;
  answers: any;
  respondent_name: string | null;
  created_at: string;
}

interface FormSection {
  type: "prefesta" | "cardapio" | "contrato" | "avaliacao";
  label: string;
  icon: React.ElementType;
  templates: FormTemplate[];
  responses: Map<string, FormResponse[]>; // template_id -> responses
  publicPath: string;
}

interface EventComplementaryTabProps {
  eventId: string;
  companyId: string;
  companySlug: string;
  leadPhone?: string | null;
  form: EventFormData;
  setForm: React.Dispatch<React.SetStateAction<EventFormData>>;
  onSaveFirst?: () => Promise<string | null>;
}

export function EventComplementaryTab({
  eventId,
  companyId,
  companySlug,
  leadPhone,
  form,
  setForm,
  onSaveFirst,
}: EventComplementaryTabProps) {
  const [sections, setSections] = useState<FormSection[]>([]);
  const [loading, setLoading] = useState(!!companyId);
  const [sendingForm, setSendingForm] = useState<string | null>(null);
  const [savingBeforeOpen, setSavingBeforeOpen] = useState(false);
  const [iframeModal, setIframeModal] = useState<{ url: string; title: string } | null>(null);

  useEffect(() => {
    if (!companyId) {
      setLoading(false);
      return;
    }
    loadData();
  }, [eventId, companyId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [
        { data: prefestaTemplates },
        { data: cardapioTemplates },
        { data: contratoTemplates },
        { data: evaluationTemplates },
      ] = await Promise.all([
        supabase.from("prefesta_templates").select("id, name, slug, questions").eq("company_id", companyId).eq("is_active", true),
        supabase.from("cardapio_templates").select("id, name, slug, sections").eq("company_id", companyId).eq("is_active", true),
        supabase.from("contrato_templates").select("id, name, slug, questions").eq("company_id", companyId).eq("is_active", true),
        supabase.from("evaluation_templates").select("id, name, slug, questions").eq("company_id", companyId).eq("is_active", true),
      ]);

      let prefestaResponses: any[] | null = null;
      let cardapioResponses: any[] | null = null;
      let contratoResponses: any[] | null = null;
      let evaluationResponses: any[] | null = null;

      if (eventId) {
        const [r1, r2, r3, r4] = await Promise.all([
          supabase.from("prefesta_responses").select("id, template_id, answers, respondent_name, created_at").eq("event_id", eventId),
          supabase.from("cardapio_responses").select("id, template_id, answers, respondent_name, created_at").eq("event_id", eventId),
          supabase.from("contrato_responses").select("id, template_id, answers, respondent_name, created_at").eq("event_id", eventId),
          supabase.from("evaluation_responses").select("id, template_id, answers, respondent_name, created_at").eq("event_id", eventId),
        ]);
        prefestaResponses = r1.data;
        cardapioResponses = r2.data;
        contratoResponses = r3.data;
        evaluationResponses = r4.data;
      }

      const mapResponses = (responses: any[] | null) => {
        const map = new Map<string, FormResponse[]>();
        (responses || []).forEach((r: any) => {
          const list = map.get(r.template_id) || [];
          list.push(r);
          map.set(r.template_id, list);
        });
        return map;
      };

      setSections([
        {
          type: "prefesta",
          label: "Pré-Festa",
          icon: ClipboardList,
          templates: (prefestaTemplates || []) as FormTemplate[],
          responses: mapResponses(prefestaResponses),
          publicPath: "pre-festa",
        },
        {
          type: "cardapio",
          label: "Cardápio",
          icon: UtensilsCrossed,
          templates: (cardapioTemplates || []) as FormTemplate[],
          responses: mapResponses(cardapioResponses),
          publicPath: "cardapio",
        },
        {
          type: "contrato",
          label: "Dados Complementares",
          icon: ScrollText,
          templates: (contratoTemplates || []) as FormTemplate[],
          responses: mapResponses(contratoResponses),
          publicPath: "contrato",
        },
        {
          type: "avaliacao",
          label: "Avaliação",
          icon: Star,
          templates: (evaluationTemplates || []) as FormTemplate[],
          responses: mapResponses(evaluationResponses),
          publicPath: "avaliacao",
        },
      ]);
    } catch (err) {
      console.error("Error loading complementary data:", err);
    } finally {
      setLoading(false);
    }
  };

  const getFormLink = (section: FormSection, template: FormTemplate, overrideEventId?: string) => {
    const slug = template.slug || template.id;
    const eid = overrideEventId || eventId;
    return `${window.location.origin}/${section.publicPath}/${companySlug}/${slug}?event_id=${eid}`;
  };

  const openFormModal = async (section: FormSection, template: FormTemplate) => {
    let currentEventId = eventId;

    // If no eventId yet (new event), save first
    if (!currentEventId && onSaveFirst) {
      setSavingBeforeOpen(true);
      try {
        const savedId = await onSaveFirst();
        if (!savedId) {
          setSavingBeforeOpen(false);
          return; // save failed or validation error
        }
        currentEventId = savedId;
      } catch {
        setSavingBeforeOpen(false);
        return;
      }
      setSavingBeforeOpen(false);
    }

    if (!currentEventId) {
      toast({ title: "Salve a festa primeiro", variant: "destructive" });
      return;
    }

    const url = getFormLink(section, template, currentEventId);
    setIframeModal({ url, title: `${section.label} — ${template.name}` });
  };

  const copyFormLink = (section: FormSection, template: FormTemplate) => {
    const link = getFormLink(section, template);
    navigator.clipboard.writeText(link);
    toast({ title: "Link copiado!" });
  };

  const sendFormToHost = async (section: FormSection, template: FormTemplate) => {
    if (!leadPhone) {
      toast({ title: "Lead sem WhatsApp vinculado", variant: "destructive" });
      return;
    }

    const key = `${section.type}-${template.id}`;
    setSendingForm(key);

    try {
      const { data: instance } = await supabase
        .from("wapi_instances")
        .select("instance_id")
        .eq("company_id", companyId)
        .order("connected_at", { ascending: false })
        .limit(1)
        .single();

      if (!instance?.instance_id) {
        toast({ title: "Nenhuma instância WhatsApp ativa", variant: "destructive" });
        return;
      }

      const link = getFormLink(section, template);
      const message = `Olá! 😊\n\nPor favor, preencha o formulário de *${section.label}* para sua festa:\n\n${link}\n\nObrigado!`;

      const { error } = await supabase.functions.invoke("wapi-send", {
        body: {
          action: "send-text",
          phone: leadPhone,
          message,
          instanceId: instance.instance_id,
        },
      });

      if (error) throw error;
      toast({ title: `Formulário de ${section.label} enviado via WhatsApp!` });
    } catch (err: any) {
      toast({ title: "Erro ao enviar", description: err.message, variant: "destructive" });
    } finally {
      setSendingForm(null);
    }
  };

  const renderAnswers = (answers: any, template: FormTemplate, type: string) => {
    if (!answers) return null;

    // For cardapio, answers is structured differently (sections-based)
    if (type === "cardapio" && template.sections) {
      const sections = Array.isArray(template.sections) ? template.sections : [];
      return (
        <div className="space-y-3">
          {sections.map((section: any, sIdx: number) => {
            const sectionAnswers = answers[section.title || `section_${sIdx}`];
            if (!sectionAnswers) return null;
            return (
              <div key={sIdx} className="space-y-1">
                <p className="text-xs font-semibold text-foreground/80">{section.title}</p>
                {Array.isArray(sectionAnswers) ? (
                  <ul className="text-xs text-muted-foreground space-y-0.5 pl-3">
                    {sectionAnswers.map((item: string, i: number) => (
                      <li key={i} className="flex items-start gap-1.5">
                        <span className="text-primary mt-0.5">•</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-muted-foreground">{String(sectionAnswers)}</p>
                )}
              </div>
            );
          })}
          {/* Render any top-level answers not in sections */}
          {Object.entries(answers).filter(([key]) => !sections.some((s: any) => (s.title || `section_${sections.indexOf(s)}`) === key)).map(([key, value]) => (
            <div key={key} className="space-y-0.5">
              <p className="text-xs font-medium text-foreground/70 capitalize">{key.replace(/_/g, " ")}</p>
              <p className="text-xs text-muted-foreground">{String(value)}</p>
            </div>
          ))}
        </div>
      );
    }

    // For prefesta and contrato (questions-based)
    const questions = Array.isArray(template.questions) ? template.questions : [];
    if (Array.isArray(answers)) {
      return (
        <div className="space-y-2">
          {answers.map((answer: any, i: number) => {
            const question = questions[i];
            return (
              <div key={i} className="space-y-0.5">
                <p className="text-xs font-medium text-foreground/70">
                  {question?.label || question?.title || `Pergunta ${i + 1}`}
                </p>
                <p className="text-xs text-muted-foreground">
                  {typeof answer === "object" ? JSON.stringify(answer) : String(answer || "—")}
                </p>
              </div>
            );
          })}
        </div>
      );
    }

    // Object-based answers
    return (
      <div className="space-y-2">
        {Object.entries(answers).map(([key, value]) => {
          const question = questions.find((q: any) => q.id === key || q.label === key);
          return (
            <div key={key} className="space-y-0.5">
              <p className="text-xs font-medium text-foreground/70">
                {question?.label || question?.title || key.replace(/_/g, " ")}
              </p>
              <p className="text-xs text-muted-foreground">
                {typeof value === "object" ? JSON.stringify(value) : String(value || "—")}
              </p>
            </div>
          );
        })}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin mr-2" />
        Carregando informações complementares...
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Observações Internas */}
      <div className="rounded-xl border border-border/40 bg-card p-5 shadow-sm">
        <div className="flex items-center gap-2.5 text-[11px] uppercase tracking-[0.18em] font-semibold text-muted-foreground mb-4 pb-2.5 border-b border-border/40">
          <div className="p-1.5 rounded-md bg-primary/8 ring-1 ring-primary/15">
            <FileText className="h-3.5 w-3.5 text-primary" />
          </div>
          Observações Internas
        </div>
        <div className="space-y-2.5">
          <Textarea
            value={form.internal_notes || ""}
            onChange={(e) => setForm((prev) => ({ ...prev, internal_notes: e.target.value }))}
            rows={3}
            placeholder="Anotações internas do buffet (não aparece no contrato)..."
          />
          <p className="text-[10px] text-muted-foreground">
            Este campo é exclusivo para uso interno e não será incluído em contratos.
          </p>
        </div>
      </div>

      {/* Form Sections */}
      {sections.map((section) => {
        if (section.templates.length === 0) return null;

        return (
          <div key={section.type} className="rounded-xl border border-border/40 bg-card p-5 shadow-sm">
            <div className="flex items-center gap-2.5 text-[11px] uppercase tracking-[0.18em] font-semibold text-muted-foreground mb-4 pb-2.5 border-b border-border/40">
              <div className="p-1.5 rounded-md bg-primary/8 ring-1 ring-primary/15">
                <section.icon className="h-3.5 w-3.5 text-primary" />
              </div>
              {section.label}
            </div>

            <div className="space-y-3">
              {section.templates.map((template) => {
                const responses = section.responses.get(template.id) || [];
                const hasResponse = responses.length > 0;
                const sendKey = `${section.type}-${template.id}`;

                return (
                  <div
                    key={template.id}
                    className="rounded-lg border border-border/40 bg-muted/20 overflow-hidden"
                  >
                    <div className="px-4 py-3 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-sm font-medium truncate">{template.name}</span>
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[10px] gap-1 shrink-0",
                            hasResponse
                              ? "bg-green-500/15 text-green-700 border-green-200"
                              : "bg-muted text-muted-foreground"
                          )}
                        >
                          {hasResponse ? (
                            <>
                              <CheckCircle2 className="h-3 w-3" />
                              Respondido
                            </>
                          ) : (
                            <>
                              <Clock className="h-3 w-3" />
                              Pendente
                            </>
                          )}
                        </Badge>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => copyFormLink(section, template)}
                          title="Copiar link"
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          disabled={savingBeforeOpen}
                          onClick={() => openFormModal(section, template)}
                          title="Preencher formulário"
                        >
                          {savingBeforeOpen ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ExternalLink className="h-3.5 w-3.5" />}
                        </Button>
                        <Button
                          type="button"
                          variant="default"
                          size="sm"
                          className="gap-1.5 text-xs h-7"
                          disabled={sendingForm === sendKey}
                          onClick={() => sendFormToHost(section, template)}
                        >
                          {sendingForm === sendKey ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Send className="h-3.5 w-3.5" />
                          )}
                          Enviar
                        </Button>
                      </div>
                    </div>

                    {/* Responses */}
                    {hasResponse && (
                      <div className="border-t border-border/40">
                        {responses.map((response) => (
                          <Collapsible key={response.id}>
                            <CollapsibleTrigger className="w-full px-4 py-2.5 flex items-center justify-between text-xs text-muted-foreground hover:bg-muted/40 transition-colors">
                              <span>
                                {response.respondent_name || "Anfitrião"} — {format(new Date(response.created_at), "dd/MM/yyyy 'às' HH:mm")}
                              </span>
                              <ChevronDown className="h-3.5 w-3.5 transition-transform duration-200 [&[data-state=open]]:rotate-180" />
                            </CollapsibleTrigger>
                            <CollapsibleContent>
                              <div className="px-4 py-3 bg-background/50">
                                {renderAnswers(response.answers, template, section.type)}
                              </div>
                            </CollapsibleContent>
                          </Collapsible>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {sections.every((s) => s.templates.length === 0) && (
        <div className="text-center py-8 text-muted-foreground text-sm">
          Nenhum formulário cadastrado. Crie templates em <span className="font-medium">Formulários</span>.
        </div>
      )}

      {/* Modal iframe para preencher formulário internamente */}
      <Dialog open={!!iframeModal} onOpenChange={(open) => { if (!open) { setIframeModal(null); loadData(); } }}>
        <DialogContent className="max-w-2xl w-[95vw] h-[85vh] p-0 flex flex-col">
          <DialogHeader className="px-4 py-3 border-b border-border/40 shrink-0">
            <DialogTitle className="text-sm font-medium">{iframeModal?.title}</DialogTitle>
          </DialogHeader>
          <div className="flex-1 min-h-0">
            {iframeModal && (
              <iframe
                src={iframeModal.url}
                className="w-full h-full border-0 rounded-b-lg"
                title={iframeModal.title}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
