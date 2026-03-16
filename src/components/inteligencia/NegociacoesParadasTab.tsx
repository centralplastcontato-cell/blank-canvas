import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useNegociacoesParadas, type NegociacaoParada } from "@/hooks/useNegociacoesParadas";
import { useCompany } from "@/contexts/CompanyContext";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { MessageSquare, Clock, AlertTriangle, User, Calendar, Radar } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface NegociacoesParadasTabProps {
  selectedUnit?: string;
}

const STALLED_OPTIONS = [
  { value: "7", label: "7 dias" },
  { value: "10", label: "10 dias" },
  { value: "14", label: "14 dias" },
  { value: "21", label: "21 dias" },
  { value: "30", label: "30 dias" },
];

export function NegociacoesParadasTab({ selectedUnit }: NegociacoesParadasTabProps) {
  const navigate = useNavigate();
  
  const [stalledDays, setStalledDays] = useState("10");
  const { data, isLoading } = useNegociacoesParadas(Number(stalledDays), selectedUnit);

  const handleOpenConversation = (lead: NegociacaoParada) => {
    if (lead.conversationId) {
      navigate(`/central-atendimento?conversation=${lead.conversationId}`);
    } else {
      navigate(`/central-atendimento?search=${encodeURIComponent(lead.whatsapp)}`);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        <Skeleton className="h-10 w-48" />
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
    );
  }

  const stalledLeads = data || [];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Radar className="h-5 w-5 text-orange-500" />
          <h2 className="text-lg font-semibold">Negociações Paradas</h2>
          <Badge variant="secondary" className="text-xs">
            {stalledLeads.length}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground whitespace-nowrap">Paradas há mais de:</span>
          <Select value={stalledDays} onValueChange={setStalledDays}>
            <SelectTrigger className="w-[110px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STALLED_OPTIONS.map(o => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Empty state */}
      {stalledLeads.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <div className="p-3 rounded-full bg-green-500/10 mb-3">
              <Radar className="h-8 w-8 text-green-500" />
            </div>
            <h3 className="font-semibold text-lg">Nenhuma negociação parada!</h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-md">
              Não existem leads com atendimento humano parados há mais de {stalledDays} dias nos estágios monitorados.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Lead list */}
      <div className="grid gap-3">
        {stalledLeads.map((lead) => (
          <Card key={lead.leadId} className="border-l-4 border-l-orange-500/70 hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <User className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="font-semibold truncate">{lead.leadName}</span>
                    <Badge variant="outline" className="text-xs shrink-0">
                      {lead.statusLabel}
                    </Badge>
                    {lead.unit && (
                      <Badge variant="secondary" className="text-xs shrink-0">
                        {lead.unit}
                      </Badge>
                    )}
                  </div>

                  <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" />
                      {lead.diasParado} dias parado
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" />
                      Última msg: {format(new Date(lead.lastMessageAt), "dd/MM/yy 'às' HH:mm", { locale: ptBR })}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 text-sm">
                    <AlertTriangle className="h-3.5 w-3.5 text-orange-500 shrink-0" />
                    <span className="text-orange-600 dark:text-orange-400 font-medium">{lead.motivo}</span>
                  </div>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  className="shrink-0 gap-2"
                  onClick={() => handleOpenConversation(lead)}
                >
                  <MessageSquare className="h-4 w-4" />
                  Abrir conversa
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
