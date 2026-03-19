import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  X, MessageSquare, Calendar, MapPin, Users, Tag,
  User, Sparkles, Clock, ExternalLink, Phone
} from "lucide-react";
import { LEAD_STATUS_LABELS, type LeadStatus } from "@/types/crm";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { maskPhone } from "@/lib/mask-utils";

interface ContactInfoSheetProps {
  isOpen: boolean;
  onClose: () => void;
  contactName: string | null;
  contactPhone: string;
  contactPicture: string | null;
  linkedLead: {
    id: string;
    name: string;
    whatsapp: string;
    unit: string | null;
    status: string;
    month: string | null;
    day_of_month: number | null;
    day_preference: string | null;
    guests: string | null;
    observacoes: string | null;
    created_at: string;
    responsavel_id: string | null;
    campaign_name: string | null;
  } | null;
  onOpenLeadDetail?: () => void;
}

const STATUS_COLORS: Record<string, string> = {
  novo: "bg-emerald-500",
  em_contato: "bg-blue-500",
  orcamento_enviado: "bg-purple-500",
  aguardando_resposta: "bg-amber-500",
  fechado: "bg-green-600",
  perdido: "bg-red-500",
  transferido: "bg-cyan-500",
  fornecedor: "bg-orange-500",
  retorno: "bg-violet-500",
};

export function ContactInfoSheet({
  isOpen,
  onClose,
  contactName,
  contactPhone,
  contactPicture,
  linkedLead,
  onOpenLeadDetail,
}: ContactInfoSheetProps) {
  const displayName = linkedLead?.name || contactName || contactPhone;
  const statusLabel = linkedLead
    ? (LEAD_STATUS_LABELS as Record<string, string>)[linkedLead.status] || linkedLead.status
    : null;
  const statusColor = linkedLead ? STATUS_COLORS[linkedLead.status] || "bg-muted" : "";

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-md p-0 overflow-hidden">
        <ScrollArea className="h-full">
          {/* Header with close */}
          <div className="flex items-center gap-3 px-5 py-4 border-b border-border/40">
            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={onClose}>
              <X className="w-5 h-5" />
            </Button>
            <span className="font-semibold text-base">Dados do contato</span>
          </div>

          {/* Avatar + Name */}
          <div className="flex flex-col items-center pt-8 pb-6 px-6 bg-gradient-to-b from-muted/30 to-transparent">
            <Avatar className="h-28 w-28 ring-4 ring-background shadow-xl">
              <AvatarImage
                src={contactPicture || undefined}
                alt={displayName}
                referrerPolicy="no-referrer"
              />
              <AvatarFallback className="bg-primary/10 text-primary text-3xl font-bold">
                {displayName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <h2 className="mt-4 text-xl font-bold text-foreground text-center">{displayName}</h2>
            <p className="text-sm text-muted-foreground mt-0.5">{contactPhone}</p>
            {statusLabel && (
              <Badge className={`mt-3 ${statusColor} text-white border-0 px-3 py-1`}>
                {statusLabel}
              </Badge>
            )}
          </div>

          <Separator />

          {/* Lead Info Cards */}
          {linkedLead ? (
            <div className="px-5 py-5 space-y-4">
              {/* Info grid */}
              <div className="space-y-3">
                <InfoRow icon={<MapPin className="w-4 h-4" />} label="Unidade" value={linkedLead.unit || "Não informado"} />
                <InfoRow
                  icon={<Calendar className="w-4 h-4" />}
                  label="Data preferência"
                  value={`${linkedLead.day_of_month || linkedLead.day_preference || "-"} / ${linkedLead.month || "-"}`}
                />
                <InfoRow icon={<Users className="w-4 h-4" />} label="Convidados" value={linkedLead.guests || "Não informado"} />
                <InfoRow icon={<Tag className="w-4 h-4" />} label="Campanha" value={linkedLead.campaign_name || "-"} />
                <InfoRow
                  icon={<Clock className="w-4 h-4" />}
                  label="Capturado em"
                  value={format(new Date(linkedLead.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                />
              </div>

              {/* Observações */}
              {linkedLead.observacoes && (
                <>
                  <Separator />
                  <div className="space-y-1.5">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Observações</p>
                    <p className="text-sm text-foreground/80 leading-relaxed bg-muted/30 rounded-xl p-3">
                      {linkedLead.observacoes}
                    </p>
                  </div>
                </>
              )}

              {/* CTA to open full detail */}
              {onOpenLeadDetail && (
                <>
                  <Separator />
                  <Button
                    variant="outline"
                    className="w-full gap-2"
                    onClick={() => {
                      onOpenLeadDetail();
                      onClose();
                    }}
                  >
                    <ExternalLink className="w-4 h-4" />
                    Ver detalhes completos do lead
                  </Button>
                </>
              )}
            </div>
          ) : (
            <div className="px-5 py-8 text-center space-y-3">
              <div className="w-12 h-12 mx-auto rounded-full bg-muted/50 flex items-center justify-center">
                <User className="w-6 h-6 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">
                Nenhum lead vinculado a este contato.
              </p>
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 py-2 px-3 rounded-xl hover:bg-muted/30 transition-colors">
      <div className="p-2 rounded-lg bg-primary/10 text-primary shrink-0">{icon}</div>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium text-foreground truncate">{value}</p>
      </div>
    </div>
  );
}
