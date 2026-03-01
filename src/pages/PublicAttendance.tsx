import { useEffect, useState, useMemo } from "react";
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
import { Loader2, UserPlus, Users, Trash2, Pencil, Check, X, CheckCircle2, RotateCcw, Copy, ExternalLink } from "lucide-react";
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
  finalized_at: string | null;
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

      // Fetch company info via RPC
      const { data: companyArr } = await supabase.rpc("get_company_public_info", { _company_id: data.company_id });
      const company = companyArr && (companyArr as any[])[0];
      if (company) {
        setCompanyName(company.name || "");
        setCompanyLogo(company.logo_url || "");
      }

      // Fetch event info via RPC
      if (data.event_id) {
        const { data: evArr } = await supabase.rpc("get_event_public_info", { _event_id: data.event_id });
        const ev = evArr && (evArr as any[])[0];
        if (ev) setEventTitle(ev.title);
      }

      // Fetch events for linking via RPC
      const { data: eventsData } = await supabase.rpc("get_events_public_list", { _company_id: data.company_id });
      if (eventsData) setEvents(eventsData as any[]);

      setLoading(false);
    }
    load();
  }, [recordId]);

  const saveEntry = async (updatedGuests: Guest[], extraFields: Record<string, any> = {}) => {
    if (!entry) return;
    setSaving(true);
    const { error } = await supabase.rpc("update_attendance_entry_public", {
      _entry_id: entry.id,
      _guests: updatedGuests as any,
      _notes: (extraFields.notes !== undefined ? extraFields.notes : entry.notes) || null,
      _receptionist_name: (extraFields.receptionist_name !== undefined ? extraFields.receptionist_name : receptionistName) || null,
      _event_id: (extraFields.event_id !== undefined ? extraFields.event_id : selectedEventId) || null,
      _finalized_at: extraFields.finalized_at !== undefined ? extraFields.finalized_at : entry.finalized_at || null,
    });
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
    await supabase.rpc("update_attendance_entry_public", {
      _entry_id: entry.id,
      _guests: entry.guests as any,
      _notes: entry.notes || null,
      _receptionist_name: receptionistName || null,
      _event_id: eventId || null,
      _finalized_at: entry.finalized_at || null,
    });
  };

  const handleReopen = async () => {
    if (!entry) return;
    setSaving(true);
    const { error } = await supabase.rpc("update_attendance_entry_public", {
      _entry_id: entry.id,
      _guests: entry.guests as any,
      _notes: entry.notes || null,
      _receptionist_name: receptionistName || null,
      _event_id: selectedEventId || null,
      _finalized_at: null,
    });
    setSaving(false);
    if (error) {
      toast({ title: "Erro ao reabrir", description: error.message, variant: "destructive" });
      return;
    }
    setEntry({ ...entry, finalized_at: null });
    toast({ title: "🔓 Lista reaberta!" });
  };

  const handleFinalize = async () => {
    if (!entry) return;
    if (!receptionistName.trim()) {
      toast({ title: "Preencha o nome da recepcionista antes de finalizar", variant: "destructive" });
      return;
    }
    if (entry.guests.length === 0) {
      toast({ title: "Adicione pelo menos um convidado antes de finalizar", variant: "destructive" });
      return;
    }
    setSaving(true);
    const now = new Date().toISOString();
    const { error } = await supabase.rpc("update_attendance_entry_public", {
      _entry_id: entry.id,
      _guests: entry.guests as any,
      _notes: entry.notes || null,
      _receptionist_name: receptionistName || null,
      _event_id: selectedEventId || null,
      _finalized_at: now,
    });
    setSaving(false);
    if (error) {
      toast({ title: "Erro ao finalizar", description: error.message, variant: "destructive" });
      return;
    }
    setEntry({ ...entry, finalized_at: now });
    toast({ title: "✅ Lista finalizada com sucesso!" });
  };

  const ageStats = useMemo(() => {
    if (!entry) return null;
    const stats = { total: entry.guests.length, "0-4": 0, "5-10": 0, "11-16": 0, "17-18": 0, "18+": 0, na: 0 };
    for (const g of entry.guests) {
      const n = parseInt(g.age);
      if (isNaN(n) || !g.age?.trim()) { stats.na++; continue; }
      if (n <= 4) stats["0-4"]++;
      else if (n <= 10) stats["5-10"]++;
      else if (n <= 16) stats["11-16"]++;
      else if (n <= 18) stats["17-18"]++;
      else stats["18+"]++;
    }
    return stats;
  }, [entry?.guests]);

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
    <div className="min-h-screen bg-gradient-to-b from-primary/5 via-background to-background">
      {/* Header */}
      <header className="bg-card/90 backdrop-blur-md border-b border-border/50 sticky top-0 z-10 shadow-sm">
        <div className="max-w-lg mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            {companyLogo && <img src={companyLogo} alt="" className="h-11 w-11 rounded-xl object-cover ring-2 ring-primary/10 shadow-sm" />}
            <div className="min-w-0">
              <h1 className="font-bold text-lg text-foreground truncate">{companyName || "Lista de Presença"}</h1>
              <p className="text-xs text-primary font-medium truncate">
                {eventTitle || "Lista de Presença"}
                {entry.guests.length > 0 && ` · ${entry.guests.length} convidado${entry.guests.length !== 1 ? "s" : ""}`}
              </p>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-5 space-y-5 pb-24">
        {/* Finalized banner */}
        {entry.finalized_at && (
          <div className="space-y-3">
            <div className="flex items-center gap-3 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 p-4">
              <CheckCircle2 className="h-6 w-6 text-green-600 shrink-0" />
              <div>
                <p className="font-semibold text-green-800 dark:text-green-300">Lista Finalizada</p>
                <p className="text-xs text-green-600 dark:text-green-400">
                  Finalizada em {format(new Date(entry.finalized_at), "dd/MM/yyyy 'às' HH:mm")}
                  {receptionistName && ` por ${receptionistName}`}
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              onClick={handleReopen}
              disabled={saving}
              className="w-full gap-2"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
              Reabrir Lista
            </Button>
          </div>
        )}

        {/* Receptionist name */}
        {!entry.finalized_at && (
          <Card className="shadow-sm border-border/50">
            <CardContent className="p-4 space-y-2">
              <Label className="text-sm font-semibold text-foreground">Nome da Recepcionista</Label>
              <Input
                placeholder="Seu nome..."
                value={receptionistName}
                onChange={e => setReceptionistName(e.target.value)}
                onBlur={handleReceptionistBlur}
                className="h-12 bg-background"
              />
            </CardContent>
          </Card>
        )}

        {/* Event selector (if not pre-linked) */}
        {!entry.finalized_at && !entry.event_id && events.length > 0 && (
          <Card className="shadow-sm border-border/50">
            <CardContent className="p-4 space-y-2">
              <Label className="text-sm font-semibold text-foreground">Festa</Label>
              <Select value={selectedEventId} onValueChange={handleEventChange}>
                <SelectTrigger className="h-12 bg-background">
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
            </CardContent>
          </Card>
        )}

        <Separator />

        {/* Age stats */}
        {ageStats && ageStats.total > 0 && (
          <Card className="shadow-sm border-border/50 overflow-hidden">
            <CardContent className="py-4 px-4">
              <p className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wider">Faixa Etária</p>
              <div className="grid grid-cols-3 gap-2 text-center">
                {[
                  { label: "Total", value: ageStats.total, highlight: true },
                  { label: "0-4", value: ageStats["0-4"] },
                  { label: "5-10", value: ageStats["5-10"] },
                  { label: "11-16", value: ageStats["11-16"] },
                  { label: "17-18", value: ageStats["17-18"] },
                  { label: "18+", value: ageStats["18+"] },
                  ...(ageStats.na > 0 ? [{ label: "S/ idade", value: ageStats.na }] : []),
                ].map((item: any) => (
                  <div key={item.label} className={`rounded-xl p-2.5 ${item.highlight ? 'bg-primary/10 ring-1 ring-primary/20' : 'bg-muted/50'}`}>
                    <p className={`text-xl font-bold ${item.highlight ? 'text-primary' : 'text-foreground'}`}>{item.value}</p>
                    <p className="text-[10px] text-muted-foreground leading-tight font-medium">{item.label}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Guest list */}
        {entry.guests.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Convidados registrados ({entry.guests.length})</Label>
              <div className="flex gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 text-xs"
                  onClick={() => window.open(`/lista-presenca/${recordId}/conferencia`, "_blank")}
                >
                  <ExternalLink className="h-3.5 w-3.5" /> Ver Lista
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 text-xs"
                  onClick={() => {
                    const lines: string[] = [];
                    if (companyName) lines.push(`Lista de Presença - ${companyName}`);
                    if (eventTitle) lines.push(`Festa: ${eventTitle}`);
                    lines.push(`${entry.guests.length} convidado${entry.guests.length !== 1 ? "s" : ""}`);
                    lines.push("");
                    entry.guests.forEach((g, i) => {
                      let line = `#${i + 1} ${g.name}`;
                      if (g.age?.trim()) line += ` - ${g.age} anos`;
                      if (g.phone?.trim()) line += ` - ${g.phone}`;
                      if (g.is_child_only) line += ` - 👶 Resp: ${g.guardian_name} ${g.guardian_phone}`;
                      if (g.wants_info) line += ` - Quer info`;
                      lines.push(line);
                    });
                    navigator.clipboard.writeText(lines.join("\n"));
                    toast({ title: "📋 Lista copiada!" });
                  }}
                >
                  <Copy className="h-3.5 w-3.5" /> Copiar
                </Button>
              </div>
            </div>
            {entry.guests.map((guest, i) => (
              <Card key={i} className="shadow-sm border-border/40 hover:shadow-md transition-shadow">
                <CardContent className="py-2 px-3">
                  {!entry.finalized_at && editingGuestIdx === i && editGuest ? (
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
                      {!entry.finalized_at && (
                        <div className="flex items-center gap-0.5 shrink-0">
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground" onClick={() => startEditGuest(i)} disabled={saving}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => handleRemoveGuest(i)} disabled={saving}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <Separator />

        {/* Add guest form - only when not finalized */}
        {!entry.finalized_at && (
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
                disabled={saving || !guestName.trim()}
                className="w-full h-12 gap-2 rounded-xl text-base font-semibold shadow-md"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
                Adicionar Convidado
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Finalize button */}
        {!entry.finalized_at && entry.guests.length > 0 && (
          <>
            <Button
              onClick={handleFinalize}
              disabled={saving}
              variant="default"
              className="w-full h-14 gap-2 text-base font-semibold rounded-xl shadow-lg bg-green-600 hover:bg-green-700"
            >
              {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <CheckCircle2 className="h-5 w-5" />}
              Finalizar Lista de Presença
            </Button>
          </>
        )}
      </div>

      {/* Fixed footer with count */}
      <div className="fixed bottom-0 left-0 right-0 bg-card/90 backdrop-blur-md border-t border-border/50 py-3.5 px-4 z-10 shadow-[0_-4px_20px_-4px_rgba(0,0,0,0.1)]">
        <div className="max-w-lg mx-auto flex items-center justify-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-primary/10">
            <Users className="h-5 w-5 text-primary" />
          </div>
          <span className="font-bold text-xl text-foreground">{entry.guests.length}</span>
          <span className="text-muted-foreground font-medium">convidado{entry.guests.length !== 1 ? "s" : ""}</span>
        </div>
      </div>
    </div>
  );
}
