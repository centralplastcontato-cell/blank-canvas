import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentCompanyId } from "@/hooks/useCurrentCompanyId";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { toast } from "@/hooks/use-toast";
import { Users, Plus, Trash2, ChevronDown, ChevronRight, Pencil, Loader2, Share2, ExternalLink, UserPlus, Check, X } from "lucide-react";
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
  const [receptionistName, setReceptionistName] = useState("");
  const [guests, setGuests] = useState<Guest[]>([]);
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());

  // Add guest form
  const [guestName, setGuestName] = useState("");
  const [guestAge, setGuestAge] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [isChildOnly, setIsChildOnly] = useState(false);
  const [guardianName, setGuardianName] = useState("");
  const [guardianPhone, setGuardianPhone] = useState("");
  const [wantsInfo, setWantsInfo] = useState(false);
  // Editing guest inline
  const [editingGuestIdx, setEditingGuestIdx] = useState<number | null>(null);
  const [editGuest, setEditGuest] = useState<Guest | null>(null);

  const resetGuestForm = () => {
    setGuestName("");
    setGuestAge("");
    setGuestPhone("");
    setIsChildOnly(false);
    setGuardianName("");
    setGuardianPhone("");
    setWantsInfo(false);
  };

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
    setReceptionistName("");
    setGuests([]);
    setEditingGuestIdx(null);
    setEditGuest(null);
    resetGuestForm();
    setDialogOpen(true);
  };

  const openEdit = (record: AttendanceRecord) => {
    setEditingId(record.id);
    setSelectedEventId(record.event_id || "");
    setNotes(record.notes || "");
    setReceptionistName(record.receptionist_name || "");
    setGuests(record.guests || []);
    setEditingGuestIdx(null);
    setEditGuest(null);
    resetGuestForm();
    setDialogOpen(true);
  };

  const handleAddGuest = () => {
    if (!guestName.trim()) {
      toast({ title: "Informe o nome do convidado", variant: "destructive" });
      return;
    }
    if (isChildOnly && (!guardianName.trim() || !guardianPhone.trim())) {
      toast({ title: "Informe responsável e telefone", variant: "destructive" });
      return;
    }
    const newGuest: Guest = {
      name: guestName.trim(),
      age: guestAge.trim(),
      phone: guestPhone.trim(),
      is_child_only: isChildOnly,
      guardian_name: isChildOnly ? guardianName.trim() : "",
      guardian_phone: isChildOnly ? guardianPhone.trim() : "",
      wants_info: wantsInfo,
    };
    setGuests(prev => [...prev, newGuest]);
    resetGuestForm();
    toast({ title: `✅ ${newGuest.name} adicionado(a)!` });
  };

  const startEditGuest = (idx: number) => {
    setEditingGuestIdx(idx);
    setEditGuest({ ...guests[idx] });
  };

  const cancelEditGuest = () => {
    setEditingGuestIdx(null);
    setEditGuest(null);
  };

  const saveEditGuest = () => {
    if (editingGuestIdx === null || !editGuest) return;
    if (!editGuest.name.trim()) {
      toast({ title: "Nome é obrigatório", variant: "destructive" });
      return;
    }
    setGuests(prev => prev.map((g, i) => i === editingGuestIdx ? { ...editGuest, name: editGuest.name.trim() } : g));
    setEditingGuestIdx(null);
    setEditGuest(null);
  };

  const removeGuestAt = (idx: number) => {
    setGuests(prev => prev.filter((_, i) => i !== idx));
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
      receptionist_name: receptionistName || null,
      guests: guests as any,
    };

    let error;
    if (editingId) {
      ({ error } = await supabase.from("attendance_entries").update(payload).eq("id", editingId));
    } else {
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
    <div className="max-w-6xl mx-auto space-y-4">
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
                <Card className="bg-card border-border">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <h3 className="font-semibold truncate">
                          {record.event?.title || (record.event_id ? "Festa" : "Sem festa vinculada")}
                        </h3>
                        <p className="text-sm text-muted-foreground line-clamp-1">
                          {record.event?.event_date
                            ? format(new Date(record.event.event_date + "T12:00:00"), "dd/MM/yyyy")
                            : !record.event_id ? "Aguardando vincular" : ""}
                          {" · "}
                          {guestCount} convidado{guestCount !== 1 ? "s" : ""}
                          {wantsInfoCount > 0 && ` · ${wantsInfoCount} quer info`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap border-t border-border/50 pt-3">
                      <CollapsibleTrigger asChild>
                        <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs rounded-full px-3.5 bg-muted/30 border-border/60 hover:bg-primary/10 hover:text-primary hover:border-primary/30 transition-all">
                          {isOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />} Detalhes
                        </Button>
                      </CollapsibleTrigger>
                      <SendBotButton guests={record.guests} recordId={record.id} onSent={fetchData} />
                      <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs rounded-full px-3.5 bg-muted/30 border-border/60 hover:bg-primary/10 hover:text-primary hover:border-primary/30 transition-all" onClick={() => { const baseUrl = currentCompany?.custom_domain ? `https://${currentCompany.custom_domain}` : window.location.origin; window.open(`${baseUrl}/lista-presenca/${record.id}`, '_blank'); }}>
                        <ExternalLink className="h-3.5 w-3.5" /> Abrir
                      </Button>
                      <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs rounded-full px-3.5 bg-muted/30 border-border/60 hover:bg-primary/10 hover:text-primary hover:border-primary/30 transition-all" onClick={() => { const domain = currentCompany?.custom_domain || ''; const link = domain ? `${domain}/lista-presenca/${record.id}` : `${window.location.origin}/lista-presenca/${record.id}`; navigator.clipboard.writeText(link); toast({ title: "Link copiado!" }); }}>
                        <Share2 className="h-3.5 w-3.5" /> Link
                      </Button>
                      <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs rounded-full px-3.5 bg-muted/30 border-border/60 hover:bg-primary/10 hover:text-primary hover:border-primary/30 transition-all" onClick={() => openEdit(record)}>
                        <Pencil className="h-3.5 w-3.5" /> Editar
                      </Button>
                      <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs rounded-full px-3.5 ml-auto border-destructive/30 text-destructive hover:bg-destructive/10 hover:border-destructive/50 transition-all" onClick={() => handleDelete(record.id)}>
                        <Trash2 className="h-3.5 w-3.5" /> Excluir
                      </Button>
                    </div>
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
                  </CardContent>
                </Card>
              </Collapsible>
            );
          })}
        </div>
      )}

      {/* Dialog criar/editar — layout idêntico à página pública */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90dvh] flex flex-col p-0 gap-0 overflow-hidden">
          <DialogHeader className="p-4 pb-2 shrink-0 border-b">
            <DialogTitle>{editingId ? "Editar Lista de Presença" : "Nova Lista de Presença"}</DialogTitle>
          </DialogHeader>

          <div
            className="flex-1 min-h-0 overflow-y-auto bg-gradient-to-b from-primary/5 via-background to-background px-4 py-5 space-y-5"
            style={{ WebkitOverflowScrolling: 'touch', overscrollBehavior: 'contain' }}
          >
            {/* Nome da Recepcionista */}
            <Card className="shadow-sm border-border/50">
              <CardContent className="p-4 space-y-2">
                <Label className="text-sm font-semibold text-foreground">Nome da Recepcionista</Label>
                <Input
                  placeholder="Seu nome..."
                  value={receptionistName}
                  onChange={e => setReceptionistName(e.target.value)}
                  className="h-12 bg-background"
                />
              </CardContent>
            </Card>

            {/* Festa */}
            <Card className="shadow-sm border-border/50">
              <CardContent className="p-4 space-y-2">
                <Label className="text-sm font-semibold text-foreground">Festa</Label>
                <Select value={selectedEventId} onValueChange={setSelectedEventId}>
                  <SelectTrigger className="h-12 bg-background">
                    <SelectValue placeholder="Selecione a festa..." />
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
              </CardContent>
            </Card>

            <Separator />

            {/* Lista de convidados já adicionados */}
            {guests.length > 0 && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">Convidados registrados ({guests.length})</Label>
                {guests.map((guest, i) => (
                  <Card key={i} className="shadow-sm border-border/40">
                    <CardContent className="py-2 px-3">
                      {editingGuestIdx === i && editGuest ? (
                        <div className="space-y-2">
                          <Input placeholder="Nome *" value={editGuest.name} onChange={e => setEditGuest({ ...editGuest, name: e.target.value })} className="h-10 bg-background" />
                          <div className="grid grid-cols-2 gap-2">
                            <Input placeholder="Idade" value={editGuest.age} onChange={e => setEditGuest({ ...editGuest, age: e.target.value })} className="h-10 bg-background" />
                            <Input placeholder="Telefone" value={editGuest.phone} onChange={e => setEditGuest({ ...editGuest, phone: e.target.value })} className="h-10 bg-background" />
                          </div>
                          <div className="flex items-center justify-between rounded-lg border border-border p-2">
                            <span className="text-xs">Criança desacompanhada</span>
                            <Switch checked={editGuest.is_child_only} onCheckedChange={v => setEditGuest({ ...editGuest, is_child_only: v })} />
                          </div>
                          {editGuest.is_child_only && (
                            <div className="grid grid-cols-2 gap-2 pl-2 border-l-2 border-primary/30">
                              <Input placeholder="Responsável" value={editGuest.guardian_name} onChange={e => setEditGuest({ ...editGuest, guardian_name: e.target.value })} className="h-10 bg-background" />
                              <Input placeholder="Tel. resp." value={editGuest.guardian_phone} onChange={e => setEditGuest({ ...editGuest, guardian_phone: e.target.value })} className="h-10 bg-background" />
                            </div>
                          )}
                          <div className="flex items-center justify-between rounded-lg border border-border p-2">
                            <span className="text-xs">Quer receber info</span>
                            <Switch checked={editGuest.wants_info} onCheckedChange={v => setEditGuest({ ...editGuest, wants_info: v })} />
                          </div>
                          <div className="flex gap-2">
                            <Button size="sm" onClick={saveEditGuest} className="flex-1 gap-1">
                              <Check className="h-3.5 w-3.5" /> Salvar
                            </Button>
                            <Button size="sm" variant="outline" onClick={cancelEditGuest} className="gap-1">
                              <X className="h-3.5 w-3.5" /> Cancelar
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium">
                              <span className="text-muted-foreground">#{i + 1}</span> {guest.name}
                              {guest.age && <span className="text-muted-foreground"> · {guest.age}</span>}
                            </p>
                            {guest.phone && <p className="text-xs text-muted-foreground">{guest.phone}</p>}
                            {guest.is_child_only && (
                              <p className="text-xs text-muted-foreground">👶 Resp: {guest.guardian_name} {guest.guardian_phone}</p>
                            )}
                            <div className="flex gap-2 mt-0.5">
                              {guest.wants_info && <span className="text-xs text-primary">✅ Quer info</span>}
                              {guest.is_child_only && <span className="text-xs text-muted-foreground">👶 Desacompanhada</span>}
                            </div>
                          </div>
                          <div className="flex items-center gap-0.5 shrink-0">
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground" onClick={() => startEditGuest(i)}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => removeGuestAt(i)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            <Separator />

            {/* Adicionar Convidado */}
            <Card className="shadow-sm border-border/50 border-l-4 border-l-primary/40">
              <CardContent className="p-4 space-y-3.5">
                <Label className="text-sm font-bold flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-primary/10">
                    <UserPlus className="h-4 w-4 text-primary" />
                  </div>
                  Adicionar Convidado
                </Label>

                <Input
                  placeholder="Nome do convidado *"
                  value={guestName}
                  onChange={e => setGuestName(e.target.value)}
                  className="h-12 bg-background"
                />

                <div className="grid grid-cols-2 gap-2">
                  <Input placeholder="Idade" value={guestAge} onChange={e => setGuestAge(e.target.value)} className="h-12 bg-background" />
                  <Input placeholder="Telefone" value={guestPhone} onChange={e => setGuestPhone(e.target.value)} className="h-12 bg-background" />
                </div>

                <div className="flex items-center justify-between rounded-xl border border-border/50 bg-muted/30 p-3.5">
                  <div>
                    <p className="text-sm font-medium">Criança desacompanhada</p>
                    <p className="text-xs text-muted-foreground">Pais deixaram a criança na festa</p>
                  </div>
                  <Switch checked={isChildOnly} onCheckedChange={setIsChildOnly} />
                </div>

                {isChildOnly && (
                  <div className="grid grid-cols-2 gap-2 pl-3 border-l-2 border-primary/30">
                    <Input placeholder="Nome do responsável *" value={guardianName} onChange={e => setGuardianName(e.target.value)} className="h-12 bg-background" />
                    <Input placeholder="Tel. responsável *" value={guardianPhone} onChange={e => setGuardianPhone(e.target.value)} className="h-12 bg-background" />
                  </div>
                )}

                <div className="flex items-center justify-between rounded-xl border border-border/50 bg-muted/30 p-3.5">
                  <div>
                    <p className="text-sm font-medium">Deseja receber informações</p>
                    <p className="text-xs text-muted-foreground">Sobre o buffet e eventos</p>
                  </div>
                  <Switch checked={wantsInfo} onCheckedChange={setWantsInfo} />
                </div>

                <Button
                  onClick={handleAddGuest}
                  disabled={!guestName.trim()}
                  className="w-full h-12 gap-2 rounded-xl text-base font-semibold shadow-md"
                >
                  <UserPlus className="h-4 w-4" />
                  Adicionar Convidado
                </Button>
              </CardContent>
            </Card>

            {/* Observações */}
            <Card className="shadow-sm border-border/50">
              <CardContent className="p-4 space-y-2">
                <Label className="text-sm font-semibold text-foreground">Observações</Label>
                <Textarea
                  placeholder="Anotações adicionais..."
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  rows={3}
                  className="bg-background"
                />
              </CardContent>
            </Card>
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
