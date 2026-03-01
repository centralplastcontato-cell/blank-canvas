import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Users, CheckCircle, Copy, Star } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { FreelancerAutocomplete } from "@/components/agenda/FreelancerAutocomplete";
import { Toaster } from "@/components/ui/toaster";
import { format } from "date-fns";
import { PublicStaffEvaluation } from "@/components/public-staff/PublicStaffEvaluation";

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

interface CompanyEvent {
  id: string;
  title: string;
  event_date: string;
}

const PIX_TYPES = ["CPF", "CNPJ", "E-mail", "Telefone", "Chave aleatória"];

function formatCurrency(val: string) {
  const num = val.replace(/\D/g, "");
  if (!num) return "";
  return (parseInt(num, 10) / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function calcTotal(data: StaffRole[]) {
  let sum = 0;
  data.forEach(role => role.entries.forEach(e => {
    const num = e.value.replace(/\D/g, "");
    if (num) sum += parseInt(num, 10) / 100;
  }));
  return sum;
}

export default function PublicStaff() {
  const { recordId } = useParams<{ recordId: string }>();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [staffData, setStaffData] = useState<StaffRole[]>([]);
  const [notes, setNotes] = useState("");
  const [eventTitle, setEventTitle] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [hasEventId, setHasEventId] = useState(true);
  const [selectedEventId, setSelectedEventId] = useState("");
  const [companyEvents, setCompanyEvents] = useState<CompanyEvent[]>([]);
  const [eventId, setEventId] = useState<string | null>(null);

  useEffect(() => {
    if (!recordId) return;
    (async () => {
      const { data: rpcData, error } = await supabase.rpc("get_staff_entry_public", { _entry_id: recordId });
      const data = rpcData && Array.isArray(rpcData) ? (rpcData as any[])[0] : rpcData;

      if (error || !data) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      setStaffData(data.staff_data as unknown as StaffRole[]);
      setNotes(data.notes || "");
      setCompanyId(data.company_id);

      if (data.event_id) {
        setHasEventId(true);
        setEventId(data.event_id);
        // Fetch event info via RPC
        const { data: evArr } = await supabase.rpc("get_event_public_info", { _event_id: data.event_id });
        const ev = evArr && (evArr as any[])[0];
        if (ev) {
          setEventTitle(ev.title);
          setEventDate(ev.event_date);
        }
      } else {
        setHasEventId(false);
        // Fetch company events via RPC
        const { data: events } = await supabase.rpc("get_events_public_list", { _company_id: data.company_id });
        setCompanyEvents((events as any[]) || []);
      }

      setLoading(false);
    })();
  }, [recordId]);

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

  const copyPixKey = (key: string) => {
    if (!key) return;
    navigator.clipboard.writeText(key);
    toast({ title: "Chave PIX copiada!" });
  };

  const handleSubmit = async () => {
    if (!recordId) return;

    // If no event was pre-set and user hasn't selected one, require it
    if (!hasEventId && !selectedEventId) {
      toast({ title: "Selecione a festa", variant: "destructive" });
      return;
    }

    setSaving(true);

    const rpcEventId = (!hasEventId && selectedEventId) ? selectedEventId : (eventId || null);

    const { error } = await supabase.rpc("update_staff_entry_public", {
      _entry_id: recordId,
      _staff_data: staffData as any,
      _notes: notes || null,
      _event_id: rpcEventId,
    });

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
            <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
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
            <p className="text-muted-foreground text-sm">Os dados da equipe foram salvos com sucesso.</p>
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
            <Users className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-bold">Equipe / Financeiro</h1>
          </div>
          {hasEventId && eventTitle && (
            <p className="text-sm text-muted-foreground">
              {eventTitle}
              {eventDate && ` — ${format(new Date(eventDate + "T12:00:00"), "dd/MM/yyyy")}`}
            </p>
          )}
        </div>

        <Tabs defaultValue="staff" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="staff">Equipe / Financeiro</TabsTrigger>
            <TabsTrigger value="avaliacao" className="gap-1">
              <Star className="h-3.5 w-3.5" />
              Avaliar Equipe
            </TabsTrigger>
          </TabsList>

          <TabsContent value="staff" className="space-y-5 mt-4">
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

            {/* Staff Roles */}
            {staffData.map((role, roleIdx) => (
              <div key={roleIdx} className="space-y-3">
                <Label className="text-sm font-semibold block">
                  {role.roleTitle} ({role.entries.length})
                </Label>
                {role.entries.map((entry, entryIdx) => (
                  <Card key={entryIdx} className="border-l-2 border-l-primary/30">
                    <CardContent className="p-3 space-y-3">
                      <span className="text-xs text-muted-foreground font-medium block">
                        {role.roleTitle} #{entryIdx + 1}
                      </span>
                      <FreelancerAutocomplete
                        companyId={companyId}
                        value={entry.name}
                        onChange={val => updateEntry(roleIdx, entryIdx, "name", val)}
                        onSelect={f => {
                          setStaffData(prev => {
                            const copy = prev.map(r => ({ ...r, entries: r.entries.map(e => ({ ...e })) }));
                            copy[roleIdx].entries[entryIdx].name = f.name;
                            copy[roleIdx].entries[entryIdx].pix_type = f.pix_type;
                            copy[roleIdx].entries[entryIdx].pix_key = f.pix_key;
                            return copy;
                          });
                        }}
                        className="h-12 text-base"
                        placeholder="Nome"
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <Select value={entry.pix_type} onValueChange={v => updateEntry(roleIdx, entryIdx, "pix_type", v)}>
                          <SelectTrigger className="h-12">
                            <SelectValue placeholder="Tipo PIX" />
                          </SelectTrigger>
                          <SelectContent>
                            {PIX_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                          </SelectContent>
                        </Select>
                        <Input
                          className="h-12 text-base"
                          placeholder="Valor (R$)"
                          inputMode="numeric"
                          value={entry.value}
                          onChange={e => updateEntry(roleIdx, entryIdx, "value", e.target.value)}
                        />
                      </div>
                      <div className="flex gap-2">
                        <Input
                          className="flex-1 h-12 text-base"
                          placeholder="Chave PIX"
                          value={entry.pix_key}
                          onChange={e => updateEntry(roleIdx, entryIdx, "pix_key", e.target.value)}
                        />
                        {entry.pix_key && (
                          <Button type="button" variant="outline" size="icon" className="h-12 w-12 shrink-0" onClick={() => copyPixKey(entry.pix_key)}>
                            <Copy className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ))}

            {/* Total */}
            <div className="flex items-center justify-between bg-muted/50 rounded-lg p-3">
              <span className="font-semibold text-sm">Total</span>
              <span className="font-bold text-base">
                {calcTotal(staffData).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
              </span>
            </div>

            {/* Notes */}
            <div>
              <Label className="mb-1.5 block">Observações</Label>
              <Input
                className="h-12 text-base"
                placeholder="Notas adicionais..."
                value={notes}
                onChange={e => setNotes(e.target.value)}
              />
            </div>

            {/* Submit */}
            <Button onClick={handleSubmit} disabled={saving} className="w-full h-12 text-base">
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Enviar
            </Button>
          </TabsContent>

          <TabsContent value="avaliacao" className="mt-4">
            {companyId && recordId && (
              <PublicStaffEvaluation
                recordId={recordId}
                companyId={companyId}
                eventId={eventId}
                staffData={staffData}
              />
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
