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
  fuNumber: number;
  instanceUnit: string | null;
}

interface FollowUpsTabProps {
  intelligenceData: LeadIntelligence[];
  selectedUnit?: string;
}

interface InstanceDelays {
  unit: string;
  delays: Record<number, number>;
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

function formatDelayLabel(hours: number): string {
  if (hours >= 24 && hours % 24 === 0) return `${hours / 24}d`;
  return `${hours}h`;
}

export function FollowUpsTab({ intelligenceData, selectedUnit }: FollowUpsTabProps) {
  const navigate = useNavigate();
  const { currentCompany } = useCompany();
  const [isLoading, setIsLoading] = useState(true);
  const [followUpLeads, setFollowUpLeads] = useState<FollowUpLead[]>([]);
  const [instanceDelaysMap, setInstanceDelaysMap] = useState<Map<string, InstanceDelays>>(new Map());

  useEffect(() => {
    if (!currentCompany?.id) return;
    loadFollowUpData();
  }, [currentCompany?.id]);

  async function loadFollowUpData() {
    if (!currentCompany?.id) return;
    setIsLoading(true);

    try {
      // Fetch ALL bot settings + instances for this company
      const { data: allSettings } = await supabase
        .from("wapi_bot_settings" as any)
        .select("instance_id, follow_up_delay_hours, follow_up_2_delay_hours, follow_up_3_delay_hours, follow_up_4_delay_hours")
        .eq("company_id", currentCompany.id);

      const { data: instances } = await supabase
        .from("wapi_instances" as any)
        .select("id, unit")
        .eq("company_id", currentCompany.id);

      // Build instance -> delays map
      const instMap = new Map<string, string>();
      if (instances) {
        for (const inst of instances) {
          instMap.set((inst as any).id, (inst as any).unit);
        }
      }

      const delaysMap = new Map<string, InstanceDelays>();
      if (allSettings) {
        for (const s of allSettings as any[]) {
          const unit = instMap.get(s.instance_id) || "unknown";
          delaysMap.set(s.instance_id, {
            unit,
            delays: {
              1: s.follow_up_delay_hours ?? 24,
              2: s.follow_up_2_delay_hours ?? 48,
              3: s.follow_up_3_delay_hours ?? 72,
              4: s.follow_up_4_delay_hours ?? 96,
            },
          });
        }
      }
      setInstanceDelaysMap(delaysMap);

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

      // For each lead, find the highest follow-up number
      const leadMaxFu = new Map<string, number>();
      for (const ev of historyEvents) {
        let fuNum = 1;
        if (ev.action.includes("#2")) fuNum = 2;
        else if (ev.action.includes("#3")) fuNum = 3;
        else if (ev.action.includes("#4")) fuNum = 4;
        const current = leadMaxFu.get(ev.lead_id) || 0;
        if (fuNum > current) leadMaxFu.set(ev.lead_id, fuNum);
      }

      const leadIds = [...leadMaxFu.keys()];
      
      // Fetch leads and their conversations (for instance_id) in parallel
      const [leadsResult, conversationsResult] = await Promise.all([
        supabase
          .from("campaign_leads")
          .select("id, name, whatsapp, status")
          .in("id", leadIds)
          .not("status", "in", '("fechado","perdido")'),
        supabase
          .from("wapi_conversations" as any)
          .select("lead_id, instance_id")
          .eq("company_id", currentCompany.id)
          .in("lead_id", leadIds),
      ]);

      const leads = leadsResult.data;
      const conversations = conversationsResult.data as any[] | null;

      if (!leads || leads.length === 0) {
        setFollowUpLeads([]);
        setIsLoading(false);
        return;
      }

      // Build lead -> instance_id map
      const leadInstanceMap = new Map<string, string>();
      if (conversations) {
        for (const conv of conversations) {
          leadInstanceMap.set(conv.lead_id, conv.instance_id);
        }
      }

      const intelMap = new Map(intelligenceData.map(i => [i.lead_id, i]));

      const result: FollowUpLead[] = leads.map(lead => {
        const intel = intelMap.get(lead.id);
        const instanceId = leadInstanceMap.get(lead.id);
        const instanceUnit = instanceId ? instMap.get(instanceId) || null : null;
        return {
          leadId: lead.id,
          leadName: lead.name,
          leadWhatsapp: lead.whatsapp,
          score: intel?.score ?? 0,
          temperature: intel?.temperature ?? "frio",
          status: lead.status,
          lastCustomerMessageAt: intel?.last_customer_message_at ?? null,
          fuNumber: leadMaxFu.get(lead.id) || 1,
          instanceUnit,
        };
      });

      result.sort((a, b) => b.score - a.score);
      setFollowUpLeads(result);
    } catch (e) {
      console.error("Error loading follow-up data:", e);
    } finally {
      setIsLoading(false);
    }
  }

  // Compute delay labels for each column based on selected unit or all instances
  function getDelayLabel(fuNumber: number): string {
    if (instanceDelaysMap.size === 0) {
      return `${fuNumber * 24}h`;
    }

    // If a unit is selected, find the matching instance
    if (selectedUnit && selectedUnit !== "all") {
      for (const [, data] of instanceDelaysMap) {
        if (data.unit === selectedUnit) {
          return formatDelayLabel(data.delays[fuNumber]);
        }
      }
    }

    // If only one instance or all have same delay, show single value
    const allDelays = [...instanceDelaysMap.values()].map(d => d.delays[fuNumber]);
    const unique = [...new Set(allDelays)];
    if (unique.length === 1) {
      return formatDelayLabel(unique[0]);
    }

    // Multiple different delays: show range
    const min = Math.min(...unique);
    const max = Math.max(...unique);
    return `${formatDelayLabel(min)}–${formatDelayLabel(max)}`;
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
                  <span className="text-xs font-normal text-muted-foreground">({getDelayLabel(col.fuNumber)})</span>
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
