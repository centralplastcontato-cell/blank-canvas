import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentCompanyId } from "@/hooks/useCurrentCompanyId";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { toast } from "@/hooks/use-toast";
import { Users, Plus, Trash2, ChevronDown, ChevronRight, Copy, Pencil, Loader2, MinusCircle, PlusCircle } from "lucide-react";
import { format } from "date-fns";


interface StaffEntry {
  name: string;
  pix_type: string;
  pix_key: string;
  value: string;
}

interface StaffRole {
  roleTitle: string;
  entries: StaffEntry[];
}

interface EventStaffRecord {
  id: string;
  event_id: string;
  company_id: string;
  filled_by: string | null;
  staff_data: StaffRole[];
  notes: string | null;
  created_at: string;
  updated_at: string;
  event?: { title: string; event_date: string; lead_name?: string };
}

interface CalendarEvent {
  event_id: string;
  event_title: string;
  event_date: string;
  lead_name: string | null;
}

const DEFAULT_ROLES = [
  { title: "Gerente de Festa", default_quantity: 1 },
  { title: "Garçom", default_quantity: 2 },
  { title: "Cozinha", default_quantity: 2 },
  { title: "Monitor", default_quantity: 7 },
  { title: "Segurança", default_quantity: 1 },
];

const PIX_TYPES = ["CPF", "CNPJ", "E-mail", "Telefone", "Chave aleatória"];

function buildEmptyStaffData(roles: { title: string; default_quantity: number }[]): StaffRole[] {
  return roles.map(r => ({
    roleTitle: r.title,
    entries: Array.from({ length: r.default_quantity }, () => ({
      name: "", pix_type: "", pix_key: "", value: "",
    })),
  }));
}

function formatCurrency(val: string) {
  const num = val.replace(/\D/g, "");
  if (!num) return "";
  return (parseInt(num, 10) / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function EventStaffManager() {
  const companyId = useCurrentCompanyId();
  const [records, setRecords] = useState<EventStaffRecord[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedEventId, setSelectedEventId] = useState("");
  const [staffData, setStaffData] = useState<StaffRole[]>([]);
  const [notes, setNotes] = useState("");
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());

  const fetchData = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);
    const [entriesRes, eventsRes] = await Promise.all([
      supabase
        .from("event_staff_entries")
        .select("*")
        .eq("company_id", companyId)
        .order("created_at", { ascending: false }),
      supabase.rpc("get_company_events_for_cardapio", { _company_id: companyId }),
    ]);

    if (entriesRes.data) {
      // enrich with event info
      const eventIds = [...new Set(entriesRes.data.map((e: any) => e.event_id))];
      const { data: eventDetails } = await supabase
        .from("company_events")
        .select("id, title, event_date")
        .in("id", eventIds);

      const eventMap = new Map((eventDetails || []).map((e: any) => [e.id, e]));
      setRecords(
        entriesRes.data.map((r: any) => ({
          ...r,
          staff_data: r.staff_data as StaffRole[],
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
    setStaffData(buildEmptyStaffData(DEFAULT_ROLES));
    setNotes("");
    setDialogOpen(true);
  };

  const openEdit = (record: EventStaffRecord) => {
    setEditingId(record.id);
    setSelectedEventId(record.event_id);
    setStaffData(record.staff_data);
    setNotes(record.notes || "");
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!companyId || !selectedEventId) {
      toast({ title: "Selecione uma festa", variant: "destructive" });
      return;
    }
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();

    const payload = {
      event_id: selectedEventId,
      company_id: companyId,
      filled_by: user?.id || null,
      staff_data: staffData as any,
      notes: notes || null,
    };

    let error;
    if (editingId) {
      ({ error } = await supabase.from("event_staff_entries").update(payload).eq("id", editingId));
    } else {
      ({ error } = await supabase.from("event_staff_entries").insert(payload));
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
    const { error } = await supabase.from("event_staff_entries").delete().eq("id", id);
    if (error) toast({ title: "Erro ao excluir", variant: "destructive" });
    else { toast({ title: "Excluído!" }); fetchData(); }
  };

  const updateEntry = (roleIdx: number, entryIdx: number, field: keyof StaffEntry, value: string) => {
    setStaffData(prev => {
      const copy = prev.map(r => ({ ...r, entries: r.entries.map(e => ({ ...e })) }));
      if (field === "value") {
        copy[roleIdx].entries[entryIdx][field] = formatCurrency(value);
      } else {
        copy[roleIdx].entries[entryIdx][field] = value;
      }
      return copy;
    });
  };

  const addEntry = (roleIdx: number) => {
    setStaffData(prev => {
      const copy = prev.map(r => ({ ...r, entries: [...r.entries.map(e => ({ ...e }))] }));
      copy[roleIdx].entries.push({ name: "", pix_type: "", pix_key: "", value: "" });
      return copy;
    });
  };

  const removeEntry = (roleIdx: number, entryIdx: number) => {
    setStaffData(prev => {
      const copy = prev.map(r => ({ ...r, entries: [...r.entries.map(e => ({ ...e }))] }));
      if (copy[roleIdx].entries.length > 1) copy[roleIdx].entries.splice(entryIdx, 1);
      return copy;
    });
  };

  const copyToClipboard = (record: EventStaffRecord) => {
    const lines: string[] = [];
    lines.push(`📋 Equipe - ${record.event?.title || "Festa"}`);
    if (record.event?.event_date) lines.push(`📅 ${format(new Date(record.event.event_date + "T12:00:00"), "dd/MM/yyyy")}`);
    lines.push("");
    record.staff_data.forEach(role => {
      lines.push(`👥 ${role.roleTitle}`);
      role.entries.forEach((e, i) => {
        if (e.name) {
          lines.push(`  ${i + 1}. ${e.name}`);
          if (e.pix_type) lines.push(`     PIX (${e.pix_type}): ${e.pix_key}`);
          if (e.value) lines.push(`     Valor: ${e.value}`);
        }
      });
      lines.push("");
    });
    if (record.notes) lines.push(`📝 Obs: ${record.notes}`);
    navigator.clipboard.writeText(lines.join("\n"));
    toast({ title: "Copiado para a área de transferência!" });
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
          <h3 className="font-semibold text-lg">Equipe / Financeiro</h3>
        </div>
        <Button size="sm" onClick={openNew} className="gap-1.5">
          <Plus className="h-4 w-4" /> Nova Equipe
        </Button>
      </div>

      {records.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <Users className="h-10 w-10 mx-auto mb-2 opacity-40" />
            <p>Nenhum registro de equipe ainda.</p>
            <p className="text-sm">Clique em "Nova Equipe" para começar.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {records.map(record => {
            const isOpen = expandedCards.has(record.id);
            const filledCount = record.staff_data.reduce((acc, r) => acc + r.entries.filter(e => e.name).length, 0);
            const totalSlots = record.staff_data.reduce((acc, r) => acc + r.entries.length, 0);

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
                              {record.event?.title || "Festa"}
                            </CardTitle>
                            <p className="text-xs text-muted-foreground">
                              {record.event?.event_date
                                ? format(new Date(record.event.event_date + "T12:00:00"), "dd/MM/yyyy")
                                : ""}
                              {" · "}
                              {filledCount}/{totalSlots} preenchidos
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={e => { e.stopPropagation(); copyToClipboard(record); }}>
                            <Copy className="h-4 w-4" />
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
                    <CardContent className="pt-0 pb-4 px-4 space-y-3">
                      {record.staff_data.map((role, ri) => (
                        <div key={ri}>
                          <p className="text-sm font-medium text-muted-foreground mb-1">{role.roleTitle}</p>
                          <div className="space-y-1">
                            {role.entries.map((entry, ei) => (
                              <div key={ei} className="text-sm pl-3 border-l-2 border-border py-1">
                                <span className="font-medium">{entry.name || "—"}</span>
                                {entry.pix_type && (
                                  <span className="text-muted-foreground"> · PIX {entry.pix_type}: {entry.pix_key}</span>
                                )}
                                {entry.value && (
                                  <span className="text-muted-foreground"> · {entry.value}</span>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
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
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar Equipe" : "Nova Equipe"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Festa</Label>
              <Select value={selectedEventId} onValueChange={setSelectedEventId}>
                <SelectTrigger>
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
            </div>

            <Separator />

            {staffData.map((role, roleIdx) => (
              <div key={roleIdx} className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-semibold">{role.roleTitle} ({role.entries.length})</Label>
                  <div className="flex gap-1">
                    <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeEntry(roleIdx, role.entries.length - 1)} disabled={role.entries.length <= 1}>
                      <MinusCircle className="h-4 w-4" />
                    </Button>
                    <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => addEntry(roleIdx)}>
                      <PlusCircle className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                {role.entries.map((entry, entryIdx) => (
                  <div key={entryIdx} className="grid grid-cols-2 md:grid-cols-4 gap-2 pl-3 border-l-2 border-primary/20">
                    <Input
                      placeholder="Nome"
                      value={entry.name}
                      onChange={e => updateEntry(roleIdx, entryIdx, "name", e.target.value)}
                    />
                    <Select value={entry.pix_type} onValueChange={v => updateEntry(roleIdx, entryIdx, "pix_type", v)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Tipo PIX" />
                      </SelectTrigger>
                      <SelectContent>
                        {PIX_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Input
                      placeholder="Chave PIX"
                      value={entry.pix_key}
                      onChange={e => updateEntry(roleIdx, entryIdx, "pix_key", e.target.value)}
                    />
                    <Input
                      placeholder="Valor (R$)"
                      value={entry.value}
                      onChange={e => updateEntry(roleIdx, entryIdx, "value", e.target.value)}
                    />
                  </div>
                ))}
              </div>
            ))}

            <div>
              <Label>Observações</Label>
              <Input
                placeholder="Notas adicionais..."
                value={notes}
                onChange={e => setNotes(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingId ? "Salvar" : "Criar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
