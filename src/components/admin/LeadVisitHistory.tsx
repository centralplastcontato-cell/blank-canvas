import { useState, useEffect } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { getCurrentCompanyId } from "@/lib/supabase-helpers";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Plus, Loader2, MapPin, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";

interface LeadVisit {
  id: string;
  data_visita: string;
  horario_visita: string | null;
  status_visita: string;
  observacoes: string | null;
  created_at: string;
}

const VISIT_STATUS = [
  { value: "agendada", label: "Agendada", color: "bg-blue-500/15 text-blue-700 border-blue-300" },
  { value: "realizada", label: "Realizada", color: "bg-green-500/15 text-green-700 border-green-300" },
  { value: "nao_compareceu", label: "Não compareceu", color: "bg-red-500/15 text-red-700 border-red-300" },
  { value: "remarcada", label: "Remarcada", color: "bg-amber-500/15 text-amber-700 border-amber-300" },
  { value: "cancelada", label: "Cancelada", color: "bg-muted text-muted-foreground border-border" },
];

const TIME_OPTIONS = Array.from({ length: 28 }, (_, i) => {
  const h = String(Math.floor((i + 16) / 2)).padStart(2, "0");
  const m = (i + 16) % 2 === 0 ? "00" : "30";
  return `${h}:${m}`;
});

interface LeadVisitHistoryProps {
  leadId: string;
  currentUserId: string;
}

export function LeadVisitHistory({ leadId, currentUserId }: LeadVisitHistoryProps) {
  const [visits, setVisits] = useState<LeadVisit[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [visitDate, setVisitDate] = useState<Date | undefined>(undefined);
  const [visitTime, setVisitTime] = useState("");
  const [visitStatus, setVisitStatus] = useState("agendada");
  const [visitNotes, setVisitNotes] = useState("");

  const fetchVisits = async () => {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("lead_visits")
      .select("id, data_visita, horario_visita, status_visita, observacoes, created_at")
      .eq("lead_id", leadId)
      .order("data_visita", { ascending: false });

    if (!error && data) {
      setVisits(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (leadId) fetchVisits();
  }, [leadId]);

  const handleSubmit = async () => {
    if (!visitDate) {
      toast({ title: "Selecione uma data", variant: "destructive" });
      return;
    }

    setSaving(true);
    const payload = {
      lead_id: leadId,
      company_id: getCurrentCompanyId(),
      data_visita: format(visitDate, "yyyy-MM-dd"),
      horario_visita: visitTime || null,
      status_visita: visitStatus,
      observacoes: visitNotes || null,
      created_by: currentUserId,
    };

    console.log("[Lead:Visitas]", payload);

    const { error } = await (supabase as any).from("lead_visits").insert(payload);

    if (error) {
      toast({ title: "Erro ao registrar visita", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Visita registrada!" });
      setDialogOpen(false);
      resetForm();
      fetchVisits();
    }
    setSaving(false);
  };

  const resetForm = () => {
    setVisitDate(undefined);
    setVisitTime("");
    setVisitStatus("agendada");
    setVisitNotes("");
  };

  const getStatusInfo = (status: string) =>
    VISIT_STATUS.find((s) => s.value === status) || VISIT_STATUS[0];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="flex items-center gap-2">
          <MapPin className="w-4 h-4" />
          Histórico de Visitas
        </Label>
        <Button
          variant="outline"
          size="sm"
          className="h-7 text-xs gap-1"
          onClick={() => { resetForm(); setDialogOpen(true); }}
          aria-label="Registrar nova visita"
        >
          <Plus className="w-3 h-3" />
          Registrar Visita
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-4">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      ) : visits.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">
          Nenhuma visita registrada.
        </p>
      ) : (
        <div className="space-y-2">
          {visits.map((v) => {
            const statusInfo = getStatusInfo(v.status_visita);
            return (
              <div
                key={v.id}
                className="border border-border/60 rounded-lg p-3 bg-muted/20 transition-all duration-200 hover:bg-muted/40"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 text-sm font-medium min-w-0">
                    <CalendarIcon className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    <span>{format(new Date(v.data_visita + "T12:00:00"), "dd/MM/yyyy")}</span>
                    {v.horario_visita && (
                      <>
                        <Clock className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                        <span>{v.horario_visita}</span>
                      </>
                    )}
                  </div>
                  <Badge variant="outline" className={cn("text-[10px] shrink-0", statusInfo.color)}>
                    {statusInfo.label}
                  </Badge>
                </div>
                {v.observacoes && (
                  <p className="text-xs text-muted-foreground mt-1.5 pl-5 leading-relaxed">
                    {v.observacoes}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Register Visit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-sm p-0 overflow-hidden border-0 shadow-[0_20px_60px_rgba(0,0,0,0.15)] rounded-2xl">
          {/* Header gradient */}
          <div className="px-6 pt-6 pb-4 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent">
            <DialogHeader>
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-primary/15 ring-1 ring-primary/20 shadow-sm">
                  <MapPin className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <DialogTitle className="text-lg font-bold tracking-tight">Registrar Visita</DialogTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">Adicione um registro de visita ao lead</p>
                </div>
              </div>
            </DialogHeader>
          </div>

          <div className="px-6 pb-6 space-y-5">
            {/* Data da visita */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Data da visita *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal h-11 rounded-xl border-border/60 hover:border-primary/40 transition-colors",
                      !visitDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2.5 h-4 w-4 text-primary/60" />
                    {visitDate ? format(visitDate, "dd/MM/yyyy") : "Selecionar data"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 rounded-xl shadow-lg" align="start">
                  <Calendar
                    mode="single"
                    selected={visitDate}
                    onSelect={setVisitDate}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                    locale={ptBR}
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Horário */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Horário</Label>
              <Select value={visitTime || "none"} onValueChange={(v) => setVisitTime(v === "none" ? "" : v)}>
                <SelectTrigger className="h-11 rounded-xl border-border/60 hover:border-primary/40 transition-colors">
                  <Clock className="h-4 w-4 mr-2.5 text-primary/60" />
                  <SelectValue placeholder="Selecionar horário" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="none">Sem horário</SelectItem>
                  {TIME_OPTIONS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* Status */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Status *</Label>
              <Select value={visitStatus} onValueChange={setVisitStatus}>
                <SelectTrigger className="h-11 rounded-xl border-border/60 hover:border-primary/40 transition-colors">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {VISIT_STATUS.map((s) => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Observações */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Observações</Label>
              <Textarea
                value={visitNotes}
                onChange={(e) => setVisitNotes(e.target.value)}
                rows={3}
                placeholder="Informações sobre a visita..."
                className="rounded-xl border-border/60 hover:border-primary/40 focus:border-primary/40 transition-colors resize-none"
              />
            </div>

            {/* Submit */}
            <Button
              className="w-full h-11 rounded-xl font-semibold shadow-sm hover:shadow-md transition-all duration-200"
              onClick={handleSubmit}
              disabled={saving || !visitDate}
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Registrar Visita
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
