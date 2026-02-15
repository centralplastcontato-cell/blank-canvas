import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Search, X, UserCheck } from "lucide-react";
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
  const [leadResults, setLeadResults] = useState<Array<{ id: string; name: string; whatsapp: string }>>([]);
  const [leadSearching, setLeadSearching] = useState(false);
  const [showLeadDropdown, setShowLeadDropdown] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(initialData || EMPTY);
      setLeadSearch("");
      setLeadResults([]);
      setShowLeadDropdown(false);
    }
  }, [open, initialData]);

  // Debounced lead search
  useEffect(() => {
    if (!leadSearch || leadSearch.length < 2 || !currentCompany?.id) {
      setLeadResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setLeadSearching(true);
      const { data } = await supabase
        .from("campaign_leads")
        .select("id, name, whatsapp")
        .eq("company_id", currentCompany.id)
        .ilike("name", `%${leadSearch}%`)
        .limit(10);
      setLeadResults(data || []);
      setLeadSearching(false);
      setShowLeadDropdown(true);
    }, 300);
    return () => clearTimeout(timer);
  }, [leadSearch, currentCompany?.id]);

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
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar Festa" : "Nova Festa"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Nome do cliente / Título *</Label>
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
                    placeholder="Buscar lead por nome..."
                    value={leadSearch}
                    onChange={(e) => setLeadSearch(e.target.value)}
                    className="pl-8"
                  />
                  {leadSearching && <Loader2 className="absolute right-2.5 top-2.5 h-4 w-4 animate-spin text-muted-foreground" />}
                </div>
                {showLeadDropdown && leadResults.length > 0 && (
                  <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-md shadow-md max-h-48 overflow-y-auto">
                    {leadResults.map((lead) => (
                      <button
                        key={lead.id}
                        type="button"
                        className="w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors"
                        onClick={() => {
                          setForm({ ...form, lead_id: lead.id, lead_name: lead.name, title: form.title || lead.name });
                          setLeadSearch("");
                          setShowLeadDropdown(false);
                        }}
                      >
                        <span className="font-medium">{lead.name}</span>
                        <span className="text-xs text-muted-foreground ml-2">{lead.whatsapp}</span>
                      </button>
                    ))}
                  </div>
                )}
                {showLeadDropdown && leadResults.length === 0 && leadSearch.length >= 2 && !leadSearching && (
                  <p className="text-xs text-muted-foreground mt-1">Nenhum lead encontrado.</p>
                )}
              </>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Data *</Label>
              <Input type="date" value={form.event_date} onChange={(e) => setForm({ ...form, event_date: e.target.value })} required />
            </div>
            <div>
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Horário início</Label>
              <Input type="time" value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })} />
            </div>
            <div>
              <Label>Horário fim</Label>
              <Input type="time" value={form.end_time} onChange={(e) => setForm({ ...form, end_time: e.target.value })} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Tipo de festa</Label>
              <Select value={form.event_type} onValueChange={(v) => setForm({ ...form, event_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {EVENT_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Convidados</Label>
              <Input type="number" value={form.guest_count ?? ""} onChange={(e) => setForm({ ...form, guest_count: e.target.value ? Number(e.target.value) : null })} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
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
            <div>
              <Label>Pacote</Label>
              <Input value={form.package_name} onChange={(e) => setForm({ ...form, package_name: e.target.value })} />
            </div>
          </div>

          <div>
            <Label>Valor total (R$)</Label>
            <Input type="number" step="0.01" value={form.total_value ?? ""} onChange={(e) => setForm({ ...form, total_value: e.target.value ? Number(e.target.value) : null })} />
          </div>

          <div>
            <Label>Observações</Label>
            <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3} />
          </div>

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
