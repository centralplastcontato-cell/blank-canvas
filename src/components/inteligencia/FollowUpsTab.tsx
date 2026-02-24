import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { MessageCircle, Timer } from "lucide-react";
import { TemperatureBadge } from "./TemperatureBadge";
import { InlineAISummary } from "./InlineAISummary";
import { useCompany } from "@/contexts/CompanyContext";
import { supabase } from "@/integrations/supabase/client";
import { LeadIntelligence } from "@/hooks/useLeadIntelligence";
import { LEAD_STATUS_LABELS, LeadStatus } from "@/types/crm";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface FollowUpLead {
  leadId: string;
  leadName: string;
  leadWhatsapp: string;
  score: number;
  temperature: string;
  status: string;
  lastCustomerMessageAt: string | null;
  fuNumber: number; // 1-4
}

interface FollowUpsTabProps {
  intelligenceData: LeadIntelligence[];
}

const COLUMN_CONFIG = [
  { fuNumber: 1, label: "1º Follow-up", color: "border-l-green-500", iconBg: "bg-green-500/10", iconColor: "text-green-500" },
  { fuNumber: 2, label: "2º Follow-up", color: "border-l-sky-500", iconBg: "bg-sky-500/10", iconColor: "text-sky-500" },
  { fuNumber: 3, label: "3º Follow-up", color: "border-l-orange-500", iconBg: "bg-orange-500/10", iconColor: "text-orange-500" },
  { fuNumber: 4, label: "4º Follow-up", color: "border-l-red-500", iconBg: "bg-red-500/10", iconColor: "text-red-500" },
];

function timeAgo(date: string | null) {
  if (!date) return "—";
  return formatDistanceToNow(new Date(date), { addSuffix: true, locale: ptBR });
}

export function FollowUpsTab({ intelligenceData }: FollowUpsTabProps) {
  const navigate = useNavigate();
  const { currentCompany } = useCompany();
  const [isLoading, setIsLoading] = useState(true);
  const [followUpLeads, setFollowUpLeads] = useState<FollowUpLead[]>([]);
  const [delayLabels, setDelayLabels] = useState<Record<number, string>>({ 1: "24h", 2: "48h", 3: "72h", 4: "96h" });

  useEffect(() => {
    if (!currentCompany?.id) return;
    loadFollowUpData();
  }, [currentCompany?.id]);

  async function loadFollowUpData() {
    if (!currentCompany?.id) return;
    setIsLoading(true);

    try {
      // Fetch bot settings for delay labels
      const { data: botSettings } = await supabase
        .from("wapi_bot_settings" as any)
        .select("follow_up_delay_hours, follow_up_2_delay_hours, follow_up_3_delay_hours, follow_up_4_delay_hours")
        .eq("company_id", currentCompany.id)
        .limit(1)
        .maybeSingle();

      if (botSettings) {
        setDelayLabels({
          1: `${(botSettings as any).follow_up_delay_hours ?? 24}h`,
          2: `${(botSettings as any).follow_up_2_delay_hours ?? 48}h`,
          3: `${(botSettings as any).follow_up_3_delay_hours ?? 72}h`,
          4: `${(botSettings as any).follow_up_4_delay_hours ?? 96}h`,
        });
      }

      // Fetch follow-up history events
      const followUpActions = [
        "Follow-up automático enviado",
        "Follow-up #2 automático enviado",
        "Follow-up #3 automático enviado",
        "Follow-up #4 automático enviado",
      ];

      const { data: historyEvents } = await supabase
        .from("lead_history")
        .select("lead_id, action, created_at")
        .eq("company_id", currentCompany.id)
        .in("action", followUpActions)
        .order("created_at", { ascending: false });

      if (!historyEvents || historyEvents.length === 0) {
        setFollowUpLeads([]);
        setIsLoading(false);
        return;
      }

      // For each lead, find the highest follow-up number received
      const leadMaxFu = new Map<string, number>();
      for (const ev of historyEvents) {
        let fuNum = 1;
        if (ev.action.includes("#2")) fuNum = 2;
        else if (ev.action.includes("#3")) fuNum = 3;
        else if (ev.action.includes("#4")) fuNum = 4;

        const current = leadMaxFu.get(ev.lead_id) || 0;
        if (fuNum > current) leadMaxFu.set(ev.lead_id, fuNum);
      }

      // Get lead details
      const leadIds = [...leadMaxFu.keys()];
      const { data: leads } = await supabase
        .from("campaign_leads")
        .select("id, name, whatsapp, status")
        .in("id", leadIds)
        .not("status", "in", '("fechado","perdido")');

      if (!leads || leads.length === 0) {
        setFollowUpLeads([]);
        setIsLoading(false);
        return;
      }

      // Build intelligence map
      const intelMap = new Map(intelligenceData.map(i => [i.lead_id, i]));

      const result: FollowUpLead[] = leads.map(lead => {
        const intel = intelMap.get(lead.id);
        return {
          leadId: lead.id,
          leadName: lead.name,
          leadWhatsapp: lead.whatsapp,
          score: intel?.score ?? 0,
          temperature: intel?.temperature ?? "frio",
          status: lead.status,
          lastCustomerMessageAt: intel?.last_customer_message_at ?? null,
          fuNumber: leadMaxFu.get(lead.id) || 1,
        };
      });

      // Sort by score descending within each group
      result.sort((a, b) => b.score - a.score);
      setFollowUpLeads(result);
    } catch (e) {
      console.error("Error loading follow-up data:", e);
    } finally {
      setIsLoading(false);
    }
  }

  if (isLoading) {
    return (
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-64 rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
      {COLUMN_CONFIG.map(col => {
        const columnLeads = followUpLeads.filter(l => l.fuNumber === col.fuNumber);
        return (
          <Card key={col.fuNumber} className={`border-l-4 ${col.color} shadow-card`}>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <div className={`p-1.5 rounded-lg ${col.iconBg}`}>
                  <Timer className={`h-4 w-4 ${col.iconColor}`} />
                </div>
                <div className="flex flex-col">
                  <span>{col.label}</span>
                  <span className="text-xs font-normal text-muted-foreground">({delayLabels[col.fuNumber]})</span>
                </div>
                <span className="ml-auto text-sm font-normal text-muted-foreground">
                  {columnLeads.length}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 max-h-[calc(100vh-220px)] overflow-y-auto">
              {columnLeads.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">
                  Nenhum lead nesta etapa
                </p>
              ) : (
                columnLeads.map(lead => (
                  <div key={lead.leadId} className="p-4 rounded-lg border border-border/50 bg-card/50 hover:bg-card transition-colors">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{lead.leadName}</p>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <span className="text-xs text-muted-foreground">
                            Score: <span className="font-bold text-foreground">{lead.score}</span>
                          </span>
                          <TemperatureBadge temperature={lead.temperature} />
                          <span className="text-xs text-muted-foreground">
                            {LEAD_STATUS_LABELS[lead.status as LeadStatus] || lead.status}
                          </span>
                        </div>
                        {lead.lastCustomerMessageAt && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Última msg: {timeAgo(lead.lastCustomerMessageAt)}
                          </p>
                        )}
                      </div>
                      <Button
                        size="icon"
                        variant="outline"
                        className="shrink-0 h-8 w-8"
                        onClick={() => navigate(`/atendimento?phone=${lead.leadWhatsapp}`)}
                      >
                        <MessageCircle className="h-4 w-4" />
                      </Button>
                    </div>
                    <InlineAISummary leadId={lead.leadId} leadWhatsapp={lead.leadWhatsapp} />
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
