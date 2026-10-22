import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, BellRing, CheckCircle2, ChevronDown, CircleAlert } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useHubHealth } from "@/hooks/useHubHealth";
import { buildAlerts } from "@/lib/hubAlerts";

const VISIBLE = 4;

// Central de alertas do Painel: o que precisa de atenção agora, por unidade
export function HubAlerts() {
  const navigate = useNavigate();
  const { data, isLoading, error } = useHubHealth();
  const [expanded, setExpanded] = useState(false);
  const alerts = useMemo(() => (data ? buildAlerts(data) : []), [data]);

  // SQL da fase 3 ainda não rodado ou falha: não ocupa espaço no Painel
  if (error) return null;

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-4 space-y-2">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (alerts.length === 0) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/5 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-400">
        <CheckCircle2 className="h-4 w-4 shrink-0" />
        Tudo em ordem: nenhuma unidade precisa de atenção agora.
      </div>
    );
  }

  const critical = alerts.filter(a => a.severity === "critical").length;
  const shown = expanded ? alerts : alerts.slice(0, VISIBLE);

  return (
    <Card className={cn(critical > 0 && "border-rose-500/30")}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <BellRing className="h-4 w-4" />
          Precisa de atenção
          <span className="text-xs font-normal text-muted-foreground">
            · {alerts.length} {alerts.length === 1 ? "alerta" : "alertas"}
            {critical > 0 && ` (${critical} ${critical === 1 ? "urgente" : "urgentes"})`}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <ul className="divide-y divide-border/60">
          {shown.map(a => {
            const Icon = a.severity === "critical" ? CircleAlert : AlertTriangle;
            return (
              <li key={a.id} className="flex items-start gap-3 py-2.5 min-w-0">
                <Icon className={cn("h-4 w-4 mt-0.5 shrink-0", a.severity === "critical" ? "text-rose-600" : "text-amber-600")} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">
                    <span className="text-muted-foreground font-normal">{a.companyName} · </span>
                    {a.title}
                  </p>
                  <p className="text-xs text-muted-foreground">{a.detail}</p>
                </div>
                {a.action && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs shrink-0"
                    onClick={() => navigate(a.action!.path)}
                  >
                    {a.action.label}
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
        {alerts.length > VISIBLE && (
          <Button variant="ghost" size="sm" className="mt-1 text-xs text-muted-foreground" onClick={() => setExpanded(v => !v)}>
            <ChevronDown className={cn("h-3.5 w-3.5 mr-1 transition-transform", expanded && "rotate-180")} />
            {expanded ? "Mostrar menos" : `Ver mais ${alerts.length - VISIBLE}`}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
