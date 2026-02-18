import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentCompanyId } from "@/hooks/useCurrentCompanyId";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { toast } from "@/hooks/use-toast";
import { FileText, Plus, Trash2, ChevronDown, ChevronRight, Pencil, Loader2, Share2, ExternalLink } from "lucide-react";
import { format } from "date-fns";
import { useCompany } from "@/contexts/CompanyContext";

interface InfoBlock {
  title: string;
  content: string;
}

interface InfoRecord {
  id: string;
  company_id: string;
  event_id: string | null;
  items: InfoBlock[];
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

export function EventInfoManager() {
  const companyId = useCurrentCompanyId();
  const { currentCompany } = useCompany();
  const [records, setRecords] = useState<InfoRecord[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedEventId, setSelectedEventId] = useState("");
  const [items, setItems] = useState<InfoBlock[]>([{ title: "", content: "" }]);
  const [notes, setNotes] = useState("");
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());

  const fetchData = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);
    const [entriesRes, eventsRes] = await Promise.all([
      supabase
        .from("event_info_entries")
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
          items: r.items as InfoBlock[],
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
    setItems([{ title: "", content: "" }]);
    setNotes("");
    setDialogOpen(true);
  };

  const openEdit = (record: InfoRecord) => {
    setEditingId(record.id);
    setSelectedEventId(record.event_id || "");
    setItems(record.items.map(i => ({ ...i })));
    setNotes(record.notes || "");
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!companyId) {
      toast({ title: "Selecione uma empresa", variant: "destructive" });
      return;
    }

    const validItems = items.filter(i => i.title.trim() || i.content.trim());
    if (validItems.length === 0) {
      toast({ title: "Adicione pelo menos um bloco de informação", variant: "destructive" });
      return;
    }

    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();

    const payload = {
      event_id: selectedEventId || null,
      company_id: companyId,
      filled_by: user?.id || null,
      items: validItems as any,
      notes: notes || null,
    };

    let error;
    if (editingId) {
      ({ error } = await supabase.from("event_info_entries").update(payload).eq("id", editingId));
    } else {
      ({ error } = await supabase.from("event_info_entries").insert(payload));
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
    const { error } = await supabase.from("event_info_entries").delete().eq("id", id);
    if (error) toast({ title: "Erro ao excluir", variant: "destructive" });
    else { toast({ title: "Excluído!" }); fetchData(); }
  };

  const updateBlock = (idx: number, field: "title" | "content", value: string) => {
    setItems(prev => prev.map((item, i) => i === idx ? { ...item, [field]: value } : item));
  };

  const addBlock = () => {
    setItems(prev => [...prev, { title: "", content: "" }]);
  };

  const removeBlock = (idx: number) => {
    if (items.length <= 1) return;
    setItems(prev => prev.filter((_, i) => i !== idx));
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
          <FileText className="h-5 w-5 text-primary" />
          <h3 className="font-semibold text-lg">Informações</h3>
        </div>
        <Button size="sm" onClick={openNew} className="gap-1.5">
          <Plus className="h-4 w-4" /> Novo Informativo
        </Button>
      </div>

      {records.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <FileText className="h-10 w-10 mx-auto mb-2 opacity-40" />
            <p>Nenhum informativo criado ainda.</p>
            <p className="text-sm">Clique em "Novo Informativo" para começar.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {records.map(record => {
            const isOpen = expandedCards.has(record.id);

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
                                : !record.event_id ? "" : ""}
                              {record.items.length > 0 && ` · ${record.items.length} assunto(s)`}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={e => { e.stopPropagation(); const baseUrl = currentCompany?.custom_domain ? `https://${currentCompany.custom_domain}` : window.location.origin; window.open(`${baseUrl}/informacoes/${record.id}`, '_blank'); }}>
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={e => { e.stopPropagation(); const domain = currentCompany?.custom_domain || ''; const link = domain ? `${domain}/informacoes/${record.id}` : `${window.location.origin}/informacoes/${record.id}`; navigator.clipboard.writeText(link); toast({ title: "Link copiado!" }); }}>
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
                    <CardContent className="pt-0 pb-4 px-4 space-y-3">
                      {record.items.map((block, i) => (
                        <div key={i} className="border-l-2 border-primary/30 pl-3 py-1">
                          <p className="text-sm font-medium">{block.title || "Sem título"}</p>
                          <p className="text-sm text-muted-foreground whitespace-pre-wrap">{block.content}</p>
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
        <DialogContent className="max-w-lg max-h-[85dvh] flex flex-col p-0 gap-0 overflow-hidden">
          <DialogHeader className="p-4 pb-2 shrink-0">
            <DialogTitle>{editingId ? "Editar Informativo" : "Novo Informativo"}</DialogTitle>
          </DialogHeader>

          <div className="flex-1 min-h-0 overflow-y-auto px-4 pb-4 space-y-4" style={{ WebkitOverflowScrolling: 'touch', overscrollBehavior: 'contain' }}>
            <div>
              <Label className="mb-1.5 block">Festa <span className="text-muted-foreground font-normal">(opcional)</span></Label>
              <Select value={selectedEventId} onValueChange={setSelectedEventId}>
                <SelectTrigger className="h-12">
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

            <div className="space-y-4">
              <Label className="text-sm font-semibold block">Blocos de Informação</Label>
              {items.map((block, idx) => (
                <Card key={idx} className="relative">
                  <CardContent className="p-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <Input
                        className="h-10 text-sm font-medium flex-1"
                        placeholder="Título do assunto..."
                        value={block.title}
                        onChange={e => updateBlock(idx, "title", e.target.value)}
                      />
                      {items.length > 1 && (
                        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive" onClick={() => removeBlock(idx)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                    <Textarea
                      className="text-sm min-h-[80px]"
                      placeholder="Escreva as informações, orientações ou particularidades..."
                      value={block.content}
                      onChange={e => updateBlock(idx, "content", e.target.value)}
                      rows={3}
                    />
                  </CardContent>
                </Card>
              ))}
              <Button type="button" variant="outline" size="sm" className="w-full gap-1.5" onClick={addBlock}>
                <Plus className="h-3.5 w-3.5" /> Adicionar Bloco
              </Button>
            </div>

            <div>
              <Label className="mb-1.5 block">Observações gerais</Label>
              <Textarea
                placeholder="Anotações adicionais..."
                value={notes}
                onChange={e => setNotes(e.target.value)}
                rows={2}
              />
            </div>
          </div>

          <DialogFooter className="p-4 pt-2 shrink-0 border-t">
            <Button onClick={handleSave} disabled={saving} className="w-full h-12">
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingId ? "Salvar Alterações" : "Criar Informativo"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
