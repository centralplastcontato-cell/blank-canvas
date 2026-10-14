import { useCallback, useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Faixa de atenção no topo da Central de Atendimento quando um número ficou
 * mais de 2h, em horário comercial, sem nenhum aviso do WhatsApp (alerta
 * "mensagens podem não estar chegando" do follow-up-check). Fica até alguém
 * clicar em "Já conferi". Nunca manda desconectar o aparelho: isso destruiria
 * uma sessão que pode estar funcionando (alarme falso VENDAS 2, 13/10 21:18).
 */

interface SilentAlert {
  unit: string;
  since: string;
  notificationIds: string[];
}

const LOOKBACK_HOURS = 24;
const REFRESH_MS = 2 * 60 * 1000;

export function groupSilentAlerts(
  rows: { id: string; created_at: string; data: Record<string, unknown> | null }[],
): SilentAlert[] {
  const byUnit = new Map<string, SilentAlert>();
  for (const row of rows) {
    const data = row.data || {};
    if (data.webhook_silent !== true) continue;
    const unit = (typeof data.unit === "string" && data.unit) || "WhatsApp";
    const since = (typeof data.last_webhook_event_at === "string" && data.last_webhook_event_at) || row.created_at;
    const current = byUnit.get(unit);
    if (!current) {
      byUnit.set(unit, { unit, since, notificationIds: [row.id] });
    } else {
      current.notificationIds.push(row.id);
      if (since < current.since) current.since = since;
    }
  }
  return Array.from(byUnit.values()).sort((a, b) => a.unit.localeCompare(b.unit));
}

function formatSince(iso: string): string {
  const d = new Date(iso);
  const sameDay = d.toDateString() === new Date().toDateString();
  return d.toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    hour: "2-digit",
    minute: "2-digit",
    ...(sameDay ? {} : { day: "2-digit", month: "2-digit" }),
  });
}

export function SilentInstanceBanner() {
  const [alerts, setAlerts] = useState<SilentAlert[]>([]);

  const load = useCallback(async () => {
    const since = new Date(Date.now() - LOOKBACK_HOURS * 3600 * 1000).toISOString();
    const { data, error } = await supabase
      .from("notifications")
      .select("id, created_at, data")
      .eq("type", "message_stuck")
      .eq("read", false)
      .gte("created_at", since)
      .order("created_at", { ascending: true })
      .limit(50);
    if (error) return;
    setAlerts(groupSilentAlerts((data || []) as any));
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, REFRESH_MS);
    return () => clearInterval(t);
  }, [load]);

  const dismiss = async (alert: SilentAlert) => {
    setAlerts((prev) => prev.filter((a) => a.unit !== alert.unit));
    await supabase.from("notifications").update({ read: true }).in("id", alert.notificationIds);
  };

  if (alerts.length === 0) return null;

  return (
    <div className="space-y-2 mb-3 shrink-0">
      {alerts.map((alert) => (
        <div
          key={alert.unit}
          role="alert"
          className="rounded-xl bg-amber-500 text-white px-4 py-3 text-sm shadow-md flex items-center justify-between gap-3 flex-wrap"
        >
          <span className="flex items-start gap-2 min-w-0">
            <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <span>
              <strong>Atenção: {alert.unit} sem avisos do WhatsApp desde {formatSince(alert.since)}.</strong>{" "}
              Pode ser só falta de mensagens. Verifique no Hub se o número está Online e mande uma mensagem de teste.
              Só reconecte pelo QR se o Hub mostrar Desconectado.
            </span>
          </span>
          <button
            onClick={() => dismiss(alert)}
            className="flex-shrink-0 rounded-full bg-white text-amber-700 px-4 py-1.5 text-xs font-bold hover:bg-amber-50"
          >
            Já conferi
          </button>
        </div>
      ))}
    </div>
  );
}
