import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Loader2, Search, X, UserCheck, ListChecks, User, CalendarDays, PartyPopper, Briefcase, CalendarIcon, AlertTriangle, CreditCard, Handshake, Copy, ExternalLink, Clock, CheckCircle2, Send, PenLine, Baby, Gift, FileSignature, Repeat, Plus, Trash2 } from "lucide-react";
import { ManualClientDataForm } from "./ManualClientDataForm";
import { EventContractDialog } from "@/components/contracts/EventContractDialog";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";

export interface ParcelaDetail {
  valor: number | null;
  vencimento: string; // yyyy-MM-dd
}

export interface PaymentDetails {
  entrada_valor: number | null;
  entrada_forma: string;
  entrada_data?: string | null;
  saldo_valor: number | null;
  saldo_forma: string;
  saldo_data?: string | null;
  parcelas: number | null;
  observacoes_pagamento: string;
  parcelas_details?: ParcelaDetail[];
  parcelas_same_day?: boolean;
  parcelas_day?: number | null;
}

export interface BirthdayChild {
  name: string;
  age: string;
  birthdate: string;
}

export interface EventFormData {
  id?: string;
  title: string;
  event_date: string;
  start_time: string;
  end_time: string;
  event_type: string;
  guest_count: number | null;
  unit: string;
  status: string;
  package_name: string;
  total_value: number | null;
  notes: string;
  lead_id?: string | null;
  lead_name?: string | null;
  checklist_template_id?: string | null;
  data_fechamento_venda?: string | null;
  vendedor_responsavel_id?: string | null;
  vendedor_responsavel_name?: string | null;
  payment_method?: string | null;
  payment_details?: PaymentDetails | null;
  child_name?: string | null;
  child_age?: string | null;
  child_birthdate?: string | null;
  birthday_children?: BirthdayChild[];
  parent_names?: string | null;
  gifts?: string | null;
  extra_guest_value?: number | null;
  is_permuta?: boolean;
}

const PAYMENT_METHODS = [
  { value: "cartao", label: "Cartão" },
  { value: "boleto", label: "Boleto" },
  { value: "pix", label: "PIX" },
  { value: "dinheiro", label: "Dinheiro" },
  { value: "transferencia", label: "Transferência" },
  { value: "misto", label: "Misto" },
];

const PAYMENT_FORMS = [
  { value: "pix", label: "PIX" },
  { value: "cartao", label: "Cartão" },
  { value: "dinheiro", label: "Dinheiro" },
  { value: "boleto", label: "Boleto" },
  { value: "transferencia", label: "Transferência" },
];

const EVENT_TYPES = [
  { value: "aniversario", label: "Aniversário" },
  { value: "formatura", label: "Formatura" },
  { value: "escolar", label: "Escolar" },
  { value: "aniversario_kids", label: "Aniversário Kids" },
  { value: "confraternizacao", label: "Confraternização" },
];

const TIME_OPTIONS = Array.from({ length: 48 }, (_, i) => {
  const h = String(Math.floor(i / 2)).padStart(2, "0");
  const m = i % 2 === 0 ? "00" : "30";
  return `${h}:${m}`;
});

const DAY_OPTIONS = Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, "0"));
const MONTH_OPTIONS = [
  { value: "01", label: "Janeiro" },
  { value: "02", label: "Fevereiro" },
  { value: "03", label: "Março" },
  { value: "04", label: "Abril" },
  { value: "05", label: "Maio" },
  { value: "06", label: "Junho" },
  { value: "07", label: "Julho" },
  { value: "08", label: "Agosto" },
  { value: "09", label: "Setembro" },
  { value: "10", label: "Outubro" },
  { value: "11", label: "Novembro" },
  { value: "12", label: "Dezembro" },
];
const YEAR_OPTIONS = ["2026", "2027", "2028", "2029", "2030"];

const normalizeTimeValue = (value?: string | null) => {
  if (!value) return "";
  return value.slice(0, 5);
};

const STATUS_OPTIONS = [
  { value: "pendente", label: "Pendente" },
  { value: "confirmado", label: "Confirmado" },
  { value: "cancelado", label: "Cancelado" },
];

interface ClientDataRequest {
  id: string;
  token: string;
  status: string;
  client_data: any;
  completed_at: string | null;
}

interface EventFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: EventFormData) => Promise<string | void>;
  initialData?: EventFormData | null;
  units: Array<{ name: string }>;
  userId?: string;
}

const EMPTY_PAYMENT: PaymentDetails = {
  entrada_valor: null,
  entrada_forma: "",
  entrada_data: null,
  saldo_valor: null,
  saldo_forma: "",
  saldo_data: null,
  parcelas: null,
  observacoes_pagamento: "",
  parcelas_details: [],
  parcelas_same_day: true,
  parcelas_day: null,
};

const EMPTY: EventFormData = {
  title: "",
  event_date: "",
  start_time: "",
  end_time: "",
  event_type: "aniversario",
  guest_count: null,
  unit: "",
  status: "pendente",
  package_name: "",
  total_value: null,
  notes: "",
  lead_id: null,
  lead_name: null,
  data_fechamento_venda: null,
  vendedor_responsavel_id: null,
  vendedor_responsavel_name: null,
  payment_method: null,
  payment_details: null,
  child_name: null,
  child_age: null,
  child_birthdate: null,
  birthday_children: [{ name: "", age: "", birthdate: "" }],
  parent_names: null,
  gifts: null,
  extra_guest_value: null,
  is_permuta: false,
};

function SectionHeader({ icon: Icon, label }: { icon: React.ElementType; label: string }) {
  return (
    <div className="flex items-center gap-2.5 text-[11px] uppercase tracking-[0.18em] font-semibold text-muted-foreground mb-4 pb-2.5 border-b border-border/40">
      <div className="p-1.5 rounded-md bg-primary/8 ring-1 ring-primary/15">
        <Icon className="h-3.5 w-3.5 text-primary" />
      </div>
      {label}
    </div>
  );
}

function MoneyInput({ value, onChange, placeholder = "0,00" }: { value: number | null; onChange: (v: number | null) => void; placeholder?: string }) {
  return (
    <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-muted-foreground">R$</span>
      <Input
        className="pl-10"
        placeholder={placeholder}
        value={value != null ? value.toLocaleString("pt-BR", { minimumFractionDigits: 2 }) : ""}
        onChange={(e) => {
          const raw = e.target.value.replace(/[^\d]/g, "");
          const num = raw ? Number(raw) / 100 : null;
          onChange(num);
        }}
      />
    </div>
  );
}

function ClientDataStatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; className: string; icon: React.ElementType }> = {
    pending: { label: "Não enviado", className: "bg-muted text-muted-foreground", icon: Clock },
    sent: { label: "Aguardando cliente", className: "bg-amber-500/15 text-amber-700 border-amber-200", icon: Send },
    completed: { label: "Recebido", className: "bg-green-500/15 text-green-700 border-green-200", icon: CheckCircle2 },
    reviewed: { label: "Revisado", className: "bg-primary/15 text-primary border-primary/20", icon: CheckCircle2 },
  };
  const c = config[status] || config.pending;
  const StatusIcon = c.icon;
  return (
    <Badge variant="outline" className={cn("text-xs gap-1", c.className)}>
      <StatusIcon className="h-3 w-3" />
      {c.label}
    </Badge>
  );
}

function buildParcelasDetails(parcelas: number | null, saldo: number | null, existing: ParcelaDetail[] = []): ParcelaDetail[] {
  if (!parcelas || parcelas < 1) return [];

  if (!saldo || saldo <= 0) {
    return Array.from({ length: parcelas }, (_, i) => ({
      valor: existing[i]?.valor ?? null,
      vencimento: existing[i]?.vencimento ?? "",
    }));
  }

  const saldoEmCentavos = Math.round(saldo * 100);
  const valorBase = Math.floor(saldoEmCentavos / parcelas);
  const restante = saldoEmCentavos - valorBase * parcelas;

  return Array.from({ length: parcelas }, (_, i) => ({
    valor: (valorBase + (i < restante ? 1 : 0)) / 100,
    vencimento: existing[i]?.vencimento ?? "",
  }));
}

export function EventFormDialog({ open, onOpenChange, onSubmit, initialData, units, userId }: EventFormDialogProps) {
  const [form, setForm] = useState<EventFormData>(EMPTY);
  const [payment, setPayment] = useState<PaymentDetails>(EMPTY_PAYMENT);
  const [saving, setSaving] = useState(false);
  const { currentCompany } = useCompany();

  const [dateDay, setDateDay] = useState("");
  const [dateMonth, setDateMonth] = useState("");
  const [dateYear, setDateYear] = useState("");

  const [leadSearch, setLeadSearch] = useState("");
  const [showLeadDropdown, setShowLeadDropdown] = useState(false);
  const [closedLeads, setClosedLeads] = useState<Array<{ id: string; name: string; whatsapp: string }>>([]);
  const [linkedLeadIds, setLinkedLeadIds] = useState<Set<string>>(new Set());
  const [loadingLeads, setLoadingLeads] = useState(false);

  const [templates, setTemplates] = useState<Array<{ id: string; name: string; items: string[] }>>([]);
  const [packages, setPackages] = useState<Array<{ id: string; name: string; valor_pessoa_adicional: number | null; preco_separado: boolean; valor_pessoa_adicional_adulto: number | null; valor_pessoa_adicional_crianca: number | null }>>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [companyUsers, setCompanyUsers] = useState<Array<{ id: string; name: string }>>([]);
  const [fechamentoDate, setFechamentoDate] = useState<Date | undefined>(undefined);

  // Client data request state
  const [clientRequest, setClientRequest] = useState<ClientDataRequest | null>(null);
  const [loadingClientRequest, setLoadingClientRequest] = useState(false);
  const [generatingLink, setGeneratingLink] = useState(false);
  const [resolvedMessage, setResolvedMessage] = useState<string | null>(null);
  const [sendingClientLink, setSendingClientLink] = useState(false);
   const [showManualForm, setShowManualForm] = useState(false);
   const [editingClientData, setEditingClientData] = useState(false);
  const [contractModels, setContractModels] = useState<Array<{ id: string; nome_modelo: string; versao: number; tipo_evento: string }>>([]);
  const [selectedContractModelId, setSelectedContractModelId] = useState<string | null>(null);
  const [contractDialogOpen, setContractDialogOpen] = useState(false);

  // Conflict detection state
  const [conflictEvent, setConflictEvent] = useState<{ title: string; start_time: string; end_time: string; unit: string } | null>(null);
  const [_checkingConflict, setCheckingConflict] = useState(false);
  const conflictTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Conflict detection effect
  const inferEndTime = useCallback((start: string): string => {
    if (!start) return "";
    const [h, m] = start.split(":").map(Number);
    const endH = h + 3;
    return `${String(endH).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  }, []);

  useEffect(() => {
    if (!open || !currentCompany?.id || !form.event_date) {
      setConflictEvent(null);
      return;
    }

    const startTime = form.start_time;
    if (!startTime) {
      setConflictEvent(null);
      return;
    }

    const endTime = form.end_time || inferEndTime(startTime);
    if (!endTime) {
      setConflictEvent(null);
      return;
    }

    if (conflictTimerRef.current) clearTimeout(conflictTimerRef.current);

    conflictTimerRef.current = setTimeout(async () => {
      setCheckingConflict(true);
      try {
        let query = supabase
          .from("company_events")
          .select("id, title, start_time, end_time, unit")
          .eq("company_id", currentCompany.id)
          .eq("event_date", form.event_date)
          .neq("status", "cancelado");

        // Filter by unit if set
        if (form.unit) {
          query = query.eq("unit", form.unit);
        }

        // Exclude current event if editing
        const editId = form.id || initialData?.id;
        if (editId) {
          query = query.neq("id", editId);
        }

        const { data: events } = await query;

        if (!events || events.length === 0) {
          setConflictEvent(null);
          setCheckingConflict(false);
          return;
        }

        // Check overlap: (newStart < existingEnd) AND (newEnd > existingStart)
        const conflict = events.find((ev) => {
          const evStart = normalizeTimeValue(ev.start_time) || "00:00";
          const evEnd = normalizeTimeValue(ev.end_time) || inferEndTime(evStart);
          if (!evEnd) return false;
          return startTime < evEnd && endTime > evStart;
        });

        setConflictEvent(
          conflict
            ? {
                title: conflict.title,
                start_time: normalizeTimeValue(conflict.start_time) || "",
                end_time: normalizeTimeValue(conflict.end_time) || "",
                unit: conflict.unit || "",
              }
            : null
        );
      } catch {
        setConflictEvent(null);
      } finally {
        setCheckingConflict(false);
      }
    }, 300);

    return () => {
      if (conflictTimerRef.current) clearTimeout(conflictTimerRef.current);
    };
  }, [open, currentCompany?.id, form.event_date, form.start_time, form.end_time, form.unit, form.id, initialData?.id, inferEndTime]);

  useEffect(() => {
    if (open) {
      const data = initialData || EMPTY;
      setForm({
        ...data,
        start_time: normalizeTimeValue(data.start_time),
        end_time: normalizeTimeValue(data.end_time),
      });
      const loadedPayment = (data.payment_details as PaymentDetails) || EMPTY_PAYMENT;
      // Auto-fill parcelas details if saldo and parcelas are set but details have null values
      if (loadedPayment.parcelas && loadedPayment.parcelas >= 1 && loadedPayment.saldo_valor && loadedPayment.saldo_valor > 0) {
        const hasEmptyValues = (loadedPayment.parcelas_details || []).some(d => d.valor == null);
        if (hasEmptyValues || !loadedPayment.parcelas_details?.length) {
          const perParcela = Math.round((loadedPayment.saldo_valor / loadedPayment.parcelas) * 100) / 100;
          loadedPayment.parcelas_details = Array.from({ length: loadedPayment.parcelas }, (_, i) => ({
            valor: perParcela,
            vencimento: loadedPayment.parcelas_details?.[i]?.vencimento || "",
          }));
        }
      }
      setPayment(loadedPayment);
      if (data.event_date) {
        const [y, m, d] = data.event_date.split("-");
        setDateYear(y || "");
        setDateMonth(m || "");
        setDateDay(d || "");
      } else {
        setDateDay("");
        setDateMonth("");
        setDateYear("");
      }
      setLeadSearch("");
      setShowLeadDropdown(false);
      setSelectedTemplate("");
      setFechamentoDate(data.data_fechamento_venda ? new Date(data.data_fechamento_venda + "T12:00:00") : undefined);
      setClientRequest(null);
      setShowManualForm(false);
      setEditingClientData(false);
    }
  }, [open, initialData]);

  // Fetch client data request for existing events
  const eventId = form.id || initialData?.id;
  useEffect(() => {
    if (!open || !eventId || !currentCompany?.id) return;
    setLoadingClientRequest(true);
    supabase
      .from("client_data_requests")
      .select("id, token, status, client_data, completed_at")
      .eq("event_id", eventId)
      .order("created_at", { ascending: false })
      .limit(1)
      .then(({ data }) => {
        setClientRequest((data && data.length > 0) ? data[0] as ClientDataRequest : null);
        setLoadingClientRequest(false);
      });
  }, [open, eventId, currentCompany?.id]);

  useEffect(() => {
    if (dateDay && dateMonth && dateYear) {
      setForm((prev) => ({ ...prev, event_date: `${dateYear}-${dateMonth}-${dateDay}` }));
    }
  }, [dateDay, dateMonth, dateYear]);

  useEffect(() => {
    if (!open || !currentCompany?.id) return;
    supabase
      .from("event_checklist_templates")
      .select("id, name, items")
      .eq("company_id", currentCompany.id)
      .eq("is_active", true)
      .then(({ data }) => {
        setTemplates(
          (data || []).map((t: any) => ({ id: t.id, name: t.name, items: Array.isArray(t.items) ? t.items : [] }))
        );
      });
    supabase
      .from("company_packages")
      .select("id, name, valor_pessoa_adicional, preco_separado, valor_pessoa_adicional_adulto, valor_pessoa_adicional_crianca")
      .eq("company_id", currentCompany.id)
      .eq("is_active", true)
      .order("sort_order")
      .then(({ data }) => {
        setPackages((data || []).map((p: any) => ({ id: p.id, name: p.name, valor_pessoa_adicional: p.valor_pessoa_adicional, preco_separado: !!p.preco_separado, valor_pessoa_adicional_adulto: p.valor_pessoa_adicional_adulto, valor_pessoa_adicional_crianca: p.valor_pessoa_adicional_crianca })));
      });

  }, [open, currentCompany?.id]);

  // Auto-fill extra_guest_value from package when packages load or package_name changes
  useEffect(() => {
    if (!form.package_name || packages.length === 0) return;
    const pkg = packages.find(p => p.name === form.package_name);
    if (pkg && form.extra_guest_value == null && pkg.valor_pessoa_adicional != null) {
      setForm(prev => ({ ...prev, extra_guest_value: pkg.valor_pessoa_adicional }));
    }
  }, [packages, form.package_name]);

  // Fetch contract models
  useEffect(() => {
    if (!open || !currentCompany?.id) return;
    (supabase as any)
      .from("contract_models")
      .select("id, nome_modelo, versao, tipo_evento")
      .eq("company_id", currentCompany.id)
      .eq("is_active", true)
      .then(({ data }: any) => {
        const models = (data || []) as Array<{ id: string; nome_modelo: string; versao: number; tipo_evento: string }>;
        setContractModels(models);
        // Auto-select based on event_type
        const eventType = (initialData?.event_type || "").toLowerCase();
        const autoMatch = eventType ? models.find(m => m.tipo_evento.toLowerCase() === eventType) : null;
        setSelectedContractModelId(autoMatch?.id || (models.length === 1 ? models[0].id : null));
      });
  }, [open, currentCompany?.id, initialData?.event_type]);

  useEffect(() => {
    if (!open || !currentCompany?.id) return;
    supabase
      .from("user_companies")
      .select("user_id, profiles:user_id(full_name)")
      .eq("company_id", currentCompany.id)
      .then(({ data }) => {
        setCompanyUsers(
          (data || [])
            .filter((d: any) => d.profiles?.full_name)
            .map((d: any) => ({ id: d.user_id, name: d.profiles.full_name }))
        );
      });
  }, [open, currentCompany?.id]);

  useEffect(() => {
    if (!open || !currentCompany?.id) return;
    setLoadingLeads(true);
    const fetchData = async () => {
      const [leadsRes, eventsRes] = await Promise.all([
        supabase.from("campaign_leads").select("id, name, whatsapp").eq("company_id", currentCompany.id).eq("status", "fechado"),
        supabase.from("company_events").select("lead_id").eq("company_id", currentCompany.id).not("lead_id", "is", null),
      ]);
      setClosedLeads(leadsRes.data || []);
      setLinkedLeadIds(new Set((eventsRes.data || []).map((e) => e.lead_id!)));
      setLoadingLeads(false);
    };
    fetchData();
  }, [open, currentCompany?.id]);

  const availableLeads = useMemo(() => {
    const filtered = closedLeads.filter((lead) => !linkedLeadIds.has(lead.id) || lead.id === initialData?.lead_id);
    if (!leadSearch) return filtered;
    const q = leadSearch.toLowerCase();
    return filtered.filter((l) => l.name.toLowerCase().includes(q));
  }, [closedLeads, linkedLeadIds, leadSearch, initialData?.lead_id]);

  const handleSubmit = async (e: React.FormEvent, keepOpen = false) => {
    e.preventDefault();
    if (!form.title) {
      toast({ title: "Preencha o nome do cliente", variant: "destructive" });
      return;
    }
    if (!dateDay || !dateMonth || !dateYear || !form.event_date) {
      toast({ title: "Preencha a data completa (dia, mês e ano)", variant: "destructive" });
      return;
    }
    if (units.length > 1 && !form.unit) {
      toast({ title: "Selecione uma unidade", variant: "destructive" });
      return;
    }
    if (conflictEvent) {
      toast({ title: "Conflito de horário detectado", description: "Altere o horário, data ou unidade antes de salvar.", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const submitData = { ...form, payment_details: payment };
      const resultId = await onSubmit(submitData);
      if (!isEdit && resultId) {
        // Transition to edit mode: set the ID so contractor data section appears
        setForm(prev => ({ ...prev, id: resultId }));
      }
      if (!keepOpen) {
        onOpenChange(false);
      }
    } finally {
      setSaving(false);
    }
  };

  const resolveContractMessage = (template: string, link: string) => {
    const leadName = form.title || form.lead_name || "Cliente";
    const firstName = leadName.split(" ")[0];
    const companyName = currentCompany?.name || "Buffet";
    const eventDate = form.event_date
      ? (() => { const [y, m, d] = form.event_date.split("-"); return `${d}/${m}/${y}`; })()
      : "";
    const eventType = EVENT_TYPES.find(t => t.value === form.event_type)?.label || form.event_type || "";
    const packageName = form.package_name || "";

    return template
      .replace(/\{\{nome\}\}/gi, leadName)
      .replace(/\{\{primeiro_nome\}\}/gi, firstName)
      .replace(/\{\{empresa\}\}/gi, companyName)
      .replace(/\{\{buffet\}\}/gi, companyName)
      .replace(/\{\{nome_buffet\}\}/gi, companyName)
      .replace(/\{\{data_festa\}\}/gi, eventDate)
      .replace(/\{\{tipo_festa\}\}/gi, eventType)
      .replace(/\{\{pacote\}\}/gi, packageName)
      .replace(/\{\{link_formulario_contrato\}\}/gi, link);
  };

  const generateClientLink = async () => {
    const eventId = form.id || initialData?.id;
    if (!eventId || !currentCompany?.id) {
      toast({ title: "Salve a festa primeiro antes de solicitar dados do contratante", variant: "destructive" });
      return;
    }
    setGeneratingLink(true);
    try {
      const token = crypto.randomUUID().replace(/-/g, "").slice(0, 24);
      const { data, error } = await supabase
        .from("client_data_requests")
        .insert({
          company_id: currentCompany.id,
          event_id: eventId,
          lead_id: form.lead_id || null,
          token,
          status: "sent",
          sent_at: new Date().toISOString(),
        })
        .select("id, token, status, client_data, completed_at")
        .single();
      if (error) throw error;
      setClientRequest(data as ClientDataRequest);

      // Load contract message settings and resolve
      const link = `${window.location.origin}/dados-contratante/${token}`;
      const { data: msgSettings } = await (supabase as any)
        .from("contract_message_settings")
        .select("is_enabled, message_template")
        .eq("company_id", currentCompany.id)
        .maybeSingle();

      if (msgSettings?.is_enabled && msgSettings?.message_template) {
        const resolved = resolveContractMessage(msgSettings.message_template, link);
        setResolvedMessage(resolved);
        navigator.clipboard.writeText(resolved);
        toast({ title: "Link gerado e mensagem copiada!", description: "A mensagem personalizada foi copiada para a área de transferência." });
      } else {
        navigator.clipboard.writeText(link);
        toast({ title: "Link gerado e copiado!" });
      }
    } catch (err: any) {
      toast({ title: "Erro ao gerar link", description: err.message, variant: "destructive" });
    } finally {
      setGeneratingLink(false);
    }
  };

  const getClientLink = () => {
    if (!clientRequest?.token) return "";
    return `${window.location.origin}/dados-contratante/${clientRequest.token}`;
  };

  const copyLink = () => {
    navigator.clipboard.writeText(getClientLink());
    toast({ title: "Link copiado!" });
  };

  const copyMessage = () => {
    if (resolvedMessage) {
      navigator.clipboard.writeText(resolvedMessage);
      toast({ title: "Mensagem copiada!" });
    }
  };

  const sendClientLinkToLead = async () => {
    if (!form.lead_id || !clientRequest?.token) return;
    setSendingClientLink(true);
    try {
      // Get lead phone
      const { data: lead } = await supabase
        .from("campaign_leads")
        .select("whatsapp")
        .eq("id", form.lead_id)
        .single();
      if (!lead?.whatsapp) {
        toast({ title: "Lead sem WhatsApp cadastrado", variant: "destructive" });
        return;
      }

      // Get active instance for company
      const { data: instance } = await supabase
        .from("wapi_instances")
        .select("instance_id")
        .eq("company_id", currentCompany?.id)
        .order("connected_at", { ascending: false })
        .limit(1)
        .single();
      if (!instance?.instance_id) {
        toast({ title: "Nenhuma instância WhatsApp ativa", variant: "destructive" });
        return;
      }

      const link = getClientLink();

      // Always re-fetch the saved template so edited text is respected
      let message = "";
      const { data: msgSettings } = await (supabase as any)
        .from("contract_message_settings")
        .select("is_enabled, message_template")
        .eq("company_id", currentCompany?.id)
        .maybeSingle();

      if (msgSettings?.is_enabled && msgSettings?.message_template) {
        message = resolveContractMessage(msgSettings.message_template, link);
        setResolvedMessage(message);
      } else {
        message = `Olá! Segue o link para preenchimento dos dados do contratante:\n\n${link}`;
      }

      const { error } = await supabase.functions.invoke("wapi-send", {
        body: {
          action: "send-text",
          phone: lead.whatsapp,
          message,
          instanceId: instance.instance_id,
        },
      });
      if (error) throw error;
      toast({ title: "Link enviado com sucesso via WhatsApp!" });
    } catch (err: any) {
      toast({ title: "Erro ao enviar link", description: err.message, variant: "destructive" });
    } finally {
      setSendingClientLink(false);
    }
  };

  const isEdit = !!initialData?.id || !!form.id;
  const clientData = clientRequest?.client_data as Record<string, string> | null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[720px] max-h-[90vh] p-0 gap-0 overflow-hidden rounded-2xl [&>button]:top-5 [&>button]:right-5">
        <DialogHeader className="px-7 pt-7 pb-4 border-b border-border/40 bg-muted/30">
          <DialogTitle className="text-lg font-bold tracking-tight">{isEdit ? "Editar Festa" : "Nova Festa"}</DialogTitle>
          <p className="text-[13px] text-muted-foreground mt-1">Preencha os dados do evento e contratação</p>
        </DialogHeader>

        <form id="event-form" onSubmit={handleSubmit} className="overflow-y-auto px-7 py-6 space-y-5" style={{ maxHeight: "calc(90vh - 180px)" }}>
          {/* Conflict Alert */}
          {conflictEvent && (
            <Alert variant="destructive" className="border-destructive/60 bg-destructive/10">
              <AlertTriangle className="h-5 w-5" />
              <AlertTitle className="text-sm font-bold">⚠️ Conflito de horário detectado!</AlertTitle>
              <AlertDescription className="text-sm mt-1">
                Já existe uma festa agendada neste horário:
                <span className="font-semibold block mt-1">
                  "{conflictEvent.title}" — {conflictEvent.start_time} às {conflictEvent.end_time || "N/A"}
                  {conflictEvent.unit && ` (${conflictEvent.unit})`}
                </span>
                <span className="block mt-1 text-xs">
                  Altere o horário, a data ou a unidade para continuar.
                </span>
              </AlertDescription>
            </Alert>
          )}

          {/* Section 1 – Dados do Cliente */}
          <div className="rounded-xl border border-border/40 bg-card p-5 shadow-sm">
            <SectionHeader icon={User} label="Dados do Cliente" />
            <div className="space-y-5">
              <div className="space-y-2.5">
                <Label className="text-sm font-medium text-foreground/70">Nome do cliente *</Label>
                <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
              </div>
              <div className="relative space-y-2.5">
                <Label className="text-sm font-medium text-foreground/70">Vincular Lead do CRM</Label>
                {form.lead_id ? (
                  <div className="flex items-center gap-2 p-2 rounded-md border border-border bg-accent/30">
                    <UserCheck className="h-4 w-4 text-primary shrink-0" />
                    <span className="text-sm flex-1 truncate">{form.lead_name || "Lead vinculado"}</span>
                    <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={() => setForm({ ...form, lead_id: null, lead_name: null })}>
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ) : (
                  <>
                    <div className="relative">
                      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input placeholder="Buscar lead fechado..." value={leadSearch} onChange={(e) => setLeadSearch(e.target.value)} onFocus={() => setShowLeadDropdown(true)} className="pl-8" />
                      {loadingLeads && <Loader2 className="absolute right-2.5 top-2.5 h-4 w-4 animate-spin text-muted-foreground" />}
                    </div>
                    {showLeadDropdown && availableLeads.length > 0 && (
                      <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-md shadow-md max-h-48 overflow-y-auto">
                        {availableLeads.map((lead) => (
                          <button key={lead.id} type="button" className="w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors flex items-center gap-2" onClick={() => { setForm({ ...form, lead_id: lead.id, lead_name: lead.name, title: form.title || lead.name }); setLeadSearch(""); setShowLeadDropdown(false); }}>
                            <span className="font-medium flex-1">{lead.name}</span>
                            <Badge variant="secondary" className="text-[10px] bg-green-500/15 text-green-700 border-0">Fechado</Badge>
                            <span className="text-xs text-muted-foreground">{lead.whatsapp}</span>
                          </button>
                        ))}
                      </div>
                    )}
                    {showLeadDropdown && availableLeads.length === 0 && !loadingLeads && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {closedLeads.length === 0 ? "Nenhum lead fechado encontrado." : "Todos os leads fechados já possuem festa vinculada."}
                      </p>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Section 2 – Data e Horário */}
          <div className="rounded-xl border border-border/40 bg-card p-5 shadow-sm">
            <SectionHeader icon={CalendarDays} label="Data e Horário" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-y-5">
              <div className="space-y-2.5 md:pr-6">
                <Label className="text-sm font-medium text-foreground/70">Data da festa *</Label>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <Select value={dateDay} onValueChange={setDateDay}>
                      <SelectTrigger><SelectValue placeholder="Dia" /></SelectTrigger>
                      <SelectContent>{DAY_OPTIONS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="flex-[2]">
                    <Select value={dateMonth} onValueChange={setDateMonth}>
                      <SelectTrigger><SelectValue placeholder="Mês" /></SelectTrigger>
                      <SelectContent>{MONTH_OPTIONS.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="flex-1">
                    <Select value={dateYear} onValueChange={setDateYear}>
                      <SelectTrigger><SelectValue placeholder="Ano" /></SelectTrigger>
                      <SelectContent>{YEAR_OPTIONS.map((y) => <SelectItem key={y} value={y}>{y}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <div className="space-y-2.5 md:pl-6 md:border-l md:border-border/50">
                <Label className="text-sm font-medium text-foreground/70">Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{STATUS_OPTIONS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>

              <div className="space-y-2.5 md:pr-6">
                <Label className="text-sm font-medium text-foreground/70">Horário início</Label>
                <Select value={form.start_time} onValueChange={(v) => setForm({ ...form, start_time: v === "none" ? "" : v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sem horário</SelectItem>
                    {TIME_OPTIONS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2.5 md:pl-6 md:border-l md:border-border/50">
                <Label className="text-sm font-medium text-foreground/70">Horário fim</Label>
                <Select value={form.end_time} onValueChange={(v) => setForm({ ...form, end_time: v === "none" ? "" : v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sem horário</SelectItem>
                    {TIME_OPTIONS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Section 3 – Informações da Festa */}
          <div className="rounded-xl border border-border/40 bg-card p-5 shadow-sm">
            <SectionHeader icon={PartyPopper} label="Informações da Festa" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-y-5">
              <div className="space-y-2.5 md:pr-6">
                <Label className="text-sm font-medium text-foreground/70">Tipo de festa</Label>
                <Select value={form.event_type} onValueChange={(v) => {
                  setForm({ ...form, event_type: v });
                  const autoMatch = contractModels.find(m => m.tipo_evento.toLowerCase() === v.toLowerCase());
                  if (autoMatch) setSelectedContractModelId(autoMatch.id);
                }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{EVENT_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>

              <div className="space-y-2.5 md:pl-6 md:border-l md:border-border/50">
                <Label className="text-sm font-medium text-foreground/70">Convidados</Label>
                <Input type="number" value={form.guest_count ?? ""} onChange={(e) => setForm({ ...form, guest_count: e.target.value ? Number(e.target.value) : null })} />
              </div>

              <div className="space-y-2.5 md:pr-6">
                <Label className="text-sm font-medium text-foreground/70">Unidade{units.length > 1 ? " *" : ""}</Label>
                {units.length > 0 ? (
                  <Select value={form.unit} onValueChange={(v) => setForm({ ...form, unit: v })}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>{units.map((u) => <SelectItem key={u.name} value={u.name}>{u.name}</SelectItem>)}</SelectContent>
                  </Select>
                ) : (
                  <Input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} />
                )}
              </div>

              <div className="space-y-2.5 md:pl-6 md:border-l md:border-border/50">
                <Label className="text-sm font-medium text-foreground/70">Pacote</Label>
                {packages.length > 0 ? (
                  <Select value={form.package_name} onValueChange={(v) => {
                    const pkgName = v === "none" ? "" : v;
                    const selectedPkg = packages.find(p => p.name === pkgName);
                    const autoExtraValue = selectedPkg?.valor_pessoa_adicional ?? null;
                    setForm({ ...form, package_name: pkgName, extra_guest_value: autoExtraValue });
                  }}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sem pacote</SelectItem>
                      {packages.map((p) => <SelectItem key={p.id} value={p.name}>{p.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input value={form.package_name} onChange={(e) => setForm({ ...form, package_name: e.target.value })} placeholder="Nenhum pacote cadastrado" />
                )}
                {(() => {
                  const selectedPkg = packages.find(p => p.name === form.package_name);
                  if (!selectedPkg) return null;
                  if (selectedPkg.preco_separado) {
                    const hasAdulto = selectedPkg.valor_pessoa_adicional_adulto != null;
                    const hasCrianca = selectedPkg.valor_pessoa_adicional_crianca != null;
                    if (!hasAdulto && !hasCrianca) return null;
                    return (
                      <div className="text-xs text-primary font-medium mt-1 space-y-0.5">
                        {hasCrianca && (
                          <p>Criança adicional: R$ {selectedPkg.valor_pessoa_adicional_crianca!.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                        )}
                        {hasAdulto && (
                          <p>Adulto adicional: R$ {selectedPkg.valor_pessoa_adicional_adulto!.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                        )}
                      </div>
                    );
                  }
                  if (selectedPkg.valor_pessoa_adicional != null) {
                    return (
                      <p className="text-xs text-primary font-medium mt-1">
                        Pessoa adicional: R$ {selectedPkg.valor_pessoa_adicional.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                    );
                  }
                  return null;
                })()}
              </div>

              <div className="space-y-2.5 md:pr-6">
                <Label className="text-sm font-medium text-foreground/70">Valor do pacote</Label>
                <MoneyInput value={form.total_value} onChange={(v) => setForm({ ...form, total_value: v })} />
              </div>

              {/* Checklist template - only for new events */}
              {!isEdit && templates.length > 0 && (
                <div className="space-y-2.5 md:pl-6 md:border-l md:border-border/50">
                  <Label className="text-sm font-medium text-foreground/70 flex items-center gap-1.5">
                    <ListChecks className="h-4 w-4" /> Template de Checklist
                  </Label>
                  <Select value={selectedTemplate} onValueChange={(v) => { setSelectedTemplate(v); setForm({ ...form, checklist_template_id: v || null }); }}>
                    <SelectTrigger><SelectValue placeholder="Sem template" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sem template</SelectItem>
                      {templates.map((t) => <SelectItem key={t.id} value={t.id}>{t.name} ({t.items.length} itens)</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-2.5 md:col-span-2">
                <Label className="text-sm font-medium text-foreground/70">Observações</Label>
                <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3} />
              </div>
            </div>
          </div>

          {/* Section – Aniversariante & Extras */}
          <div className="rounded-xl border border-border/40 bg-card p-5 shadow-sm">
            <SectionHeader icon={Baby} label="Aniversariante & Extras" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-y-5">
              <div className="space-y-2.5 md:pr-6">
                <Label className="text-sm font-medium text-foreground/70">Nome do aniversariante</Label>
                <Input value={form.child_name || ""} onChange={(e) => setForm({ ...form, child_name: e.target.value || null })} placeholder="Nome do aniversariante" />
              </div>

              <div className="space-y-2.5 md:pl-6 md:border-l md:border-border/50">
                <Label className="text-sm font-medium text-foreground/70">Idade a comemorar</Label>
                <Input value={form.child_age || ""} onChange={(e) => setForm({ ...form, child_age: e.target.value || null })} placeholder="Ex: 5 anos" />
              </div>

              <div className="space-y-2.5 md:pr-6">
                <Label className="text-sm font-medium text-foreground/70">Data de nascimento</Label>
                <Input type="date" value={form.child_birthdate || ""} onChange={(e) => setForm({ ...form, child_birthdate: e.target.value || null })} />
              </div>

              <div className="space-y-3 md:col-span-2">
                <Label className="text-sm font-medium text-foreground/70">Responsáveis</Label>
                {(() => {
                  let responsibles: Array<{ name: string; phone: string; relation: string }> = [];
                  try {
                    const parsed = JSON.parse(form.parent_names || "[]");
                    if (Array.isArray(parsed)) responsibles = parsed;
                  } catch { /* legacy plain text — ignore */ }
                  while (responsibles.length < 2) responsibles.push({ name: "", phone: "", relation: "" });

                  const updateResponsible = (idx: number, field: string, value: string) => {
                    const updated = [...responsibles];
                    updated[idx] = { ...updated[idx], [field]: value };
                    setForm({ ...form, parent_names: JSON.stringify(updated) });
                  };

                  const RELATIONS = [
                    { value: "pai", label: "Pai" },
                    { value: "mae", label: "Mãe" },
                    { value: "avo", label: "Avó" },
                    { value: "avo_m", label: "Avô" },
                    { value: "tio", label: "Tio" },
                    { value: "tia", label: "Tia" },
                    { value: "padrasto", label: "Padrasto" },
                    { value: "madrasta", label: "Madrasta" },
                    { value: "outros", label: "Outros" },
                  ];

                  return responsibles.map((r, idx) => (
                    <div key={idx} className="rounded-lg border border-border/40 bg-muted/20 p-3 space-y-2">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{idx + 1}º Responsável</p>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                        <Input
                          placeholder="Nome"
                          value={r.name}
                          onChange={(e) => updateResponsible(idx, "name", e.target.value)}
                        />
                        <Input
                          placeholder="Telefone"
                          value={r.phone}
                          onChange={(e) => updateResponsible(idx, "phone", e.target.value)}
                        />
                        <Select value={r.relation || "none"} onValueChange={(v) => updateResponsible(idx, "relation", v === "none" ? "" : v)}>
                          <SelectTrigger><SelectValue placeholder="Parentesco" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Selecione</SelectItem>
                            {RELATIONS.map((rel) => <SelectItem key={rel.value} value={rel.value}>{rel.label}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  ));
                })()}
              </div>

              <div className="space-y-2.5 md:pr-6">
                <Label className="text-sm font-medium text-foreground/70 flex items-center gap-1.5"><Gift className="h-3.5 w-3.5" /> Brindes inclusos</Label>
                <Input value={form.gifts || ""} onChange={(e) => setForm({ ...form, gifts: e.target.value || null })} placeholder="Ex: Kit lembrancinhas, balões" />
              </div>

              <div className="space-y-2.5 md:pl-6 md:border-l md:border-border/50">
                <Label className="text-sm font-medium text-foreground/70">Valor por convidado extra</Label>
                <MoneyInput value={form.extra_guest_value} onChange={(v) => setForm({ ...form, extra_guest_value: v })} />
              </div>
            </div>
          </div>

          {/* Section 4 – Pagamento */}
          <div className="rounded-xl border border-border/40 bg-card p-5 shadow-sm">
            <SectionHeader icon={CreditCard} label="Pagamento" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-y-5">
              <div className="space-y-2.5 md:pr-6">
                <Label className="text-sm font-medium text-foreground/70">Valor total</Label>
                <MoneyInput value={form.total_value} onChange={(v) => {
                  setForm({ ...form, total_value: v });
                  const entrada = payment.entrada_valor ?? 0;
                  const novoSaldo = v != null ? Math.max(0, v - entrada) : null;
                  setPayment(prev => ({
                    ...prev,
                    saldo_valor: novoSaldo,
                    parcelas_details: buildParcelasDetails(prev.parcelas, novoSaldo, prev.parcelas_details || []),
                  }));
                }} />
              </div>

              <div className="space-y-2.5 md:pl-6 md:border-l md:border-border/50">
                <Label className="text-sm font-medium text-foreground/70">Forma de pagamento</Label>
                <Select value={form.payment_method || "none"} onValueChange={(v) => setForm({ ...form, payment_method: v === "none" ? null : v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Não informado</SelectItem>
                    {PAYMENT_METHODS.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2.5 md:pr-6">
                <Label className="text-sm font-medium text-foreground/70">Parcelas</Label>
                <Input type="number" min={1} max={24} placeholder="1" value={payment.parcelas ?? ""} onChange={(e) => {
                  const num = e.target.value ? Math.max(1, Math.min(24, Number(e.target.value))) : null;
                  const details = buildParcelasDetails(num, payment.saldo_valor, payment.parcelas_details || []);
                  setPayment({ ...payment, parcelas: num, parcelas_details: details });
                }} />
              </div>

              <div className="space-y-2.5 md:pl-6 md:border-l md:border-border/50">
                {(payment.parcelas ?? 0) > 1 && (
                  <div className="space-y-2.5">
                    <Label className="text-sm font-medium text-foreground/70">Vencimentos</Label>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant={payment.parcelas_same_day !== false ? "default" : "outline"}
                        className="text-xs flex-1"
                        onClick={() => setPayment(prev => ({ ...prev, parcelas_same_day: true }))}
                      >
                        Mesmo dia
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant={payment.parcelas_same_day === false ? "default" : "outline"}
                        className="text-xs flex-1"
                        onClick={() => setPayment(prev => ({ ...prev, parcelas_same_day: false, parcelas_day: null }))}
                      >
                        Dias diferentes
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {/* Installment details */}
              {(payment.parcelas ?? 0) >= 1 && (
                <div className="md:col-span-2 space-y-3">
                  <div className="rounded-lg border border-border/40 bg-muted/20 p-3 space-y-2">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Detalhes das parcelas</p>
                    {(payment.parcelas_details || []).map((parcela, idx) => (
                      <div key={idx} className="flex items-center gap-3">
                        <span className="text-xs font-medium text-muted-foreground w-16 shrink-0">
                          {idx + 1}ª parcela
                        </span>
                        <div className="flex-1">
                          <MoneyInput
                            value={parcela.valor}
                            onChange={(v) => {
                              const updated = [...(payment.parcelas_details || [])];
                              updated[idx] = { ...updated[idx], valor: v };
                              setPayment(prev => ({ ...prev, parcelas_details: updated }));
                            }}
                            placeholder="Valor"
                          />
                        </div>
                        {payment.parcelas_same_day === false ? (
                          <div className="w-36">
                            <Input
                              type="date"
                              value={parcela.vencimento}
                              onChange={(e) => {
                                const updated = [...(payment.parcelas_details || [])];
                                updated[idx] = { ...updated[idx], vencimento: e.target.value };
                                setPayment(prev => ({ ...prev, parcelas_details: updated }));
                              }}
                              className="text-xs"
                            />
                          </div>
                        ) : (
                          <div className="w-36">
                            {idx === 0 ? (
                              <Input
                                type="date"
                                value={parcela.vencimento}
                                onChange={(e) => {
                                  const baseDate = e.target.value;
                                  const updated = [...(payment.parcelas_details || [])];
                                  updated[0] = { ...updated[0], vencimento: baseDate };
                                  if (baseDate) {
                                    const [y, m, d] = baseDate.split("-").map(Number);
                                    for (let i = 1; i < updated.length; i++) {
                                      const nextDate = new Date(y, m - 1 + i, d);
                                      const ny = nextDate.getFullYear();
                                      const nm = String(nextDate.getMonth() + 1).padStart(2, "0");
                                      const nd = String(nextDate.getDate()).padStart(2, "0");
                                      updated[i] = { ...updated[i], vencimento: `${ny}-${nm}-${nd}` };
                                    }
                                  }
                                  setPayment(prev => ({ ...prev, parcelas_details: updated }));
                                }}
                                className="text-xs"
                              />
                            ) : (
                              <span className="text-xs text-muted-foreground">
                                {parcela.vencimento ? (() => { const [y,m,d] = parcela.vencimento.split("-"); return `${d}/${m}/${y}`; })() : "—"}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-2.5 md:pr-6">
                <Label className="text-sm font-medium text-foreground/70">Valor da entrada</Label>
                <MoneyInput value={payment.entrada_valor} onChange={(v) => {
                  const total = form.total_value ?? 0;
                  const novoSaldo = total > 0 ? Math.max(0, total - (v ?? 0)) : payment.saldo_valor;
                  setPayment(prev => ({
                    ...prev,
                    entrada_valor: v,
                    saldo_valor: novoSaldo,
                    parcelas_details: buildParcelasDetails(prev.parcelas, novoSaldo, prev.parcelas_details || []),
                  }));
                }} />
              </div>

              <div className="space-y-2.5 md:pl-6 md:border-l md:border-border/50">
                <Label className="text-sm font-medium text-foreground/70">Forma da entrada</Label>
                <Select value={payment.entrada_forma || "none"} onValueChange={(v) => setPayment({ ...payment, entrada_forma: v === "none" ? "" : v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Não informado</SelectItem>
                    {PAYMENT_FORMS.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2.5 md:col-span-2">
                <Label className="text-sm font-medium text-foreground/70">Data da entrada</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !payment.entrada_data && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {payment.entrada_data ? format(new Date(payment.entrada_data + "T12:00:00"), "dd/MM/yyyy") : "Selecionar data da entrada"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={payment.entrada_data ? new Date(payment.entrada_data + "T12:00:00") : undefined}
                      onSelect={(d) => setPayment({ ...payment, entrada_data: d ? format(d, "yyyy-MM-dd") : null })}
                      locale={ptBR}
                      className="p-3 pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2.5 md:pr-6">
                <Label className="text-sm font-medium text-foreground/70">Valor do saldo</Label>
                <MoneyInput value={payment.saldo_valor} onChange={(v) => {
                  setPayment({
                    ...payment,
                    saldo_valor: v,
                    parcelas_details: buildParcelasDetails(payment.parcelas, v, payment.parcelas_details || []),
                  });
                }} />
              </div>

              <div className="space-y-2.5 md:pl-6 md:border-l md:border-border/50">
                <Label className="text-sm font-medium text-foreground/70">Forma do saldo</Label>
                <Select value={payment.saldo_forma || "none"} onValueChange={(v) => setPayment({ ...payment, saldo_forma: v === "none" ? "" : v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Não informado</SelectItem>
                    {PAYMENT_FORMS.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2.5 md:col-span-2">
                <Label className="text-sm font-medium text-foreground/70">Data do saldo</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !payment.saldo_data && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {payment.saldo_data ? format(new Date(payment.saldo_data + "T12:00:00"), "dd/MM/yyyy") : "Selecionar data do saldo"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={payment.saldo_data ? new Date(payment.saldo_data + "T12:00:00") : undefined}
                      onSelect={(d) => {
                        const dateStr = d ? format(d, "yyyy-MM-dd") : null;
                        const updatedPayment = { ...payment, saldo_data: dateStr };
                        // Sync to parcelas_details[0].vencimento when 1 parcela
                        if (dateStr && (payment.parcelas ?? 0) <= 1 && updatedPayment.parcelas_details?.length) {
                          updatedPayment.parcelas_details = [{ ...updatedPayment.parcelas_details[0], vencimento: dateStr }];
                        }
                        setPayment(updatedPayment);
                      }}
                      locale={ptBR}
                      className="p-3 pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2.5 md:col-span-2">
                <Label className="text-sm font-medium text-foreground/70">Observações de pagamento</Label>
                <Textarea
                  value={payment.observacoes_pagamento}
                  onChange={(e) => setPayment({ ...payment, observacoes_pagamento: e.target.value })}
                  rows={2}
                  placeholder="Ex: Entrada via PIX até 15/03, saldo parcelado em 3x no cartão..."
                />
              </div>
            </div>
          </div>

          {/* Section 5 – Dados Comerciais */}
          <div className="rounded-xl border border-border/40 bg-card p-5 shadow-sm">
            <SectionHeader icon={Briefcase} label="Dados Comerciais" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-y-5">
              <div className="space-y-2.5 md:pr-6">
                <Label className="text-sm font-medium text-foreground/70">Data de fechamento da venda</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !fechamentoDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {fechamentoDate ? format(fechamentoDate, "dd/MM/yyyy") : "Selecionar data"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={fechamentoDate}
                      onSelect={(d) => {
                        setFechamentoDate(d);
                        setForm({ ...form, data_fechamento_venda: d ? format(d, "yyyy-MM-dd") : null });
                      }}
                      initialFocus
                      className={cn("p-3 pointer-events-auto")}
                      locale={ptBR}
                    />
                  </PopoverContent>
                </Popover>
                {!fechamentoDate && (
                  <div className="flex items-center gap-1.5 text-xs text-amber-600">
                    <AlertTriangle className="h-3 w-3" />
                    <span>Data de fechamento pendente</span>
                  </div>
                )}
              </div>

              <div className="space-y-2.5 md:pl-6 md:border-l md:border-border/50">
                <Label className="text-sm font-medium text-foreground/70">Vendedor responsável</Label>
                <Select
                  value={form.vendedor_responsavel_id || "none"}
                  onValueChange={(v) => {
                    const userId = v === "none" ? null : v;
                    const userName = companyUsers.find(u => u.id === v)?.name || null;
                    setForm({ ...form, vendedor_responsavel_id: userId, vendedor_responsavel_name: userName });
                  }}
                >
                  <SelectTrigger><SelectValue placeholder="Selecionar vendedor" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sem vendedor</SelectItem>
                    {companyUsers.map((u) => (
                      <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Permuta toggle */}
            <div className="mt-5 pt-5 border-t border-border/40">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Repeat className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <Label className="text-sm font-medium">Permuta</Label>
                    <p className="text-[11px] text-muted-foreground">Evento não contabiliza valores no caixa financeiro</p>
                  </div>
                </div>
                <Switch
                  checked={form.is_permuta || false}
                  onCheckedChange={(checked) => setForm({ ...form, is_permuta: checked })}
                />
              </div>
            </div>

            {/* Contract Model Selector */}
            <div className="mt-5 pt-5 border-t border-border/40">
              <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2.5">
                <FileSignature className="h-3 w-3" />
                Modelo de Contrato
              </div>
              {contractModels.length > 0 ? (
                <>
                  <Select
                    value={selectedContractModelId || ""}
                    onValueChange={(val) => setSelectedContractModelId(val)}
                  >
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue placeholder="Selecione o modelo de contrato" />
                    </SelectTrigger>
                    <SelectContent>
                      {contractModels.map((m) => (
                        <SelectItem key={m.id} value={m.id} className="text-xs">
                          {m.nome_modelo.toUpperCase()} — {m.tipo_evento} (v{m.versao})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {isEdit && selectedContractModelId && (
                    <Button
                      type="button"
                      className="w-full gap-2 mt-3"
                      variant="default"
                      onClick={() => setContractDialogOpen(true)}
                    >
                      <FileSignature className="h-4 w-4" />
                      Gerar Contrato
                    </Button>
                  )}
                </>
              ) : (
                <p className="text-xs text-muted-foreground">Nenhum modelo de contrato cadastrado</p>
              )}
            </div>
          </div>

          {/* Section 6 – Dados do Contratante */}
          <div className="rounded-xl border border-border/40 bg-card p-5 shadow-sm">
            <SectionHeader icon={Handshake} label="Dados do Contratante" />

            {!isEdit ? (
              <p className="text-sm text-muted-foreground">
                Salve a festa primeiro para solicitar os dados do contratante.
              </p>
            ) : loadingClientRequest ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Carregando...
              </div>
            ) : !clientRequest ? (
              <div className="space-y-3">
                {!showManualForm ? (
                  <>
                    <div className="flex items-center gap-2">
                      <ClientDataStatusBadge status="pending" />
                      <span className="text-sm text-muted-foreground">Dados do contratante não solicitados</span>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <Button type="button" variant="outline" onClick={generateClientLink} disabled={generatingLink} className="gap-2">
                        {generatingLink ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                        Enviar link ao cliente
                      </Button>
                      <Button type="button" variant="outline" onClick={() => setShowManualForm(true)} className="gap-2">
                        <PenLine className="h-4 w-4" />
                        Preencher manualmente
                      </Button>
                    </div>
                  </>
                ) : (
                  <ManualClientDataForm
                    eventId={eventId!}
                    companyId={currentCompany!.id}
                    leadId={form.lead_id}
                    onSaved={(req) => {
                      setClientRequest(req as ClientDataRequest);
                      setShowManualForm(false);
                    }}
                    onCancel={() => setShowManualForm(false)}
                  />
                )}
              </div>
            ) : clientRequest.status === "completed" || clientRequest.status === "reviewed" ? (
              <div className="space-y-4">
                {editingClientData ? (
                  <ManualClientDataForm
                    eventId={eventId!}
                    companyId={currentCompany!.id}
                    leadId={form.lead_id}
                    initialClientData={clientData}
                    requestId={clientRequest.id}
                    onSaved={(req) => {
                      setClientRequest(req as ClientDataRequest);
                      setEditingClientData(false);
                    }}
                    onCancel={() => setEditingClientData(false)}
                  />
                ) : (
                  <>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <ClientDataStatusBadge status={clientRequest.status} />
                        <span className="text-sm text-muted-foreground">
                          {clientRequest.completed_at ? `Recebido em ${format(new Date(clientRequest.completed_at), "dd/MM/yyyy 'às' HH:mm")}` : "Dados recebidos"}
                        </span>
                      </div>
                      <Button type="button" variant="ghost" size="sm" onClick={() => setEditingClientData(true)} className="gap-1.5 text-xs">
                        <PenLine className="h-3.5 w-3.5" />
                        Editar
                      </Button>
                    </div>
                    {clientData && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-4 rounded-lg bg-muted/50 border border-border/40">
                        {clientData.nome && <div><span className="text-xs text-muted-foreground">Nome</span><p className="text-sm font-medium">{clientData.nome}</p></div>}
                        {clientData.cpf && <div><span className="text-xs text-muted-foreground">CPF</span><p className="text-sm font-medium">{clientData.cpf}</p></div>}
                        {clientData.rg && <div><span className="text-xs text-muted-foreground">RG</span><p className="text-sm font-medium">{clientData.rg}</p></div>}
                        {clientData.nascimento && <div><span className="text-xs text-muted-foreground">Nascimento</span><p className="text-sm font-medium">{clientData.nascimento}</p></div>}
                        {clientData.email && <div><span className="text-xs text-muted-foreground">E-mail</span><p className="text-sm font-medium">{clientData.email}</p></div>}
                        {clientData.endereco && <div className="md:col-span-2"><span className="text-xs text-muted-foreground">Endereço</span><p className="text-sm font-medium">{clientData.endereco}{clientData.numero ? `, ${clientData.numero}` : ""}{clientData.complemento ? ` - ${clientData.complemento}` : ""}</p></div>}
                        {clientData.bairro && <div><span className="text-xs text-muted-foreground">Bairro</span><p className="text-sm font-medium">{clientData.bairro}</p></div>}
                        {(clientData.cidade || clientData.estado) && <div><span className="text-xs text-muted-foreground">Cidade/Estado</span><p className="text-sm font-medium">{[clientData.cidade, clientData.estado].filter(Boolean).join(" - ")}</p></div>}
                        {clientData.cep && <div><span className="text-xs text-muted-foreground">CEP</span><p className="text-sm font-medium">{clientData.cep}</p></div>}
                      </div>
                    )}
                  </>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {showManualForm ? (
                  <ManualClientDataForm
                    eventId={eventId!}
                    companyId={currentCompany!.id}
                    leadId={form.lead_id}
                    requestId={clientRequest.id}
                    onSaved={(req) => {
                      setClientRequest(req as ClientDataRequest);
                      setShowManualForm(false);
                    }}
                    onCancel={() => setShowManualForm(false)}
                  />
                ) : (
                  <>
                    <div className="rounded-2xl border border-border/60 bg-card shadow-sm overflow-hidden">
                      <div className="px-4 py-3 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-primary/15 text-primary shadow-sm">
                          <Handshake className="w-4 h-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <ClientDataStatusBadge status={clientRequest.status} />
                            <span className="text-sm text-muted-foreground">Link enviado, aguardando preenchimento</span>
                          </div>
                        </div>
                      </div>
                      <div className="px-4 py-2.5 border-t border-border/40 flex items-center gap-2">
                        <Button type="button" variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={copyLink} title="Copiar link">
                          <Copy className="h-3.5 w-3.5" />
                        </Button>
                        <Button type="button" variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => window.open(getClientLink(), "_blank")} title="Abrir link">
                          <ExternalLink className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                      {form.lead_id && (
                        <div className="px-4 py-3 border-t border-border/40 bg-muted/20">
                          <Button
                            type="button"
                            variant="default"
                            size="sm"
                            className="w-full gap-2 rounded-xl shadow-sm"
                            disabled={sendingClientLink}
                            onClick={sendClientLinkToLead}
                          >
                            {sendingClientLink ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                            Enviar link via WhatsApp
                          </Button>
                        </div>
                      )}
                    </div>
                    <Button type="button" variant="outline" size="sm" onClick={() => setShowManualForm(true)} className="gap-2">
                      <PenLine className="h-3.5 w-3.5" />
                      Preencher manualmente
                    </Button>
                    {resolvedMessage && (
                      <div className="space-y-2">
                        <p className="text-xs font-medium text-muted-foreground">Mensagem para o cliente:</p>
                        <div className="rounded-lg bg-muted/50 border border-border/30 p-3">
                          <p className="text-xs whitespace-pre-line leading-relaxed">{resolvedMessage}</p>
                        </div>
                        <Button type="button" variant="outline" size="sm" onClick={copyMessage} className="gap-1.5 text-xs">
                          <Copy className="h-3 w-3" />
                          Copiar mensagem
                        </Button>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </form>

        {/* Fixed footer */}
        <div className="flex justify-end gap-3 px-7 py-4 border-t border-border/40 bg-muted/20">
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          {!isEdit && (
            <Button
              type="button"
              variant="outline"
              disabled={saving || !!conflictEvent}
              className="px-6 rounded-lg"
              onClick={(e) => handleSubmit(e as any, true)}
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Salvar
            </Button>
          )}
          <Button type="submit" form="event-form" disabled={saving || !!conflictEvent} className="px-8 rounded-lg shadow-sm">
            {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            {isEdit ? "Salvar" : "Criar e Fechar"}
          </Button>
        </div>
      </DialogContent>

      {/* Contract Generation Dialog */}
      {isEdit && userId && selectedContractModelId && (
        <EventContractDialog
          open={contractDialogOpen}
          onOpenChange={(o) => {
            setContractDialogOpen(o);
          }}
          eventId={form.id!}
          modelId={selectedContractModelId}
          userId={userId}
        />
      )}
    </Dialog>
  );
}
