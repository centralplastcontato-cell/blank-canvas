import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, Search, X, UserCheck, ListChecks } from "lucide-react";
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

export function EventFormDialog({ open, onOpenChange, onSubmit, initialData, units }: EventFormDialogProps) {
  const [form, setForm] = useState<EventFormData>(EMPTY);
  const [saving, setSaving] = useState(false);
  const { currentCompany } = useCompany();

  // Lead search state
  const [leadSearch, setLeadSearch] = useState("");
  const [showLeadDropdown, setShowLeadDropdown] = useState(false);
  const [closedLeads, setClosedLeads] = useState<Array<{ id: string; name: string; whatsapp: string }>>([]);
  const [linkedLeadIds, setLinkedLeadIds] = useState<Set<string>>(new Set());
  const [loadingLeads, setLoadingLeads] = useState(false);

  // Checklist templates
  const [templates, setTemplates] = useState<Array<{ id: string; name: string; items: string[] }>>([]);
  // Company packages
  const [packages, setPackages] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");

  useEffect(() => {
    if (open) {
      setForm(initialData || EMPTY);
      setLeadSearch("");
      setShowLeadDropdown(false);
      setSelectedTemplate("");
    }
  }, [open, initialData]);

  // Load checklist templates and packages
  useEffect(() => {
    if (!open || !currentCompany?.id) return;
    supabase
      .from("event_checklist_templates")
      .select("id, name, items")
      .eq("company_id", currentCompany.id)
      .eq("is_active", true)
      .then(({ data }) => {
        setTemplates(
          (data || []).map((t: any) => ({
            id: t.id,
            name: t.name,
            items: Array.isArray(t.items) ? t.items : [],
          }))
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

  // Load closed leads and linked lead IDs when dialog opens
  useEffect(() => {
    if (!open || !currentCompany?.id) return;
    setLoadingLeads(true);

    const fetchData = async () => {
      const [leadsRes, eventsRes] = await Promise.all([
        supabase
          .from("campaign_leads")
          .select("id, name, whatsapp")
          .eq("company_id", currentCompany.id)
          .eq("status", "fechado"),
        supabase
          .from("company_events")
          .select("lead_id")
          .eq("company_id", currentCompany.id)
          .not("lead_id", "is", null),
      ]);

      setClosedLeads(leadsRes.data || []);
      setLinkedLeadIds(new Set((eventsRes.data || []).map((e) => e.lead_id!)));
      setLoadingLeads(false);
    };
    fetchData();
  }, [open, currentCompany?.id]);

  const availableLeads = useMemo(() => {
    const filtered = closedLeads.filter(
      (lead) => !linkedLeadIds.has(lead.id) || lead.id === initialData?.lead_id
    );
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
      <DialogContent className="max-w-[350px] max-h-[90vh] overflow-y-auto p-5">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar Festa" : "Nova Festa"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-5 [&_input]:rounded-md [&_input]:border-input [&_button[role=combobox]]:rounded-md [&_textarea]:rounded-md" style={{ '--radius': '0.5rem' } as React.CSSProperties}>
          <div className="space-y-2">
            <Label>Nome do cliente *</Label>
            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
          </div>

          {/* Lead CRM link */}
          <div className="relative">
            <Label>Vincular Lead do CRM</Label>
            {form.lead_id ? (
              <div className="flex items-center gap-2 p-2 rounded-md border border-border bg-accent/30">
                <UserCheck className="h-4 w-4 text-primary shrink-0" />
                <span className="text-sm flex-1 truncate">{form.lead_name || "Lead vinculado"}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => setForm({ ...form, lead_id: null, lead_name: null })}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ) : (
              <>
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar lead fechado..."
                    value={leadSearch}
                    onChange={(e) => setLeadSearch(e.target.value)}
                    onFocus={() => setShowLeadDropdown(true)}
                    className="pl-8"
                  />
                  {loadingLeads && <Loader2 className="absolute right-2.5 top-2.5 h-4 w-4 animate-spin text-muted-foreground" />}
                </div>
                {showLeadDropdown && availableLeads.length > 0 && (
                  <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-md shadow-md max-h-48 overflow-y-auto">
                    {availableLeads.map((lead) => (
                      <button
                        key={lead.id}
                        type="button"
                        className="w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors flex items-center gap-2"
                        onClick={() => {
                          setForm({ ...form, lead_id: lead.id, lead_name: lead.name, title: form.title || lead.name });
                          setLeadSearch("");
                          setShowLeadDropdown(false);
                        }}
                      >
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

          <div className="w-full flex flex-col space-y-2">
            <Label>Data *</Label>
            <Input type="date" value={form.event_date} onChange={(e) => setForm({ ...form, event_date: e.target.value })} required className="w-full" />
          </div>

          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-4 w-full">
            <div className="flex-1 flex flex-col space-y-2">
              <Label>Horário início</Label>
              <Input type="time" value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })} className="w-full" />
            </div>
            <div className="flex-1 flex flex-col space-y-2">
              <Label>Horário fim</Label>
              <Input type="time" value={form.end_time} onChange={(e) => setForm({ ...form, end_time: e.target.value })} className="w-full" />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Tipo de festa</Label>
            <Select value={form.event_type} onValueChange={(v) => setForm({ ...form, event_type: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {EVENT_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Convidados</Label>
            <Input type="number" value={form.guest_count ?? ""} onChange={(e) => setForm({ ...form, guest_count: e.target.value ? Number(e.target.value) : null })} />
          </div>

          <div className="space-y-2">
            <Label>Unidade</Label>
            {units.length > 0 ? (
              <Select value={form.unit} onValueChange={(v) => setForm({ ...form, unit: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {units.map((u) => <SelectItem key={u.name} value={u.name}>{u.name}</SelectItem>)}
                </SelectContent>
              </Select>
            ) : (
              <Input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} />
            )}
          </div>

          <div className="space-y-2">
            <Label>Pacote</Label>
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
            <Label>Valor total (R$)</Label>
            <Input type="number" step="0.01" value={form.total_value ?? ""} onChange={(e) => setForm({ ...form, total_value: e.target.value ? Number(e.target.value) : null })} />
          </div>

          <div className="space-y-2">
            <Label>Observações</Label>
            <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3} />
          </div>

          {/* Checklist template selector - only for new events */}
          {!isEdit && templates.length > 0 && (
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5">
                <ListChecks className="h-4 w-4" /> Template de Checklist
              </Label>
              <Select value={selectedTemplate} onValueChange={(v) => {
                setSelectedTemplate(v);
                setForm({ ...form, checklist_template_id: v || null });
              }}>
                <SelectTrigger><SelectValue placeholder="Sem template" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sem template</SelectItem>
                  {templates.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name} ({t.items.length} itens)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {isEdit ? "Salvar" : "Criar Festa"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
