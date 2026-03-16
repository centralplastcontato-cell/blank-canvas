import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { AlertTriangle, ArrowRight, Bell, RefreshCw, TrendingDown, Users, Calendar, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

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
};

const SEVERITY_STYLES: Record<string, string> = {
  critical: "border-red-500/30 bg-red-500/5",
  warning: "border-amber-500/20 bg-amber-500/5",
};

const ACTION_LABELS: Record<string, string> = {
  negociacoes_paradas: "Ver negociações",
  conversao_caiu: "Ver relatório",
  orcamentos_sem_resposta: "Ver no CRM",
  poucos_leads: "Ver relatório",
  baixa_ocupacao: "Ver agenda",
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

  const handleAction = (alert: Alert) => {
    const filter = alert.related_filter;
    if (!filter) return;

    if (filter.tab && onTabChange) {
      onTabChange(filter.tab);
      return;
    }

    if (filter.path) {
      navigate(filter.path);
    }
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
        {alerts.map((alert) => (
          <div
            key={alert.id}
            className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${
              SEVERITY_STYLES[alert.severity] || SEVERITY_STYLES.warning
            }`}
          >
            <div className="shrink-0">
              {ICON_MAP[alert.alert_type] || <AlertTriangle className="h-5 w-5 text-muted-foreground" />}
            </div>
            <p className="flex-1 text-sm font-medium text-foreground leading-snug">
              {alert.alert_message}
            </p>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleAction(alert)}
              className="shrink-0 h-8 text-xs font-semibold text-primary hover:text-primary"
            >
              {ACTION_LABELS[alert.alert_type] || "Ver"}
              <ArrowRight className="h-3.5 w-3.5 ml-1" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
