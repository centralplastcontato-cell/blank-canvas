import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentCompanyId } from "@/hooks/useCurrentCompanyId";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { toast } from "@/hooks/use-toast";
import { ClipboardCheck, Plus, Trash2, ChevronDown, ChevronRight, Copy, Pencil, Loader2, Share2 } from "lucide-react";
import { format } from "date-fns";
import { useCompany } from "@/contexts/CompanyContext";

interface MonitoringItem {
  label: string;
  checked: boolean;
  detail?: string;
  category?: string;
}

interface MonitoringRecord {
  id: string;
  company_id: string;
  event_id: string | null;
  items: MonitoringItem[];
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

const DEFAULT_ITEMS: MonitoringItem[] = [
  // Preparação
  { label: "Ler a ficha técnica da festa", checked: false, category: "Preparação" },
  { label: "Identificar o tipo de cardápio e consultar a cozinha sobre falta de itens", checked: false, category: "Preparação" },
  { label: "Identificar o tipo de bebidas e consultar o bar sobre falta de itens", checked: false, category: "Preparação" },
  { label: "Verificar se foram contratados opcionais", checked: false, category: "Preparação" },
  { label: "Verificar energia do buffet, acender lâmpadas e testar brinquedos eletrônicos", checked: false, category: "Preparação" },
  { label: "Verificar água e coloração, abrir torneiras e dar descargas", checked: false, category: "Preparação" },
  { label: "Verificar limpeza geral do buffet e providenciar se necessário", checked: false, category: "Preparação" },
  { label: "Verificar reposição de descartáveis e produtos de higiene nos banheiros", checked: false, category: "Preparação" },
  { label: "Verificar cestos de lixo e lixeiras posicionados com sacos", checked: false, category: "Preparação" },
  { label: "Verificar presença dos colaboradores freelancers e orientar horários", checked: false, category: "Preparação" },
  { label: "Confirmar se todos os freelancers escalados estão presentes (substituir se houver faltas)", checked: false, category: "Preparação" },
  { label: "Conferir serviços terceirizados e se estão sendo executados", checked: false, category: "Preparação" },
  { label: "Solicitar que terceirizados assinem o termo de responsabilidade", checked: false, category: "Preparação" },
  { label: "Confirmar uniformes para todos os colaboradores", checked: false, category: "Preparação" },
  { label: "Definir horário de lanche dos colaboradores (prontos 15min antes)", checked: false, category: "Preparação" },
  { label: "Definir postos de trabalho para cada colaborador", checked: false, category: "Preparação" },
  { label: "Fazer ensaio dos monitores do parabéns e recepção", checked: false, category: "Preparação" },
  { label: "Ligar som ambiente e definir playlist conforme idade/solicitação", checked: false, category: "Preparação" },
  { label: "Ligar ar-condicionado 30 min antes (em dias quentes)", checked: false, category: "Preparação" },
  { label: "Testar retrospectiva (quando houver)", checked: false, category: "Preparação" },
  { label: "Testar telão (quando houver)", checked: false, category: "Preparação" },
  { label: "Verificar mesas organizadas, alinhadas e com guardanapeiras", checked: false, category: "Preparação" },
  { label: "Reunir colaboradores, orientar postura e avaliar festa anterior", checked: false, category: "Preparação" },
  // Durante a festa
  { label: "Recepcionar anfitriões, se colocar à disposição e oferecer algo", checked: false, category: "Durante a festa" },
  { label: "Garantir cumprimento do cronograma da festa", checked: false, category: "Durante a festa" },
  { label: "Separar vela(s) do bolo com isqueiro/fósforo", checked: false, category: "Durante a festa" },
  { label: "Anunciar atividades programadas (piquenique, animação, etc)", checked: false, category: "Durante a festa" },
  { label: "Passar nas mesas e perguntar se está tudo bem", checked: false, category: "Durante a festa" },
  { label: "Manter pelo menos 1 monitor no salão de brinquedos durante parabéns", checked: false, category: "Durante a festa" },
  // Encerramento
  { label: "Apresentar lista de presença final (pagantes vs cortesias)", checked: false, category: "Encerramento" },
  { label: "Fazer acerto de excedentes e opcionais em aberto", checked: false, category: "Encerramento" },
  { label: "Supervisionar arrumação dos setores (cozinha, bar, lanchonete, brinquedos)", checked: false, category: "Encerramento" },
  { label: "Verificar armazenamento correto de sobras de alimentos (etiquetar)", checked: false, category: "Encerramento" },
  { label: "Verificar devolução de uniformes em bom estado", checked: false, category: "Encerramento" },
  { label: "Desligar aparelhos eletrônicos (brinquedos, som, TVs)", checked: false, category: "Encerramento" },
  { label: "Desligar todos os ar-condicionados", checked: false, category: "Encerramento" },
  { label: "Fechamento do buffet: desligar luzes e trancar portas", checked: false, category: "Encerramento" },
];

export function PartyMonitoringManager() {
  const companyId = useCurrentCompanyId();
  const { currentCompany } = useCompany();
  const [records, setRecords] = useState<MonitoringRecord[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedEventId, setSelectedEventId] = useState("");
  const [items, setItems] = useState<MonitoringItem[]>([]);
  const [notes, setNotes] = useState("");
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());

  const fetchData = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);
    const [entriesRes, eventsRes] = await Promise.all([
      supabase
        .from("party_monitoring_entries")
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
          items: r.items as MonitoringItem[],
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
    setItems(DEFAULT_ITEMS.map(i => ({ ...i })));
    setNotes("");
    setDialogOpen(true);
  };

  const openEdit = (record: MonitoringRecord) => {
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
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();

    const payload = {
      event_id: selectedEventId || null,
      company_id: companyId,
      filled_by: user?.id || null,
      items: items as any,
      notes: notes || null,
    };

    let error;
    if (editingId) {
      ({ error } = await supabase.from("party_monitoring_entries").update(payload).eq("id", editingId));
    } else {
      ({ error } = await supabase.from("party_monitoring_entries").insert(payload));
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
    const { error } = await supabase.from("party_monitoring_entries").delete().eq("id", id);
    if (error) toast({ title: "Erro ao excluir", variant: "destructive" });
    else { toast({ title: "Excluído!" }); fetchData(); }
  };

  const toggleItem = (idx: number, checked: boolean) => {
    setItems(prev => prev.map((item, i) => i === idx ? { ...item, checked } : item));
  };

  const updateItemDetail = (idx: number, detail: string) => {
    setItems(prev => prev.map((item, i) => i === idx ? { ...item, detail } : item));
  };

  const toggleCard = (id: string) => {
    setExpandedCards(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const copyToClipboard = (record: MonitoringRecord) => {
    const lines: string[] = [];
    lines.push(`📋 Acompanhamento de Festa - ${record.event?.title || "Sem festa"}`);
    if (record.event?.event_date) lines.push(`📅 ${format(new Date(record.event.event_date + "T12:00:00"), "dd/MM/yyyy")}`);
    lines.push("");
    const checked = record.items.filter(i => i.checked);
    const unchecked = record.items.filter(i => !i.checked);
    if (checked.length > 0) {
      lines.push(`✅ Concluídos (${checked.length}/${record.items.length}):`);
      checked.forEach(i => {
        lines.push(`  ✅ ${i.label}${i.detail ? ` — ${i.detail}` : ""}`);
      });
    }
    if (unchecked.length > 0) {
      lines.push("");
      lines.push(`⬜ Pendentes (${unchecked.length}):`);
      unchecked.forEach(i => {
        lines.push(`  ⬜ ${i.label}`);
      });
    }
    if (record.notes) { lines.push(""); lines.push(`📝 Obs: ${record.notes}`); }
    navigator.clipboard.writeText(lines.join("\n"));
    toast({ title: "Copiado para a área de transferência!" });
  };

  // Group items by category for dialog display
  const groupedItems = items.reduce<{ category: string; startIdx: number; items: { item: MonitoringItem; idx: number }[] }[]>((acc, item, idx) => {
    const cat = item.category || "Geral";
    const last = acc[acc.length - 1];
    if (last && last.category === cat) {
      last.items.push({ item, idx });
    } else {
      acc.push({ category: cat, startIdx: idx, items: [{ item, idx }] });
    }
    return acc;
  }, []);

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ClipboardCheck className="h-5 w-5 text-primary" />
          <h3 className="font-semibold text-lg">Acompanhamento de Festa</h3>
        </div>
        <Button size="sm" onClick={openNew} className="gap-1.5">
          <Plus className="h-4 w-4" /> Novo Acompanhamento
        </Button>
      </div>

      {records.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <ClipboardCheck className="h-10 w-10 mx-auto mb-2 opacity-40" />
            <p>Nenhum registro de acompanhamento ainda.</p>
            <p className="text-sm">Clique em "Novo Acompanhamento" para começar.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {records.map(record => {
            const isOpen = expandedCards.has(record.id);
            const checkedCount = record.items.filter(i => i.checked).length;

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
                                : !record.event_id ? "Aguardando gerente vincular" : ""}
                              {" · "}
                              {checkedCount}/{record.items.length} concluídos
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={e => { e.stopPropagation(); const baseUrl = currentCompany?.custom_domain ? `https://${currentCompany.custom_domain}` : window.location.origin; navigator.clipboard.writeText(`${baseUrl}/acompanhamento/${record.id}`); toast({ title: "Link copiado!" }); }}>
                            <Share2 className="h-4 w-4" />
                          </Button>
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
                    <CardContent className="pt-0 pb-4 px-4 space-y-2">
                      {record.items.map((item, i) => (
                        <div key={i} className={`text-sm pl-3 border-l-2 py-1 ${item.checked ? "border-primary" : "border-border"}`}>
                          <span className={item.checked ? "font-medium" : "text-muted-foreground"}>
                            {item.checked ? "✅" : "⬜"} {item.label}
                          </span>
                          {item.checked && item.detail && (
                            <p className="text-xs text-muted-foreground mt-0.5 pl-5">{item.detail}</p>
                          )}
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
            <DialogTitle>{editingId ? "Editar Acompanhamento" : "Novo Acompanhamento"}</DialogTitle>
          </DialogHeader>

          <div className="flex-1 min-h-0 overflow-y-auto px-4 pb-4 space-y-4" style={{ WebkitOverflowScrolling: 'touch', overscrollBehavior: 'contain' }}>
            <div>
              <Label className="mb-1.5 block">Festa <span className="text-muted-foreground font-normal">(opcional)</span></Label>
              <Select value={selectedEventId} onValueChange={setSelectedEventId}>
                <SelectTrigger className="h-12">
                  <SelectValue placeholder="O gerente pode vincular depois..." />
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

            {groupedItems.map(group => (
              <div key={group.category} className="space-y-3">
                <Label className="text-sm font-semibold block border-b pb-1">{group.category}</Label>
                {group.items.map(({ item, idx }) => (
                  <div key={idx} className="space-y-1.5">
                    <div className="flex items-start gap-2">
                      <Checkbox
                        checked={item.checked}
                        onCheckedChange={(checked) => toggleItem(idx, !!checked)}
                        className="mt-0.5"
                      />
                      <span className="text-sm leading-snug">{item.label}</span>
                    </div>
                    {item.checked && (
                      <Input
                        className="h-10 text-sm ml-6"
                        placeholder="Observação (opcional)"
                        value={item.detail || ""}
                        onChange={e => updateItemDetail(idx, e.target.value)}
                      />
                    )}
                  </div>
                ))}
              </div>
            ))}

            <div>
              <Label className="mb-1.5 block">Observações gerais</Label>
              <Textarea
                placeholder="Anotações adicionais..."
                value={notes}
                onChange={e => setNotes(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter className="p-4 pt-2 shrink-0 border-t">
            <Button onClick={handleSave} disabled={saving} className="w-full h-12">
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingId ? "Salvar Alterações" : "Criar Acompanhamento"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
