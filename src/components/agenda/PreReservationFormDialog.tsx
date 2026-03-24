import { useState, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { addDays, format } from "date-fns";
import { Loader2, Search, UserCheck, X } from "lucide-react";
import type { CompanyUnit } from "@/hooks/useCompanyUnits";

export interface PreReservation {
  id: string;
  company_id: string;
  lead_id: string | null;
  customer_name: string;
  customer_phone: string | null;
  event_date: string;
  unit: string | null;
  reservation_days: number;
  reservation_start_at: string;
  reservation_expires_at: string;
  status: string;
  notes: string | null;
  created_by: string | null;
  converted_event_id: string | null;
  cancellation_reason: string | null;
  created_at: string;
  updated_at: string;
}

interface PreReservationFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: string;
  userId: string;
  units: CompanyUnit[];
  onSuccess: () => void;
  initialData?: PreReservation | null;
  initialDate?: string;
}

interface LeadOption {
  id: string;
  name: string;
  whatsapp: string;
}

export function PreReservationFormDialog({
  open, onOpenChange, companyId, userId, units, onSuccess, initialData, initialDate,
}: PreReservationFormDialogProps) {
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [unit, setUnit] = useState("");
  const [notes, setNotes] = useState("");
  const [reservationDays, setReservationDays] = useState("3");
  const [leadId, setLeadId] = useState<string | null>(null);
  const [leadSearch, setLeadSearch] = useState("");
  const [leadResults, setLeadResults] = useState<LeadOption[]>([]);
  const [leadSearching, setLeadSearching] = useState(false);
  const [selectedLead, setSelectedLead] = useState<LeadOption | null>(null);
  const [saving, setSaving] = useState(false);

  const physicalUnits = units.filter(u => u.slug !== "trabalhe-conosco");

  useEffect(() => {
    if (open) {
      if (initialData) {
        setCustomerName(initialData.customer_name);
        setCustomerPhone(initialData.customer_phone || "");
        setEventDate(initialData.event_date);
        setUnit(initialData.unit || "");
        setNotes(initialData.notes || "");
        setReservationDays(String(initialData.reservation_days));
        setLeadId(initialData.lead_id);
        if (initialData.lead_id) {
          supabase.from("campaign_leads").select("id, name, whatsapp").eq("id", initialData.lead_id).single()
            .then(({ data }) => {
              if (data) setSelectedLead(data as LeadOption);
            });
        }
      } else {
        setCustomerName("");
        setCustomerPhone("");
        setEventDate(initialDate || "");
        setUnit("");
        setNotes("");
        setReservationDays("3");
        setLeadId(null);
        setSelectedLead(null);
      }
      setLeadSearch("");
      setLeadResults([]);
    }
  }, [open, initialData, initialDate]);

  const searchLeads = useCallback(async (term: string) => {
    if (term.trim().length < 2) { setLeadResults([]); return; }
    setLeadSearching(true);
    const clean = `%${term.trim()}%`;
    const { data } = await supabase
      .from("campaign_leads")
      .select("id, name, whatsapp")
      .eq("company_id", companyId)
      .or(`name.ilike.${clean},whatsapp.ilike.${clean}`)
      .limit(10);
    setLeadResults((data || []) as LeadOption[]);
    setLeadSearching(false);
  }, [companyId]);

  useEffect(() => {
    const t = setTimeout(() => { if (leadSearch.trim().length >= 2) searchLeads(leadSearch); }, 300);
    return () => clearTimeout(t);
  }, [leadSearch, searchLeads]);

  const selectLead = (lead: LeadOption) => {
    setSelectedLead(lead);
    setLeadId(lead.id);
    setCustomerName(lead.name);
    setCustomerPhone(lead.whatsapp || "");
    setLeadSearch("");
    setLeadResults([]);
  };

  const clearLead = () => {
    setSelectedLead(null);
    setLeadId(null);
  };

  const expiresAt = eventDate && reservationDays
    ? format(addDays(new Date(), parseInt(reservationDays)), "dd/MM/yyyy")
    : "";

  const handleSubmit = async () => {
    if (!customerName.trim() || !eventDate) {
      toast({ title: "Preencha nome e data", variant: "destructive" });
      return;
    }
    setSaving(true);
    const days = parseInt(reservationDays);
    const expiresDate = addDays(new Date(), days).toISOString();

    const payload: any = {
      company_id: companyId,
      customer_name: customerName.trim(),
      customer_phone: customerPhone.trim() || null,
      event_date: eventDate,
      unit: unit || null,
      reservation_days: days,
      reservation_expires_at: expiresDate,
      notes: notes.trim() || null,
      lead_id: leadId,
    };

    let error;
    if (initialData) {
      ({ error } = await supabase.from("pre_reservations").update(payload).eq("id", initialData.id));
    } else {
      payload.created_by = userId;
      payload.reservation_start_at = new Date().toISOString();
      ({ error } = await supabase.from("pre_reservations").insert(payload));

      // Register in lead history
      if (!error && leadId) {
        await (supabase as any).from("lead_history").insert({
          lead_id: leadId,
          company_id: companyId,
          action: "pre_reserva_criada",
          details: `Pré-reserva criada para ${eventDate} (${days} dias)`,
          performed_by: userId,
        });
      }
    }

    if (error) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
    } else {
      toast({ title: initialData ? "Pré-reserva atualizada!" : "Pré-reserva criada!" });
      onSuccess();
      onOpenChange(false);
    }
    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-pink-400" />
            {initialData ? "Editar Pré-reserva" : "Nova Pré-reserva"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Lead search */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Vincular lead existente</Label>
            {selectedLead ? (
              <div className="flex items-center gap-2 p-2.5 rounded-xl border border-pink-200 bg-pink-50/50">
                <UserCheck className="h-4 w-4 text-pink-500 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{selectedLead.name}</p>
                  <p className="text-xs text-muted-foreground">{selectedLead.whatsapp}</p>
                </div>
                <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={clearLead}>
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            ) : (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={leadSearch}
                  onChange={(e) => setLeadSearch(e.target.value)}
                  placeholder="Buscar por nome ou telefone..."
                  className="pl-9"
                />
                {leadResults.length > 0 && (
                  <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-xl shadow-lg max-h-48 overflow-y-auto">
                    {leadResults.map((lead) => (
                      <button
                        key={lead.id}
                        onClick={() => selectLead(lead)}
                        className="w-full text-left px-3 py-2 hover:bg-accent text-sm flex items-center gap-2"
                      >
                        <span className="font-medium truncate">{lead.name}</span>
                        <span className="text-xs text-muted-foreground shrink-0">{lead.whatsapp}</span>
                      </button>
                    ))}
                  </div>
                )}
                {leadSearching && (
                  <div className="absolute z-50 w-full mt-1 bg-popover border rounded-xl p-3 flex justify-center">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Nome do cliente *</Label>
              <Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Nome completo" />
            </div>
            <div className="space-y-2">
              <Label>Telefone</Label>
              <Input value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} placeholder="(11) 99999-0000" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Data da festa *</Label>
              <Input type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Unidade</Label>
              <Select value={unit} onValueChange={setUnit}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {physicalUnits.map(u => (
                    <SelectItem key={u.name} value={u.name}>{u.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Duração da pré-reserva</Label>
            <Select value={reservationDays} onValueChange={setReservationDays}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {[1, 2, 3, 4, 5, 6, 7].map(d => (
                  <SelectItem key={d} value={String(d)}>{d} dia{d > 1 ? "s" : ""}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {expiresAt && (
              <p className="text-xs text-muted-foreground">
                Válida até: <span className="font-medium text-pink-600">{expiresAt}</span>
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Observações internas</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Anotações sobre esta pré-reserva..." rows={3} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={saving} className="bg-pink-500 hover:bg-pink-600 text-white">
            {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            {initialData ? "Salvar" : "Criar Pré-reserva"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
