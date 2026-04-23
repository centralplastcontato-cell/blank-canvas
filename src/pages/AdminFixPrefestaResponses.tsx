import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, CheckCircle2, AlertTriangle, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";

interface OrphanResponse {
  id: string;
  respondent_name: string | null;
  created_at: string;
  company_id: string;
  company_name?: string;
  template_name?: string;
}

interface EventOption {
  id: string;
  title: string;
  event_date: string;
  lead_name: string;
}

export default function AdminFixPrefestaResponses() {
  const [responses, setResponses] = useState<OrphanResponse[]>([]);
  const [eventsByCompany, setEventsByCompany] = useState<Record<string, EventOption[]>>({});
  const [selectedEvents, setSelectedEvents] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [saved, setSaved] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);

    // Fetch orphan responses
    const { data: orphans } = await supabase
      .from("prefesta_responses")
      .select("id, respondent_name, created_at, company_id, template_id")
      .is("event_id", null)
      .order("created_at", { ascending: false });

    if (!orphans || orphans.length === 0) {
      setResponses([]);
      setLoading(false);
      return;
    }

    // Get unique company IDs and template IDs
    const companyIds = [...new Set(orphans.map(o => o.company_id))];
    const templateIds = [...new Set(orphans.map(o => o.template_id))];

    // Fetch company names and template names
    const [companiesRes, templatesRes] = await Promise.all([
      supabase.from("companies").select("id, name").in("id", companyIds),
      supabase.from("prefesta_templates").select("id, name").in("id", templateIds),
    ]);

    const companyMap = Object.fromEntries((companiesRes.data || []).map(c => [c.id, c.name]));
    const templateMap = Object.fromEntries((templatesRes.data || []).map(t => [t.id, t.name]));

    const enriched: OrphanResponse[] = orphans.map(o => ({
      ...o,
      company_name: companyMap[o.company_id] || "Desconhecida",
      template_name: templateMap[o.template_id] || "Template",
    }));

    setResponses(enriched);

    // Fetch events for each company
    const eventsMap: Record<string, EventOption[]> = {};
    for (const cid of companyIds) {
      const { data: events } = await supabase
        .from("company_events")
        .select("id, title, event_date, lead_id")
        .eq("company_id", cid)
        .neq("status", "cancelado")
        .order("event_date", { ascending: false });

      if (events && events.length > 0) {
        const leadIds = events.map(e => e.lead_id).filter(Boolean);
        const { data: leads } = await supabase
          .from("campaign_leads")
          .select("id, name")
          .in("id", leadIds as string[]);

        const leadMap = Object.fromEntries((leads || []).map(l => [l.id, l.name]));

        eventsMap[cid] = events.map(e => ({
          id: e.id,
          title: e.title,
          event_date: e.event_date,
          lead_name: e.lead_id ? (leadMap[e.lead_id] || "") : "",
        }));
      }
    }

    setEventsByCompany(eventsMap);
    setLoading(false);
  }

  async function handleSave(responseId: string) {
    const eventId = selectedEvents[responseId];
    if (!eventId) return;

    setSaving(prev => ({ ...prev, [responseId]: true }));

    const { error } = await supabase
      .from("prefesta_responses")
      .update({ event_id: eventId })
      .eq("id", responseId);

    setSaving(prev => ({ ...prev, [responseId]: false }));

    if (error) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
    } else {
      setSaved(prev => ({ ...prev, [responseId]: true }));
      toast({ title: "Vinculado com sucesso! ✅" });
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const pending = responses.filter(r => !saved[r.id]);

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Link2 className="h-6 w-6 text-primary" />
            Vincular Respostas Pré-Festa
          </h1>
          <p className="text-sm text-muted-foreground">
            Estas respostas foram enviadas sem vínculo com um evento. Selecione a festa correta para cada uma.
          </p>
        </div>

        {pending.length === 0 ? (
          <div className="bg-card rounded-xl p-8 text-center space-y-3 border border-border">
            <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto" />
            <h2 className="text-lg font-semibold text-foreground">Tudo vinculado! 🎉</h2>
            <p className="text-muted-foreground text-sm">Não há respostas pendentes sem evento.</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm text-amber-600 bg-amber-50 dark:bg-amber-950/30 rounded-xl p-3">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span><strong>{pending.length}</strong> resposta(s) sem evento vinculado</span>
            </div>

            {pending.map((r) => {
              const events = eventsByCompany[r.company_id] || [];
              return (
                <div key={r.id} className="bg-card rounded-xl border border-border p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-foreground">{r.respondent_name || "Sem nome"}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(r.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                        {" · "}
                        {r.company_name}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">{r.template_name}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Select
                      value={selectedEvents[r.id] || ""}
                      onValueChange={(v) => setSelectedEvents(prev => ({ ...prev, [r.id]: v }))}
                    >
                      <SelectTrigger className="flex-1 bg-white dark:bg-background rounded-xl">
                        <SelectValue placeholder="Selecione a festa..." />
                      </SelectTrigger>
                      <SelectContent className="max-h-60">
                        {events.map(ev => (
                          <SelectItem key={ev.id} value={ev.id}>
                            {format(new Date(ev.event_date + "T12:00:00"), "dd/MM/yy", { locale: ptBR })}
                            {" — "}
                            {ev.title}
                            {ev.lead_name ? ` (${ev.lead_name})` : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Button
                      size="sm"
                      onClick={() => handleSave(r.id)}
                      disabled={!selectedEvents[r.id] || saving[r.id]}
                      className="rounded-xl"
                    >
                      {saving[r.id] ? <Loader2 className="h-4 w-4 animate-spin" /> : "Vincular"}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {Object.values(saved).some(Boolean) && pending.length > 0 && (
          <p className="text-xs text-muted-foreground text-center">
            {Object.values(saved).filter(Boolean).length} resposta(s) vinculada(s) com sucesso
          </p>
        )}
      </div>
    </div>
  );
}
