import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MessageCircle, Download, RefreshCw } from "lucide-react";
import { TemperatureBadge } from "./TemperatureBadge";
import { InlineAISummary } from "./InlineAISummary";
import { LeadIntelligence } from "@/hooks/useLeadIntelligence";
import { LEAD_STATUS_LABELS, LeadStatus } from "@/types/crm";
import { format, isToday, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";

interface LeadsDoDiaTabProps {
  data: LeadIntelligence[];
  canExport: boolean;
}

export function LeadsDoDiaTab({ data, canExport }: LeadsDoDiaTabProps) {
  const navigate = useNavigate();
  const { currentCompany } = useCompany();
  const [missingLeads, setMissingLeads] = useState<LeadIntelligence[]>([]);

  const todayFromIntelligence = data.filter(d => {
    const createdAt = d.lead_created_at || d.created_at;
    return isToday(new Date(createdAt));
  });

  // Fetch leads created today that are missing from lead_intelligence
  useEffect(() => {
    if (!currentCompany?.id) return;
    const intelligenceLeadIds = new Set(data.map(d => d.lead_id));
    
    const fetchMissing = async () => {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      
      const { data: allTodayLeads } = await supabase
        .from('campaign_leads')
        .select('id, name, status, whatsapp, unit, created_at')
        .eq('company_id', currentCompany.id)
        .gte('created_at', todayStart.toISOString());
      
      if (!allTodayLeads) return;
      
      const missing = allTodayLeads
        .filter(l => !intelligenceLeadIds.has(l.id))
        .map(l => ({
          id: `missing-${l.id}`,
          lead_id: l.id,
          company_id: currentCompany.id,
          score: 0,
          temperature: 'frio',
          priority_flag: false,
          abandonment_type: null,
          intent_tags: [],
          last_customer_message_at: null,
          last_agent_message_at: null,
          followup_count: 0,
          updated_at: l.created_at,
          created_at: l.created_at,
          lead_name: l.name,
          lead_status: l.status,
          lead_whatsapp: l.whatsapp,
          lead_unit: l.unit,
          lead_created_at: l.created_at,
        } as LeadIntelligence));
      
      setMissingLeads(missing);
    };
    
    fetchMissing();
  }, [currentCompany?.id, data]);

  const todayLeads = [...todayFromIntelligence, ...missingLeads]
    .sort((a, b) => new Date(b.lead_created_at || b.created_at).getTime() - new Date(a.lead_created_at || a.created_at).getTime());

  const handleExport = () => {
    const rows = todayLeads.map(d => [
      d.lead_name,
      d.score,
      d.temperature,
      LEAD_STATUS_LABELS[d.lead_status as LeadStatus] || d.lead_status,
      d.lead_whatsapp,
    ]);

    const csv = [
      ['Nome', 'Score', 'Temperatura', 'Status', 'WhatsApp'].join(','),
      ...rows.map(r => r.join(',')),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `inteligencia-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold">
          Leads do Dia ({todayLeads.length})
        </h3>
        {canExport && todayLeads.length > 0 && (
          <Button size="sm" variant="outline" onClick={handleExport}>
            <Download className="h-4 w-4 mr-1" />
            Exportar
          </Button>
        )}
      </div>

      {todayLeads.length === 0 ? (
        <Card>
          <CardContent className="py-8">
            <p className="text-sm text-muted-foreground text-center">
              Nenhum lead novo hoje
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {todayLeads.map(item => (
            <Card key={item.id}>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate">{item.lead_name}</p>
                    <p className="text-sm text-muted-foreground">
                      {LEAD_STATUS_LABELS[item.lead_status as LeadStatus] || item.lead_status}
                    </p>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="shrink-0"
                    onClick={() => navigate(`/atendimento?phone=${item.lead_whatsapp}`)}
                  >
                    <MessageCircle className="h-4 w-4" />
                  </Button>
                </div>

                <div className="flex items-center gap-4 flex-wrap">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-muted-foreground">Score:</span>
                    <span className="font-bold text-sm">{item.score}</span>
                  </div>
                  <TemperatureBadge temperature={item.temperature} />
                  <div className="flex items-center gap-1 text-xs text-muted-foreground/60">
                    <RefreshCw className="h-3 w-3" />
                    {formatDistanceToNow(new Date(item.updated_at), { addSuffix: true, locale: ptBR })}
                  </div>
                </div>

                <InlineAISummary leadId={item.lead_id} leadWhatsapp={item.lead_whatsapp} />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
