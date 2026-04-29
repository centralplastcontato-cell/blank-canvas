import { useState, useEffect, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import {
  FileText, ClipboardList, UtensilsCrossed, Star, CheckCircle2, Clock, Eye, Loader2,
  User, MapPin, Phone, Mail, Calendar, Users, Baby, CreditCard, Hash, MessageCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { buildPublicFormUrl } from "@/lib/publicFormRoutes";
import { format } from "date-fns";
import { toast } from "@/hooks/use-toast";
import { CardapioResponseSheet } from "@/components/cardapio/CardapioResponseSheet";

interface FormStatus {
  type: string;
  label: string;
  icon: React.ElementType;
  sent: boolean;
  hasResponse: boolean;
  responseCount: number;
  responses: Array<{ id: string; answers: any; respondent_name: string | null; created_at: string; event_id?: string; template_id?: string }>;
  templateId?: string;
  templateSlug?: string;
  publicPath?: string;
  templateQuestions?: any[];
  templateSections?: any[];
  cardapioTemplates?: Array<{ id: string; name: string; sections: any[] }>;
}

interface EventFormsStatusPanelProps {
  eventId: string;
  companyId: string;
  leadId?: string | null;
  eventDate?: string;
  parentNames?: string | null;
}

const FORM_TYPES = [
  { type: "prefesta", label: "Pré-Festa", icon: ClipboardList, responseTable: "prefesta_responses", publicPath: "pre-festa", templateTable: "prefesta_templates" },
  { type: "cardapio", label: "Cardápio", icon: UtensilsCrossed, responseTable: "cardapio_responses", publicPath: "cardapio", templateTable: "cardapio_templates" },
  { type: "contrato", label: "Dados Complementares", icon: FileText, responseTable: "contrato_responses", publicPath: "contrato", templateTable: "contrato_templates" },
  { type: "avaliacao", label: "Avaliação", icon: Star, responseTable: "evaluation_responses", publicPath: "avaliacao", templateTable: "evaluation_templates" },
];

const FORM_TYPE_DEFAULT_MESSAGES: Record<string, string> = {
  prefesta: "Olá {{nome}}! 🎉\n\nSua festa está chegando! Para garantir que tudo saia perfeito, precisamos de algumas informações.\n\nPreencha o formulário abaixo:\n{{link}}",
  cardapio: "Olá {{nome}}! 🍽️\n\nVamos definir o cardápio da sua festa? Acesse o link abaixo e escolha as opções:\n\n{{link}}",
  contrato: "Olá {{nome}}! 😊\n\nEstamos finalizando os detalhes da sua festa no {{empresa}} no dia {{data_evento}}.\n\nPara seguirmos, preciso que você preencha seus dados pessoais e as informações do aniversariante no link abaixo:\n\n{{link}}\n\nAssim o buffet consegue finalizar o preenchimento do contrato com essas informações. 🎉",
  avaliacao: "Olá {{nome}}! ⭐\n\nEsperamos que a festa tenha sido incrível! 🎊\n\nNos ajude a melhorar cada vez mais respondendo nossa avaliação:\n{{link}}",
};

const FIELD_LABELS: Record<string, string> = {
  nome: "Nome", name: "Nome", email: "E-mail", cpf: "CPF", rg: "RG",
  cep: "CEP", endereco: "Endereço", address: "Endereço", numero: "Número",
  complemento: "Complemento", bairro: "Bairro", cidade: "Cidade", city: "Cidade",
  estado: "Estado", state: "Estado", nascimento: "Nascimento", birthdate: "Nascimento",
  phone: "Telefone", telefone: "Telefone", whatsapp: "WhatsApp",
  responsaveis: "Responsáveis", birthday_children: "Aniversariante(s)",
  relation: "Parentesco", age: "Idade", pix_type: "Tipo PIX", pix_key: "Chave PIX",
};

const HIDDEN_FIELDS = new Set(["id", "event_id", "company_id", "template_id", "lead_id", "token", "status"]);

function getFieldLabel(key: string): string {
  return FIELD_LABELS[key] || key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatDate(value: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [y, m, d] = value.split("-");
    return `${d}/${m}/${y}`;
  }
  return value;
}

function ResponsaveisCard({ data }: { data: any[] }) {
  if (!Array.isArray(data) || data.length === 0) return null;
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
        <Users className="h-3.5 w-3.5 text-primary" />
        Responsáveis
      </div>
      <div className="grid gap-2">
        {data.map((resp, idx) => (
          <div key={idx} className="rounded-lg bg-muted/40 border border-border/30 p-2.5 space-y-1">
            <div className="flex items-center gap-2">
              <User className="h-3 w-3 text-muted-foreground" />
              <span className="text-xs font-medium text-foreground">{resp.name || "—"}</span>
              {resp.relation && (
                <Badge variant="outline" className="text-[9px] px-1.5 py-0">{resp.relation}</Badge>
              )}
            </div>
            {resp.phone && (
              <div className="flex items-center gap-2 pl-5">
                <Phone className="h-2.5 w-2.5 text-muted-foreground" />
                <span className="text-[11px] text-muted-foreground">{resp.phone}</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function BirthdayChildrenCard({ data }: { data: any[] }) {
  if (!Array.isArray(data) || data.length === 0) return null;
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
        <Baby className="h-3.5 w-3.5 text-primary" />
        Aniversariante(s)
      </div>
      <div className="grid gap-2">
        {data.map((child, idx) => (
          <div key={idx} className="rounded-lg bg-primary/5 border border-primary/15 p-2.5 space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-foreground">{child.name || "—"}</span>
              {child.age && (
                <Badge className="text-[9px] px-1.5 py-0 bg-primary/15 text-primary border-0">
                  {child.age} anos
                </Badge>
              )}
            </div>
            {child.birthdate && (
              <div className="flex items-center gap-2 pl-0">
                <Calendar className="h-2.5 w-2.5 text-muted-foreground" />
                <span className="text-[11px] text-muted-foreground">{formatDate(child.birthdate)}</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function getFieldIcon(key: string) {
  const k = key.toLowerCase();
  if (k === "email") return Mail;
  if (k === "cpf" || k === "rg") return CreditCard;
  if (k === "cep" || k === "endereco" || k === "bairro" || k === "cidade" || k === "estado" || k === "numero" || k === "complemento") return MapPin;
  if (k === "nascimento" || k === "birthdate") return Calendar;
  if (k === "phone" || k === "telefone" || k === "whatsapp") return Phone;
  if (k === "nome" || k === "name") return User;
  return Hash;
}

function FormattedResponseView({ answers, formType, questions }: { answers: any; formType: string; questions?: any[] }) {
  if (!answers || typeof answers !== "object") {
    return <span className="text-xs text-muted-foreground italic">Sem dados</span>;
  }

  if (formType === "contrato" && !Array.isArray(answers)) {
    const simpleFields: [string, any][] = [];
    let responsaveis: any[] = [];
    let birthdayChildren: any[] = [];

    Object.entries(answers).forEach(([key, value]) => {
      if (HIDDEN_FIELDS.has(key)) return;
      if (key === "responsaveis") {
        responsaveis = Array.isArray(value) ? value : typeof value === "string" ? tryParseJSON(value) : [];
      } else if (key === "birthday_children") {
        birthdayChildren = Array.isArray(value) ? value : typeof value === "string" ? tryParseJSON(value) : [];
      } else {
        simpleFields.push([key, value]);
      }
    });

    const addressFields = new Set(["cep", "endereco", "numero", "complemento", "bairro", "cidade", "estado"]);
    const personalFields = simpleFields.filter(([k]) => !addressFields.has(k));
    const addrFields = simpleFields.filter(([k]) => addressFields.has(k));

    return (
      <div className="space-y-4">
        {personalFields.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Dados Pessoais</p>
            <div className="grid gap-1">
              {personalFields.map(([key, value]) => (
                <FieldRow key={key} fieldKey={key} value={value} />
              ))}
            </div>
          </div>
        )}
        {addrFields.length > 0 && (
          <>
            <Separator />
            <div className="space-y-1.5">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Endereço</p>
              <div className="grid gap-1">
                {addrFields.map(([key, value]) => (
                  <FieldRow key={key} fieldKey={key} value={value} />
                ))}
              </div>
            </div>
          </>
        )}
        {responsaveis.length > 0 && (
          <>
            <Separator />
            <ResponsaveisCard data={responsaveis} />
          </>
        )}
        {birthdayChildren.length > 0 && (
          <>
            <Separator />
            <BirthdayChildrenCard data={birthdayChildren} />
          </>
        )}
      </div>
    );
  }

  if (formType === "cardapio" && !Array.isArray(answers)) {
    return (
      <div className="space-y-3">
        {Object.entries(answers).map(([sectionName, items]) => (
          <div key={sectionName} className="rounded-lg bg-muted/20 border border-border/30 p-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-primary mb-2">{sectionName}</p>
            {Array.isArray(items) ? (
              <div className="flex flex-wrap gap-1.5">
                {(items as string[]).map((item, i) => (
                  <Badge key={i} variant="secondary" className="text-[10px] font-normal">{item}</Badge>
                ))}
              </div>
            ) : (
              <span className="text-xs text-foreground">{String(items)}</span>
            )}
          </div>
        ))}
      </div>
    );
  }

  if (formType === "cardapio" && Array.isArray(answers)) {
    const sections = answers.filter((item: any) => item?.SectionTitle || item?.sectionTitle);
    if (sections.length > 0) {
      return (
        <div className="space-y-3">
          {sections.map((section: any, idx: number) => {
            const title = section.SectionTitle || section.sectionTitle || "Seção";
            const selected = section.Selected || section.selected || [];
            const items = Array.isArray(selected) ? selected : typeof selected === "string" ? tryParseJSON(selected) : [];
            return (
              <div key={idx} className="rounded-lg bg-muted/20 border border-border/30 p-3">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-primary mb-2">{title}</p>
                {items.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {items.map((item: string, i: number) => (
                      <Badge key={i} variant="secondary" className="text-[10px] font-normal">{item}</Badge>
                    ))}
                  </div>
                ) : (
                  <span className="text-xs text-muted-foreground italic">Nenhum item selecionado</span>
                )}
              </div>
            );
          })}
        </div>
      );
    }
  }

  if (Array.isArray(answers)) {
    // Check if it's a questions-based format ({questionId, value})
    const isQuestionFormat = answers.length > 0 && answers[0] && typeof answers[0] === "object" && "questionId" in answers[0];
    
    if (isQuestionFormat && questions && questions.length > 0) {
      const formatVal = (val: any): string => {
        if (val === true) return "👍 Sim";
        if (val === false) return "👎 Não";
        if (typeof val === "string" && /^\d{4}-\d{2}-\d{2}T/.test(val)) {
          try { return format(new Date(val), "dd/MM/yyyy"); } catch { return val; }
        }
        if (typeof val === "object" && val !== null) return JSON.stringify(val);
        return String(val ?? "—");
      };

      return (
        <div className="space-y-2">
          {answers.map((answer: any, i: number) => {
            const qId = answer.questionId;
            const question = qId
              ? (questions.find((q: any) => q.id === qId) || questions.find((q: any) => qId.startsWith(q.id)))
              : questions[i];
            const label = question?.text || question?.label || question?.title || `Pergunta ${i + 1}`;
            return (
              <div key={i} className="space-y-0.5">
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="text-sm font-medium text-foreground">{formatVal(answer.value)}</p>
              </div>
            );
          })}
        </div>
      );
    }

    return (
      <div className="space-y-2">
        {answers.map((item: any, idx: number) => (
          <div key={idx} className="rounded-lg bg-muted/30 border border-border/30 p-2.5">
            {typeof item === "object" && item !== null ? (
              <div className="space-y-1">
                {Object.entries(item).filter(([k]) => !HIDDEN_FIELDS.has(k)).map(([k, v]) => (
                  <FieldRow key={k} fieldKey={k} value={v} />
                ))}
              </div>
            ) : (
              <span className="text-xs text-foreground">{String(item)}</span>
            )}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {Object.entries(answers).filter(([k]) => !HIDDEN_FIELDS.has(k)).map(([key, value]) => {
        if (Array.isArray(value)) {
          return (
            <div key={key} className="space-y-1">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{getFieldLabel(key)}</p>
              {value.map((item, i) => (
                <div key={i} className="rounded bg-muted/30 p-2 text-xs">
                  {typeof item === "object" ? Object.entries(item).map(([ik, iv]) => (
                    <FieldRow key={ik} fieldKey={ik} value={iv} />
                  )) : String(item)}
                </div>
              ))}
            </div>
          );
        }
        return <FieldRow key={key} fieldKey={key} value={value} />;
      })}
    </div>
  );
}

function FieldRow({ fieldKey, value }: { fieldKey: string; value: any }) {
  const Icon = getFieldIcon(fieldKey);
  const displayValue = value == null || value === "" ? "—" : typeof value === "object" ? JSON.stringify(value) : formatDate(String(value));

  return (
    <div className="flex items-start gap-2 py-0.5">
      <Icon className="h-3 w-3 text-muted-foreground mt-0.5 shrink-0" />
      <span className="text-[11px] text-muted-foreground min-w-[90px] shrink-0">{getFieldLabel(fieldKey)}</span>
      <span className="text-[11px] text-foreground font-medium break-all">{displayValue}</span>
    </div>
  );
}

function tryParseJSON(str: string): any[] {
  try { const p = JSON.parse(str); return Array.isArray(p) ? p : []; } catch { return []; }
}

export function EventFormsStatusPanel({ eventId, companyId, leadId, eventDate, parentNames }: EventFormsStatusPanelProps) {
  const [formStatuses, setFormStatuses] = useState<FormStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewingResponses, setViewingResponses] = useState<FormStatus | null>(null);
  const [viewingCardapio, setViewingCardapio] = useState<FormStatus | null>(null);
  const [companyInfo, setCompanyInfo] = useState<{ name: string; logo_url: string | null } | null>(null);
  const [sendingForm, setSendingForm] = useState<string | null>(null);

  const fetchStatuses = useCallback(async () => {
    if (!eventId || !companyId) return;
    setLoading(true);

    try {
      const { data: historyData } = await supabase
        .from("lead_history")
        .select("details")
        .eq("action", "form_sent_whatsapp")
        .contains("details", JSON.stringify({ event_id: eventId }));

      const sentTypes = new Set<string>();
      (historyData || []).forEach((row: any) => {
        const d = typeof row.details === "string" ? JSON.parse(row.details) : row.details;
        if (d?.form_type) sentTypes.add(d.form_type);
      });

      // Fetch first active template for each form type to enable sending
      // Note: cardapio_templates uses "sections" instead of "questions"
      const templatePromises = FORM_TYPES.map(async (ft) => {
        const selectFields = ft.templateTable === "cardapio_templates"
          ? "id, slug, sections"
          : "id, slug, questions";
        const { data } = await (supabase as any)
          .from(ft.templateTable)
          .select(selectFields)
          .eq("company_id", companyId)
          .eq("is_active", true)
          .limit(1);
        return { type: ft.type, template: data?.[0] || null };
      });
      const templateResults = await Promise.all(templatePromises);
      const templateMap = new Map(templateResults.map(r => [r.type, r.template]));

      // Fetch all active cardapio templates for the lateral sheet (PDF template switcher)
      const { data: allCardapioTpls } = await supabase
        .from("cardapio_templates")
        .select("id, name, sections")
        .eq("company_id", companyId)
        .eq("is_active", true);
      const cardapioTemplates = (allCardapioTpls || []) as any[];

      // Fetch company info for the PDF header
      const { data: companyRow } = await supabase
        .from("companies")
        .select("name, logo_url")
        .eq("id", companyId)
        .maybeSingle();
      if (companyRow) setCompanyInfo({ name: companyRow.name, logo_url: companyRow.logo_url });

      const statuses: FormStatus[] = [];

      for (const ft of FORM_TYPES) {
        let responses: any[] = [];

        if (ft.responseTable === "prefesta_responses" || ft.responseTable === "evaluation_responses") {
          const { data } = await (supabase as any)
            .from(ft.responseTable)
            .select("id, answers, respondent_name, created_at")
            .eq("event_id", eventId)
            .order("created_at", { ascending: false });
          responses = data || [];
        } else if (ft.responseTable === "cardapio_responses") {
          const { data } = await supabase
            .from("cardapio_responses")
            .select("id, answers, respondent_name, created_at, event_id, template_id, company_events(event_date, title, guest_count, child_name, parent_names, lead_id, campaign_leads(name))")
            .eq("event_id", eventId)
            .order("created_at", { ascending: false });
          responses = data || [];
        } else if (ft.responseTable === "contrato_responses") {
          const { data } = await (supabase as any)
            .from("client_data_requests")
            .select("id, client_data, completed_at, created_at, status")
            .eq("event_id", eventId)
            .eq("status", "completed")
            .order("created_at", { ascending: false });
          responses = (data || []).map((d: any) => ({
            id: d.id,
            answers: d.client_data,
            respondent_name: null,
            created_at: d.completed_at || d.created_at,
          }));
        }

        const tmpl = templateMap.get(ft.type);

        statuses.push({
          type: ft.type,
          label: ft.label,
          icon: ft.icon,
          sent: sentTypes.has(ft.type),
          hasResponse: responses.length > 0,
          responseCount: responses.length,
          responses,
          templateId: tmpl?.id,
          templateSlug: tmpl?.slug || undefined,
          publicPath: ft.publicPath,
          templateQuestions: Array.isArray(tmpl?.questions) ? tmpl.questions : undefined,
          templateSections: ft.type === "cardapio" && Array.isArray(tmpl?.sections) ? tmpl.sections : undefined,
          cardapioTemplates: ft.type === "cardapio" ? cardapioTemplates : undefined,
        });
      }

      setFormStatuses(statuses);
    } finally {
      setLoading(false);
    }
  }, [eventId, companyId]);

  useEffect(() => {
    fetchStatuses();
  }, [fetchStatuses]);

  const handleSendForm = async (fs: FormStatus) => {
    if (!leadId || !fs.templateId || !fs.publicPath) return;

    setSendingForm(fs.type);
    try {
      // Get lead data
      const { data: lead } = await supabase
        .from("campaign_leads")
        .select("name, whatsapp")
        .eq("id", leadId)
        .single();

      if (!lead?.whatsapp) {
        toast({ title: "Lead sem WhatsApp cadastrado", variant: "destructive" });
        return;
      }

      // Get company data (slug + name)
      const { data: company } = await supabase
        .from("companies")
        .select("slug, name")
        .eq("id", companyId)
        .single();

      if (!company?.slug) {
        toast({ title: "Empresa sem slug configurado", variant: "destructive" });
        return;
      }

      // Get connected WhatsApp instances
      const { data: connectedInstances } = await (supabase as any)
        .from("wapi_instances")
        .select("instance_id, unit, status")
        .eq("company_id", companyId)
        .eq("status", "connected");

      if (!connectedInstances?.length) {
        toast({ title: "Nenhuma instância WhatsApp conectada", variant: "destructive" });
        return;
      }

      const link = buildPublicFormUrl({
        type: fs.type as "prefesta" | "cardapio" | "contrato" | "avaliacao",
        templateId: fs.templateId,
        templateSlug: fs.templateSlug,
        companySlug: company.slug,
        baseUrl: window.location.origin,
        eventId,
      });

      // Get configured template
      const { data: automationSettings } = await supabase
        .from("form_automation_settings")
        .select("message_template")
        .eq("company_id", companyId)
        .eq("form_type", fs.type)
        .maybeSingle();

      const rawTemplate = automationSettings?.message_template || FORM_TYPE_DEFAULT_MESSAGES[fs.type] || "";

      // Resolve variables - use lead name (contratante), not event title
      const leadName = lead.name || parentNames || "Cliente";
      const firstName = leadName.split(" ")[0];
      const formattedDate = eventDate ? format(new Date(eventDate + "T12:00:00"), "dd/MM/yyyy") : "";

      const message = rawTemplate
        .replace(/\{\{\s*nome\s*\}\}/gi, firstName)
        .replace(/\{\{\s*link\s*\}\}/gi, link)
        .replace(/\{\{\s*data_evento\s*\}\}/gi, formattedDate)
        .replace(/\{\{\s*empresa\s*\}\}/gi, company.name || "");

      // Reuse a conversa existente apenas se a instância dela ainda estiver conectada.
      const { findExistingConversation, toCanonicalBrazilianPhone } = await import("@/lib/whatsappConversationHelper");
      const existingConv = await findExistingConversation(leadId, lead.whatsapp, companyId);
      const matchingInstance = connectedInstances.find((item: any) => item.instance_id === existingConv?.instanceId) || connectedInstances[0];
      const matchingConversation = existingConv?.instanceId === matchingInstance.instance_id ? existingConv : null;

      // Sempre envia o telefone no formato canônico (com 55) para que a edge
      // não crie um chat duplicado caso o lead esteja salvo sem código do país.
      const canonicalPhone = toCanonicalBrazilianPhone(lead.whatsapp);

      // Send via WhatsApp
      const { data: sendData, error } = await supabase.functions.invoke("wapi-send", {
        body: {
          action: "send-text",
          phone: canonicalPhone,
          message,
          instanceId: matchingInstance.instance_id,
          ...(matchingConversation && {
            conversationId: matchingConversation.conversationId,
            companyId: matchingConversation.companyId,
          }),
        },
      });

      if (error) {
        console.error("[sendForm] wapi-send error:", error, "response data:", sendData);
        const errMsg = typeof sendData === "object" && sendData?.error ? sendData.error : error.message;
        throw new Error(errMsg);
      }

      // Log the send
      await supabase.from("lead_history").insert({
        lead_id: leadId,
        company_id: companyId,
        action: "form_sent_whatsapp",
        details: { form_type: fs.type, template_id: fs.templateId, event_id: eventId },
      });

      toast({ title: `${fs.label} enviado via WhatsApp ✅` });
      fetchStatuses(); // Refresh to show updated status
    } catch (err: any) {
      toast({ title: "Erro ao enviar", description: err.message, variant: "destructive" });
    } finally {
      setSendingForm(null);
    }
  };

  if (loading) {
    return (
      <div className="rounded-xl border border-border/40 bg-card shadow-sm overflow-hidden">
        <div className="px-4 py-2.5 bg-muted/30 border-b border-border/30 flex items-center gap-2">
          <FileText className="h-3.5 w-3.5 text-primary" />
          <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">Formulários</p>
        </div>
        <div className="p-4 flex items-center justify-center">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="rounded-xl border border-border/40 bg-card shadow-sm overflow-hidden">
        <div className="px-4 py-2.5 bg-muted/30 border-b border-border/30 flex items-center gap-2">
          <FileText className="h-3.5 w-3.5 text-primary" />
          <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">Formulários</p>
        </div>
        <div className="p-3 space-y-1.5">
          {formStatuses.map((fs) => {
            const Icon = fs.icon;
            const canSend = !!leadId && !!fs.templateId;
            const isSending = sendingForm === fs.type;
            return (
              <div key={fs.type} className="rounded-lg px-3 py-2 bg-muted/20 hover:bg-muted/40 transition-colors space-y-1.5">
                {/* Status row */}
                <div className="flex items-center gap-2.5">
                  <div className={cn(
                    "p-1.5 rounded-lg",
                    fs.hasResponse ? "bg-emerald-500/15" : fs.sent ? "bg-amber-500/15" : "bg-muted"
                  )}>
                    <Icon className={cn(
                      "h-3.5 w-3.5",
                      fs.hasResponse ? "text-emerald-600" : fs.sent ? "text-amber-600" : "text-muted-foreground"
                    )} />
                  </div>
                  <span className="text-xs font-medium flex-1 text-foreground">{fs.label}</span>
                  
                  {fs.hasResponse ? (
                    <div className="flex items-center gap-1.5">
                      <Badge variant="outline" className="text-[9px] bg-emerald-500/15 text-emerald-700 border-emerald-300 gap-1">
                        <CheckCircle2 className="h-2.5 w-2.5" />
                        Respondido
                      </Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 text-primary hover:text-primary/80"
                        onClick={() => {
                          if (fs.type === "cardapio") setViewingCardapio(fs);
                          else setViewingResponses(fs);
                        }}
                        title="Ver respostas"
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ) : fs.sent ? (
                    <Badge variant="outline" className="text-[9px] bg-amber-500/15 text-amber-700 border-amber-300 gap-1">
                      <Clock className="h-2.5 w-2.5" />
                      Enviado
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-[9px] text-muted-foreground gap-1">
                      <Clock className="h-2.5 w-2.5" />
                      Pendente
                    </Badge>
                  )}
                </div>

                {/* Send button row - show when form has a template and lead is linked */}
                {canSend && !fs.hasResponse && (
                  <div className="flex items-center gap-1.5 pl-8">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-6 text-[10px] px-2 gap-1 border-emerald-300/50 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800"
                      disabled={isSending}
                      onClick={() => handleSendForm(fs)}
                    >
                      {isSending ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <MessageCircle className="h-3 w-3" />
                      )}
                      {fs.sent ? "Reenviar WhatsApp" : "WhatsApp"}
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Response Viewer Dialog */}
      <Dialog open={!!viewingResponses} onOpenChange={(o) => !o && setViewingResponses(null)}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              {viewingResponses && <viewingResponses.icon className="h-4 w-4 text-primary" />}
              Respostas — {viewingResponses?.label}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {viewingResponses?.responses.map((resp) => (
              <div key={resp.id} className="rounded-xl border border-border/50 bg-muted/10 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  {resp.respondent_name && (
                    <span className="text-xs font-semibold text-foreground">{resp.respondent_name}</span>
                  )}
                  <Badge variant="outline" className="text-[9px] font-normal">
                    {format(new Date(resp.created_at), "dd/MM/yyyy 'às' HH:mm")}
                  </Badge>
                </div>
                <FormattedResponseView answers={resp.answers} formType={viewingResponses.type} questions={viewingResponses.templateQuestions} />
              </div>
            ))}
            {viewingResponses?.responses.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">Nenhuma resposta encontrada.</p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Cardápio lateral sheet — same UX as Operações > Cardápio */}
      <CardapioResponseSheet
        open={!!viewingCardapio}
        onOpenChange={(o) => { if (!o) setViewingCardapio(null); }}
        response={viewingCardapio?.responses[0] ? { ...viewingCardapio.responses[0], event_id: viewingCardapio.responses[0].event_id || eventId, template_id: viewingCardapio.responses[0].template_id || viewingCardapio.templateId } : null}
        template={viewingCardapio && viewingCardapio.templateSections ? { id: viewingCardapio.templateId || "", name: "Cardápio", sections: viewingCardapio.templateSections as any } : null}
        company={companyInfo}
        allTemplates={viewingCardapio?.cardapioTemplates as any}
        side="right"
        contentClassName="!right-[28rem] !left-auto sm:!max-w-md border-l border-r shadow-2xl"
        onDelete={async (id) => {
          await supabase.from("cardapio_responses").delete().eq("id", id);
          toast({ title: "Resposta apagada" });
          fetchStatuses();
        }}
      />
    </>
  );
}
