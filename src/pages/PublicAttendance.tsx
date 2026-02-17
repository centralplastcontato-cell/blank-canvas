import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { Loader2, UserPlus, Users, Trash2, Pencil, Check, X } from "lucide-react";
import { format } from "date-fns";

interface Guest {
  name: string;
  age: string;
  phone: string;
  is_child_only: boolean;
  guardian_name: string;
  guardian_phone: string;
  wants_info: boolean;
}

interface AttendanceEntry {
  id: string;
  company_id: string;
  event_id: string | null;
  guests: Guest[];
  receptionist_name: string | null;
  notes: string | null;
}

interface EventInfo {
  id: string;
  title: string;
  event_date: string;
}

export default function PublicAttendance() {
  const { recordId } = useParams<{ recordId: string }>();
  const [entry, setEntry] = useState<AttendanceEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notFound, setNotFound] = useState(false);

  // Receptionist name
  const [receptionistName, setReceptionistName] = useState("");

  // Event linking
  const [events, setEvents] = useState<EventInfo[]>([]);
  const [selectedEventId, setSelectedEventId] = useState("");

  // New guest form
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

  // Company branding
  const [companyName, setCompanyName] = useState("");
  const [companyLogo, setCompanyLogo] = useState("");
  const [eventTitle, setEventTitle] = useState("");

  useEffect(() => {
    async function load() {
      if (!recordId) { setNotFound(true); setLoading(false); return; }

      const { data, error } = await supabase
        .from("attendance_entries")
        .select("*")
        .eq("id", recordId)
        .single();

      if (error || !data) { setNotFound(true); setLoading(false); return; }

      const entryData: AttendanceEntry = {
        ...data,
        guests: (data.guests || []) as unknown as Guest[],
      };
      setEntry(entryData);
      setReceptionistName(data.receptionist_name || "");
      setSelectedEventId(data.event_id || "");

      // Fetch company info
      const { data: company } = await supabase
        .from("companies")
        .select("name, logo_url")
        .eq("id", data.company_id)
        .single();
      if (company) {
        setCompanyName(company.name || "");
        setCompanyLogo(company.logo_url || "");
      }

      // Fetch event info if linked
      if (data.event_id) {
        const { data: ev } = await supabase
          .from("company_events")
          .select("id, title, event_date")
          .eq("id", data.event_id)
          .single();
        if (ev) setEventTitle(ev.title);
      }

      // Fetch events for linking
      const { data: eventsData } = await supabase
        .from("company_events")
        .select("id, title, event_date")
        .eq("company_id", data.company_id)
        .eq("status", "confirmado")
        .order("event_date", { ascending: true });
      if (eventsData) setEvents(eventsData);

      setLoading(false);
    }
    load();
  }, [recordId]);

  const saveEntry = async (updatedGuests: Guest[], extraFields: Record<string, any> = {}) => {
    if (!entry) return;
    setSaving(true);
    const { error } = await supabase
      .from("attendance_entries")
      .update({
        guests: updatedGuests as any,
        receptionist_name: receptionistName || null,
        event_id: selectedEventId || null,
        ...extraFields,
      })
      .eq("id", entry.id);
    setSaving(false);
    if (error) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
      return false;
    }
    return true;
  };

  const handleAddGuest = async () => {
    if (!guestName.trim()) {
      toast({ title: "Informe o nome do convidado", variant: "destructive" });
      return;
    }
    if (!entry) return;

    const newGuest: Guest = {
      name: guestName.trim(),
      age: guestAge.trim(),
      phone: guestPhone.trim(),
      is_child_only: isChildOnly,
      guardian_name: isChildOnly ? guardianName.trim() : "",
      guardian_phone: isChildOnly ? guardianPhone.trim() : "",
      wants_info: wantsInfo,
    };

    const updatedGuests = [...entry.guests, newGuest];
    const ok = await saveEntry(updatedGuests);
    if (ok) {
      setEntry({ ...entry, guests: updatedGuests });
      // Reset form
      setGuestName("");
      setGuestAge("");
      setGuestPhone("");
      setIsChildOnly(false);
      setGuardianName("");
      setGuardianPhone("");
      setWantsInfo(false);
      toast({ title: `✅ ${newGuest.name} adicionado(a)!` });
    }
  };

  const handleRemoveGuest = async (idx: number) => {
    if (!entry) return;
    const updatedGuests = entry.guests.filter((_, i) => i !== idx);
    const ok = await saveEntry(updatedGuests);
    if (ok) {
      setEntry({ ...entry, guests: updatedGuests });
      toast({ title: "Convidado removido" });
    }
  };

  const startEditGuest = (idx: number) => {
    if (!entry) return;
    setEditingGuestIdx(idx);
    setEditGuest({ ...entry.guests[idx] });
  };

  const cancelEditGuest = () => {
    setEditingGuestIdx(null);
    setEditGuest(null);
  };

  const saveEditGuest = async () => {
    if (!entry || editingGuestIdx === null || !editGuest) return;
    if (!editGuest.name.trim()) {
      toast({ title: "Nome é obrigatório", variant: "destructive" });
      return;
    }
    const updatedGuests = entry.guests.map((g, i) => i === editingGuestIdx ? { ...editGuest, name: editGuest.name.trim() } : g);
    const ok = await saveEntry(updatedGuests);
    if (ok) {
      setEntry({ ...entry, guests: updatedGuests });
      setEditingGuestIdx(null);
      setEditGuest(null);
      toast({ title: "Convidado atualizado!" });
    }
  };
  const handleReceptionistBlur = async () => {
    if (!entry) return;
    await saveEntry(entry.guests);
  };

  const handleEventChange = async (eventId: string) => {
    setSelectedEventId(eventId);
    if (!entry) return;
    const ev = events.find(e => e.id === eventId);
    if (ev) setEventTitle(ev.title);
    await supabase
      .from("attendance_entries")
      .update({ event_id: eventId || null })
      .eq("id", entry.id);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (notFound || !entry) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4">
        <Users className="h-12 w-12 text-muted-foreground mb-4" />
        <h1 className="text-xl font-bold mb-2">Lista não encontrada</h1>
        <p className="text-muted-foreground text-center">Este link pode estar expirado ou inválido.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 py-3">
          <div className="flex items-center gap-3">
            {companyLogo && <img src={companyLogo} alt="" className="h-10 w-10 rounded-lg object-cover" />}
            <div className="min-w-0">
              <h1 className="font-bold text-foreground truncate">{companyName || "Lista de Presença"}</h1>
              <p className="text-xs text-muted-foreground truncate">
                {eventTitle || "Lista de Presença"}
                {entry.guests.length > 0 && ` · ${entry.guests.length} convidado${entry.guests.length !== 1 ? "s" : ""}`}
              </p>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-4 space-y-4 pb-24">
        {/* Receptionist name */}
        <div>
          <Label className="mb-1.5 block text-sm font-medium">Nome da Recepcionista</Label>
          <Input
            placeholder="Seu nome..."
            value={receptionistName}
            onChange={e => setReceptionistName(e.target.value)}
            onBlur={handleReceptionistBlur}
            className="h-12"
          />
        </div>

        {/* Event selector (if not pre-linked) */}
        {!entry.event_id && events.length > 0 && (
          <div>
            <Label className="mb-1.5 block text-sm font-medium">Festa</Label>
            <Select value={selectedEventId} onValueChange={handleEventChange}>
              <SelectTrigger className="h-12">
                <SelectValue placeholder="Selecione a festa..." />
              </SelectTrigger>
              <SelectContent>
                {events.map(ev => (
                  <SelectItem key={ev.id} value={ev.id}>
                    {ev.title} — {format(new Date(ev.event_date + "T12:00:00"), "dd/MM/yyyy")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <Separator />

        {/* Guest list */}
        {entry.guests.length > 0 && (
          <div className="space-y-2">
            <Label className="text-sm font-medium">Convidados registrados ({entry.guests.length})</Label>
            {entry.guests.map((guest, i) => (
              <Card key={i} className="bg-muted/50">
                <CardContent className="py-2 px-3">
                  {editingGuestIdx === i && editGuest ? (
                    <div className="space-y-2">
                      <Input placeholder="Nome *" value={editGuest.name} onChange={e => setEditGuest({ ...editGuest, name: e.target.value })} className="h-10" />
                      <div className="grid grid-cols-2 gap-2">
                        <Input placeholder="Idade" value={editGuest.age} onChange={e => setEditGuest({ ...editGuest, age: e.target.value })} className="h-10" />
                        <Input placeholder="Telefone" value={editGuest.phone} onChange={e => setEditGuest({ ...editGuest, phone: e.target.value })} className="h-10" />
                      </div>
                      <div className="flex items-center justify-between rounded-lg border border-border p-2">
                        <span className="text-xs">Criança desacompanhada</span>
                        <Switch checked={editGuest.is_child_only} onCheckedChange={v => setEditGuest({ ...editGuest, is_child_only: v })} />
                      </div>
                      {editGuest.is_child_only && (
                        <div className="grid grid-cols-2 gap-2 pl-2 border-l-2 border-primary/30">
                          <Input placeholder="Responsável" value={editGuest.guardian_name} onChange={e => setEditGuest({ ...editGuest, guardian_name: e.target.value })} className="h-10" />
                          <Input placeholder="Tel. resp." value={editGuest.guardian_phone} onChange={e => setEditGuest({ ...editGuest, guardian_phone: e.target.value })} className="h-10" />
                        </div>
                      )}
                      <div className="flex items-center justify-between rounded-lg border border-border p-2">
                        <span className="text-xs">Quer receber info</span>
                        <Switch checked={editGuest.wants_info} onCheckedChange={v => setEditGuest({ ...editGuest, wants_info: v })} />
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" onClick={saveEditGuest} disabled={saving} className="flex-1 gap-1">
                          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />} Salvar
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
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground" onClick={() => startEditGuest(i)} disabled={saving}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => handleRemoveGuest(i)} disabled={saving}>
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

        {/* Add guest form */}
        <div className="space-y-3">
          <Label className="text-sm font-semibold flex items-center gap-1.5">
            <UserPlus className="h-4 w-4" /> Adicionar Convidado
          </Label>

          <Input
            placeholder="Nome do convidado *"
            value={guestName}
            onChange={e => setGuestName(e.target.value)}
            className="h-12"
          />

          <div className="grid grid-cols-2 gap-2">
            <Input
              placeholder="Idade"
              value={guestAge}
              onChange={e => setGuestAge(e.target.value)}
              className="h-12"
            />
            <Input
              placeholder="Telefone"
              value={guestPhone}
              onChange={e => setGuestPhone(e.target.value)}
              className="h-12"
            />
          </div>

          {/* Child only toggle */}
          <div className="flex items-center justify-between rounded-lg border border-border p-3">
            <div>
              <p className="text-sm font-medium">Criança desacompanhada</p>
              <p className="text-xs text-muted-foreground">Pais deixaram a criança na festa</p>
            </div>
            <Switch checked={isChildOnly} onCheckedChange={setIsChildOnly} />
          </div>

          {isChildOnly && (
            <div className="grid grid-cols-2 gap-2 pl-2 border-l-2 border-primary/30">
              <Input
                placeholder="Nome do responsável *"
                value={guardianName}
                onChange={e => setGuardianName(e.target.value)}
                className="h-12"
              />
              <Input
                placeholder="Tel. responsável *"
                value={guardianPhone}
                onChange={e => setGuardianPhone(e.target.value)}
                className="h-12"
              />
            </div>
          )}

          {/* Wants info toggle */}
          <div className="flex items-center justify-between rounded-lg border border-border p-3">
            <div>
              <p className="text-sm font-medium">Deseja receber informações</p>
              <p className="text-xs text-muted-foreground">Sobre o buffet e eventos</p>
            </div>
            <Switch checked={wantsInfo} onCheckedChange={setWantsInfo} />
          </div>

          <Button
            onClick={handleAddGuest}
            disabled={saving || !guestName.trim()}
            className="w-full h-12 gap-2"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
            Adicionar Convidado
          </Button>
        </div>
      </div>

      {/* Fixed footer with count */}
      <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border py-3 px-4 z-10">
        <div className="max-w-lg mx-auto flex items-center justify-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          <span className="font-bold text-lg">{entry.guests.length}</span>
          <span className="text-muted-foreground">convidado{entry.guests.length !== 1 ? "s" : ""} registrado{entry.guests.length !== 1 ? "s" : ""}</span>
        </div>
      </div>
    </div>
  );
}
