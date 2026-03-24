import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarDays, Clock, MapPin, Phone, User, Pencil, PartyPopper, ExternalLink, Loader2, XCircle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import type { PreReservation } from "./PreReservationFormDialog";

interface PreReservationDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preReservation: PreReservation | null;
  onEdit: (pr: PreReservation) => void;
  onConvert: (pr: PreReservation) => void;
  onRefresh: () => void;
  userId?: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  ativa: { label: "Ativa", color: "bg-pink-100 text-pink-700 border-pink-200" },
  convertida: { label: "Convertida", color: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  expirada: { label: "Expirada", color: "bg-gray-100 text-gray-600 border-gray-200" },
  cancelada: { label: "Cancelada", color: "bg-red-100 text-red-700 border-red-200" },
};

export function PreReservationDetailSheet({
  open, onOpenChange, preReservation, onEdit, onConvert, onRefresh, userId,
}: PreReservationDetailSheetProps) {
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelling, setCancelling] = useState(false);

  if (!preReservation) return null;

  const pr = preReservation;
  const statusCfg = STATUS_CONFIG[pr.status] || STATUS_CONFIG.ativa;
  const isActive = pr.status === "ativa";
  const expiresDate = new Date(pr.reservation_expires_at);
  const isExpired = expiresDate < new Date() && pr.status === "ativa";

  const handleCancel = async () => {
    setCancelling(true);
    const { error } = await supabase
      .from("pre_reservations")
      .update({
        status: "cancelada",
        cancellation_reason: cancelReason.trim() || null,
      })
      .eq("id", pr.id);

    if (error) {
      toast({ title: "Erro ao cancelar", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Pré-reserva cancelada" });
      if (pr.lead_id) {
        await (supabase as any).from("lead_history").insert({
          lead_id: pr.lead_id,
          company_id: pr.company_id,
          action: "pre_reserva_cancelada",
          details: `Pré-reserva cancelada${cancelReason ? `: ${cancelReason}` : ""}`,
          performed_by: userId,
        });
      }
      onRefresh();
      onOpenChange(false);
    }
    setCancelling(false);
    setCancelOpen(false);
    setCancelReason("");
  };

  const handleOpenLead = () => {
    if (pr.lead_id) {
      window.open(`/admin?lead=${pr.lead_id}`, "_blank");
    }
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader className="pb-4">
            <SheetTitle className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-pink-400" />
              Pré-reserva
            </SheetTitle>
          </SheetHeader>

          <div className="space-y-5">
            {/* Status badge */}
            <div className="flex items-center gap-2">
              <Badge className={`${statusCfg.color} border`}>{statusCfg.label}</Badge>
              {isExpired && <Badge variant="destructive" className="text-[10px]">Vencida</Badge>}
            </div>

            {/* Client info */}
            <div className="space-y-3 p-4 rounded-xl border border-border/50 bg-muted/30">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="font-semibold text-sm">{pr.customer_name}</span>
              </div>
              {pr.customer_phone && (
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="text-sm">{pr.customer_phone}</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="text-sm">
                  Festa: {format(new Date(pr.event_date + "T12:00:00"), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                </span>
              </div>
              {pr.unit && (
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="text-sm">{pr.unit}</span>
                </div>
              )}
            </div>

            {/* Reservation details */}
            <div className="space-y-2 p-4 rounded-xl border border-pink-200/50 bg-pink-50/30">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-pink-500 shrink-0" />
                <span className="text-sm font-medium text-pink-700">
                  Duração: {pr.reservation_days} dia{pr.reservation_days > 1 ? "s" : ""}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Início: {format(new Date(pr.reservation_start_at), "dd/MM/yyyy 'às' HH:mm")}
              </p>
              <p className="text-xs text-muted-foreground">
                Validade: <span className="font-medium text-pink-600">{format(expiresDate, "dd/MM/yyyy 'às' HH:mm")}</span>
              </p>
            </div>

            {/* Notes */}
            {pr.notes && (
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Observações</Label>
                <p className="text-sm bg-muted/30 p-3 rounded-xl">{pr.notes}</p>
              </div>
            )}

            {/* Cancellation reason */}
            {pr.status === "cancelada" && pr.cancellation_reason && (
              <div className="space-y-1">
                <Label className="text-xs text-destructive">Motivo do cancelamento</Label>
                <p className="text-sm bg-destructive/5 p-3 rounded-xl text-destructive">{pr.cancellation_reason}</p>
              </div>
            )}

            {/* Actions */}
            <div className="space-y-2 pt-2">
              {isActive && (
                <>
                  <Button className="w-full bg-pink-500 hover:bg-pink-600 text-white" onClick={() => onConvert(pr)}>
                    <PartyPopper className="h-4 w-4 mr-2" />
                    Converter em Festa Oficial
                  </Button>
                  <Button variant="outline" className="w-full" onClick={() => { onEdit(pr); onOpenChange(false); }}>
                    <Pencil className="h-4 w-4 mr-2" />
                    Editar
                  </Button>
                  <Button variant="outline" className="w-full text-destructive hover:text-destructive" onClick={() => setCancelOpen(true)}>
                    <XCircle className="h-4 w-4 mr-2" />
                    Cancelar Pré-reserva
                  </Button>
                </>
              )}
              {pr.lead_id && (
                <Button variant="ghost" className="w-full" onClick={handleOpenLead}>
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Abrir Lead Vinculado
                </Button>
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Cancel confirmation dialog */}
      <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancelar Pré-reserva</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Label>Motivo do cancelamento (opcional)</Label>
            <Textarea
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="Informe o motivo..."
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelOpen(false)} disabled={cancelling}>Voltar</Button>
            <Button variant="destructive" onClick={handleCancel} disabled={cancelling}>
              {cancelling && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Confirmar Cancelamento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
