import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { AlertTriangle, ArrowRight, Bell, RefreshCw, TrendingDown, Users, Calendar, FileText, Lightbulb, Zap, ListChecks } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface Alert {
  id: string;
  alert_type: string;
  alert_message: string;
  severity: string;
  related_filter: any;
  created_at: string;
}

const ICON_MAP: Record<string, React.ReactNode> = {
  negociacoes_paradas: <Users className="h-5 w-5 text-orange-500" />,
  conversao_caiu: <TrendingDown className="h-5 w-5 text-red-500" />,
  orcamentos_sem_resposta: <FileText className="h-5 w-5 text-amber-500" />,
  poucos_leads: <Bell className="h-5 w-5 text-yellow-500" />,
  baixa_ocupacao: <Calendar className="h-5 w-5 text-blue-500" />,
  reativacao_volume_alto: <Zap className="h-5 w-5 text-red-500" />,
  tarefas_atrasadas: <ListChecks className="h-5 w-5 text-orange-500" />,
};

const SEVERITY_STYLES: Record<string, string> = {
  critical: "border-red-500/30 bg-red-500/5",
  warning: "border-amber-500/20 bg-amber-500/5",
};

interface AlertAction {
  label: string;
  primary?: boolean;
  handler: (alert: Alert, navigate: ReturnType<typeof useNavigate>, onTabChange?: (tab: string) => void) => void;
}

const ALERT_ACTIONS: Record<string, AlertAction[]> = {
  negociacoes_paradas: [
    {
      label: "Ver negociações",
      primary: true,
      handler: (_alert, _nav, onTabChange) => onTabChange?.("negociacoes"),
    },
    {
      label: "Abrir CRM",
      handler: (_alert, navigate) => navigate("/admin"),
    },
  ],
  orcamentos_sem_resposta: [
    {
      label: "Ver leads",
      primary: true,
      handler: (_alert, _nav, onTabChange) => onTabChange?.("negociacoes"),
    },
    {
      label: "Abrir CRM filtrado",
      handler: (_alert, navigate) => navigate("/admin"),
    },
  ],
  conversao_caiu: [
    {
      label: "Ver relatório",
      primary: true,
      handler: (_alert, _nav, onTabChange) => onTabChange?.("relatorios"),
    },
    {
      label: "Ver funil",
      handler: (_alert, _nav, onTabChange) => onTabChange?.("funil"),
    },
  ],
  poucos_leads: [
    {
      label: "Ver relatório",
      primary: true,
      handler: (_alert, _nav, onTabChange) => onTabChange?.("relatorios"),
    },
  ],
  baixa_ocupacao: [
    {
      label: "Abrir agenda",
      primary: true,
      handler: (alert, navigate) => {
        const month = alert.related_filter?.month;
        if (month) {
          navigate(`/agenda?month=${month}`);
        } else {
          navigate("/agenda");
        }
      },
    },
  ],
  reativacao_volume_alto: [
    {
      label: "Ver configurações",
      primary: true,
      handler: (_alert, navigate) => navigate("/configuracoes"),
    },
  ],
  tarefas_atrasadas: [
    {
      label: "Ver tarefas",
      primary: true,
      handler: (_alert, navigate) => navigate("/agenda"),
    },
  ],
};

const SUGGESTIONS: Record<string, string> = {
  negociacoes_paradas: "💡 Sugerimos entrar em contato com esses leads para retomar a negociação.",
  orcamentos_sem_resposta: "💡 Sugerimos fazer um follow-up com os leads que receberam orçamento.",
  conversao_caiu: "💡 Revise o funil para identificar em qual etapa os leads estão sendo perdidos.",
  poucos_leads: "💡 Sugerimos intensificar a divulgação e campanhas para atrair novos leads.",
  baixa_ocupacao: "💡 Sugerimos intensificar a divulgação para esse mês e oferecer condições especiais.",
  reativacao_volume_alto: "💡 Verifique os limites de envio na tela de Reativação Inteligente e ajuste se necessário.",
  tarefas_atrasadas: "💡 Revise as tarefas atrasadas e atualize os status ou redistribua entre a equipe.",
};

interface AlertsPanelProps {
  onTabChange?: (tab: string) => void;
}

export function AlertsPanel({ onTabChange }: AlertsPanelProps) {
  const { currentCompany } = useCompany();
  const navigate = useNavigate();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchAlerts = async () => {
    if (!currentCompany?.id) return;
    const { data } = await supabase
      .from("alerts_system")
      .select("*")
      .eq("company_id", currentCompany.id)
      .eq("resolved", false)
      .order("created_at", { ascending: false })
      .limit(5);
    setAlerts((data as Alert[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchAlerts();
  }, [currentCompany?.id]);

  const handleRefresh = async () => {
    if (!currentCompany?.id) return;
    setRefreshing(true);
    try {
      await supabase.functions.invoke("smart-alerts", {
        body: { company_id: currentCompany.id },
      });
      await fetchAlerts();
    } catch (e) {
      console.error("Erro ao atualizar alertas:", e);
    }
    setRefreshing(false);
  };

  if (loading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-16 rounded-xl" />
      </div>
    );
  }

  if (alerts.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
          <AlertTriangle className="h-4 w-4" />
          Alertas do Sistema
        </h2>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleRefresh}
          disabled={refreshing}
          className="h-7 text-xs text-muted-foreground"
        >
          <RefreshCw className={`h-3.5 w-3.5 mr-1 ${refreshing ? "animate-spin" : ""}`} />
          Atualizar
        </Button>
      </div>

      <div className="grid gap-2">
        {alerts.map((alert) => {
          const actions = ALERT_ACTIONS[alert.alert_type] || [];
          const suggestion = SUGGESTIONS[alert.alert_type];

          return (
            <div
              key={alert.id}
              className={cn(
                "p-3 rounded-xl border transition-colors",
                SEVERITY_STYLES[alert.severity] || SEVERITY_STYLES.warning
              )}
            >
              <div className="flex items-start gap-3">
                <div className="shrink-0 mt-0.5">
                  {ICON_MAP[alert.alert_type] || <AlertTriangle className="h-5 w-5 text-muted-foreground" />}
                </div>
                <div className="flex-1 min-w-0 space-y-2">
                  <p className="text-sm font-medium text-foreground leading-snug">
                    {alert.alert_message}
                  </p>

                  {/* Suggestion */}
                  {suggestion && (
                    <p className="text-xs text-muted-foreground flex items-start gap-1.5">
                      <Lightbulb className="h-3.5 w-3.5 shrink-0 mt-0.5 text-amber-500" />
                      <span>{suggestion.replace("💡 ", "")}</span>
                    </p>
                  )}

                  {/* Action buttons */}
                  {actions.length > 0 && (
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {actions.map((action, i) => (
                        <Button
                          key={i}
                          variant={action.primary ? "default" : "outline"}
                          size="sm"
                          onClick={() => action.handler(alert, navigate, onTabChange)}
                          className={cn(
                            "h-7 text-xs font-medium",
                            action.primary
                              ? "bg-primary/90 hover:bg-primary shadow-sm"
                              : "text-muted-foreground"
                          )}
                        >
                          {action.label}
                          {action.primary && <ArrowRight className="h-3 w-3 ml-1" />}
                        </Button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
