import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Clock, MapPin, User, Calendar, MessageSquare, Users, Package, CreditCard, Star } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface VisitDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  visit: any | null;
}

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  agendada: { label: "Agendada", color: "bg-blue-100 text-blue-700 border-blue-200" },
  confirmada: { label: "Confirmada", color: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  realizada: { label: "Realizada", color: "bg-green-100 text-green-700 border-green-200" },
  cancelada: { label: "Cancelada", color: "bg-red-100 text-red-700 border-red-200" },
  remarcada: { label: "Remarcada", color: "bg-amber-100 text-amber-700 border-amber-200" },
  nao_compareceu: { label: "Não compareceu", color: "bg-gray-100 text-gray-700 border-gray-200" },
};

const INTEREST_MAP: Record<string, { label: string; emoji: string }> = {
  alto: { label: "Alto", emoji: "🔥" },
  medio: { label: "Médio", emoji: "🌤️" },
  baixo: { label: "Baixo", emoji: "❄️" },
};

const VISIT_TYPE_MAP: Record<string, string> = {
  comercial: "🏪 Visita Comercial",
  atendimento: "🎯 Atendimento",
};

export function VisitDetailSheet({ open, onOpenChange, visit }: VisitDetailSheetProps) {
  if (!visit) return null;

  const status = STATUS_MAP[visit.status_visita] || { label: visit.status_visita, color: "bg-muted text-foreground" };
  const interest = visit.interest_level ? INTEREST_MAP[visit.interest_level] : null;
  const leadName = visit.campaign_leads?.name || "Lead";
  const leadPhone = visit.campaign_leads?.whatsapp || "";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto p-0">
        <SheetHeader className="p-5 pb-3">
          <div>
            <SheetTitle className="text-lg font-bold leading-tight text-left">
              {leadName}
            </SheetTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {VISIT_TYPE_MAP[visit.visit_type] || "📍 Visita"}
            </p>
          </div>
        </SheetHeader>

        <div className="px-5 space-y-5 pb-6">
          {/* Status */}
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground w-20 shrink-0">Status</span>
            <Badge variant="outline" className={cn("text-xs px-2 py-0.5 border", status.color)}>
              {status.label}
            </Badge>
          </div>

          {/* Date & Time */}
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground w-20 shrink-0">Data</span>
            <div className="flex items-center gap-1.5 text-sm font-medium">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              {format(parseISO(visit.data_visita), "dd 'de' MMMM, yyyy", { locale: ptBR })}
              {visit.horario_visita && (
                <span className="text-muted-foreground ml-1">
                  <Clock className="h-3.5 w-3.5 inline mr-0.5" />
                  {visit.horario_visita.slice(0, 5)}
                </span>
              )}
            </div>
          </div>

          {/* Interest Level */}
          {interest && (
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground w-20 shrink-0">Interesse</span>
              <span className="text-sm font-medium">{interest.emoji} {interest.label}</span>
            </div>
          )}

          {/* Unit */}
          {visit.unit && (
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground w-20 shrink-0">Unidade</span>
              <span className="text-sm flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                {visit.unit}
              </span>
            </div>
          )}

          {/* Lead Channel */}
          {visit.lead_channel && (
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground w-20 shrink-0">Origem</span>
              <span className="text-sm">{visit.lead_channel}</span>
            </div>
          )}

          <Separator />

          {/* Guest Count */}
          {visit.guest_count && (
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">{visit.guest_count} convidados</span>
            </div>
          )}

          {/* Package Interest */}
          {visit.package_interest && (
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">Pacote: {visit.package_interest}</span>
            </div>
          )}

          {/* Payment Preference */}
          {visit.payment_preference && (
            <div className="flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">Pagamento: {visit.payment_preference}</span>
            </div>
          )}

          {/* Party Date Interest */}
          {visit.party_date_interest && (
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">Data da festa: {visit.party_date_interest}</span>
            </div>
          )}

          {/* Observations */}
          {visit.observacoes && (
            <>
              <Separator />
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <MessageSquare className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-semibold">Observações</span>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap pl-6">
                  {visit.observacoes}
                </p>
              </div>
            </>
          )}

          {/* Seller Notes */}
          {visit.seller_notes && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Star className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-semibold">Notas do vendedor</span>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap pl-6">
                {visit.seller_notes}
              </p>
            </div>
          )}

          {/* Client Questions */}
          {visit.client_questions && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-semibold">Perguntas do cliente</span>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap pl-6">
                {visit.client_questions}
              </p>
            </div>
          )}

          {/* Metadata */}
          <Separator />
          <div className="text-[11px] text-muted-foreground/60">
            <p>Criada em {format(parseISO(visit.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p>
            {leadPhone && <p>WhatsApp: {leadPhone}</p>}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
