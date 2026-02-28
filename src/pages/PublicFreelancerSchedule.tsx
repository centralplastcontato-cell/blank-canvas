import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, CheckCircle2, CalendarDays, Clock, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "@/hooks/use-toast";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

interface EventItem {
  id: string;
  title: string;
  event_date: string;
  start_time: string | null;
  end_time: string | null;
  package_name: string | null;
  event_type: string | null;
}

interface ScheduleData {
  id: string;
  title: string;
  start_date: string;
  end_date: string;
  event_ids: string[];
  company_id: string;
  company_name: string;
  company_logo: string | null;
  company_slug: string | null;
  event_display_names: Record<string, string>;
  notes: string | null;
}

export default function PublicFreelancerSchedule() {
  const { scheduleId, companySlug, scheduleSlug } = useParams<{ scheduleId?: string; companySlug?: string; scheduleSlug?: string }>();
  const [schedule, setSchedule] = useState<ScheduleData | null>(null);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [selectedEvents, setSelectedEvents] = useState<string[]>([]);

  const formatPhone = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 11);
    if (digits.length <= 2) return digits;
    if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  };

  useEffect(() => {
    async function load() {
      if (!scheduleId && !scheduleSlug) { setNotFound(true); setLoading(false); return; }

      let query = supabase
        .from("freelancer_schedules")
        .select("id, title, start_date, end_date, event_ids, company_id, is_active, event_display_names, notes")
        .eq("is_active", true);

      if (scheduleId) {
        query = query.eq("id", scheduleId);
      } else if (companySlug && scheduleSlug) {
        // Resolve company by slug via RPC
        const companyId = await supabase.rpc("get_company_id_by_slug", { _slug: companySlug });
        const companyData = companyId.data ? { id: companyId.data } : null;
        if (!companyData) { setNotFound(true); setLoading(false); return; }
        query = query.eq("company_id", companyData.id).eq("slug", scheduleSlug);
      }

      const { data: schedData, error: schedError } = await query.single();

      if (schedError || !schedData) { setNotFound(true); setLoading(false); return; }

      // Get company info via RPC
      const { data: compArr } = await supabase.rpc("get_company_public_info", { _company_id: (schedData as any).company_id });
      const compData = compArr && (compArr as any[])[0];

      const sd = schedData as any;
      setSchedule({
        id: sd.id,
        title: sd.title,
        start_date: sd.start_date,
        end_date: sd.end_date,
        event_ids: sd.event_ids || [],
        company_id: sd.company_id,
        company_name: compData?.name || "",
        company_logo: compData?.logo_url || null,
        company_slug: compData?.slug || null,
        event_display_names: sd.event_display_names || {},
        notes: sd.notes || null,
      });

      // Fetch events
      if (sd.event_ids && sd.event_ids.length > 0) {
        // Fetch events individually via RPC (no bulk RPC available)
        const evResults = await Promise.all(
          sd.event_ids.map((eid: string) => supabase.rpc("get_event_public_info", { _event_id: eid }))
        );
        const evData = evResults
          .map(r => r.data && (r.data as any[])[0])
          .filter(Boolean)
          .sort((a: any, b: any) => a.event_date.localeCompare(b.event_date));
        setEvents(evData || []);
      }

      setLoading(false);
    }
    load();
  }, [scheduleId, companySlug, scheduleSlug]);

  const toggleEvent = (eventId: string) => {
    setSelectedEvents(prev => prev.includes(eventId) ? prev.filter(x => x !== eventId) : [...prev, eventId]);
  };

  const handleSubmit = async () => {
    if (!schedule || !name.trim() || !phone.trim() || selectedEvents.length === 0) {
      toast({ title: "Preencha todos os campos e selecione ao menos uma festa", variant: "destructive" });
      return;
    }
    setSubmitting(true);

    const { error } = await supabase.from("freelancer_availability").insert({
      schedule_id: schedule.id,
      company_id: schedule.company_id,
      freelancer_name: name.trim(),
      freelancer_phone: phone.trim(),
      available_event_ids: selectedEvents,
    } as any);

    setSubmitting(false);
    if (error) {
      toast({ title: "Erro ao enviar", variant: "destructive" });
    } else {
      setSubmitted(true);
    }
  };

  // Removed auto-redirect after submission

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-accent/5">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (notFound || !schedule) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="text-center space-y-2">
          <h1 className="text-xl font-bold text-foreground">Escala não encontrada</h1>
          <p className="text-muted-foreground text-sm">Este link pode estar desativado ou não existe.</p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-accent/5 p-4">
        <Helmet><title>Disponibilidade Enviada</title></Helmet>
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center space-y-6 max-w-md">
          {schedule!.company_logo && <img src={schedule!.company_logo} alt={schedule!.company_name} className="h-32 w-auto mx-auto" />}
          <CheckCircle2 className="h-16 w-16 text-accent mx-auto" />
          <h1 className="text-2xl font-bold text-foreground">Disponibilidade enviada! 🎉</h1>
          <p className="text-muted-foreground">Obrigado, {name}! O buffet receberá sua disponibilidade e entrará em contato.</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5">
      <Helmet><title>Disponibilidade - {schedule.company_name}</title></Helmet>

      <div className="max-w-lg mx-auto px-4 py-8 space-y-6">
        {/* Header */}
        <motion.div initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="text-center space-y-3">
          {schedule.company_logo && <img src={schedule.company_logo} alt={schedule.company_name} className="h-24 w-auto mx-auto" />}
          <h1 className="text-xl font-bold text-foreground">{schedule.title}</h1>
          <p className="text-sm text-muted-foreground">
            Informe sua disponibilidade para as festas abaixo
          </p>
        </motion.div>

        {/* Notes/Observações */}
        {schedule.notes && (
          <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.05 }}>
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex gap-3">
              <Info className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-amber-800 uppercase tracking-wide mb-1">Observações</p>
                <p className="text-sm text-amber-900 whitespace-pre-line">{schedule.notes}</p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Name + Phone */}
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }} className="space-y-3">
          <div className="bg-card rounded-2xl p-5 shadow-sm space-y-3">
            <label className="text-sm font-medium text-foreground">Seu nome <span className="text-destructive">*</span></label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="Nome completo" className="rounded-xl" />
          </div>
          <div className="bg-card rounded-2xl p-5 shadow-sm space-y-3">
            <label className="text-sm font-medium text-foreground">WhatsApp <span className="text-destructive">*</span></label>
            <Input value={phone} onChange={e => setPhone(formatPhone(e.target.value))} placeholder="(00) 00000-0000" className="rounded-xl" inputMode="tel" />
          </div>
        </motion.div>

        {/* Events */}
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }} className="space-y-3">
          <h2 className="text-sm font-medium text-foreground px-1">
            Selecione as festas em que você tem disponibilidade <span className="text-destructive">*</span>
          </h2>
          {events.map((ev, i) => {
            const dateObj = parseISO(ev.event_date);
            const dayName = format(dateObj, "EEEE", { locale: ptBR });
            const dateStr = format(dateObj, "dd/MM");
            const isSelected = selectedEvents.includes(ev.id);

            return (
              <motion.div
                key={ev.id}
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 + i * 0.05 }}
              >
                <label
                  className={`flex items-center gap-4 p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                    isSelected
                      ? "border-primary bg-primary/5 shadow-sm"
                      : "border-border bg-card hover:border-primary/30"
                  }`}
                >
                  <Checkbox checked={isSelected} onCheckedChange={() => toggleEvent(ev.id)} className="shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{schedule?.event_display_names?.[ev.id] || ev.title}</p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1 capitalize">
                        <CalendarDays className="h-3 w-3" />
                        {dayName} {dateStr}
                      </span>
                      {ev.start_time && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {ev.start_time.slice(0, 5)}
                          {ev.end_time && `-${ev.end_time.slice(0, 5)}`}
                        </span>
                      )}
                    </div>
                    {ev.package_name && (
                      <span className="inline-block mt-1 text-xs bg-muted px-2 py-0.5 rounded-full">{ev.package_name}</span>
                    )}
                  </div>
                </label>
              </motion.div>
            );
          })}
        </motion.div>

        {/* Submit */}
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.4 }}>
          <Button
            onClick={handleSubmit}
            disabled={submitting || !name.trim() || !phone.trim() || selectedEvents.length === 0}
            className="w-full rounded-xl h-12 text-base font-semibold"
          >
            {submitting ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : null}
            Enviar disponibilidade ({selectedEvents.length})
          </Button>
        </motion.div>
      </div>
    </div>
  );
}
