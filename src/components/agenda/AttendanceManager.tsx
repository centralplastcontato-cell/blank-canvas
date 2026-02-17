import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentCompanyId } from "@/hooks/useCurrentCompanyId";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { toast } from "@/hooks/use-toast";
import { Users, Plus, Trash2, ChevronDown, ChevronRight, Pencil, Loader2, Share2, ExternalLink } from "lucide-react";
import { format } from "date-fns";
import { useCompany } from "@/contexts/CompanyContext";
import { SendBotButton } from "./SendBotDialog";

interface Guest {
  name: string;
  age: string;
  phone: string;
  is_child_only: boolean;
  guardian_name: string;
  guardian_phone: string;
  wants_info: boolean;
}

interface AttendanceRecord {
  id: string;
  company_id: string;
  event_id: string | null;
  guests: Guest[];
  receptionist_name: string | null;
  notes: string | null;
  filled_by: string | null;
  created_at: string;
  updated_at: string;
  event?: { title: string; event_date: string };
}

interface CalendarEvent {
  event_id: string;
  event_title: string;
  event_date: string;
  lead_name: string | null;
}

export function AttendanceManager() {
  const companyId = useCurrentCompanyId();
  const { currentCompany } = useCompany();
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedEventId, setSelectedEventId] = useState("");
  const [notes, setNotes] = useState("");
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());

  const fetchData = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);
    const [entriesRes, eventsRes] = await Promise.all([
      supabase
        .from("attendance_entries")
        .select("*")
        .eq("company_id", companyId)
        .order("created_at", { ascending: false }),
      supabase.rpc("get_company_events_for_cardapio", { _company_id: companyId }),
    ]);

    if (entriesRes.data) {
      const eventIds = [...new Set(entriesRes.data.map((e: any) => e.event_id).filter(Boolean))];
      let eventMap = new Map();
      if (eventIds.length > 0) {
        const { data: eventDetails } = await supabase
          .from("company_events")
          .select("id, title, event_date")
          .in("id", eventIds);
        eventMap = new Map((eventDetails || []).map((e: any) => [e.id, e]));
      }

      setRecords(
        entriesRes.data.map((r: any) => ({
          ...r,
          guests: (r.guests || []) as Guest[],
          event: eventMap.get(r.event_id) as any,
        }))
      );
    }
    if (eventsRes.data) setEvents(eventsRes.data as CalendarEvent[]);
    setLoading(false);
  }, [companyId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openNew = () => {
    setEditingId(null);
    setSelectedEventId("");
    setNotes("");
    setDialogOpen(true);
  };

  const openEdit = (record: AttendanceRecord) => {
    setEditingId(record.id);
    setSelectedEventId(record.event_id || "");
    setNotes(record.notes || "");
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!companyId) {
      toast({ title: "Selecione uma empresa", variant: "destructive" });
      return;
    }
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();

    const payload: any = {
      event_id: selectedEventId || null,
      company_id: companyId,
      filled_by: user?.id || null,
      notes: notes || null,
    };

    let error;
    if (editingId) {
      ({ error } = await supabase.from("attendance_entries").update(payload).eq("id", editingId));
    } else {
      payload.guests = [];
      ({ error } = await supabase.from("attendance_entries").insert(payload));
    }

    setSaving(false);
    if (error) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
    } else {
      toast({ title: editingId ? "Atualizado!" : "Salvo!" });
      setDialogOpen(false);
      fetchData();
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("attendance_entries").delete().eq("id", id);
    if (error) toast({ title: "Erro ao excluir", variant: "destructive" });
    else { toast({ title: "Excluído!" }); fetchData(); }
  };

  const toggleCard = (id: string) => {
    setExpandedCards(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };


  if (loading) return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          <h3 className="font-semibold text-lg">Lista de Presença</h3>
        </div>
        <Button size="sm" onClick={openNew} className="gap-1.5">
          <Plus className="h-4 w-4" /> Nova Lista
        </Button>
      </div>

      {records.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <Users className="h-10 w-10 mx-auto mb-2 opacity-40" />
            <p>Nenhuma lista de presença ainda.</p>
            <p className="text-sm">Clique em "Nova Lista" para começar.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {records.map(record => {
            const isOpen = expandedCards.has(record.id);
            const guestCount = record.guests.length;
            const wantsInfoCount = record.guests.filter(g => g.wants_info).length;

            return (
              <Collapsible key={record.id} open={isOpen} onOpenChange={() => toggleCard(record.id)}>
                <Card>
                  <CollapsibleTrigger asChild>
                    <CardHeader className="cursor-pointer py-3 px-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 min-w-0">
                          {isOpen ? <ChevronDown className="h-4 w-4 shrink-0" /> : <ChevronRight className="h-4 w-4 shrink-0" />}
                          <div className="min-w-0">
                            <CardTitle className="text-sm font-medium truncate">
                              {record.event?.title || (record.event_id ? "Festa" : "Sem festa vinculada")}
                            </CardTitle>
                            <p className="text-xs text-muted-foreground">
                              {record.event?.event_date
                                ? format(new Date(record.event.event_date + "T12:00:00"), "dd/MM/yyyy")
                                : !record.event_id ? "Aguardando vincular" : ""}
                              {" · "}
                              {guestCount} convidado{guestCount !== 1 ? "s" : ""}
                              {wantsInfoCount > 0 && ` · ${wantsInfoCount} quer info`}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <SendBotButton guests={record.guests} recordId={record.id} onSent={fetchData} />
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={e => { e.stopPropagation(); const baseUrl = currentCompany?.custom_domain ? `https://${currentCompany.custom_domain}` : window.location.origin; window.open(`${baseUrl}/lista-presenca/${record.id}`, '_blank'); }}>
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={e => { e.stopPropagation(); const baseUrl = currentCompany?.custom_domain ? `https://${currentCompany.custom_domain}` : window.location.origin; navigator.clipboard.writeText(`${baseUrl}/lista-presenca/${record.id}`); toast({ title: "Link copiado!" }); }}>
                            <Share2 className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={e => { e.stopPropagation(); openEdit(record); }}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={e => { e.stopPropagation(); handleDelete(record.id); }}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <CardContent className="pt-0 pb-4 px-4 space-y-2">
                      {record.receptionist_name && (
                        <p className="text-sm text-muted-foreground">👤 Recepcionista: {record.receptionist_name}</p>
                      )}
                      {record.guests.length === 0 ? (
                        <p className="text-sm text-muted-foreground italic">Nenhum convidado registrado ainda.</p>
                      ) : (
                        record.guests.map((guest, i) => (
                          <div key={i} className="text-sm pl-3 border-l-2 border-border py-1">
                            <span className="font-medium">#{i + 1} {guest.name}</span>
                            {guest.age && <span className="text-muted-foreground"> ({guest.age})</span>}
                            {guest.phone && <span className="text-muted-foreground"> — {guest.phone}</span>}
                            {guest.is_child_only && (
                              <p className="text-xs text-muted-foreground mt-0.5 pl-2">
                                👶 Criança desacompanhada · Resp: {guest.guardian_name} {guest.guardian_phone}
                              </p>
                            )}
                            {guest.wants_info && (
                              <span className="text-xs text-primary ml-2">✅ Quer info</span>
                            )}
                          </div>
                        ))
                      )}
                      {record.notes && (
                        <p className="text-sm text-muted-foreground pt-1">📝 {record.notes}</p>
                      )}
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            );
          })}
        </div>
      )}

      {/* Dialog criar/editar */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[85dvh] flex flex-col p-0 gap-0 overflow-hidden">
          <DialogHeader className="p-4 pb-2 shrink-0">
            <DialogTitle>{editingId ? "Editar Lista" : "Nova Lista de Presença"}</DialogTitle>
          </DialogHeader>

          <div className="flex-1 min-h-0 overflow-y-auto px-4 pb-4 space-y-4" style={{ WebkitOverflowScrolling: 'touch', overscrollBehavior: 'contain' }}>
            <div>
              <Label className="mb-1.5 block">Festa <span className="text-muted-foreground font-normal">(opcional)</span></Label>
              <Select value={selectedEventId} onValueChange={setSelectedEventId}>
                <SelectTrigger className="h-12">
                  <SelectValue placeholder="Vincular a uma festa..." />
                </SelectTrigger>
                <SelectContent>
                  {events.map(ev => (
                    <SelectItem key={ev.event_id} value={ev.event_id}>
                      {ev.event_title} — {format(new Date(ev.event_date + "T12:00:00"), "dd/MM/yyyy")}
                      {ev.lead_name ? ` (${ev.lead_name})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="mb-1.5 block">Observações</Label>
              <Textarea
                placeholder="Anotações adicionais..."
                value={notes}
                onChange={e => setNotes(e.target.value)}
                rows={3}
              />
            </div>

            <p className="text-xs text-muted-foreground">
              Após criar, compartilhe o link público para a recepcionista registrar os convidados pelo celular.
            </p>
          </div>

          <DialogFooter className="p-4 pt-2 shrink-0 border-t">
            <Button onClick={handleSave} disabled={saving} className="w-full h-12">
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingId ? "Salvar Alterações" : "Criar Lista"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
