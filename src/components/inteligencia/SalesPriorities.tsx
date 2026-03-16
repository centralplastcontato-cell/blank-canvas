import { } from "react";
import { useNavigate } from "react-router-dom";
import { useCompany } from "@/contexts/CompanyContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { MessageCircle, TrendingUp, Clock, Eye, FileText, Handshake, Zap } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { LEAD_STATUS_LABELS, type LeadStatus } from "@/types/crm";
import { cn } from "@/lib/utils";

interface PriorityLead {
  id: string;
  name: string;
  whatsapp: string;
  status: LeadStatus;
  unit: string | null;
  created_at: string;
  // Intelligence data
  score: number;
  temperature: string;
  last_customer_message_at: string | null;
  last_agent_message_at: string | null;
  priority_flag: boolean;
  // Conversation data
  last_message_at: string | null;
  has_scheduled_visit: boolean;
  // Computed
  priority_score: number;
  reason: string;
  reason_icon: React.ReactNode;
}

const STATUS_WEIGHTS: Record<string, number> = {
  aguardando_resposta: 30,
  orcamento_enviado: 25,
  em_contato: 20,
  novo: 5,
  trabalhe_conosco: 0,
  cliente_retorno: 15,
};

const STATUS_DOT_COLORS: Record<string, string> = {
  novo: "bg-blue-500",
  trabalhe_conosco: "bg-teal-500",
  em_contato: "bg-yellow-500",
  orcamento_enviado: "bg-purple-500",
  aguardando_resposta: "bg-orange-500",
  cliente_retorno: "bg-pink-500",
};

function computePriorityScore(lead: any, conv: any): { score: number; reason: string; icon: React.ReactNode } {
  let score = 0;
  let reason = "";
  let icon: React.ReactNode = <Clock className="h-3.5 w-3.5" />;

  // Base: intelligence score
  const intScore = lead.intelligence_score || 0;
  score += intScore;

  // Status weight
  score += STATUS_WEIGHTS[lead.status] || 0;

  // Recency of customer interaction
  const lastCustomerMsg = conv?.last_message_at;
  if (lastCustomerMsg) {
    const hoursSince = (Date.now() - new Date(lastCustomerMsg).getTime()) / (1000 * 60 * 60);
    if (hoursSince < 2) {
      score += 50;
      reason = "respondeu agora";
      icon = <Zap className="h-3.5 w-3.5 text-green-500" />;
    } else if (hoursSince < 6) {
      score += 40;
      reason = "respondeu há poucas horas";
      icon = <MessageCircle className="h-3.5 w-3.5 text-green-500" />;
    } else if (hoursSince < 24) {
      score += 30;
      reason = "respondeu hoje";
      icon = <MessageCircle className="h-3.5 w-3.5 text-blue-500" />;
    } else if (hoursSince < 48) {
      score += 15;
      reason = "respondeu ontem";
      icon = <Clock className="h-3.5 w-3.5 text-amber-500" />;
    } else {
      const daysAgo = Math.floor(hoursSince / 24);
      reason = `sem interação há ${daysAgo}d`;
      icon = <Clock className="h-3.5 w-3.5 text-muted-foreground" />;
    }
  } else {
    reason = "sem interação recente";
  }

  // Status-specific reasons (override if more relevant)
  if (lead.status === "orcamento_enviado" && (!lastCustomerMsg || (Date.now() - new Date(lastCustomerMsg).getTime()) < 48 * 60 * 60 * 1000)) {
    reason = "aguardando retorno do orçamento";
    icon = <FileText className="h-3.5 w-3.5 text-purple-500" />;
  }
  if (lead.status === "aguardando_resposta") {
    reason = "negociando";
    icon = <Handshake className="h-3.5 w-3.5 text-orange-500" />;
  }
  if (conv?.has_scheduled_visit && lead.status === "em_contato") {
    score += 20;
    reason = "visita agendada";
    icon = <Eye className="h-3.5 w-3.5 text-yellow-600" />;
  }

  // Priority flag bonus
  if (lead.priority_flag) score += 10;

  // Temperature bonus
  if (lead.temperature === "pronto") score += 25;
  else if (lead.temperature === "quente") score += 15;
  else if (lead.temperature === "morno") score += 5;

  return { score: Math.min(score, 200), reason, icon };
}

function timeAgo(date: string | null) {
  if (!date) return null;
  return formatDistanceToNow(new Date(date), { addSuffix: true, locale: ptBR });
}

interface SalesPrioritiesProps {
  selectedUnit?: string;
}

export function SalesPriorities({ selectedUnit }: SalesPrioritiesProps) {
  const { currentCompany } = useCompany();
  const navigate = useNavigate();

  const { data: priorities, isLoading } = useQuery({
    queryKey: ["sales-priorities", currentCompany?.id, selectedUnit],
    queryFn: async (): Promise<PriorityLead[]> => {
      if (!currentCompany?.id) return [];

      // Fetch active leads with intelligence data
      let leadsQuery = supabase
        .from("campaign_leads")
        .select("id, name, whatsapp, status, unit, created_at")
        .eq("company_id", currentCompany.id)
        .not("status", "in", '("fechado","perdido","transferido","fornecedor","outros","trabalhe_conosco")')
        .order("created_at", { ascending: false })
        .limit(500);

      if (selectedUnit && selectedUnit !== "all") {
        leadsQuery = leadsQuery.or(`unit.eq.${selectedUnit},unit.eq.As duas`);
      }

      const { data: leads } = await leadsQuery;
      if (!leads || leads.length === 0) return [];

      const leadIds = leads.map(l => l.id);

      // Fetch intelligence data and conversations in parallel
      const [intResult, convResult] = await Promise.all([
        supabase
          .from("lead_intelligence")
          .select("lead_id, score, temperature, priority_flag, last_customer_message_at, last_agent_message_at")
          .in("lead_id", leadIds),
        supabase
          .from("wapi_conversations")
          .select("lead_id, last_message_at, has_scheduled_visit")
          .in("lead_id", leadIds)
          .order("last_message_at", { ascending: false }),
      ]);

      const intMap = new Map((intResult.data || []).map(i => [i.lead_id, i]));
      // For conversations, take the most recent per lead
      const convMap = new Map<string, any>();
      (convResult.data || []).forEach(c => {
        if (c.lead_id && !convMap.has(c.lead_id)) {
          convMap.set(c.lead_id, c);
        }
      });

      // Build priority list
      const result: PriorityLead[] = leads.map(lead => {
        const intel = intMap.get(lead.id);
        const conv = convMap.get(lead.id);
        const enrichedLead = {
          ...lead,
          intelligence_score: intel?.score || 0,
          temperature: intel?.temperature || "frio",
          priority_flag: intel?.priority_flag || false,
        };
        const { score: priorityScore, reason, icon } = computePriorityScore(enrichedLead, conv);

        return {
          id: lead.id,
          name: lead.name,
          whatsapp: lead.whatsapp,
          status: lead.status as LeadStatus,
          unit: lead.unit,
          created_at: lead.created_at,
          score: intel?.score || 0,
          temperature: intel?.temperature || "frio",
          last_customer_message_at: intel?.last_customer_message_at || null,
          last_agent_message_at: intel?.last_agent_message_at || null,
          priority_flag: intel?.priority_flag || false,
          last_message_at: conv?.last_message_at || null,
          has_scheduled_visit: conv?.has_scheduled_visit || false,
          priority_score: priorityScore,
          reason,
          reason_icon: icon,
        };
      });

      // Sort by priority score descending
      result.sort((a, b) => b.priority_score - a.priority_score);

      // Return top 15
      return result.slice(0, 15);
    },
    enabled: !!currentCompany?.id,
    staleTime: 120_000,
  });

  if (isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-8 w-48 rounded-lg" />
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (!priorities || priorities.length === 0) return null;

  const tempColors: Record<string, string> = {
    pronto: "text-green-500",
    quente: "text-orange-500",
    morno: "text-yellow-500",
    frio: "text-blue-400",
  };

  const tempEmoji: Record<string, string> = {
    pronto: "🎯",
    quente: "🔥",
    morno: "🌤️",
    frio: "❄️",
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
          <TrendingUp className="h-4 w-4" />
          Prioridades de Venda
          <span className="text-xs font-normal text-muted-foreground/70">
            ({priorities.length} leads)
          </span>
        </h2>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {priorities.map((lead, index) => (
          <div
            key={lead.id}
            className={cn(
              "group relative p-3 rounded-xl border bg-card/50 hover:bg-card transition-all hover:shadow-sm",
              index < 3 && "border-primary/20 bg-primary/[0.02]"
            )}
          >
            {/* Rank badge for top 3 */}
            {index < 3 && (
              <div className="absolute -top-1.5 -left-1.5 w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center shadow-sm">
                {index + 1}
              </div>
            )}

            <div className="flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <div className={cn("w-2 h-2 rounded-full shrink-0", STATUS_DOT_COLORS[lead.status] || "bg-muted-foreground")} />
                  <p className="font-medium text-sm truncate">{lead.name}</p>
                  <span className="text-xs shrink-0" title={lead.temperature}>
                    {tempEmoji[lead.temperature] || ""}
                  </span>
                </div>
                <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                  {lead.reason_icon}
                  <span>{lead.reason}</span>
                </div>
                <div className="flex items-center gap-2 mt-1 text-[11px] text-muted-foreground/70">
                  <span>{LEAD_STATUS_LABELS[lead.status] || lead.status}</span>
                  {lead.last_message_at && (
                    <>
                      <span>•</span>
                      <span>{timeAgo(lead.last_message_at)}</span>
                    </>
                  )}
                </div>
              </div>
              <Button
                size="icon"
                variant="ghost"
                className="shrink-0 h-8 w-8 opacity-60 group-hover:opacity-100 transition-opacity"
                onClick={() => navigate(`/atendimento?phone=${lead.whatsapp}`)}
                title="Abrir conversa"
              >
                <MessageCircle className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
