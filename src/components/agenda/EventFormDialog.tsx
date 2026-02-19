import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Loader2, Search, X, UserCheck, ListChecks, User, CalendarDays, PartyPopper } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";

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
}

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
const YEAR_OPTIONS = ["2024", "2025", "2026", "2027", "2028", "2029", "2030"];

const STATUS_OPTIONS = [
  { value: "pendente", label: "Pendente" },
  { value: "confirmado", label: "Confirmado" },
  { value: "cancelado", label: "Cancelado" },
];

interface EventFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: EventFormData) => Promise<void>;
  initialData?: EventFormData | null;
  units: Array<{ name: string }>;
}

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
};

function SectionHeader({ icon: Icon, label }: { icon: React.ElementType; label: string }) {
  return (
    <div className="flex items-center gap-2 text-[11px] uppercase tracking-widest font-semibold text-muted-foreground mb-3">
      <Icon className="h-3.5 w-3.5" />
      {label}
    </div>
  );
}

export function EventFormDialog({ open, onOpenChange, onSubmit, initialData, units }: EventFormDialogProps) {
  const [form, setForm] = useState<EventFormData>(EMPTY);
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

  useEffect(() => {
    if (open) {
      const data = initialData || EMPTY;
      setForm(data);
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
    }
  }, [open, initialData]);

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
    if (!form.title || !form.event_date) return;
    setSaving(true);
    try {
      await onSubmit(form);
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  const isEdit = !!initialData?.id;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[720px] max-h-[90vh] p-0 gap-0 overflow-hidden [&>button]:top-5 [&>button]:right-5">
        {/* Header */}
        <DialogHeader className="px-7 pt-7 pb-4">
          <DialogTitle className="text-xl font-bold">{isEdit ? "Editar Festa" : "Nova Festa"}</DialogTitle>
          <p className="text-sm text-muted-foreground mt-1">Preencha os dados do evento</p>
        </DialogHeader>

        {/* Scrollable body */}
        <form id="event-form" onSubmit={handleSubmit} className="overflow-y-auto px-7 py-5 space-y-6" style={{ maxHeight: "calc(90vh - 180px)" }}>
          {/* Section 1 – Dados do Cliente */}
          <div>
            <SectionHeader icon={User} label="Dados do Cliente" />
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-foreground/80">Nome do cliente *</Label>
                <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
              </div>

              {/* Lead CRM link */}
              <div className="relative space-y-2">
                <Label className="text-sm font-medium text-foreground/80">Vincular Lead do CRM</Label>
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

          <Separator className="bg-border/40" />

          {/* Section 2 – Data e Horário */}
          <div>
            <SectionHeader icon={CalendarDays} label="Data e Horário" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-foreground/80">Data *</Label>
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

              <div className="space-y-2">
                <Label className="text-sm font-medium text-foreground/80">Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{STATUS_OPTIONS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-foreground/80">Horário início</Label>
                <Select value={form.start_time} onValueChange={(v) => setForm({ ...form, start_time: v === "none" ? "" : v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sem horário</SelectItem>
                    {TIME_OPTIONS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-foreground/80">Horário fim</Label>
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

          <Separator className="bg-border/40" />

          {/* Section 3 – Informações da Festa */}
          <div>
            <SectionHeader icon={PartyPopper} label="Informações da Festa" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-foreground/80">Tipo de festa</Label>
                <Select value={form.event_type} onValueChange={(v) => setForm({ ...form, event_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{EVENT_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-foreground/80">Convidados</Label>
                <Input type="number" value={form.guest_count ?? ""} onChange={(e) => setForm({ ...form, guest_count: e.target.value ? Number(e.target.value) : null })} />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-foreground/80">Unidade</Label>
                {units.length > 0 ? (
                  <Select value={form.unit} onValueChange={(v) => setForm({ ...form, unit: v })}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>{units.map((u) => <SelectItem key={u.name} value={u.name}>{u.name}</SelectItem>)}</SelectContent>
                  </Select>
                ) : (
                  <Input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} />
                )}
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-foreground/80">Pacote</Label>
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

              <div className="space-y-2">
                <Label className="text-sm font-medium text-foreground/80">Valor total (R$)</Label>
                <Input type="number" step="0.01" value={form.total_value ?? ""} onChange={(e) => setForm({ ...form, total_value: e.target.value ? Number(e.target.value) : null })} />
              </div>

              {/* Checklist template - only for new events */}
              {!isEdit && templates.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-foreground/80 flex items-center gap-1.5">
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

              <div className="space-y-2 md:col-span-2">
                <Label className="text-sm font-medium text-foreground/80">Observações</Label>
                <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3} />
              </div>
            </div>
          </div>
        </form>

        {/* Fixed footer */}
        <div className="flex justify-end gap-3 px-7 py-4 border-t border-border/40 bg-muted/20">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button type="submit" form="event-form" disabled={saving} className="px-8">
            {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            {isEdit ? "Salvar" : "Criar Festa"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
