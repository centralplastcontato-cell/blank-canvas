import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Wrench, CheckCircle } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Toaster } from "@/components/ui/toaster";
import { format } from "date-fns";

interface MaintenanceItem {
  label: string;
  checked: boolean;
  detail?: string;
}

interface CompanyEvent {
  id: string;
  title: string;
  event_date: string;
}

export default function PublicMaintenance() {
  const { recordId } = useParams<{ recordId: string }>();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [items, setItems] = useState<MaintenanceItem[]>([]);
  const [notes, setNotes] = useState("");
  const [eventTitle, setEventTitle] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [hasEventId, setHasEventId] = useState(true);
  const [selectedEventId, setSelectedEventId] = useState("");
  const [companyEvents, setCompanyEvents] = useState<CompanyEvent[]>([]);

  useEffect(() => {
    if (!recordId) return;
    (async () => {
      const { data, error } = await supabase
        .from("maintenance_entries")
        .select("*")
        .eq("id", recordId)
        .single();

      if (error || !data) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      setItems((data.items as unknown as MaintenanceItem[]).map(i => ({ ...i })));
      setNotes(data.notes || "");

      if (data.event_id) {
        setHasEventId(true);
        const { data: ev } = await supabase
          .from("company_events")
          .select("title, event_date")
          .eq("id", data.event_id)
          .single();
        if (ev) {
          setEventTitle(ev.title);
          setEventDate(ev.event_date);
        }
      } else {
        setHasEventId(false);
        const { data: events } = await supabase
          .from("company_events")
          .select("id, title, event_date")
          .eq("company_id", data.company_id)
          .neq("status", "cancelado")
          .order("event_date", { ascending: true });
        setCompanyEvents(events || []);
      }

      setLoading(false);
    })();
  }, [recordId]);

  const toggleItem = (idx: number, checked: boolean) => {
    setItems(prev => prev.map((item, i) => i === idx ? { ...item, checked, detail: checked ? item.detail : "" } : item));
  };

  const updateItemDetail = (idx: number, detail: string) => {
    setItems(prev => prev.map((item, i) => i === idx ? { ...item, detail } : item));
  };

  const handleSubmit = async () => {
    if (!recordId) return;

    if (!hasEventId && !selectedEventId) {
      toast({ title: "Selecione a festa", variant: "destructive" });
      return;
    }

    setSaving(true);

    const updatePayload: any = {
      items: items,
      notes: notes || null,
    };

    if (!hasEventId && selectedEventId) {
      updatePayload.event_id = selectedEventId;
    }

    const { error } = await supabase
      .from("maintenance_entries")
      .update(updatePayload)
      .eq("id", recordId);

    setSaving(false);
    if (error) {
      toast({ title: "Erro ao enviar", description: error.message, variant: "destructive" });
    } else {
      setSubmitted(true);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardContent className="py-12 text-center">
            <Wrench className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h1 className="text-xl font-semibold mb-2">Registro não encontrado</h1>
            <p className="text-muted-foreground text-sm">Este link pode estar incorreto ou o registro foi removido.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Toaster />
        <Card className="max-w-md w-full">
          <CardContent className="py-12 text-center">
            <CheckCircle className="h-14 w-14 mx-auto mb-4 text-primary" />
            <h1 className="text-xl font-semibold mb-2">Dados enviados! ✅</h1>
            <p className="text-muted-foreground text-sm">O checklist de manutenção foi salvo com sucesso.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Toaster />
      <div className="max-w-lg mx-auto px-4 py-6 space-y-5">
        {/* Header */}
        <div className="text-center space-y-1">
          <div className="flex items-center justify-center gap-2">
            <Wrench className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-bold">Manutenção</h1>
          </div>
          {hasEventId && eventTitle && (
            <p className="text-sm text-muted-foreground">
              {eventTitle}
              {eventDate && ` — ${format(new Date(eventDate + "T12:00:00"), "dd/MM/yyyy")}`}
            </p>
          )}
        </div>

        {/* Event selector when no event is pre-set */}
        {!hasEventId && (
          <div>
            <Label className="mb-1.5 block font-semibold">Selecione a festa</Label>
            <Select value={selectedEventId} onValueChange={setSelectedEventId}>
              <SelectTrigger className="h-12">
                <SelectValue placeholder="Escolha a festa..." />
              </SelectTrigger>
              <SelectContent>
                {companyEvents.map(ev => (
                  <SelectItem key={ev.id} value={ev.id}>
                    {ev.title} — {format(new Date(ev.event_date + "T12:00:00"), "dd/MM/yyyy")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Maintenance items */}
        <div className="space-y-3">
          <Label className="text-sm font-semibold block">Marque os problemas encontrados</Label>
          {items.map((item, idx) => (
            <Card key={idx} className={`transition-colors ${item.checked ? "border-destructive/50" : ""}`}>
              <CardContent className="p-3 space-y-2">
                <div className="flex items-center gap-3">
                  <Checkbox
                    checked={item.checked}
                    onCheckedChange={(checked) => toggleItem(idx, !!checked)}
                    className="h-5 w-5"
                  />
                  <span className={`text-sm ${item.checked ? "font-medium" : ""}`}>{item.label}</span>
                </div>
                {item.checked && (
                  <Input
                    className="h-10 text-sm"
                    placeholder="Detalhes (ex: qual lâmpada, onde...)"
                    value={item.detail || ""}
                    onChange={e => updateItemDetail(idx, e.target.value)}
                  />
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Notes */}
        <div>
          <Label className="mb-1.5 block">Observações gerais</Label>
          <Textarea
            placeholder="Anotações adicionais sobre a manutenção..."
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={3}
            className="text-base"
          />
        </div>

        {/* Submit */}
        <Button onClick={handleSubmit} disabled={saving} className="w-full h-12 text-base">
          {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Enviar
        </Button>
      </div>
    </div>
  );
}
