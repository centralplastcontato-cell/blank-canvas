import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { EventComplementaryTab } from "./EventComplementaryTab";
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
import { Loader2, Search, X, UserCheck, ListChecks, User, CalendarDays, PartyPopper, Briefcase, CalendarIcon, AlertTriangle, CreditCard, Handshake, Copy, ExternalLink, Clock, CheckCircle2, Send, PenLine, FileSignature, Repeat, Plus, Trash2, Package, MessageCircle } from "lucide-react";
import { sendContractViaWhatsApp, logContractAction, getContractSendTemplate, resolveContractSendMessage } from "@/components/contracts/contractAuditHelpers";
import { getFormAutomationTemplate, resolveFormAutomationMessage } from "@/lib/formAutomationMessages";
import { ManualClientDataForm } from "./ManualClientDataForm";
import { EventContractDialog } from "@/components/contracts/EventContractDialog";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { getDayType, getDayTypeLabel, findMatchingTier, DEFAULT_DAY_TYPES, DEFAULT_GUEST_TIERS } from "@/lib/brazilian-holidays";
import { DEFAULT_EVENT_TYPES } from "@/components/admin/EventTypesConfig";

export interface ParcelaDetail {
  valor: number | null;
  vencimento: string; // yyyy-MM-dd
}

export interface PaymentDetails {
  entrada_valor: number | null;
  entrada_forma: string;
  entrada_data?: string | null;
  entrada_parcelas?: number | null;
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

export interface EventOptional {
  name: string;
  value: number | null;
  valor_por_pessoa?: number | null;
  quantity?: number | null;
  unit_price?: number | null;
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
  internal_notes?: string;
  event_optionals?: EventOptional[];
  discount_type?: 'fixed' | 'percentage' | null;
  discount_value?: number | null;
  discount_base?: 'pacote' | 'total' | null;
  discount_reason?: string | null;
}

const PAYMENT_METHODS = [
  { value: "cartao", label: "Cartão Crédito" },
  { value: "cartao_debito", label: "Cartão Débito" },
  { value: "boleto", label: "Boleto" },
  { value: "pix", label: "PIX" },
  { value: "dinheiro", label: "Dinheiro" },
  { value: "transferencia", label: "Transferência" },
  { value: "misto", label: "Misto" },
];

const PAYMENT_FORMS = [
  { value: "pix", label: "PIX" },
  { value: "cartao", label: "Cartão Crédito" },
  { value: "cartao_debito", label: "Cartão Débito" },
  { value: "dinheiro", label: "Dinheiro" },
  { value: "boleto", label: "Boleto" },
  { value: "transferencia", label: "Transferência" },
];

// Event types are now loaded dynamically from company settings

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

const EMPTY_BIRTHDAY_CHILD: BirthdayChild = { name: "", age: "", birthdate: "" };

const getMeaningfulBirthdayChildren = (children?: BirthdayChild[] | null): BirthdayChild[] => {
  if (!Array.isArray(children)) return [];
  return children.filter((child) => [child.name, child.age, child.birthdate].some((value) => value?.trim()));
};

const buildClientDataEventFields = (
  clientData: any,
  fallback?: Partial<EventFormData>,
): Pick<EventFormData, "birthday_children" | "child_name" | "child_age" | "child_birthdate"> => {
  const clientChildren = getMeaningfulBirthdayChildren(clientData?.birthday_children);
  const fallbackChildren = getMeaningfulBirthdayChildren(fallback?.birthday_children);
  const effectiveChildren = clientChildren.length > 0 ? clientChildren : fallbackChildren;
  const firstChild = effectiveChildren[0];

  return {
    birthday_children: effectiveChildren.length > 0 ? effectiveChildren : [EMPTY_BIRTHDAY_CHILD],
    child_name: firstChild?.name || fallback?.child_name || null,
    child_age: firstChild?.age || fallback?.child_age || null,
    child_birthdate: firstChild?.birthdate || fallback?.child_birthdate || null,
  };
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

type EventFormDraftSnapshot = {
  form: EventFormData;
  payment: PaymentDetails;
  dateDay: string;
  dateMonth: string;
  dateYear: string;
  pricingMode: 'fixed' | 'per_person';
  adultCount: number | null;
  childCount: number | null;
  pricePerAdult: number | null;
  pricePerChild: number | null;
};

interface EventFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: EventFormData) => Promise<string | void>;
  initialData?: EventFormData | null;
  units: Array<{ name: string }>;
  userId?: string;
  draftStorageKey?: string;
}

const EMPTY_PAYMENT: PaymentDetails = {
  entrada_valor: null,
  entrada_forma: "",
  entrada_data: null,
  entrada_parcelas: null,
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
  internal_notes: "",
  event_optionals: [],
  discount_type: null,
  discount_value: null,
  discount_base: 'total',
  discount_reason: null,
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

export function EventFormDialog({ open, onOpenChange, onSubmit, initialData, units, userId, draftStorageKey }: EventFormDialogProps) {
  const [form, setForm] = useState<EventFormData>(EMPTY);
  const [payment, setPayment] = useState<PaymentDetails>(EMPTY_PAYMENT);
  const [saving, setSaving] = useState(false);
  const { currentCompany } = useCompany();

  // Per-person pricing state
  const [pricingMode, setPricingMode] = useState<'fixed' | 'per_person'>('fixed');
  const [adultCount, setAdultCount] = useState<number | null>(null);
  const [childCount, setChildCount] = useState<number | null>(null);
  const [pricePerAdult, setPricePerAdult] = useState<number | null>(null);
  const [pricePerChild, setPricePerChild] = useState<number | null>(null);

  // Dynamic event types from company settings, with fallback to defaults
  const EVENT_TYPES = useMemo(() => {
    const s = (currentCompany?.settings || {}) as Record<string, unknown>;
    if (Array.isArray(s.event_types) && s.event_types.length > 0) {
      return s.event_types as Array<{ value: string; label: string }>;
    }
    return DEFAULT_EVENT_TYPES;
  }, [currentCompany?.settings]);

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
  const [catalogOptionals, setCatalogOptionals] = useState<Array<{ id: string; name: string; description: string | null; value: number | null; valor_por_pessoa: number | null }>>([]);
  
  const [cardFees, setCardFees] = useState<Array<{ id: string; operator_name: string; antecipado: boolean; [k: string]: any }>>([]);
  const [selectedOperatorId, setSelectedOperatorId] = useState<string | null>(null);

  const [fechamentoDate, setFechamentoDate] = useState<Date | undefined>(undefined);

  // Client data request state
  const [clientRequest, setClientRequest] = useState<ClientDataRequest | null>(null);
  const [loadingClientRequest, setLoadingClientRequest] = useState(false);
  const [generatingLink, setGeneratingLink] = useState(false);
  const [resolvedMessage, setResolvedMessage] = useState<string | null>(null);
  const [sendingClientLink, setSendingClientLink] = useState(false);
  const [showManualForm, setShowManualForm] = useState(false);
  const [editingClientData, setEditingClientData] = useState(false);
  const [persistedEventId, setPersistedEventId] = useState<string | null>(initialData?.id ?? null);
  const [contractModels, setContractModels] = useState<Array<{ id: string; nome_modelo: string; versao: number; tipo_evento: string }>>([]);
  const [selectedContractModelId, setSelectedContractModelId] = useState<string | null>(null);
  const [contractDialogOpen, setContractDialogOpen] = useState(false);
  const [generatedContracts, setGeneratedContracts] = useState<Array<{ id: string; nome_documento: string; status: string; conteudo_renderizado: string; lead_id: string | null; event_id: string | null; template_id: string | null; created_at: string }>>([]);
  const [sendingContractWA, setSendingContractWA] = useState<string | null>(null);
  const [sendingContractSign, setSendingContractSign] = useState<string | null>(null);
  const [sentWA, setSentWA] = useState<Set<string>>(new Set());
  const [sentSign, setSentSign] = useState<Set<string>>(new Set());

  const fetchGeneratedContracts = useCallback(async () => {
    const eid = persistedEventId || form.id || initialData?.id;
    if (!eid || !currentCompany?.id) {
      setGeneratedContracts([]);
      setSentWA(new Set());
      setSentSign(new Set());
      return;
    }

    const { data, error } = await (supabase as any)
      .from("generated_contracts")
      .select("id, nome_documento, status, conteudo_renderizado, lead_id, event_id, template_id, created_at")
      .eq("event_id", eid)
      .eq("company_id", currentCompany.id)
      .neq("status", "cancelado")
      .order("created_at", { ascending: false })
      .limit(5);
    console.log("[contracts] fetch for event", eid, "found", data?.length ?? 0, error);

    const contracts = data || [];
    setGeneratedContracts(contracts);

    const contractIds = contracts.map((contract) => contract.id).filter(Boolean);
    if (contractIds.length === 0) {
      setSentWA(new Set());
      setSentSign(new Set());
      return;
    }

    const { data: logs } = await (supabase as any)
      .from("contract_audit_logs")
      .select("contract_id, action")
      .eq("company_id", currentCompany.id)
      .in("contract_id", contractIds)
      .in("action", ["contract_sent_whatsapp", "contract_sent_for_signature"]);

    const waIds = new Set<string>();
    const signIds = new Set<string>();

    for (const log of logs || []) {
      if (log.action === "contract_sent_whatsapp" && log.contract_id) waIds.add(log.contract_id);
      if (log.action === "contract_sent_for_signature" && log.contract_id) signIds.add(log.contract_id);
    }

    setSentWA(waIds);
    setSentSign(signIds);
  }, [persistedEventId, form.id, initialData?.id, currentCompany?.id]);

  useEffect(() => { if (open) fetchGeneratedContracts(); }, [open, fetchGeneratedContracts]);

  const handleContractSendWA = async (contract: typeof generatedContracts[0]) => {
    if (!currentCompany?.id || !userId) return;
    let leadId = contract.lead_id;
    if (!leadId && contract.event_id) {
      const { data: ev } = await supabase.from("company_events").select("lead_id").eq("id", contract.event_id).single();
      leadId = ev?.lead_id || null;
    }
    if (!leadId) {
      toast({ title: "Lead não vinculado", description: "Este contrato não possui um lead associado.", variant: "destructive" });
      return;
    }
    setSendingContractWA(contract.id);
    const result = await sendContractViaWhatsApp(currentCompany.id, leadId, contract.conteudo_renderizado, contract.nome_documento);
    if (result.success) {
      if (!["aguardando_assinatura", "assinado"].includes(contract.status)) {
        await supabase.from("generated_contracts").update({ status: "enviado" }).eq("id", contract.id);
      }
      setSentWA(prev => new Set(prev).add(contract.id));
      toast({ title: "Contrato enviado via WhatsApp ✅" });
      await logContractAction(currentCompany.id, contract.id, contract.template_id, "contract_sent_whatsapp", userId, { lead_id: leadId });
    } else {
      toast({ title: "Erro ao enviar", description: result.error, variant: "destructive" });
    }
    setSendingContractWA(null);
  };

  const handleContractSendSign = async (contract: typeof generatedContracts[0]) => {
    if (!currentCompany?.id || !userId) return;
    let leadId = contract.lead_id;
    if (!leadId && contract.event_id) {
      const { data: ev } = await supabase.from("company_events").select("lead_id").eq("id", contract.event_id).single();
      leadId = ev?.lead_id || null;
    }
    if (!leadId) {
      toast({ title: "Lead não vinculado", description: "Este contrato não possui um lead associado.", variant: "destructive" });
      return;
    }
    const { data: lead } = await supabase.from("campaign_leads").select("name, whatsapp").eq("id", leadId).single();
    if (!lead?.whatsapp) {
      toast({ title: "Lead sem WhatsApp cadastrado", variant: "destructive" });
      return;
    }
    setSendingContractSign(contract.id);
    try {
      const token = crypto.randomUUID();
      const { error: sigErr } = await (supabase as any).from("contract_signatures").insert({
        contract_id: contract.id,
        company_id: currentCompany.id,
        signer_name: lead.name,
        signer_phone: lead.whatsapp,
        token,
      });
      if (sigErr) {
        toast({ title: "Erro ao criar assinatura", description: sigErr.message, variant: "destructive" });
        return;
      }
      const signUrl = `${window.location.origin}/assinar-contrato/${token}`;
      const { data: instances } = await (supabase as any)
        .from("wapi_instances")
        .select("instance_id, instance_token")
        .eq("company_id", currentCompany.id)
        .eq("status", "connected")
        .limit(1);
      const instance = instances?.[0];
      let signatureSent = false;
      if (instance) {
        const phone = lead.whatsapp.replace(/\D/g, "");
        const template = await getContractSendTemplate(currentCompany.id);
        const msg = resolveContractSendMessage(template, {
          nome: lead.name,
          link: signUrl,
          nome_contrato: contract.nome_documento,
          empresa: currentCompany.name,
        });
        const { data: sendResult, error: sendErr } = await supabase.functions.invoke("wapi-send", {
          body: { action: "send-text", instanceId: instance.instance_id, instanceToken: instance.instance_token, phone, message: msg },
        });
        const sendPayload = sendResult as { success?: boolean; error?: string } | null;
        if (sendErr || sendPayload?.success === false) {
          toast({
            title: "Erro ao enviar link",
            description: sendErr?.message || sendPayload?.error || "Falha no envio pelo WhatsApp.",
            variant: "destructive",
          });
          await (supabase as any).from("contract_signatures").delete().eq("token", token);
        } else {
          signatureSent = true;
          await (supabase as any).from("generated_contracts").update({ status: "aguardando_assinatura", signature_token: token }).eq("id", contract.id);
          setSentSign(prev => new Set(prev).add(contract.id));
          toast({ title: "Link de assinatura enviado via WhatsApp ✅" });
        }
      } else {
        await navigator.clipboard.writeText(signUrl);
        toast({ title: "Link copiado!", description: "Nenhuma instância WhatsApp conectada. O link foi copiado." });
      }
      if (signatureSent) {
        await logContractAction(currentCompany.id, contract.id, contract.template_id, "contract_sent_for_signature", userId, { lead_id: leadId });
      }
      fetchGeneratedContracts();
    } finally {
      setSendingContractSign(null);
    }
  };

  // Conflict detection state
  const [conflictEvent, setConflictEvent] = useState<{ title: string; start_time: string; end_time: string; unit: string } | null>(null);
  const [_checkingConflict, setCheckingConflict] = useState(false);
  const conflictTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const draftHydratedRef = useRef(false);

  const syncClientDataIntoForm = useCallback((clientData: any) => {
    setForm((prev) => ({
      ...prev,
      ...buildClientDataEventFields(clientData, prev),
    }));
  }, []);

  const handleClientDataSaved = useCallback((req: ClientDataRequest, mode: "manual" | "editing" = "manual") => {
    setClientRequest(req);
    syncClientDataIntoForm(req.client_data);

    if (mode === "manual") {
      setShowManualForm(false);
      setEditingClientData(true);
      return;
    }

    setEditingClientData(true);
  }, [syncClientDataIntoForm]);

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
    if (!open) {
      draftHydratedRef.current = false;
      return;
    }

    const data = initialData || EMPTY;
    let children: BirthdayChild[] = [];
    if (data.birthday_children && Array.isArray(data.birthday_children) && data.birthday_children.length > 0) {
      children = data.birthday_children;
    } else if (data.child_name) {
      children = [{ name: data.child_name || "", age: data.child_age || "", birthdate: data.child_birthdate || "" }];
    } else {
      children = [{ name: "", age: "", birthdate: "" }];
    }

    const pd = (data.payment_details || {}) as any;
    const normalizedForm: EventFormData = {
      ...data,
      start_time: normalizeTimeValue(data.start_time),
      end_time: normalizeTimeValue(data.end_time),
      birthday_children: children,
      event_optionals: Array.isArray(data.event_optionals) ? data.event_optionals : [],
      discount_type: pd.discount_type || data.discount_type || null,
      discount_value: pd.discount_value ?? data.discount_value ?? null,
      discount_base: pd.discount_base || data.discount_base || 'total',
      discount_reason: pd.discount_reason || data.discount_reason || null,
    };

    const normalizedPayment = {
      ...EMPTY_PAYMENT,
      ...((data.payment_details as PaymentDetails) || EMPTY_PAYMENT),
    };

    if (normalizedPayment.parcelas && normalizedPayment.parcelas >= 1 && normalizedPayment.saldo_valor && normalizedPayment.saldo_valor > 0) {
      const hasEmptyValues = (normalizedPayment.parcelas_details || []).some(d => d.valor == null);
      if (hasEmptyValues || !normalizedPayment.parcelas_details?.length) {
        const perParcela = Math.round((normalizedPayment.saldo_valor / normalizedPayment.parcelas) * 100) / 100;
        normalizedPayment.parcelas_details = Array.from({ length: normalizedPayment.parcelas }, (_, i) => ({
          valor: perParcela,
          vencimento: normalizedPayment.parcelas_details?.[i]?.vencimento || "",
        }));
      }
    }

    let nextForm = normalizedForm;
    let nextPayment = normalizedPayment;
    let nextPricingMode: 'fixed' | 'per_person' = pd.pricing_mode === 'per_person' ? 'per_person' : 'fixed';
    let nextAdultCount = pd.adult_count ?? null;
    let nextChildCount = pd.child_count ?? null;
    let nextPricePerAdult = pd.price_per_adult ?? null;
    let nextPricePerChild = pd.price_per_child ?? null;
    let nextDateDay = "";
    let nextDateMonth = "";
    let nextDateYear = "";

    if (normalizedForm.event_date) {
      const [y, m, d] = normalizedForm.event_date.split("-");
      nextDateYear = y || "";
      nextDateMonth = m || "";
      nextDateDay = d || "";
    }

    if (draftStorageKey) {
      try {
        const rawDraft = sessionStorage.getItem(draftStorageKey);
        if (rawDraft) {
          const draft = JSON.parse(rawDraft) as Partial<EventFormDraftSnapshot>;
          if (draft.form) {
            nextForm = {
              ...EMPTY,
              ...draft.form,
              birthday_children: Array.isArray(draft.form.birthday_children) && draft.form.birthday_children.length > 0
                ? draft.form.birthday_children
                : [{ name: "", age: "", birthdate: "" }],
              event_optionals: Array.isArray(draft.form.event_optionals) ? draft.form.event_optionals : [],
            };
            nextPayment = {
              ...EMPTY_PAYMENT,
              ...(draft.payment || {}),
            };
            nextPricingMode = draft.pricingMode === 'per_person' ? 'per_person' : 'fixed';
            nextAdultCount = draft.adultCount ?? null;
            nextChildCount = draft.childCount ?? null;
            nextPricePerAdult = draft.pricePerAdult ?? null;
            nextPricePerChild = draft.pricePerChild ?? null;

            if (draft.dateDay || draft.dateMonth || draft.dateYear) {
              nextDateDay = draft.dateDay || "";
              nextDateMonth = draft.dateMonth || "";
              nextDateYear = draft.dateYear || "";
            } else if (nextForm.event_date) {
              const [y, m, d] = nextForm.event_date.split("-");
              nextDateYear = y || "";
              nextDateMonth = m || "";
              nextDateDay = d || "";
            }
          }
        }
      } catch {
        // Ignore invalid persisted draft and continue with server/base data.
      }
    }

    setForm(nextForm);
    setPayment(nextPayment);
    setPricingMode(nextPricingMode);
    setAdultCount(nextAdultCount);
    setChildCount(nextChildCount);
    setPricePerAdult(nextPricePerAdult);
    setPricePerChild(nextPricePerChild);
    setDateDay(nextDateDay);
    setDateMonth(nextDateMonth);
    setDateYear(nextDateYear);
    setLeadSearch("");
    setShowLeadDropdown(false);
    setSelectedTemplate("");
    setFechamentoDate(nextForm.data_fechamento_venda ? new Date(nextForm.data_fechamento_venda + "T12:00:00") : undefined);
    setClientRequest(null);
    setPersistedEventId(nextForm.id ?? null);
    setShowManualForm(false);
    setEditingClientData(false);
    draftHydratedRef.current = true;
  }, [open, initialData, draftStorageKey]);

  useEffect(() => {
    if (!open || !draftStorageKey || !draftHydratedRef.current) return;

    try {
      const snapshot: EventFormDraftSnapshot = {
        form,
        payment,
        dateDay,
        dateMonth,
        dateYear,
        pricingMode,
        adultCount,
        childCount,
        pricePerAdult,
        pricePerChild,
      };
      sessionStorage.setItem(draftStorageKey, JSON.stringify(snapshot));
    } catch {
      // Ignore storage failures.
    }
  }, [open, draftStorageKey, form, payment, dateDay, dateMonth, dateYear, pricingMode, adultCount, childCount, pricePerAdult, pricePerChild]);

  // Fetch client data request for existing events
  const eventId = persistedEventId || form.id || initialData?.id;
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
        const req = (data && data.length > 0) ? data[0] as ClientDataRequest : null;
        setClientRequest(req);
        if (req?.status === "completed" || req?.status === "reviewed") {
          syncClientDataIntoForm(req.client_data);
        }
        setLoadingClientRequest(false);
      });
  }, [open, eventId, currentCompany?.id, syncClientDataIntoForm]);

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
    supabase
      .from("company_optionals" as any)
      .select("id, name, description, value, valor_por_pessoa")
      .eq("company_id", currentCompany.id)
      .eq("is_active", true)
      .order("sort_order")
      .then(({ data }) => {
        setCatalogOptionals((data || []).map((o: any) => ({ id: o.id, name: o.name, description: o.description, value: o.value != null ? Number(o.value) : null, valor_por_pessoa: o.valor_por_pessoa != null ? Number(o.valor_por_pessoa) : null })));
      });
    supabase
      .from("company_card_fees" as any)
      .select("*")
      .eq("company_id", currentCompany.id)
      .eq("is_active", true)
      .order("operator_name")
      .then(({ data }) => {
        const fees = (data || []) as any[];
        setCardFees(fees);
        if (fees.length === 1 && !selectedOperatorId) {
          setSelectedOperatorId(fees[0].id);
        }
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

  // Auto-calculate total_value and guest_count in per_person mode
  useEffect(() => {
    if (pricingMode !== 'per_person') return;
    const adults = adultCount || 0;
    const children = childCount || 0;
    const adultVal = pricePerAdult || 0;
    const childVal = pricePerChild || 0;
    const calculated = (adults * adultVal) + (children * childVal);
    const totalGuests = adults + children;
    setForm(prev => ({
      ...prev,
      total_value: calculated > 0 ? calculated : null,
      guest_count: totalGuests > 0 ? totalGuests : prev.guest_count,
    }));
  }, [pricingMode, adultCount, childCount, pricePerAdult, pricePerChild]);

  // Computed optionals subtotal and grand total
  const optionalsSubtotal = useMemo(() => 
    (form.event_optionals || []).reduce((sum, o) => sum + (o.value || 0), 0),
    [form.event_optionals]
  );
  const discountAmount = useMemo(() => {
    if (!form.discount_type || !form.discount_value || form.discount_value <= 0) return 0;
    const base = form.discount_base === 'pacote' ? (form.total_value || 0) : ((form.total_value || 0) + optionalsSubtotal);
    if (form.discount_type === 'percentage') {
      return Math.round(base * form.discount_value / 100 * 100) / 100;
    }
    return Math.min(form.discount_value, base);
  }, [form.discount_type, form.discount_value, form.discount_base, form.total_value, optionalsSubtotal]);

  const grandTotal = Math.max(0, (form.total_value || 0) + optionalsSubtotal - discountAmount);

  const [showDiscount, setShowDiscount] = useState(false);

  // Show discount section if there's already a discount value (editing)
  useEffect(() => {
    if (open && form.discount_value && form.discount_value > 0) {
      setShowDiscount(true);
    }
  }, [open, form.discount_value]);

  // Update payment saldo when optionals or base value changes
  useEffect(() => {
    const entrada = payment.entrada_valor ?? 0;
    const novoSaldo = Math.max(0, grandTotal - entrada);
    setPayment(prev => {
      if (prev.saldo_valor === novoSaldo) return prev;
      return { ...prev, saldo_valor: novoSaldo };
    });
  }, [grandTotal, payment.entrada_valor]);

  // Recalculate per-person optionals when guest_count changes
  useEffect(() => {
    const optionals = form.event_optionals || [];
    const hasPerPerson = optionals.some(o => o.valor_por_pessoa && o.valor_por_pessoa > 0);
    if (!hasPerPerson) return;
    const guests = form.guest_count || 0;
    const updated = optionals.map(o => {
      if (!o.valor_por_pessoa || o.valor_por_pessoa <= 0) return o;
      const catalog = catalogOptionals.find(co => co.name === o.name);
      const unitPrice = o.unit_price ?? catalog?.value ?? 0;
      const qty = o.quantity || 1;
      return { ...o, value: (unitPrice * qty) + (o.valor_por_pessoa * guests * qty), unit_price: unitPrice };
    });
    setForm(prev => ({ ...prev, event_optionals: updated }));
  }, [form.guest_count]);

  // Price tier auto-calculation state
  const [priceTiers, setPriceTiers] = useState<Array<{ guest_count: number; day_type: string; price: number }>>([]);
  const [suggestedPrice, setSuggestedPrice] = useState<{ price: number; dayTypeLabel: string; guestTier: number } | null>(null);

  // Load price tiers when package changes
  useEffect(() => {
    if (!form.package_name || packages.length === 0) { setPriceTiers([]); setSuggestedPrice(null); return; }
    const pkg = packages.find(p => p.name === form.package_name);
    if (!pkg) { setPriceTiers([]); setSuggestedPrice(null); return; }
    supabase
      .from("package_price_tiers" as any)
      .select("guest_count, day_type, price")
      .eq("package_id", pkg.id)
      .then(({ data }) => {
        setPriceTiers(((data || []) as unknown as Array<{ guest_count: number; day_type: string; price: number }>));
      });
  }, [form.package_name, packages]);

  // Auto-calculate suggested price from tiers
  useEffect(() => {
    if (priceTiers.length === 0 || !form.guest_count || !form.event_date) {
      setSuggestedPrice(null);
      return;
    }
    const s = (currentCompany?.settings || {}) as Record<string, unknown>;
    const dayTypesConf = (s.day_type_config as Array<{ key: string; label: string }>) || DEFAULT_DAY_TYPES;
    const guestTiersConf = (s.guest_tiers as number[]) || DEFAULT_GUEST_TIERS;
    const [y, mo, da] = form.event_date.split("-").map(Number);
    const eventDate = new Date(y, mo - 1, da);
    const dayType = getDayType(eventDate, dayTypesConf);
    const matchedTier = findMatchingTier(form.guest_count, guestTiersConf);
    if (!matchedTier) { setSuggestedPrice(null); return; }
    const tier = priceTiers.find(t => t.guest_count === matchedTier && t.day_type === dayType);
    if (tier && tier.price > 0) {
      setSuggestedPrice({ price: tier.price, dayTypeLabel: getDayTypeLabel(dayType, dayTypesConf), guestTier: matchedTier });
      if (form.total_value == null) {
        setForm(prev => ({ ...prev, total_value: tier.price }));
      }
    } else {
      setSuggestedPrice(null);
    }
  }, [priceTiers, form.guest_count, form.event_date]);

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
      .from("company_sellers")
      .select("id, name")
      .eq("company_id", currentCompany.id)
      .eq("is_active", true)
      .order("name")
      .then(({ data }) => {
        setCompanyUsers(
          (data || []).map((d: any) => ({ id: d.id, name: d.name }))
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
      const paymentWithDiscount = {
        ...payment,
        discount_type: form.discount_type, discount_value: form.discount_value,
        discount_base: form.discount_base, discount_reason: form.discount_reason,
        // Per-person pricing data
        pricing_mode: pricingMode,
        adult_count: pricingMode === 'per_person' ? adultCount : null,
        child_count: pricingMode === 'per_person' ? childCount : null,
        price_per_adult: pricingMode === 'per_person' ? pricePerAdult : null,
        price_per_child: pricingMode === 'per_person' ? pricePerChild : null,
      };
      // Protect against overwriting valid contractor data with empty local state
      let finalForm = { ...form, id: eventId || form.id };
      if (clientRequest && (clientRequest.status === "completed" || clientRequest.status === "reviewed")) {
        if (getMeaningfulBirthdayChildren(finalForm.birthday_children).length === 0) {
          finalForm = {
            ...finalForm,
            ...buildClientDataEventFields(clientRequest.client_data, finalForm),
          };
        }
      }
      const submitData = { ...finalForm, total_value: grandTotal || null, payment_details: paymentWithDiscount };
      const resultId = await onSubmit(submitData);
      if (resultId) {
        setPersistedEventId(resultId);
        setForm(prev => ({ ...prev, id: prev.id || resultId }));
        // Auto-create pending payment for additional value (e.g. optionals added post-contract)
        if (isEdit && grandTotal > 0 && currentCompany?.id) {
          try {
            const { data: existingPayments } = await supabase
              .from('event_payments')
              .select('amount')
              .eq('event_id', resultId);
            const totalPayments = (existingPayments || []).reduce((s: number, p: any) => s + Number(p.amount), 0);
            const diff = grandTotal - totalPayments;
            if (diff > 0.01) {
              await supabase.from('event_payments').insert({
                event_id: resultId,
                company_id: currentCompany.id,
                type: 'parcela',
                amount: diff,
                due_date: new Date().toISOString().split('T')[0],
                status: 'pending',
                payment_method: null,
                notes: `Adicional - Ajuste pós-contrato (R$ ${diff.toFixed(2)})`,
              });
              await supabase.from('event_financial_timeline').insert({
                event_id: resultId,
                company_id: currentCompany.id,
                type: 'payment_created',
                description: `Parcela de R$ ${diff.toFixed(2)} criada automaticamente (adicional)`,
              });
            }
          } catch (err) {
            console.error('[EventFormDialog] auto-payment delta error:', err);
          }
        }
      }
      if (!keepOpen) {
        if (draftStorageKey) {
          try {
            sessionStorage.removeItem(draftStorageKey);
          } catch {
            // Ignore storage failures.
          }
        }
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

    return resolveFormAutomationMessage(template, {
      nome: leadName,
      primeiro_nome: firstName,
      empresa: companyName,
      buffet: companyName,
      nome_buffet: companyName,
      data_evento: eventDate,
      data_festa: eventDate,
      tipo_festa: eventType,
      pacote: packageName,
      link,
      link_formulario_contrato: link,
    });
  };

  const buildClientLink = (token: string) => `${window.location.origin}/dados-contratante/${token}`;

  const generateClientLink = async (forcedEventId?: string, options?: { skipClipboard?: boolean }): Promise<ClientDataRequest | null> => {
    const resolvedEventId = forcedEventId || eventId;
    if (!resolvedEventId || !currentCompany?.id) {
      toast({ title: "Salve a festa primeiro antes de solicitar dados do contratante", variant: "destructive" });
      return null;
    }
    setGeneratingLink(true);
    try {
      const token = crypto.randomUUID().replace(/-/g, "").slice(0, 24);
      const { data, error } = await supabase
        .from("client_data_requests")
        .insert({
          company_id: currentCompany.id,
          event_id: resolvedEventId,
          lead_id: form.lead_id || null,
          token,
          status: "sent",
          sent_at: new Date().toISOString(),
        })
        .select("id, token, status, client_data, completed_at")
        .single();
      if (error) throw error;
      setClientRequest(data as ClientDataRequest);

      const link = buildClientLink(token);
      const template = await getFormAutomationTemplate(currentCompany.id, "contrato");
      const resolved = resolveContractMessage(template, link);
      setResolvedMessage(resolved);

      if (!options?.skipClipboard) {
        navigator.clipboard.writeText(resolved);
        toast({ title: "Link gerado e mensagem copiada!", description: "A mensagem configurada em Automações foi copiada para a área de transferência." });
      }

      return data as ClientDataRequest;
    } catch (err: any) {
      toast({ title: "Erro ao gerar link", description: err.message, variant: "destructive" });
      return null;
    } finally {
      setGeneratingLink(false);
    }
  };

  const getClientLink = () => {
    if (!clientRequest?.token) return "";
    return buildClientLink(clientRequest.token);
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

  const sendClientLinkToLead = async (tokenOverride?: string, leadIdOverride?: string | null) => {
    const effectiveLeadId = leadIdOverride ?? form.lead_id;
    const effectiveToken = tokenOverride ?? clientRequest?.token;
    if (!effectiveLeadId || !effectiveToken) return false;

    setSendingClientLink(true);
    try {
      // Get lead phone
      const { data: lead } = await supabase
        .from("campaign_leads")
        .select("whatsapp")
        .eq("id", effectiveLeadId)
        .single();
      if (!lead?.whatsapp) {
        toast({ title: "Lead sem WhatsApp cadastrado", variant: "destructive" });
        return false;
      }

      // Get connected instance — prioritize same unit as event
      const { data: allInstances } = await supabase
        .from("wapi_instances")
        .select("instance_id, unit, status")
        .eq("company_id", currentCompany?.id)
        .eq("status", "connected");

      if (!allInstances || allInstances.length === 0) {
        toast({ title: "Nenhuma instância WhatsApp conectada", description: "Verifique a conexão em Configurações > WhatsApp.", variant: "destructive" });
        return false;
      }

      // Prefer instance matching event unit, fallback to any connected
      const unitMatch = form.unit ? allInstances.find(i => i.unit === form.unit) : null;
      const instance = unitMatch || allInstances[0];

      const instanceUnitLabel = (instance as any).unit || "padrão";
      toast({ title: `Enviando via ${instanceUnitLabel}...` });

      const link = buildClientLink(effectiveToken);

      let message = "";
      const template = await getFormAutomationTemplate(currentCompany.id, "contrato");
      message = resolveContractMessage(template, link);
      setResolvedMessage(message);

      const { error } = await supabase.functions.invoke("wapi-send", {
        body: {
          action: "send-text",
          phone: lead.whatsapp,
          message,
          instanceId: instance.instance_id,
        },
      });
      if (error) throw error;
      toast({ title: `✅ Link enviado com sucesso via ${instanceUnitLabel}!` });
      return true;
    } catch (err: any) {
      toast({ title: "Erro ao enviar link", description: err.message, variant: "destructive" });
      return false;
    } finally {
      setSendingClientLink(false);
    }
  };

  const handleInitialClientLinkRequest = async () => {
    const savedId = !isEdit ? await autoSaveForClientData() : eventId;
    if (!savedId) return;

    const createdRequest = await generateClientLink(savedId, { skipClipboard: !!form.lead_id });
    if (!createdRequest) return;

    if (form.lead_id) {
      await sendClientLinkToLead(createdRequest.token, form.lead_id);
    }
  };

  const isEdit = !!eventId;

  // Auto-save helper for contractor data section (avoids requiring manual save first)
  const autoSaveForClientData = async (): Promise<string | null> => {
    const missing: string[] = [];
    if (!form.title) missing.push("Nome do cliente");
    if (!form.event_date) missing.push("Data da festa");
    if (missing.length > 0) {
      toast({
        title: "⚠️ Campos obrigatórios",
        description: `Preencha: ${missing.join(" e ")} antes de continuar.`,
      });
      return null;
    }
    setSaving(true);
    try {
      const paymentWithDiscount = {
        ...payment,
        discount_type: form.discount_type, discount_value: form.discount_value,
        discount_base: form.discount_base, discount_reason: form.discount_reason,
        pricing_mode: pricingMode,
        adult_count: pricingMode === 'per_person' ? adultCount : null,
        child_count: pricingMode === 'per_person' ? childCount : null,
        price_per_adult: pricingMode === 'per_person' ? pricePerAdult : null,
        price_per_child: pricingMode === 'per_person' ? pricePerChild : null,
      };
      let finalForm = { ...form, id: eventId || form.id };
      if (clientRequest && (clientRequest.status === "completed" || clientRequest.status === "reviewed")) {
        finalForm = {
          ...finalForm,
          ...buildClientDataEventFields(clientRequest.client_data, finalForm),
        };
      }
      const submitData = { ...finalForm, total_value: grandTotal || null, payment_details: paymentWithDiscount };
      const resultId = await onSubmit(submitData);
      if (resultId) {
        setPersistedEventId(resultId);
        setForm(prev => ({ ...prev, id: prev.id || resultId }));
        toast({ title: "Festa salva automaticamente!" });
        return resultId;
      }
      return null;
    } catch {
      return null;
    } finally {
      setSaving(false);
    }
  };

  const clientData = clientRequest?.client_data as Record<string, string> | null;

  const leadPhone = useMemo(() => {
    if (!form.lead_id) return null;
    return closedLeads.find(l => l.id === form.lead_id)?.whatsapp || null;
  }, [form.lead_id, closedLeads]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!left-2 !right-2 !w-auto !translate-x-0 sm:!left-1/2 sm:!right-auto sm:!w-[calc(100vw-2rem)] sm:!-translate-x-1/2 max-w-[720px] max-h-[90vh] p-0 gap-0 overflow-hidden rounded-2xl [&>button]:top-4 [&>button]:right-4 sm:[&>button]:top-5 sm:[&>button]:right-5">
      <Tabs defaultValue="evento" className="flex h-full min-w-0 flex-col overflow-hidden">
        <DialogHeader className="border-b-0 bg-muted/30 px-4 pt-6 pb-0 sm:px-7 sm:pt-7">
          <DialogTitle className="text-lg font-bold tracking-tight">{isEdit ? "Editar Festa" : "Nova Festa"}</DialogTitle>
          <p className="text-[13px] text-muted-foreground mt-1 mb-3">Preencha os dados do evento e contratação</p>
          <TabsList className="grid w-full min-w-0 grid-cols-2">
            <TabsTrigger value="evento" className="min-w-0">Evento</TabsTrigger>
            <TabsTrigger value="complementar" className="min-w-0">Complementar</TabsTrigger>
          </TabsList>
        </DialogHeader>

        <TabsContent value="evento" className="mt-0">
        <form id="event-form" onSubmit={handleSubmit} className="space-y-5 overflow-y-auto overflow-x-hidden px-4 py-5 sm:px-7 sm:py-6" style={{ maxHeight: "calc(90vh - 220px)" }}>
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
          <div className="rounded-xl border border-border/40 bg-card p-4 shadow-sm sm:p-5">
            <SectionHeader icon={User} label="Dados do Cliente" />
            <div className="space-y-5">
              <div className="space-y-2.5">
                <Label className="text-sm font-medium text-foreground/70">Nome do cliente *</Label>
                <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
              </div>
              <div className="relative space-y-2.5">
                <Label className="text-sm font-medium text-foreground/70">Vincular Lead do CRM</Label>
                {form.lead_id ? (
                  <div className="flex min-w-0 items-center gap-2 rounded-md border border-border bg-accent/30 p-2">
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
                          <button key={lead.id} type="button" className="flex w-full flex-col items-start gap-1 px-3 py-2 text-left text-sm transition-colors hover:bg-accent sm:flex-row sm:items-center sm:gap-2" onClick={() => { setForm({ ...form, lead_id: lead.id, lead_name: lead.name, title: form.title || lead.name }); setLeadSearch(""); setShowLeadDropdown(false); }}>
                            <span className="font-medium sm:flex-1">{lead.name}</span>
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
          <div className="rounded-xl border border-border/40 bg-card p-4 shadow-sm sm:p-5">
            <SectionHeader icon={CalendarDays} label="Data e Horário" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-y-5">
              <div className="space-y-2.5 md:pr-6">
                <Label className="text-sm font-medium text-foreground/70">Data da festa *</Label>
                <div className="flex min-w-0 gap-2">
                  <div className="min-w-0 flex-1">
                    <Select value={dateDay} onValueChange={setDateDay}>
                      <SelectTrigger><SelectValue placeholder="Dia" /></SelectTrigger>
                      <SelectContent>{DAY_OPTIONS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="min-w-0 flex-[2]">
                    <Select value={dateMonth} onValueChange={setDateMonth}>
                      <SelectTrigger><SelectValue placeholder="Mês" /></SelectTrigger>
                      <SelectContent>{MONTH_OPTIONS.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="min-w-0 flex-[1.3]">
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
          <div className="rounded-xl border border-border/40 bg-card p-4 shadow-sm sm:p-5">
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
                <Input
                  type="number"
                  value={form.guest_count ?? ""}
                  onChange={(e) => setForm({ ...form, guest_count: e.target.value ? Number(e.target.value) : null })}
                  disabled={pricingMode === 'per_person'}
                  className={pricingMode === 'per_person' ? 'opacity-60' : ''}
                />
                {pricingMode === 'per_person' && (
                  <p className="text-[10px] text-muted-foreground">Auto-calculado: {(adultCount || 0)} adultos + {(childCount || 0)} crianças</p>
                )}
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
                    if (selectedPkg?.preco_separado) {
                      setPricingMode('per_person');
                      if (selectedPkg.valor_pessoa_adicional_adulto != null) setPricePerAdult(selectedPkg.valor_pessoa_adicional_adulto);
                      if (selectedPkg.valor_pessoa_adicional_crianca != null) setPricePerChild(selectedPkg.valor_pessoa_adicional_crianca);
                    } else if (!pkgName) {
                      setPricingMode('fixed');
                    }
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

              {/* Per-person pricing toggle */}
              <div className="md:col-span-2 space-y-3">
                <div className="flex items-center gap-3">
                  <Switch
                    checked={pricingMode === 'per_person'}
                    onCheckedChange={(checked) => {
                      const mode = checked ? 'per_person' : 'fixed';
                      setPricingMode(mode);
                      if (checked) {
                        const pkg = packages.find(p => p.name === form.package_name);
                        if (pkg?.preco_separado) {
                          if (pkg.valor_pessoa_adicional_adulto != null && pricePerAdult == null) setPricePerAdult(pkg.valor_pessoa_adicional_adulto);
                          if (pkg.valor_pessoa_adicional_crianca != null && pricePerChild == null) setPricePerChild(pkg.valor_pessoa_adicional_crianca);
                        }
                      }
                    }}
                  />
                  <Label className="text-sm font-medium text-foreground/70 cursor-pointer">
                    Preço por pessoa (adulto/criança)
                  </Label>
                </div>

                {pricingMode === 'per_person' && (
                  <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 space-y-3">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">Qtd Adultos</Label>
                        <Input
                          type="number"
                          min={0}
                          value={adultCount ?? ""}
                          onChange={(e) => setAdultCount(e.target.value ? Number(e.target.value) : null)}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">Valor/Adulto</Label>
                        <MoneyInput value={pricePerAdult} onChange={setPricePerAdult} />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">Qtd Crianças</Label>
                        <Input
                          type="number"
                          min={0}
                          value={childCount ?? ""}
                          onChange={(e) => setChildCount(e.target.value ? Number(e.target.value) : null)}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">Valor/Criança</Label>
                        <MoneyInput value={pricePerChild} onChange={setPricePerChild} />
                      </div>
                    </div>
                    {((adultCount || 0) > 0 || (childCount || 0) > 0) && (
                      <p className="text-xs text-muted-foreground">
                        {(adultCount || 0) > 0 && `${adultCount} adultos × R$ ${(pricePerAdult || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`}
                        {(adultCount || 0) > 0 && (childCount || 0) > 0 && " + "}
                        {(childCount || 0) > 0 && `${childCount} crianças × R$ ${(pricePerChild || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`}
                        {" = "}
                        <span className="font-semibold text-foreground">
                          R$ {(((adultCount || 0) * (pricePerAdult || 0)) + ((childCount || 0) * (pricePerChild || 0))).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                        </span>
                      </p>
                    )}
                  </div>
                )}
              </div>

              <div className="space-y-2.5 md:pr-6">
                <Label className="text-sm font-medium text-foreground/70">Valor do pacote</Label>
                {pricingMode === 'per_person' ? (
                  <div className="flex items-center h-10 px-3 rounded-xl border border-border/50 bg-muted/50">
                    <span className="text-sm text-muted-foreground mr-1">R$</span>
                    <span className="text-sm font-semibold text-foreground">
                      {(form.total_value || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                ) : (
                  <MoneyInput value={form.total_value} onChange={(v) => setForm({ ...form, total_value: v })} />
                )}
                {suggestedPrice && (
                  <button
                    type="button"
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 mt-1.5 rounded-lg border border-primary/20 bg-primary/5 text-xs font-medium text-primary transition-all hover:bg-primary/10"
                    onClick={() => setForm(prev => ({ ...prev, total_value: suggestedPrice.price }))}
                  >
                    📅 {suggestedPrice.dayTypeLabel} · {suggestedPrice.guestTier} pessoas · R$ {suggestedPrice.price.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    {form.total_value !== suggestedPrice.price && <span className="text-[10px] opacity-70 ml-1">(clique para aplicar)</span>}
                  </button>
                )}
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


          {/* Section 3.5 – Opcionais */}
          <div className="rounded-xl border border-border/40 bg-card p-4 shadow-sm sm:p-5">
            <SectionHeader icon={Package} label="Opcionais" />
            <div className="space-y-3">
              {/* Catalog suggestions */}
              {catalogOptionals.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Opcionais cadastrados</p>
                  <div className="flex flex-wrap gap-1.5">
                    {catalogOptionals
                      .filter(co => !(form.event_optionals || []).some(eo => eo.name === co.name))
                      .map(co => (
                        <button
                          key={co.id}
                          type="button"
                          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-border/60 bg-muted/30 hover:bg-primary/10 hover:border-primary/30 text-xs font-medium transition-all"
                          onClick={() => {
                            const guests = form.guest_count || 0;
                            const unitPrice = co.value || 0;
                            const qty = 1;
                            let totalValue = unitPrice * qty;
                            if (co.valor_por_pessoa && co.valor_por_pessoa > 0 && guests > 0) {
                              totalValue = totalValue + co.valor_por_pessoa * guests * qty;
                            }
                            setForm({
                              ...form,
                              event_optionals: [...(form.event_optionals || []), { name: co.name, value: totalValue || null, valor_por_pessoa: co.valor_por_pessoa, quantity: qty, unit_price: unitPrice }],
                            });
                          }}
                        >
                          <Plus className="h-3 w-3" />
                          {co.name}
                          {co.value != null && co.value > 0 && (
                            <span className="text-muted-foreground">R$ {co.value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                          )}
                          {co.valor_por_pessoa != null && co.valor_por_pessoa > 0 && (
                            <span className="text-muted-foreground">+ R$ {co.valor_por_pessoa.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}/pessoa</span>
                          )}
                        </button>
                      ))}
                  </div>
                </div>
              )}

              {(form.event_optionals || []).map((opt, idx) => (
                  <div key={idx} className="space-y-1">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <div className="w-full sm:flex-1">
                      <Input
                        placeholder="Nome do opcional"
                        value={opt.name}
                        onChange={(e) => {
                          const updated = [...(form.event_optionals || [])];
                          updated[idx] = { ...updated[idx], name: e.target.value };
                          setForm({ ...form, event_optionals: updated });
                        }}
                      />
                    </div>
                    <div className="w-20">
                      <Input
                        type="number"
                        min={1}
                        placeholder="Qtd"
                        value={opt.quantity === null || opt.quantity === undefined ? '' : opt.quantity}
                        onChange={(e) => {
                          const raw = e.target.value;
                          const updated = [...(form.event_optionals || [])];
                          if (raw === '' || raw === '0') {
                            // Allow clearing the field — store null temporarily
                            updated[idx] = { ...updated[idx], quantity: null as any };
                            setForm({ ...form, event_optionals: updated });
                            return;
                          }
                          const qty = Math.max(1, parseInt(raw) || 1);
                          const unitPrice = updated[idx].unit_price ?? updated[idx].value ?? 0;
                          const guests = form.guest_count || 0;
                          const perPerson = updated[idx].valor_por_pessoa ?? 0;
                          const totalValue = (unitPrice * qty) + (perPerson > 0 ? perPerson * guests * qty : 0);
                          updated[idx] = { ...updated[idx], quantity: qty, value: totalValue };
                          setForm({ ...form, event_optionals: updated });
                        }}
                        onBlur={() => {
                          const updated = [...(form.event_optionals || [])];
                          if (!updated[idx].quantity || updated[idx].quantity! < 1) {
                            const qty = 1;
                            const unitPrice = updated[idx].unit_price ?? updated[idx].value ?? 0;
                            const guests = form.guest_count || 0;
                            const perPerson = updated[idx].valor_por_pessoa ?? 0;
                            const totalValue = (unitPrice * qty) + (perPerson > 0 ? perPerson * guests * qty : 0);
                            updated[idx] = { ...updated[idx], quantity: qty, value: totalValue };
                            setForm({ ...form, event_optionals: updated });
                          }
                        }}
                      />
                    </div>
                    <div className="w-full sm:w-36">
                      <MoneyInput
                        value={opt.value}
                        onChange={(v) => {
                          const updated = [...(form.event_optionals || [])];
                          updated[idx] = { ...updated[idx], value: v, unit_price: v ? v / (updated[idx].quantity || 1) : null };
                          setForm({ ...form, event_optionals: updated });
                        }}
                      />
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive/70 hover:text-destructive shrink-0"
                      onClick={() => {
                        const updated = (form.event_optionals || []).filter((_, i) => i !== idx);
                        setForm({ ...form, event_optionals: updated });
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-x-3">
                    {opt.quantity != null && opt.quantity > 1 && opt.unit_price != null && opt.unit_price > 0 && (
                      <p className="text-[10px] text-muted-foreground ml-1">
                        R$ {opt.unit_price.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} × {opt.quantity} un
                      </p>
                    )}
                    {opt.valor_por_pessoa != null && opt.valor_por_pessoa > 0 && (
                      <p className="text-[10px] text-muted-foreground ml-1">
                        + R$ {opt.valor_por_pessoa.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}/pessoa × {form.guest_count || 0} convidados
                      </p>
                    )}
                  </div>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1.5 text-xs"
                onClick={() => {
                  setForm({ ...form, event_optionals: [...(form.event_optionals || []), { name: "", value: null }] });
                }}
              >
                <Plus className="h-3.5 w-3.5" /> Adicionar manual
              </Button>
              {(form.event_optionals || []).length > 0 && (() => {
                const subtotal = (form.event_optionals || []).reduce((sum, o) => sum + (o.value || 0), 0);
                return subtotal > 0 ? (
                  <p className="text-xs text-muted-foreground mt-1">
                    Subtotal opcionais: <span className="font-semibold text-foreground">R$ {subtotal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                  </p>
                ) : null;
              })()}
            </div>
          </div>

          {/* Section 4 – Pagamento */}
          <div className="rounded-xl border border-border/40 bg-card p-4 shadow-sm space-y-5 sm:p-5">
            <SectionHeader icon={CreditCard} label="Pagamento" />

            {/* --- Brindes & Convidado Extra --- */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2.5">
                <Label className="text-sm font-medium text-foreground/70 flex items-center gap-1.5">🎁 Brindes inclusos</Label>
                <Input value={form.gifts || ""} onChange={(e) => setForm({ ...form, gifts: e.target.value || null })} placeholder="Ex: Kit lembrancinhas, balões" />
              </div>
              <div className="space-y-2.5">
                <Label className="text-sm font-medium text-foreground/70">Valor por convidado extra</Label>
                <MoneyInput value={form.extra_guest_value} onChange={(v) => setForm({ ...form, extra_guest_value: v })} />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2.5">
                <Label className="text-sm font-medium text-foreground/70">Valor da festa</Label>
                <MoneyInput value={form.total_value} onChange={(v) => {
                  setForm({ ...form, total_value: v });
                }} />
              </div>
              {(optionalsSubtotal > 0 || discountAmount > 0) && (
                <div className="space-y-2.5">
                  <Label className="text-sm font-medium text-foreground/70">Valor total</Label>
                  <div className="flex items-center h-10 px-3 rounded-md border border-border/50 bg-muted/50">
                    <span className="text-sm text-muted-foreground mr-1">R$</span>
                    <span className="text-sm font-semibold text-foreground">
                      {grandTotal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    Festa R$ {(form.total_value || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    {optionalsSubtotal > 0 && ` + Opcionais R$ ${optionalsSubtotal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`}
                    {discountAmount > 0 && ` − Desconto R$ ${discountAmount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`}
                  </p>
                </div>
              )}
            </div>

            {/* --- Desconto --- */}
            {!showDiscount ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1.5 text-xs"
                onClick={() => {
                  setShowDiscount(true);
                  if (!form.discount_type) setForm(prev => ({ ...prev, discount_type: 'fixed', discount_base: 'total' }));
                }}
              >
                <Plus className="h-3.5 w-3.5" /> Aplicar Desconto
              </Button>
            ) : (
              <div className="rounded-lg border border-border/40 bg-muted/20 p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Desconto</p>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-destructive/70 hover:text-destructive"
                    onClick={() => {
                      setShowDiscount(false);
                      setForm(prev => ({ ...prev, discount_type: null, discount_value: null, discount_base: 'total', discount_reason: null }));
                    }}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Tipo</Label>
                    <Select value={form.discount_type || 'fixed'} onValueChange={(v) => setForm({ ...form, discount_type: v as 'fixed' | 'percentage' })}>
                      <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="fixed">R$ (fixo)</SelectItem>
                        <SelectItem value="percentage">% (percentual)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Valor</Label>
                    {form.discount_type === 'percentage' ? (
                      <div className="relative">
                        <Input
                          className="h-9 text-xs pr-7"
                          type="number"
                          min={0}
                          max={100}
                          step={0.5}
                          placeholder="0"
                          value={form.discount_value ?? ""}
                          onChange={(e) => setForm({ ...form, discount_value: e.target.value ? Number(e.target.value) : null })}
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
                      </div>
                    ) : (
                      <MoneyInput value={form.discount_value} onChange={(v) => setForm({ ...form, discount_value: v })} />
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Incide sobre</Label>
                    <Select value={form.discount_base || 'total'} onValueChange={(v) => setForm({ ...form, discount_base: v as 'pacote' | 'total' })}>
                      <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="total">Valor total</SelectItem>
                        <SelectItem value="pacote">Só pacote</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Motivo</Label>
                    <Input
                      className="h-9 text-xs"
                      placeholder="Ex: Cortesia"
                      value={form.discount_reason || ""}
                      onChange={(e) => setForm({ ...form, discount_reason: e.target.value || null })}
                    />
                  </div>
                </div>
                {discountAmount > 0 && (
                  <p className="text-xs text-muted-foreground">
                    Desconto: <span className="font-semibold text-destructive">−R$ {discountAmount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                    {" → "}Valor final: <span className="font-semibold text-foreground">R$ {grandTotal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                  </p>
                )}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2.5">
                <Label className="text-sm font-medium text-foreground/70">Forma de pagamento</Label>
                <Select value={form.payment_method || "none"} onValueChange={(v) => setForm({ ...form, payment_method: v === "none" ? null : v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Não informado</SelectItem>
                    {PAYMENT_METHODS.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="border-t border-border/30" />

            {/* --- Bloco 2: Entrada --- */}
            <div className="space-y-1">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Entrada</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                <div className="space-y-2.5">
                  <Label className="text-sm font-medium text-foreground/70">Valor</Label>
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
                <div className="space-y-2.5">
                  <Label className="text-sm font-medium text-foreground/70">Forma</Label>
                  <Select value={payment.entrada_forma || "none"} onValueChange={(v) => setPayment({ ...payment, entrada_forma: v === "none" ? "" : v })}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Não informado</SelectItem>
                      {PAYMENT_FORMS.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2.5">
                  <Label className="text-sm font-medium text-foreground/70">Data</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !payment.entrada_data && "text-muted-foreground")}>
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {payment.entrada_data ? format(new Date(payment.entrada_data + "T12:00:00"), "dd/MM/yyyy") : "Selecionar"}
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
              </div>

              {/* Parcelas do cartão na entrada */}
              {payment.entrada_forma === "cartao" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3">
                  <div className="space-y-2.5">
                    <Label className="text-sm font-medium text-foreground/70">Parcelas do cartão (entrada)</Label>
                    <Input
                      type="number"
                      min={1}
                      max={12}
                      placeholder="1"
                      value={payment.entrada_parcelas ?? ""}
                      onChange={(e) => {
                        const num = e.target.value ? Math.max(1, Math.min(12, Number(e.target.value))) : null;
                        setPayment({ ...payment, entrada_parcelas: num });
                      }}
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="border-t border-border/30" />

            {/* --- Bloco 3: Saldo e Parcelas --- */}
            <div className="space-y-1">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Saldo/Total</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                <div className="space-y-2.5">
                  <Label className="text-sm font-medium text-foreground/70">Valor</Label>
                  <MoneyInput value={payment.saldo_valor} onChange={(v) => {
                    setPayment({
                      ...payment,
                      saldo_valor: v,
                      parcelas_details: buildParcelasDetails(payment.parcelas, v, payment.parcelas_details || []),
                    });
                  }} />
                </div>
                <div className="space-y-2.5">
                  <Label className="text-sm font-medium text-foreground/70">Forma</Label>
                  <Select value={payment.saldo_forma || "none"} onValueChange={(v) => setPayment({ ...payment, saldo_forma: v === "none" ? "" : v })}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Não informado</SelectItem>
                      {PAYMENT_FORMS.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2.5">
                  <Label className="text-sm font-medium text-foreground/70">Data</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !payment.saldo_data && "text-muted-foreground")}>
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {payment.saldo_data ? format(new Date(payment.saldo_data + "T12:00:00"), "dd/MM/yyyy") : "Selecionar"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={payment.saldo_data ? new Date(payment.saldo_data + "T12:00:00") : undefined}
                        onSelect={(d) => {
                          const dateStr = d ? format(d, "yyyy-MM-dd") : null;
                          const updatedPayment = { ...payment, saldo_data: dateStr };
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
              </div>

              {/* Parcelas */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
                <div className="space-y-2.5">
                  <Label className="text-sm font-medium text-foreground/70">Parcelas</Label>
                  <Input type="number" min={1} max={24} placeholder="1" value={payment.parcelas ?? ""} onChange={(e) => {
                    const num = e.target.value ? Math.max(1, Math.min(24, Number(e.target.value))) : null;
                    const details = buildParcelasDetails(num, payment.saldo_valor, payment.parcelas_details || []);
                    setPayment({ ...payment, parcelas: num, parcelas_details: details });
                  }} />
                </div>
                {(payment.parcelas ?? 0) > 1 && payment.saldo_forma !== "cartao" && (
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

              {/* Detalhes das parcelas */}
              {(payment.parcelas ?? 0) >= 1 && payment.saldo_forma !== "cartao" && (
                <div className="pt-3">
                  <div className="rounded-lg border border-border/40 bg-muted/20 p-3 space-y-2">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Detalhes das parcelas</p>
                    {(payment.parcelas_details || []).map((parcela, idx) => (
                      <div key={idx} className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                        <span className="w-full shrink-0 text-xs font-medium text-muted-foreground sm:w-16">
                          {idx + 1}ª parcela
                        </span>
                        <div className="w-full flex-1 min-w-0">
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
                           <div className="w-full sm:w-36">
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
                           <div className="w-full sm:w-36">
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

              {/* Card fee info for saldo */}
              {(payment.saldo_forma === "cartao" || payment.saldo_forma === "cartao_debito") && cardFees.length > 0 && (payment.saldo_valor ?? 0) > 0 && (() => {
                const operator = cardFees.length === 1 
                  ? cardFees[0] 
                  : cardFees.find(f => f.id === selectedOperatorId) || null;
                const isDebit = payment.saldo_forma === "cartao_debito";
                const parcelas = isDebit ? 1 : Math.max(1, payment.parcelas ?? 1);
                const taxa = operator 
                  ? Number(isDebit ? (operator.taxa_debito || 0) : (operator[`taxa_credito_${parcelas}x`] || 0)) 
                  : 0;
                const bruto = payment.saldo_valor ?? 0;
                const desconto = bruto * taxa / 100;
                const liquido = bruto - desconto;

                return (
                  <div className="pt-2 space-y-2">
                    {cardFees.length > 1 && (
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">Operadora (saldo)</Label>
                        <Select value={selectedOperatorId || ""} onValueChange={setSelectedOperatorId}>
                          <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Selecione a operadora" /></SelectTrigger>
                          <SelectContent>
                            {cardFees.map(f => <SelectItem key={f.id} value={f.id}>{f.operator_name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    {operator && taxa > 0 && (
                      <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
                        <p className="text-xs font-medium text-amber-600 dark:text-amber-400">
                          💳 Taxa {operator.operator_name} {isDebit ? "Débito" : `${parcelas}x`}: {taxa.toFixed(2)}%
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Desconto: <span className="font-semibold text-destructive">R$ {desconto.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                          {" | "}Líquido: <span className="font-semibold text-emerald-600 dark:text-emerald-400">R$ {liquido.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                        </p>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Card fee info for entrada */}
              {(payment.entrada_forma === "cartao" || payment.entrada_forma === "cartao_debito") && cardFees.length > 0 && (payment.entrada_valor ?? 0) > 0 && (() => {
                const operator = cardFees.length === 1 
                  ? cardFees[0] 
                  : cardFees.find(f => f.id === selectedOperatorId) || null;
                const isDebit = payment.entrada_forma === "cartao_debito";
                const entradaParcelas = isDebit ? 1 : Math.max(1, payment.entrada_parcelas ?? 1);
                const taxa = operator 
                  ? Number(isDebit ? (operator.taxa_debito || 0) : (operator[`taxa_credito_${entradaParcelas}x`] || 0)) 
                  : 0;
                const bruto = payment.entrada_valor ?? 0;
                const desconto = bruto * taxa / 100;
                const liquido = bruto - desconto;

                return operator && taxa > 0 ? (
                  <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 -mt-2 mb-2">
                    <p className="text-xs font-medium text-amber-600 dark:text-amber-400">
                      💳 Taxa entrada ({operator.operator_name} {isDebit ? "Débito" : `${entradaParcelas}x`}): {taxa.toFixed(2)}%
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Desconto: <span className="font-semibold text-destructive">R$ {desconto.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                      {" | "}Líquido: <span className="font-semibold text-emerald-600 dark:text-emerald-400">R$ {liquido.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                    </p>
                  </div>
                ) : null;
              })()}
            </div>

            <div className="border-t border-border/30" />

            {/* --- Bloco 4: Observações --- */}
            <div className="space-y-2.5">
              <Label className="text-sm font-medium text-foreground/70">Observações de pagamento</Label>
              <Textarea
                value={payment.observacoes_pagamento}
                onChange={(e) => setPayment({ ...payment, observacoes_pagamento: e.target.value })}
                rows={2}
                placeholder="Ex: Entrada via PIX até 15/03, saldo parcelado em 3x no cartão..."
              />
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

                  {/* Generated contracts for this event */}
                  {generatedContracts.length > 0 && (
                    <div className="mt-4 space-y-2">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Contratos Gerados</span>
                      {generatedContracts.map((gc) => {
                        const STATUS_COLORS: Record<string, string> = {
                          gerado: "bg-blue-500/15 text-blue-700 border-blue-300",
                          enviado: "bg-amber-500/15 text-amber-700 border-amber-300",
                          assinado: "bg-emerald-500/15 text-emerald-700 border-emerald-300",
                          aguardando_assinatura: "bg-purple-500/15 text-purple-700 border-purple-300",
                        };
                        const STATUS_LABELS: Record<string, string> = {
                          gerado: "Gerado", enviado: "Enviado", assinado: "Assinado ✅", aguardando_assinatura: "Aguardando Assinatura",
                        };
                        return (
                          <div key={gc.id} className="rounded-lg border border-border/40 bg-muted/30 p-3 space-y-2">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-xs font-medium truncate flex-1">{gc.nome_documento}</span>
                              <Badge variant="outline" className={cn("text-[10px] shrink-0", STATUS_COLORS[gc.status] || "")}>
                                {STATUS_LABELS[gc.status] || gc.status}
                              </Badge>
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className={cn("h-7 text-[11px] gap-1.5", (sentWA.has(gc.id) || gc.status === "enviado") && "bg-emerald-500/15 text-emerald-700 border-emerald-300")}
                                disabled={sendingContractWA === gc.id}
                                onClick={() => handleContractSendWA(gc)}
                              >
                                {sendingContractWA === gc.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <MessageCircle className="h-3 w-3" />}
                                {sentWA.has(gc.id) || gc.status === "enviado" ? "WhatsApp ✅" : "WhatsApp"}
                              </Button>
                              {gc.status !== "assinado" && (
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className={cn("h-7 text-[11px] gap-1.5", (sentSign.has(gc.id) || gc.status === "aguardando_assinatura") && "bg-emerald-500/15 text-emerald-700 border-emerald-300")}
                                  disabled={sendingContractSign === gc.id}
                                  onClick={() => handleContractSendSign(gc)}
                                >
                                  {sendingContractSign === gc.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <FileSignature className="h-3 w-3" />}
                                  {sentSign.has(gc.id) || gc.status === "aguardando_assinatura" ? "Assinatura ✅" : "Enviar p/ Assinatura"}
                                </Button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
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

            {loadingClientRequest ? (
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
                      <Button type="button" variant="outline" disabled={generatingLink || sendingClientLink || saving} className="gap-2" onClick={() => void handleInitialClientLinkRequest()}>
                        {generatingLink || sendingClientLink ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                        Enviar link ao cliente
                      </Button>
                      <Button type="button" variant="outline" disabled={saving} className="gap-2" onClick={async () => {
                        if (!isEdit) {
                          const savedId = await autoSaveForClientData();
                          if (!savedId) return;
                        }
                        setShowManualForm(true);
                      }}>
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
                    onSaved={(req) => handleClientDataSaved(req as ClientDataRequest, "manual")}
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
                    onSaved={(req) => handleClientDataSaved(req as ClientDataRequest, "editing")}
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
                      <div className="space-y-3">
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
                        {/* Birthday children */}
                        {Array.isArray((clientRequest?.client_data as any)?.birthday_children) && (clientRequest?.client_data as any).birthday_children.filter((c: any) => c.name).length > 0 && (
                          <div className="p-4 rounded-lg bg-muted/50 border border-border/40 space-y-2">
                            <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Aniversariante(s)</span>
                            {(clientRequest?.client_data as any).birthday_children.filter((c: any) => c.name).map((child: any, idx: number) => (
                              <div key={idx} className="flex items-center gap-3 text-sm">
                                <span className="font-medium">{child.name}</span>
                                {child.age && <span className="text-muted-foreground">{child.age}</span>}
                                {child.birthdate && <span className="text-muted-foreground">{child.birthdate.includes("-") ? child.birthdate.split("-").reverse().join("/") : child.birthdate}</span>}
                              </div>
                            ))}
                          </div>
                        )}
                        {/* Responsáveis */}
                        {Array.isArray((clientRequest?.client_data as any)?.responsaveis) && (clientRequest?.client_data as any).responsaveis.filter((r: any) => r.name).length > 0 && (
                          <div className="p-4 rounded-lg bg-muted/50 border border-border/40 space-y-2">
                            <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Responsáveis</span>
                            {(clientRequest?.client_data as any).responsaveis.filter((r: any) => r.name).map((r: any, idx: number) => (
                              <div key={idx} className="flex items-center gap-3 text-sm">
                                <span className="font-medium">{r.name}</span>
                                {r.phone && <span className="text-muted-foreground">{r.phone}</span>}
                                {r.relation && <span className="text-muted-foreground">({r.relation})</span>}
                              </div>
                            ))}
                          </div>
                        )}
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
                      // Sync birthday_children back to form state so main save won't overwrite
                      const cd = req.client_data as any;
                      if (cd?.birthday_children?.length) {
                        setForm(prev => ({
                          ...prev,
                          birthday_children: cd.birthday_children,
                          child_name: cd.birthday_children[0]?.name || prev.child_name,
                          child_age: cd.birthday_children[0]?.age || prev.child_age,
                          child_birthdate: cd.birthday_children[0]?.birthdate || prev.child_birthdate,
                        }));
                      }
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
                            onClick={() => void sendClientLinkToLead()}
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
        </TabsContent>

        <TabsContent value="complementar" className="mt-0">
          <div className="overflow-y-auto overflow-x-hidden px-4 py-5 sm:px-7 sm:py-6" style={{ maxHeight: "calc(90vh - 220px)" }}>
            <EventComplementaryTab
              eventId={eventId || ""}
              companyId={currentCompany!.id}
              companySlug={currentCompany!.slug}
              leadPhone={leadPhone}
              form={form}
              setForm={setForm}
              onSaveFirst={autoSaveForClientData}
            />
          </div>
        </TabsContent>

        {/* Fixed footer */}
        <div className="flex flex-col-reverse gap-2 border-t border-border/40 bg-muted/20 px-4 py-4 sm:flex-row sm:justify-end sm:gap-3 sm:px-7">
          <Button type="button" variant="ghost" className="w-full sm:w-auto" onClick={() => onOpenChange(false)}>Cancelar</Button>
          {!isEdit && (
            <Button
              type="button"
              variant="outline"
              disabled={saving || !!conflictEvent}
              className="w-full rounded-lg sm:w-auto sm:px-6"
              onClick={(e) => handleSubmit(e as any, true)}
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Salvar
            </Button>
          )}
          <Button type="submit" form="event-form" disabled={saving || !!conflictEvent} className="w-full rounded-lg shadow-sm sm:w-auto sm:px-8">
            {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            {isEdit ? "Salvar" : "Criar e Fechar"}
          </Button>
        </div>
      </Tabs>
      </DialogContent>

      {/* Contract Generation Dialog */}
      {isEdit && userId && selectedContractModelId && (
        <EventContractDialog
          open={contractDialogOpen}
          onOpenChange={(o) => {
            setContractDialogOpen(o);
            if (!o) fetchGeneratedContracts();
          }}
          eventId={form.id!}
          modelId={selectedContractModelId}
          userId={userId}
        />
      )}
    </Dialog>
  );
}
