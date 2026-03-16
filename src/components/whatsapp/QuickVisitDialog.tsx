import { useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { getCurrentCompanyId } from "@/lib/supabase-helpers";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Loader2, MapPin, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";

const VISIT_STATUS = [
  { value: "agendada", label: "Agendada" },
  { value: "realizada", label: "Realizada" },
  { value: "nao_compareceu", label: "Não compareceu" },
  { value: "remarcada", label: "Remarcada" },
  { value: "cancelada", label: "Cancelada" },
];

const TIME_OPTIONS = Array.from({ length: 28 }, (_, i) => {
  const h = String(Math.floor((i + 16) / 2)).padStart(2, "0");
  const m = (i + 16) % 2 === 0 ? "00" : "30";
  return `${h}:${m}`;
});

interface QuickVisitDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leadId: string;
  currentUserId: string;
}

export function QuickVisitDialog({ open, onOpenChange, leadId, currentUserId }: QuickVisitDialogProps) {
  const [visitDate, setVisitDate] = useState<Date | undefined>(undefined);
  const [visitTime, setVisitTime] = useState("");
  const [visitStatus, setVisitStatus] = useState("agendada");
  const [visitNotes, setVisitNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const resetForm = () => {
    setVisitDate(undefined);
    setVisitTime("");
    setVisitStatus("agendada");
    setVisitNotes("");
  };

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

    console.log("[QuickVisit]", payload);

    const { error } = await (supabase as any).from("lead_visits").insert(payload);

    if (error) {
      toast({ title: "Erro ao registrar visita", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Visita registrada!" });
      onOpenChange(false);
      resetForm();
    }
    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) resetForm(); onOpenChange(v); }}>
      <DialogContent className="max-w-sm p-0 overflow-hidden border-0 shadow-[0_20px_60px_rgba(0,0,0,0.15)] rounded-2xl">
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
                  className="p-3 pointer-events-auto"
                  locale={ptBR}
                />
              </PopoverContent>
            </Popover>
          </div>

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
  );
}
