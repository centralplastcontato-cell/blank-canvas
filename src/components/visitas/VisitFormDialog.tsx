import { useState, useEffect } from "react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { getCurrentCompanyId } from "@/lib/supabase-helpers";
import { useCompanyUnits } from "@/hooks/useCompanyUnits";


import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  CalendarIcon, Loader2, MapPin, Package, User as UserIcon, X,
  PartyPopper, Clock, Users, DollarSign, CreditCard, UserPlus, Phone,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";

const TIME_OPTIONS = Array.from({ length: 28 }, (_, i) => {
  const h = String(Math.floor((i + 16) / 2)).padStart(2, "0");
  const m = (i + 16) % 2 === 0 ? "00" : "30";
  return `${h}:${m}`;
});

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

interface VisitFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  visitType: "visita" | "atendimento";
  currentUserId: string;
  onCreated?: () => void;
  /** When set, skip lead search and lock to this lead */
  fixedLead?: { id: string; name: string; unit?: string | null } | null;
}

export function VisitFormDialog({
  open,
  onOpenChange,
  visitType,
  currentUserId,
  onCreated,
  fixedLead,
}: VisitFormDialogProps) {
  const companyId = getCurrentCompanyId();
  const { units } = useCompanyUnits(companyId || undefined);

  // Lead search
  const [leadSearch, setLeadSearch] = useState("");
  const [leadId, setLeadId] = useState("");
  const [leadName, setLeadName] = useState("");
  const [leadResults, setLeadResults] = useState<{ id: string; name: string; whatsapp: string }[]>([]);

  // New client mode
  const [isNewClient, setIsNewClient] = useState(false);
  const [newClientName, setNewClientName] = useState("");
  const [newClientPhone, setNewClientPhone] = useState("");

  // Form
  const [date, setDate] = useState<Date | undefined>(undefined);
  const [time, setTime] = useState("");
  const [notes, setNotes] = useState("");
  const [responsavel, setResponsavel] = useState("");
  const [unit, setUnit] = useState("");
  const [itemsDesc, setItemsDesc] = useState("");
  const [eventId, setEventId] = useState("");
  const [leadEvents, setLeadEvents] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<{ user_id: string; full_name: string }[]>([]);
  const [saving, setSaving] = useState(false);

  const isAtendimento = visitType === "atendimento";

  // Load profiles
  useEffect(() => {
    if (!companyId || !open) return;
    supabase.from("profiles").select("user_id, full_name").then(({ data }) => {
      if (data) setProfiles(data);
    });
  }, [companyId, open]);

  // Set fixed lead when provided
  useEffect(() => {
    if (open && fixedLead) {
      setLeadId(fixedLead.id);
      setLeadName(fixedLead.name);
      setUnit(fixedLead.unit || "");
      if (isAtendimento) fetchLeadEvents(fixedLead.id);
    }
  }, [open, fixedLead]);

  const resetForm = () => {
    setLeadSearch("");
    setLeadId("");
    setLeadName("");
    setLeadResults([]);
    setIsNewClient(false);
    setNewClientName("");
    setNewClientPhone("");
    setDate(undefined);
    setTime("");
    setNotes("");
    setResponsavel("");
    setUnit("");
    setItemsDesc("");
    setEventId("");
    setLeadEvents([]);
  };

  // Lead search
  useEffect(() => {
    if (fixedLead || leadSearch.length < 2) { setLeadResults([]); return; }
    const t = setTimeout(async () => {
      const cid = getCurrentCompanyId();
      const { data } = await supabase
        .from("campaign_leads")
        .select("id, name, whatsapp")
        .eq("company_id", cid!)
        .or(`name.ilike.%${leadSearch}%,whatsapp.ilike.%${leadSearch}%`)
        .limit(10);
      setLeadResults(data || []);
    }, 300);
    return () => clearTimeout(t);
  }, [leadSearch, fixedLead]);

  const fetchLeadEvents = async (lid: string) => {
    const cid = getCurrentCompanyId();
    if (!cid) return;
    const { data } = await (supabase as any)
      .from("company_events")
      .select("id, title, event_date, start_time, end_time, event_type, guest_count, total_value, package_name, unit, status, child_name, child_age, payment_method")
      .eq("company_id", cid)
      .eq("lead_id", lid)
      .neq("status", "cancelado")
      .order("event_date", { ascending: true });
    setLeadEvents(data || []);
  };

  const handleSubmit = async () => {
    if (!date) {
      toast({ title: "Selecione uma data", variant: "destructive" });
      return;
    }

    let finalLeadId = leadId;

    // If new client mode, create lead first
    if (isNewClient) {
      if (!newClientName.trim() || !newClientPhone.trim()) {
        toast({ title: "Preencha nome e telefone do novo cliente", variant: "destructive" });
        return;
      }
      setSaving(true);
      const { data: newLead, error: leadError } = await (supabase as any)
        .from("campaign_leads")
        .insert({
          name: newClientName.trim(),
          whatsapp: newClientPhone.trim(),
          company_id: getCurrentCompanyId(),
          status: "novo",
          campaign_id: "00000000-0000-0000-0000-000000000000",
        })
        .select("id")
        .single();

      if (leadError || !newLead) {
        toast({ title: "Erro ao criar lead", description: leadError?.message, variant: "destructive" });
        setSaving(false);
        return;
      }
      finalLeadId = newLead.id;
    } else if (!leadId) {
      toast({ title: "Selecione um lead", variant: "destructive" });
      return;
    }

    setSaving(true);
    const payload: any = {
      lead_id: finalLeadId,
      company_id: getCurrentCompanyId(),
      data_visita: format(date, "yyyy-MM-dd"),
      horario_visita: time || null,
      status_visita: "agendada",
      observacoes: notes || null,
      responsavel_user_id: responsavel || null,
      created_by: currentUserId,
      unit: unit || null,
      visit_type: visitType,
    };
    if (isAtendimento) {
      payload.event_id = eventId || null;
      payload.items_description = itemsDesc || null;
    }

    const { error } = await (supabase as any).from("lead_visits").insert(payload);
    if (error) {
      toast({ title: "Erro ao criar agendamento", description: error.message, variant: "destructive" });
    } else {
      toast({ title: isAtendimento ? "Atendimento agendado!" : "Visita criada!" });
      onOpenChange(false);
      resetForm();
      onCreated?.();
    }
    setSaving(false);
  };

  const selectedEvent = leadEvents.find((e: any) => e.id === eventId);

  const canSubmit = saving || !date || (!isNewClient && !leadId) || (isNewClient && (!newClientName.trim() || !newClientPhone.trim()));

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) resetForm(); onOpenChange(v); }}>
      <DialogContent className="max-w-[520px] max-h-[90vh] p-0 gap-0 overflow-hidden rounded-2xl [&>button]:top-5 [&>button]:right-5">
        <DialogHeader className={cn(
          "px-7 pt-7 pb-4 border-b border-border/40",
          isAtendimento ? "bg-violet-50/50 dark:bg-violet-950/20" : "bg-muted/30"
        )}>
          <DialogTitle className="text-lg font-bold tracking-tight flex items-center gap-2">
            {isAtendimento ? <><Package className="h-5 w-5 text-violet-600" /> Agendar Atendimento</> : "Nova Visita"}
          </DialogTitle>
          <p className="text-[13px] text-muted-foreground mt-1">
            {isAtendimento ? "Agende um atendimento para um cliente com festa fechada" : "Agende uma nova visita para um lead"}
          </p>
        </DialogHeader>

        <div className="overflow-y-auto px-7 py-6 space-y-5" style={{ maxHeight: "calc(90vh - 180px)" }}>
          {/* Lead section */}
          <div className="rounded-xl border border-border/40 bg-card p-5 shadow-sm">
            <SectionHeader icon={UserIcon} label="Lead" />
            
            {/* Toggle: existing lead vs new client */}
            {!fixedLead && (
              <div className="flex gap-2 mb-4">
                <Button
                  type="button"
                  variant={!isNewClient ? "default" : "outline"}
                  size="sm"
                  className="flex-1 text-xs"
                  onClick={() => { setIsNewClient(false); setNewClientName(""); setNewClientPhone(""); }}
                >
                  <UserIcon className="h-3.5 w-3.5 mr-1.5" />
                  Lead existente
                </Button>
                <Button
                  type="button"
                  variant={isNewClient ? "default" : "outline"}
                  size="sm"
                  className="flex-1 text-xs"
                  onClick={() => { setIsNewClient(true); setLeadId(""); setLeadName(""); setLeadResults([]); setLeadSearch(""); }}
                >
                  <UserPlus className="h-3.5 w-3.5 mr-1.5" />
                  Novo cliente
                </Button>
              </div>
            )}

            {isNewClient ? (
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-foreground/70">Nome *</Label>
                  <input
                    type="text"
                    value={newClientName}
                    onChange={(e) => setNewClientName(e.target.value)}
                    placeholder="Nome do cliente"
                    className="w-full h-10 px-3 rounded-lg border border-border/60 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-foreground/70">Telefone (WhatsApp) *</Label>
                  <input
                    type="tel"
                    value={newClientPhone}
                    onChange={(e) => setNewClientPhone(e.target.value)}
                    placeholder="(11) 99999-9999"
                    className="w-full h-10 px-3 rounded-lg border border-border/60 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
                <p className="text-xs text-muted-foreground">O lead será criado automaticamente no CRM</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                <Label className="text-sm font-medium text-foreground/70">Selecionar lead *</Label>
                {leadId ? (
                  <div className="flex items-center gap-2 p-2.5 rounded-lg border border-primary/30 bg-primary/5">
                    <UserIcon className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium flex-1">{leadName}</span>
                    {!fixedLead && (
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => { setLeadId(""); setLeadName(""); setLeadEvents([]); setEventId(""); }}>
                        <X className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="relative">
                    <input
                      type="text"
                      value={leadSearch}
                      onChange={(e) => setLeadSearch(e.target.value)}
                      placeholder="Buscar lead por nome ou telefone..."
                      className="w-full h-10 px-3 rounded-lg border border-border/60 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                    {leadResults.length > 0 && (
                      <div className="absolute z-10 w-full mt-1 rounded-lg border border-border bg-card shadow-lg max-h-48 overflow-y-auto">
                        {leadResults.map(l => (
                          <button
                            key={l.id}
                            className="w-full text-left px-3 py-2.5 text-sm hover:bg-muted/50 transition-colors first:rounded-t-lg last:rounded-b-lg"
                            onClick={() => {
                              setLeadId(l.id);
                              setLeadName(l.name);
                              setLeadResults([]);
                              setLeadSearch("");
                              if (isAtendimento) fetchLeadEvents(l.id);
                            }}
                          >
                            <span className="font-medium">{l.name}</span>
                            <span className="text-muted-foreground ml-2 text-xs">{l.whatsapp}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Event link - only for atendimento */}
          {isAtendimento && leadId && (
            <div className="rounded-xl border border-violet-300/40 bg-violet-50/30 dark:bg-violet-950/10 p-5 shadow-sm">
              <SectionHeader icon={PartyPopper} label="Festa vinculada" />
              <div className="space-y-2.5">
                <Label className="text-sm font-medium text-foreground/70">Vincular a uma festa (opcional)</Label>
                <Select value={eventId || "none"} onValueChange={(v) => setEventId(v === "none" ? "" : v)}>
                  <SelectTrigger><SelectValue placeholder="Selecionar festa" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sem vínculo</SelectItem>
                    {leadEvents.map((e: any) => (
                      <SelectItem key={e.id} value={e.id}>
                        {e.title} — {format(parseISO(e.event_date + "T12:00:00"), "dd/MM/yyyy")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {leadEvents.length === 0 && (
                  <p className="text-xs text-muted-foreground">Nenhuma festa encontrada para este lead</p>
                )}
              </div>

              {/* Event summary card */}
              {selectedEvent && (() => {
                const eventDate = format(parseISO(selectedEvent.event_date + "T12:00:00"), "dd/MM/yyyy");
                const timeStr = selectedEvent.start_time
                  ? `${selectedEvent.start_time}${selectedEvent.end_time ? ` – ${selectedEvent.end_time}` : ""}`
                  : null;
                return (
                  <div className="mt-4 rounded-lg border border-violet-200/60 dark:border-violet-800/40 bg-white/80 dark:bg-violet-950/30 p-4 space-y-2">
                    <p className="text-sm font-semibold text-foreground">{selectedEvent.title}</p>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1.5"><CalendarIcon className="h-3 w-3 text-violet-500" /><span>{eventDate}</span></div>
                      {timeStr && <div className="flex items-center gap-1.5"><Clock className="h-3 w-3 text-violet-500" /><span>{timeStr}</span></div>}
                      {selectedEvent.event_type && <div className="flex items-center gap-1.5"><PartyPopper className="h-3 w-3 text-violet-500" /><span className="capitalize">{selectedEvent.event_type}</span></div>}
                      {selectedEvent.guest_count && <div className="flex items-center gap-1.5"><Users className="h-3 w-3 text-violet-500" /><span>{selectedEvent.guest_count} convidados</span></div>}
                      {selectedEvent.package_name && <div className="flex items-center gap-1.5"><Package className="h-3 w-3 text-violet-500" /><span>{selectedEvent.package_name}</span></div>}
                      {selectedEvent.unit && <div className="flex items-center gap-1.5"><MapPin className="h-3 w-3 text-violet-500" /><span>{selectedEvent.unit}</span></div>}
                      {selectedEvent.total_value != null && selectedEvent.total_value > 0 && (
                        <div className="flex items-center gap-1.5"><DollarSign className="h-3 w-3 text-violet-500" /><span>R$ {Number(selectedEvent.total_value).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span></div>
                      )}
                      {selectedEvent.payment_method && <div className="flex items-center gap-1.5"><CreditCard className="h-3 w-3 text-violet-500" /><span className="capitalize">{selectedEvent.payment_method}</span></div>}
                    </div>
                    {selectedEvent.child_name && (
                      <p className="text-xs text-muted-foreground mt-1 pt-1.5 border-t border-violet-100 dark:border-violet-800/30">
                        🎂 {selectedEvent.child_name}{selectedEvent.child_age ? ` (${selectedEvent.child_age})` : ""}
                      </p>
                    )}
                  </div>
                );
              })()}
            </div>
          )}

          {/* Date & Time */}
          <div className="rounded-xl border border-border/40 bg-card p-5 shadow-sm">
            <SectionHeader icon={CalendarIcon} label="Data e Horário" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-y-5">
              <div className="space-y-2.5 md:pr-6">
                <Label className="text-sm font-medium text-foreground/70">Data *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !date && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {date ? format(date, "dd/MM/yyyy") : "Selecionar data"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={date} onSelect={setDate} locale={ptBR} className="p-3 pointer-events-auto" />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2.5 md:pl-6 md:border-l md:border-border/50">
                <Label className="text-sm font-medium text-foreground/70">Horário</Label>
                <Select value={time || "none"} onValueChange={(v) => setTime(v === "none" ? "" : v)}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sem horário</SelectItem>
                    {TIME_OPTIONS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2.5 md:pr-6">
                <Label className="text-sm font-medium text-foreground/70">Responsável</Label>
                <Select value={responsavel || "none"} onValueChange={(v) => setResponsavel(v === "none" ? "" : v)}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sem responsável</SelectItem>
                    {profiles.map(p => <SelectItem key={p.user_id} value={p.user_id}>{p.full_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              {units.length > 1 && (
                <div className="space-y-2.5 md:pl-6 md:border-l md:border-border/50">
                  <Label className="text-sm font-medium text-foreground/70">Unidade</Label>
                  <Select value={unit || "none"} onValueChange={(v) => setUnit(v === "none" ? "" : v)}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Selecionar unidade</SelectItem>
                      {units.map(u => <SelectItem key={u.id} value={u.name}>{u.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </div>

          {/* Items description for atendimento */}
          {isAtendimento && (
            <div className="rounded-xl border border-violet-300/40 bg-violet-50/30 dark:bg-violet-950/10 p-5 shadow-sm">
              <SectionHeader icon={Package} label="Detalhes" />
              <div className="space-y-2.5">
                <Label className="text-sm font-medium text-foreground/70">Motivo / itens do atendimento</Label>
                <Textarea value={itemsDesc} onChange={(e) => setItemsDesc(e.target.value)} rows={3} placeholder="Ex: pagamento de parcela, tirar dúvidas sobre o evento, entrega de lembrancinhas..." />
              </div>
            </div>
          )}

          {/* Notes */}
          <div className="rounded-xl border border-border/40 bg-card p-5 shadow-sm">
            <SectionHeader icon={MapPin} label="Observações" />
            <div className="space-y-2.5">
              <Label className="text-sm font-medium text-foreground/70">Notas adicionais</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder={isAtendimento ? "Observações sobre o atendimento..." : "Informações sobre a visita..."} />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-7 py-4 border-t border-border/40 bg-muted/20">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button
            onClick={handleSubmit}
            disabled={saving || !leadId || !date}
            className={cn("px-8 rounded-lg shadow-sm", isAtendimento && "bg-violet-600 hover:bg-violet-700")}
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            {isAtendimento ? "Agendar Atendimento" : "Criar Visita"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
