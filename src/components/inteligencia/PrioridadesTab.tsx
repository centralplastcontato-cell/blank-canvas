import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MessageCircle, AlertTriangle, Snowflake, Flame } from "lucide-react";
import { TemperatureBadge } from "./TemperatureBadge";
import { LeadIntelligence } from "@/hooks/useLeadIntelligence";
import { LEAD_STATUS_LABELS, LeadStatus } from "@/types/crm";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface PrioridadesTabProps {
  data: LeadIntelligence[];
}

function timeAgo(date: string | null) {
  if (!date) return "—";
  return formatDistanceToNow(new Date(date), { addSuffix: true, locale: ptBR });
}

function LeadRow({ item }: { item: LeadIntelligence }) {
  const navigate = useNavigate();
  return (
    <div className="flex items-center justify-between gap-3 p-3 rounded-lg border bg-card/50 hover:bg-card transition-colors">
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm truncate">{item.lead_name}</p>
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          <span className="text-xs text-muted-foreground">
            Score: <strong>{item.score}</strong>
          </span>
          <TemperatureBadge temperature={item.temperature} />
          <span className="text-xs text-muted-foreground">
            {LEAD_STATUS_LABELS[item.lead_status as LeadStatus] || item.lead_status}
          </span>
        </div>
        {item.last_customer_message_at && (
          <p className="text-xs text-muted-foreground mt-1">
            Última msg: {timeAgo(item.last_customer_message_at)}
          </p>
        )}
      </div>
      <Button
        size="sm"
        variant="outline"
        className="shrink-0"
        onClick={() => navigate(`/atendimento?phone=${item.lead_whatsapp}`)}
      >
        <MessageCircle className="h-4 w-4 mr-1" />
        Chat
      </Button>
    </div>
  );
}

export function PrioridadesTab({ data }: PrioridadesTabProps) {
  const activeLeads = data.filter(
    d => d.lead_status !== 'fechado' && d.lead_status !== 'perdido'
  );

  const atenderAgora = activeLeads.filter(d => d.priority_flag);
  const emRisco = activeLeads.filter(
    d => d.abandonment_type && !d.priority_flag
  );
  const frios = activeLeads.filter(
    d => d.score < 20 && !d.abandonment_type && !d.priority_flag
  );

  return (
    <div className="grid gap-6 md:grid-cols-3">
      {/* Atender Agora */}
      <Card className="border-green-500/30">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Flame className="h-5 w-5 text-green-400" />
            Atender Agora
            <span className="ml-auto text-sm font-normal text-muted-foreground">
              {atenderAgora.length}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 max-h-[500px] overflow-y-auto">
          {atenderAgora.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Nenhum lead prioritário
            </p>
          ) : (
            atenderAgora.map(item => <LeadRow key={item.id} item={item} />)
          )}
        </CardContent>
      </Card>

      {/* Em Risco */}
      <Card className="border-orange-500/30">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-400" />
            Em Risco
            <span className="ml-auto text-sm font-normal text-muted-foreground">
              {emRisco.length}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 max-h-[500px] overflow-y-auto">
          {emRisco.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Nenhum lead em risco
            </p>
          ) : (
            emRisco.map(item => (
              <div key={item.id}>
                <LeadRow item={item} />
                {item.abandonment_type && (
                  <p className="text-xs text-orange-400 ml-3 mt-1">
                    Abandono: {item.abandonment_type.replace('_', ' ')}
                  </p>
                )}
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Frios */}
      <Card className="border-blue-500/30">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Snowflake className="h-5 w-5 text-blue-400" />
            Frios
            <span className="ml-auto text-sm font-normal text-muted-foreground">
              {frios.length}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 max-h-[500px] overflow-y-auto">
          {frios.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Nenhum lead frio
            </p>
          ) : (
            frios.map(item => <LeadRow key={item.id} item={item} />)
          )}
        </CardContent>
      </Card>
    </div>
  );
}
