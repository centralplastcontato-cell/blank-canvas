import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Lead,
  LEAD_STATUS_LABELS,
  LEAD_STATUS_COLORS,
  LeadStatus,
  UserWithRole,
} from "@/types/crm";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Phone,
  Users,
  Calendar,
  MapPin,
  Trash2,
  MessageSquare,
  ChevronRight,
  RotateCcw,
} from "lucide-react";
import { maskPhone } from "@/lib/mask-utils";

interface LeadCardProps {
  lead: Lead;
  responsaveis: UserWithRole[];
  onLeadClick: (lead: Lead) => void;
  onStatusChange: (lead: Lead, newStatus: LeadStatus) => void;
  onDelete: (id: string) => void;
  canEdit: boolean;
  isAdmin: boolean;
  isSelected: boolean;
  onToggleSelect: (id: string) => void;
  formatWhatsAppLink: (phone: string) => string;
  getResponsavelName: (id: string | null) => string | null;
  canViewContact?: boolean;
}

export function LeadCard({
  lead,
  responsaveis,
  onLeadClick,
  onStatusChange,
  onDelete,
  canEdit,
  isAdmin,
  isSelected,
  onToggleSelect,
  formatWhatsAppLink,
  getResponsavelName,
  canViewContact = true,
}: LeadCardProps) {
  const navigate = useNavigate();
  const location = useLocation();

  // Navigate to WhatsApp chat with this lead's phone
  const openWhatsAppChat = () => {
    const cleanPhone = lead.whatsapp.replace(/\D/g, '');
    const phoneWithCountry = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;
    
    // If we're already on the Central de Atendimento page, just use URL params
    if (location.pathname === '/central-atendimento' || location.pathname === '/atendimento') {
      navigate(`/atendimento?phone=${phoneWithCountry}`, { replace: true });
    } else {
      // Navigate to Central de Atendimento with phone parameter
      navigate(`/atendimento?phone=${phoneWithCountry}`);
    }
  };
  return (
    <div
      className={`bg-card rounded-xl border border-border p-4 space-y-3 transition-colors ${
        isSelected ? "bg-muted/50 border-primary/50" : ""
      }`}
    >
      {/* Header: Name + Select + Actions */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {isAdmin && (
            <Checkbox
              checked={isSelected}
              onCheckedChange={() => onToggleSelect(lead.id)}
              aria-label={`Selecionar ${lead.name}`}
            />
          )}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-foreground truncate">{lead.name}</h3>
              {lead.has_return && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gradient-to-r from-violet-500/25 to-fuchsia-500/15 border border-violet-400/40 rounded-full shrink-0 shadow-sm shadow-violet-500/10 animate-pulse">
                  <RotateCcw className="w-3 h-3 text-violet-500" />
                  <span className="text-[10px] font-bold text-violet-600 uppercase tracking-wider">Retornou</span>
                </span>
              )}
              {lead.observacoes && (
                <MessageSquare className="w-3 h-3 text-primary shrink-0" />
              )}
            </div>
            <div className="flex items-center gap-1 text-sm text-muted-foreground mt-0.5">
              <Phone className="w-3 h-3" />
              <span className="truncate">{canViewContact ? lead.whatsapp : maskPhone(lead.whatsapp)}</span>
            </div>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="shrink-0 h-8 w-8 p-0"
          onClick={() => onLeadClick(lead)}
        >
          <ChevronRight className="w-5 h-5" />
        </Button>
      </div>

      {/* Status */}
      <div>
        {canEdit ? (
          <Select
            value={lead.status}
            onValueChange={(v) => onStatusChange(lead, v as LeadStatus)}
          >
            <SelectTrigger className="w-full h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(LEAD_STATUS_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-2 h-2 rounded-full ${
                        LEAD_STATUS_COLORS[value as LeadStatus]
                      }`}
                    />
                    {label}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <div className="flex items-center gap-2 px-3 py-2 bg-muted/50 rounded-lg">
            <div
              className={`w-2 h-2 rounded-full ${LEAD_STATUS_COLORS[lead.status]}`}
            />
            <span className="text-sm">{LEAD_STATUS_LABELS[lead.status]}</span>
          </div>
        )}
      </div>

      {/* Info Grid */}
      <div className="grid grid-cols-2 gap-2 text-sm">
        {lead.unit && (
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <MapPin className="w-3.5 h-3.5 text-primary" />
            <span className="truncate">{lead.unit}</span>
          </div>
        )}
        {lead.month && (
          <div className="flex items-center gap-1.5">
            <Badge variant="secondary" className="text-xs">
              {lead.day_of_month || lead.day_preference || "-"}/{lead.month}
            </Badge>
          </div>
        )}
        {lead.guests && (
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Users className="w-3.5 h-3.5" />
            <span>{lead.guests} convidados</span>
          </div>
        )}
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <Calendar className="w-3.5 h-3.5" />
          <span>
            {format(new Date(lead.created_at), "dd/MM/yy 'às' HH:mm", { locale: ptBR })}
          </span>
        </div>
      </div>

      {/* Responsável */}
      {getResponsavelName(lead.responsavel_id) && (
        <div className="text-xs text-muted-foreground bg-muted/30 rounded-md px-2 py-1.5">
          <span className="font-medium">Responsável:</span>{" "}
          {getResponsavelName(lead.responsavel_id)}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 pt-1 border-t border-border">
        {canViewContact && (
          <Button 
            variant="outline" 
            size="sm" 
            className="flex-1 h-9"
            onClick={openWhatsAppChat}
          >
            <MessageSquare className="w-4 h-4 mr-2" />
            WhatsApp
          </Button>
        )}

        {isAdmin && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-9 w-9 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                <AlertDialogDescription>
                  Tem certeza que deseja excluir o lead de{" "}
                  <strong>{lead.name}</strong>? Esta ação não pode ser desfeita.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => onDelete(lead.id)}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Excluir
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>
    </div>
  );
}
