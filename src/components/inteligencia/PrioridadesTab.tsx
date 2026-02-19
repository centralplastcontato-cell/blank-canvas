import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MessageCircle, Snowflake, Flame, AlertTriangle, RefreshCw } from "lucide-react";
import { TemperatureBadge } from "./TemperatureBadge";
import { InlineAISummary } from "./InlineAISummary";
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
    <div className="p-4 rounded-lg border border-border/50 bg-card/50 hover:bg-card transition-colors">
      <div className="flex items-center justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm truncate">{item.lead_name}</p>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className="text-xs text-muted-foreground">
              Score: <span className="font-bold text-foreground">{item.score}</span>
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
          <p className="text-xs text-muted-foreground/60 mt-0.5 flex items-center gap-1">
            <RefreshCw className="h-3 w-3" />
            Score: {timeAgo(item.updated_at)}
          </p>
        </div>
        <Button
          size="icon"
          variant="outline"
          className="shrink-0 h-8 w-8"
          onClick={() => navigate(`/atendimento?phone=${item.lead_whatsapp}`)}
        >
          <MessageCircle className="h-4 w-4" />
        </Button>
      </div>
      <InlineAISummary leadId={item.lead_id} leadWhatsapp={item.lead_whatsapp} />
    </div>
  );
}

export function PrioridadesTab({ data }: PrioridadesTabProps) {
  const activeLeads = data.filter(
    d => d.lead_status !== 'fechado' && d.lead_status !== 'perdido'
  );

  const atenderAgora = activeLeads.filter(d => d.temperature !== 'frio' && !d.abandonment_type);
  const emRisco = activeLeads.filter(
    d => d.abandonment_type && !d.priority_flag
  );
  const frios = activeLeads.filter(
    d => d.score < 20 && !d.abandonment_type && !d.priority_flag
  );

  return (
    <div className="grid gap-6 md:grid-cols-3">
      {/* Atender Agora */}
      <Card className="border-green-500/20 shadow-card border-l-4 border-l-green-500">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-green-500/10">
              <Flame className="h-4 w-4 text-green-500" />
            </div>
            Atender Agora
            <span className="ml-auto text-sm font-normal text-muted-foreground">
              {atenderAgora.length}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 max-h-[calc(100vh-220px)] overflow-y-auto">
          {atenderAgora.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              Nenhum lead prioritário
            </p>
          ) : (
            atenderAgora.map(item => <LeadRow key={item.id} item={item} />)
          )}
        </CardContent>
      </Card>

      {/* Em Risco */}
      <Card className="border-orange-500/20 shadow-card border-l-4 border-l-orange-500">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-orange-500/10">
              <AlertTriangle className="h-4 w-4 text-orange-500" />
            </div>
            Em Risco
            <span className="ml-auto text-sm font-normal text-muted-foreground">
              {emRisco.length}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 max-h-[calc(100vh-220px)] overflow-y-auto">
          {emRisco.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              Nenhum lead em risco
            </p>
          ) : (
            emRisco.map(item => (
              <div key={item.id}>
                <LeadRow item={item} />
                {item.abandonment_type && (
                  <p className="text-xs text-orange-500 ml-3 mt-1">
                    Abandono: {item.abandonment_type.replace('_', ' ')}
                  </p>
                )}
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Frios */}
      <Card className="border-blue-500/20 shadow-card border-l-4 border-l-blue-500">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-blue-500/10">
              <Snowflake className="h-4 w-4 text-blue-500" />
            </div>
            Frios
            <span className="ml-auto text-sm font-normal text-muted-foreground">
              {frios.length}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 max-h-[calc(100vh-220px)] overflow-y-auto">
          {frios.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
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
