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
import { CalendarIcon, Loader2, MapPin, CalendarDays, MessageSquare } from "lucide-react";
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
  leadUnit?: string | null;
  onVisitRegistered?: () => void;
  initialVisitType?: "visita" | "atendimento";
}

function SectionHeader({ icon: Icon, label }: { icon: React.ElementType; label: string }) {
  return (
    <div className="flex items-center gap-2.5 text-[11px] uppercase tracking-[0.18em] font-semibold text-muted-foreground mb-4 pb-2.5 border-b border-border/40">
      <div className="p-1.5 rounded-md bg-primary/8 ring-1 ring-primary/15">
        <Icon className="h-3.5 w-3.5 text-primary" />
      </div>
      {label}
    </div>
  );
}

export function QuickVisitDialog({ open, onOpenChange, leadId, currentUserId, leadUnit, onVisitRegistered, initialVisitType = "visita" }: QuickVisitDialogProps) {
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
      unit: leadUnit || null,
      visit_type: initialVisitType,
    };

    console.log("[QuickVisit]", payload);

    const { error } = await (supabase as any).from("lead_visits").insert(payload);

    if (error) {
      toast({ title: initialVisitType === "atendimento" ? "Erro ao agendar atendimento" : "Erro ao registrar visita", description: error.message, variant: "destructive" });
    } else {
      toast({ title: initialVisitType === "atendimento" ? "Atendimento agendado!" : "Visita registrada!" });
      onVisitRegistered?.();
      onOpenChange(false);
      resetForm();
    }
    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) resetForm(); onOpenChange(v); }}>
      <DialogContent className="max-w-[520px] max-h-[90vh] p-0 gap-0 overflow-hidden rounded-2xl [&>button]:top-5 [&>button]:right-5">
        {/* Header */}
        <DialogHeader className="px-7 pt-7 pb-4 border-b border-border/40 bg-muted/30">
          <DialogTitle className="text-lg font-bold tracking-tight">{initialVisitType === "atendimento" ? "Agendar Atendimento" : "Registrar Visita"}</DialogTitle>
          <p className="text-[13px] text-muted-foreground mt-1">{initialVisitType === "atendimento" ? "Agende um atendimento para o cliente" : "Adicione um registro de visita ao lead"}</p>
        </DialogHeader>

        {/* Body */}
        <div className="overflow-y-auto px-7 py-6 space-y-5" style={{ maxHeight: "calc(90vh - 180px)" }}>
          {/* Section 1 – Data e Horário */}
          <div className="rounded-xl border border-border/40 bg-card p-5 shadow-sm">
            <SectionHeader icon={CalendarDays} label="Data e Horário" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-y-5">
              <div className="space-y-2.5 md:pr-6">
                <Label className="text-sm font-medium text-foreground/70">Data da visita *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !visitDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {visitDate ? format(visitDate, "dd/MM/yyyy") : "Selecionar data"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
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

              <div className="space-y-2.5 md:pl-6 md:border-l md:border-border/50">
                <Label className="text-sm font-medium text-foreground/70">Status *</Label>
                <Select value={visitStatus} onValueChange={setVisitStatus}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {VISIT_STATUS.map((s) => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2.5 md:pr-6">
                <Label className="text-sm font-medium text-foreground/70">Horário</Label>
                <Select value={visitTime || "none"} onValueChange={(v) => setVisitTime(v === "none" ? "" : v)}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sem horário</SelectItem>
                    {TIME_OPTIONS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Section 2 – Observações */}
          <div className="rounded-xl border border-border/40 bg-card p-5 shadow-sm">
            <SectionHeader icon={MessageSquare} label="Observações" />
            <div className="space-y-2.5">
              <Label className="text-sm font-medium text-foreground/70">Notas sobre a visita</Label>
              <Textarea
                value={visitNotes}
                onChange={(e) => setVisitNotes(e.target.value)}
                rows={3}
                placeholder="Informações sobre a visita..."
              />
            </div>
          </div>
        </div>

        {/* Fixed footer */}
        <div className="flex justify-end gap-3 px-7 py-4 border-t border-border/40 bg-muted/20">
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button
            onClick={handleSubmit}
            disabled={saving || !visitDate}
            className="px-8 rounded-lg shadow-sm"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            {initialVisitType === "atendimento" ? "Agendar Atendimento" : "Registrar Visita"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
