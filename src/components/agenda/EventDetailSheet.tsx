import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { CalendarDays, Clock, Users, MapPin, Package, DollarSign, Pencil, Trash2, AlertTriangle, UserCheck, Gamepad2, Copy, Check } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { EventChecklist } from "./EventChecklist";

interface EventData {
  id: string;
  title: string;
  event_date: string;
  start_time: string | null;
  end_time: string | null;
  event_type: string | null;
  guest_count: number | null;
  unit: string | null;
  status: string;
  package_name: string | null;
  total_value: number | null;
  notes: string | null;
  lead_id?: string | null;
  company_id?: string;
}

interface EventDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event: EventData | null;
  onEdit: (event: EventData) => void;
  onDelete: (id: string) => void;
  conflicts?: EventData[];
}

const STATUS_MAP: Record<string, { label: string; variant: "default" | "secondary" | "destructive" }> = {
  confirmado: { label: "Confirmado", variant: "default" },
  pendente: { label: "Pendente", variant: "secondary" },
  cancelado: { label: "Cancelado", variant: "destructive" },
};

export function EventDetailSheet({ open, onOpenChange, event, onEdit, onDelete, conflicts = [] }: EventDetailSheetProps) {
  const [leadName, setLeadName] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleCopyControlLink = () => {
    const url = `${window.location.origin}/festa/${event?.id}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  useEffect(() => {
    if (!event?.lead_id) { setLeadName(null); return; }
    supabase.from("campaign_leads").select("name").eq("id", event.lead_id).single()
      .then(({ data }) => setLeadName(data?.name || null));
  }, [event?.lead_id]);

  if (!event) return null;

  const statusInfo = STATUS_MAP[event.status] || STATUS_MAP.pendente;
  const dateFormatted = format(new Date(event.event_date + "T12:00:00"), "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-left text-lg">{event.title}</SheetTitle>
        </SheetHeader>

        <div className="mt-5 space-y-5">
          <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>

          {conflicts.length > 0 && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
              <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
              <div>
                <p className="font-medium">Conflito de horário!</p>
                <p>{conflicts.map(c => c.title).join(", ")} no mesmo horário/unidade.</p>
              </div>
            </div>
          )}

          <div className="space-y-3 text-sm bg-muted/30 rounded-xl p-4">
            <div className="flex items-center gap-3 text-foreground">
              <div className="p-1.5 rounded-lg bg-primary/10"><CalendarDays className="h-4 w-4 text-primary" /></div>
              <span className="capitalize">{dateFormatted}</span>
            </div>

            {(event.start_time || event.end_time) && (
              <div className="flex items-center gap-3 text-foreground">
                <div className="p-1.5 rounded-lg bg-primary/10"><Clock className="h-4 w-4 text-primary" /></div>
                <span>
                  {event.start_time?.slice(0, 5) || "–"} até {event.end_time?.slice(0, 5) || "–"}
                </span>
              </div>
            )}

            {event.event_type && (
              <div className="flex items-center gap-3 text-foreground">
                <div className="p-1.5 rounded-lg bg-secondary/20"><Package className="h-4 w-4 text-secondary-foreground" /></div>
                <span className="capitalize">{event.event_type}</span>
              </div>
            )}

            {event.guest_count && (
              <div className="flex items-center gap-3 text-foreground">
                <div className="p-1.5 rounded-lg bg-accent/10"><Users className="h-4 w-4 text-accent" /></div>
                <span>{event.guest_count} convidados</span>
              </div>
            )}

            {event.unit && (
              <div className="flex items-center gap-3 text-foreground">
                <div className="p-1.5 rounded-lg bg-accent/10"><MapPin className="h-4 w-4 text-accent" /></div>
                <span>{event.unit}</span>
              </div>
            )}

            {event.total_value != null && (
              <div className="flex items-center gap-3 text-foreground">
                <div className="p-1.5 rounded-lg bg-accent/10"><DollarSign className="h-4 w-4 text-accent" /></div>
                <span>{event.total_value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span>
              </div>
            )}

            {event.package_name && (
              <div className="flex items-center gap-3 text-foreground">
                <div className="p-1.5 rounded-lg bg-secondary/20"><Package className="h-4 w-4 text-secondary-foreground" /></div>
                <span>{event.package_name}</span>
              </div>
            )}
          </div>

          {event.lead_id && leadName && (
            <>
              <Separator />
              <div className="flex items-center gap-2 text-sm">
                <UserCheck className="h-4 w-4 text-primary shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Lead vinculado</p>
                  <p className="font-medium">{leadName}</p>
                </div>
              </div>
            </>
          )}

          {event.notes && (
            <>
              <Separator />
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Observações</p>
                <p className="text-sm whitespace-pre-wrap">{event.notes}</p>
              </div>
            </>
          )}

          <Separator />

          {/* Checklist */}
          {event.company_id && (
            <EventChecklist eventId={event.id} companyId={event.company_id} />
          )}

          <Separator />

          {/* Controle da Festa link */}
          <div
            className="rounded-xl p-3 flex items-center gap-3 cursor-pointer group"
            style={{ background: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)", border: "1px solid rgba(96,165,250,0.2)" }}
            onClick={handleCopyControlLink}
          >
            <div
              className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: "linear-gradient(135deg, #2563eb, #1d4ed8)" }}
            >
              <Gamepad2 className="h-5 w-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold" style={{ color: "#93c5fd" }}>Controle da Festa</p>
              <p className="text-xs" style={{ color: "#64748b" }}>Toque para copiar o link do painel</p>
            </div>
            {copied
              ? <Check className="h-4 w-4 shrink-0" style={{ color: "#34d399" }} />
              : <Copy className="h-4 w-4 shrink-0" style={{ color: "#475569" }} />
            }
          </div>

          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1 rounded-xl" onClick={() => onEdit(event)}>
              <Pencil className="h-4 w-4 mr-2" /> Editar
            </Button>
            <Button variant="destructive" size="icon" className="rounded-xl" onClick={() => onDelete(event.id)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
