import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Loader2, Search, X, UserCheck, ListChecks, User, CalendarDays, PartyPopper, Briefcase, CalendarIcon, AlertTriangle, CreditCard, Handshake, Copy, ExternalLink, Clock, CheckCircle2, Send } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";

export interface PaymentDetails {
  entrada_valor: number | null;
  entrada_forma: string;
  saldo_valor: number | null;
  saldo_forma: string;
  parcelas: number | null;
  observacoes_pagamento: string;
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
  { value: "infantil", label: "Infantil" },
  { value: "debutante", label: "Debutante" },
  { value: "corporativo", label: "Corporativo" },
  { value: "casamento", label: "Casamento" },
  { value: "outro", label: "Outro" },
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
  onSubmit: (data: EventFormData) => Promise<void>;
  initialData?: EventFormData | null;
  units: Array<{ name: string }>;
}

const EMPTY_PAYMENT: PaymentDetails = {
  entrada_valor: null,
  entrada_forma: "",
  saldo_valor: null,
  saldo_forma: "",
  parcelas: null,
  observacoes_pagamento: "",
};

const EMPTY: EventFormData = {
  title: "",
  event_date: "",
  start_time: "",
  end_time: "",
  event_type: "infantil",
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

export function EventFormDialog({ open, onOpenChange, onSubmit, initialData, units }: EventFormDialogProps) {
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
  const [packages, setPackages] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [companyUsers, setCompanyUsers] = useState<Array<{ id: string; name: string }>>([]);
  const [fechamentoDate, setFechamentoDate] = useState<Date | undefined>(undefined);

  // Client data request state
  const [clientRequest, setClientRequest] = useState<ClientDataRequest | null>(null);
  const [loadingClientRequest, setLoadingClientRequest] = useState(false);
  const [generatingLink, setGeneratingLink] = useState(false);

  useEffect(() => {
    if (open) {
      const data = initialData || EMPTY;
      setForm(data);
      setPayment((data.payment_details as PaymentDetails) || EMPTY_PAYMENT);
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
    }
  }, [open, initialData]);

  // Fetch client data request for existing events
  useEffect(() => {
    if (!open || !initialData?.id || !currentCompany?.id) return;
    setLoadingClientRequest(true);
    supabase
      .from("client_data_requests")
      .select("id, token, status, client_data, completed_at")
      .eq("event_id", initialData.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .then(({ data }) => {
        setClientRequest((data && data.length > 0) ? data[0] as ClientDataRequest : null);
        setLoadingClientRequest(false);
      });
  }, [open, initialData?.id, currentCompany?.id]);

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
      .select("id, name")
      .eq("company_id", currentCompany.id)
      .eq("is_active", true)
      .order("sort_order")
      .then(({ data }) => {
        setPackages((data || []).map((p: any) => ({ id: p.id, name: p.name })));
      });
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

  const handleSubmit = async (e: React.FormEvent) => {
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
    setSaving(true);
    try {
      const submitData = { ...form, payment_details: payment };
      await onSubmit(submitData);
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  const generateClientLink = async () => {
    if (!initialData?.id || !currentCompany?.id) {
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
          event_id: initialData.id,
          lead_id: form.lead_id || null,
          token,
          status: "sent",
          sent_at: new Date().toISOString(),
        })
        .select("id, token, status, client_data, completed_at")
        .single();
      if (error) throw error;
      setClientRequest(data as ClientDataRequest);
      toast({ title: "Link gerado com sucesso!" });
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

  const isEdit = !!initialData?.id;
  const clientData = clientRequest?.client_data as Record<string, string> | null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[720px] max-h-[90vh] p-0 gap-0 overflow-hidden rounded-2xl [&>button]:top-5 [&>button]:right-5">
        <DialogHeader className="px-7 pt-7 pb-4 border-b border-border/40 bg-muted/30">
          <DialogTitle className="text-lg font-bold tracking-tight">{isEdit ? "Editar Festa" : "Nova Festa"}</DialogTitle>
          <p className="text-[13px] text-muted-foreground mt-1">Preencha os dados do evento e contratação</p>
        </DialogHeader>

        <form id="event-form" onSubmit={handleSubmit} className="overflow-y-auto px-7 py-6 space-y-5" style={{ maxHeight: "calc(90vh - 180px)" }}>
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
                <Select value={form.event_type} onValueChange={(v) => setForm({ ...form, event_type: v })}>
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
                  <Select value={form.package_name} onValueChange={(v) => setForm({ ...form, package_name: v === "none" ? "" : v })}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sem pacote</SelectItem>
                      {packages.map((p) => <SelectItem key={p.id} value={p.name}>{p.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input value={form.package_name} onChange={(e) => setForm({ ...form, package_name: e.target.value })} placeholder="Nenhum pacote cadastrado" />
                )}
              </div>

              <div className="space-y-2.5 md:pr-6">
                <Label className="text-sm font-medium text-foreground/70">Valor total</Label>
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

          {/* Section 4 – Pagamento */}
          <div className="rounded-xl border border-border/40 bg-card p-5 shadow-sm">
            <SectionHeader icon={CreditCard} label="Pagamento" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-y-5">
              <div className="space-y-2.5 md:pr-6">
                <Label className="text-sm font-medium text-foreground/70">Forma de pagamento</Label>
                <Select value={form.payment_method || "none"} onValueChange={(v) => setForm({ ...form, payment_method: v === "none" ? null : v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Não informado</SelectItem>
                    {PAYMENT_METHODS.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2.5 md:pl-6 md:border-l md:border-border/50">
                <Label className="text-sm font-medium text-foreground/70">Parcelas</Label>
                <Input type="number" min={1} placeholder="1" value={payment.parcelas ?? ""} onChange={(e) => setPayment({ ...payment, parcelas: e.target.value ? Number(e.target.value) : null })} />
              </div>

              <div className="space-y-2.5 md:pr-6">
                <Label className="text-sm font-medium text-foreground/70">Valor da entrada</Label>
                <MoneyInput value={payment.entrada_valor} onChange={(v) => setPayment({ ...payment, entrada_valor: v })} />
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

              <div className="space-y-2.5 md:pr-6">
                <Label className="text-sm font-medium text-foreground/70">Valor do saldo</Label>
                <MoneyInput value={payment.saldo_valor} onChange={(v) => setPayment({ ...payment, saldo_valor: v })} />
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
                <div className="flex items-center gap-2">
                  <ClientDataStatusBadge status="pending" />
                  <span className="text-sm text-muted-foreground">Dados do contratante não solicitados</span>
                </div>
                <Button type="button" variant="outline" onClick={generateClientLink} disabled={generatingLink} className="gap-2">
                  {generatingLink ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  Solicitar dados do contratante
                </Button>
              </div>
            ) : clientRequest.status === "completed" || clientRequest.status === "reviewed" ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <ClientDataStatusBadge status={clientRequest.status} />
                  <span className="text-sm text-muted-foreground">
                    {clientRequest.completed_at ? `Recebido em ${format(new Date(clientRequest.completed_at), "dd/MM/yyyy 'às' HH:mm")}` : "Dados recebidos"}
                  </span>
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
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <ClientDataStatusBadge status={clientRequest.status} />
                  <span className="text-sm text-muted-foreground">Link enviado, aguardando preenchimento</span>
                </div>
                <div className="flex items-center gap-2">
                  <Input readOnly value={getClientLink()} className="text-xs font-mono bg-muted/50" />
                  <Button type="button" variant="outline" size="icon" onClick={copyLink} title="Copiar link">
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button type="button" variant="outline" size="icon" onClick={() => window.open(getClientLink(), "_blank")} title="Abrir link">
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        </form>

        {/* Fixed footer */}
        <div className="flex justify-end gap-3 px-7 py-4 border-t border-border/40 bg-muted/20">
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button type="submit" form="event-form" disabled={saving} className="px-8 rounded-lg shadow-sm">
            {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            {isEdit ? "Salvar" : "Criar Festa"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
