import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getCurrentCompanyId } from "@/lib/supabase-helpers";
import { Sparkles, X, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNotificationSounds } from "@/hooks/useNotificationSounds";
import { useChatNotificationToggle } from "@/hooks/useChatNotificationToggle";

// Avisos da Bia (IA) no cabeçalho, na cor dela (violeta): quando ela passa um
// cliente para a equipe e quando o cliente continua sem resposta (alerta forte).
// Só os avisos da IA — o "cliente sem resposta do robô" do bot fixo usa o
// mesmo tipo de notificação e continua só no sininho, como antes.
const AI_REASONS = ["ai_handoff", "ai_handoff_unanswered"];

interface AiHandoffData {
  conversation_id: string;
  contact_phone: string;
  reason: string;
  unit?: string;
}

interface AiHandoffNotification {
  id: string;
  title: string;
  message: string | null;
  data: AiHandoffData;
  created_at: string;
  read: boolean;
  type: string;
}

interface AiHandoffAlertBannerProps {
  userId: string;
  onOpenConversation: (conversationId: string, phone: string) => void;
}

const isAiHandoff = (n: { type: string; data: unknown }) =>
  n.type === "lead_needs_human" &&
  !!n.data && typeof n.data === "object" &&
  AI_REASONS.includes(String((n.data as Record<string, unknown>).reason || "")) &&
  "conversation_id" in (n.data as object);

export function AiHandoffAlertBanner({ userId, onOpenConversation }: AiHandoffAlertBannerProps) {
  const [alerts, setAlerts] = useState<AiHandoffNotification[]>([]);
  const { playClientSound } = useNotificationSounds();
  const { notificationsEnabled } = useChatNotificationToggle();
  const notificationsEnabledRef = useRef(notificationsEnabled);

  useEffect(() => {
    notificationsEnabledRef.current = notificationsEnabled;
  }, [notificationsEnabled]);

  useEffect(() => {
    const fetchAlerts = async () => {
      const companyId = getCurrentCompanyId();
      let query = supabase
        .from("notifications")
        .select("*")
        .eq("user_id", userId)
        .eq("type", "lead_needs_human")
        .eq("read", false)
        .order("created_at", { ascending: false })
        .limit(50);
      if (companyId) {
        query = query.or(`company_id.eq.${companyId},company_id.is.null`);
      }
      const { data } = await query;
      if (data) {
        setAlerts(
          data
            .filter((n) => isAiHandoff(n))
            .map((n) => ({ ...n, data: n.data as unknown as AiHandoffData })),
        );
      }
    };

    fetchAlerts();

    const channel = supabase
      .channel("ai-handoff-alerts")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
        (payload) => {
          const notification = payload.new as AiHandoffNotification & { company_id?: string };
          const currentCompanyId = getCurrentCompanyId();
          if (notification.company_id && currentCompanyId && notification.company_id !== currentCompanyId) return;
          if (isAiHandoff(notification)) {
            setAlerts((prev) => [notification, ...prev]);
            if (notificationsEnabledRef.current) playClientSound();
          }
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
        (payload) => {
          const notification = payload.new as AiHandoffNotification;
          if (notification.read) setAlerts((prev) => prev.filter((a) => a.id !== notification.id));
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, playClientSound]);

  const markRead = async (notification: AiHandoffNotification) => {
    await supabase.from("notifications").update({ read: true }).eq("id", notification.id);
    setAlerts((prev) => prev.filter((a) => a.id !== notification.id));
  };

  if (alerts.length === 0) return null;

  // O mais urgente primeiro (cliente sem resposta), senão o mais recente
  const latest = alerts.find((a) => a.data.reason === "ai_handoff_unanswered") || alerts[0];
  const urgent = latest.data.reason === "ai_handoff_unanswered";
  const remaining = alerts.length - 1;
  const title = latest.title.replace(/^[^\p{L}\p{N}]+/u, "");

  return (
    <div className="bg-gradient-to-r from-violet-700 via-fuchsia-600 to-violet-700 border-b-2 border-violet-400 px-4 py-3 animate-in slide-in-from-top duration-300 shadow-lg shadow-violet-500/40">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className={`relative flex items-center justify-center w-11 h-11 rounded-full bg-white/20 shrink-0 ring-2 ring-white/50 ${urgent ? "animate-pulse" : ""}`}>
            <Sparkles className="w-5 h-5 text-white" />
            {urgent && <span className="absolute -top-1 -right-1 text-sm" aria-hidden>🚨</span>}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm sm:text-base font-extrabold text-white truncate">
              <span className="inline-flex items-center rounded-full bg-white/20 px-2 py-0.5 text-[10px] sm:text-xs font-black tracking-wide mr-1.5 align-middle">BIA</span>
              {title}
            </p>
            <p className="text-xs sm:text-sm text-violet-100 truncate">
              {latest.message}
              {remaining > 0 && (
                <span className="ml-1 font-medium">
                  · e mais {remaining} {remaining === 1 ? "aviso" : "avisos"}
                </span>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <Button
            size="sm"
            className="h-9 gap-1.5 bg-white text-violet-700 hover:bg-violet-50 font-bold shadow-lg"
            onClick={async () => {
              await markRead(latest);
              onOpenConversation(latest.data.conversation_id, latest.data.contact_phone);
            }}
          >
            <MessageSquare className="w-4 h-4" />
            Abrir Chat
          </Button>
          <Button
            size="icon"
            variant="ghost"
            aria-label="Dispensar aviso"
            className="h-8 w-8 text-white/70 hover:text-white hover:bg-white/10"
            onClick={() => markRead(latest)}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
