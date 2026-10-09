import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { getCurrentCompanyId } from "@/lib/supabase-helpers";
import { Sparkles, X, MessageSquare, UserPlus, CalendarCheck, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNotificationSounds } from "@/hooks/useNotificationSounds";
import { useChatNotificationToggle } from "@/hooks/useChatNotificationToggle";

// Avisos da Bia (IA) no cabeçalho, na cor dela (violeta): quando ela passa um
// cliente para a equipe e quando o cliente continua sem resposta (alerta forte).
// Só os avisos da IA — o "cliente sem resposta do robô" do bot fixo usa o
// mesmo tipo de notificação e continua só no sininho, como antes.
// Também avisa candidato novo do "Trabalhe Conosco" (no sininho ninguém via).
const AI_REASONS = ["ai_handoff", "ai_handoff_unanswered"];
// + número que parou de entregar mensagens (ninguém percebia até o cliente reclamar)
const ALERT_TYPES = ["lead_needs_human", "new_candidate", "visit_scheduled", "delivery_stall"];

interface AiHandoffData {
  conversation_id: string;
  contact_phone: string;
  reason: string;
  unit?: string;
  // new_candidate
  response_id?: string;
  photo_url?: string | null;
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

const isNewCandidate = (n: { type: string; data: unknown }) =>
  n.type === "new_candidate" && !!n.data && typeof n.data === "object" && "response_id" in (n.data as object);

// Visita marcada pela IA
const isAiVisit = (n: { type: string; data: unknown }) =>
  n.type === "visit_scheduled" && !!n.data && typeof n.data === "object" &&
  (n.data as Record<string, unknown>).reason === "ai_visit" && "conversation_id" in (n.data as object);

// Número sem entregar mensagens (fica só "enviado")
const isDeliveryStall = (n: { type: string; data: unknown }) =>
  n.type === "delivery_stall" && !!n.data && typeof n.data === "object" && "instance_id" in (n.data as object);

const isAlert = (n: { type: string; data: unknown }) => isAiHandoff(n) || isNewCandidate(n) || isAiVisit(n) || isDeliveryStall(n);

export function AiHandoffAlertBanner({ userId, onOpenConversation }: AiHandoffAlertBannerProps) {
  const navigate = useNavigate();
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
        .in("type", ALERT_TYPES)
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
            .filter((n) => isAlert(n))
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
          if (isAlert(notification)) {
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

  // O mais urgente primeiro (número sem entregar, cliente sem resposta), senão o mais recente
  const latest = alerts.find((a) => isDeliveryStall(a)) || alerts.find((a) => a.data.reason === "ai_handoff_unanswered") || alerts[0];
  const stall = isDeliveryStall(latest);
  const urgent = latest.data.reason === "ai_handoff_unanswered" || stall;
  const candidate = isNewCandidate(latest);
  const visit = isAiVisit(latest);
  const remaining = alerts.length - 1;
  const title = latest.title.replace(/^[^\p{L}\p{N}]+/u, "");

  return (
    <div className="bg-gradient-to-r from-violet-700 via-fuchsia-600 to-violet-700 border-b-2 border-violet-400 px-4 py-3 animate-in slide-in-from-top duration-300 shadow-lg shadow-violet-500/40">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className={`relative flex items-center justify-center w-11 h-11 rounded-full bg-white/20 shrink-0 ring-2 ring-white/50 overflow-hidden ${urgent ? "animate-pulse" : ""}`}>
            {candidate && latest.data.photo_url
              ? <img src={latest.data.photo_url} alt="" className="w-full h-full object-cover" />
              : candidate ? <UserPlus className="w-5 h-5 text-white" /> : visit ? <CalendarCheck className="w-5 h-5 text-white" /> : stall ? <WifiOff className="w-5 h-5 text-white" /> : <Sparkles className="w-5 h-5 text-white" />}
            {urgent && <span className="absolute -top-1 -right-1 text-sm" aria-hidden>🚨</span>}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm sm:text-base font-extrabold text-white truncate">
              <span className="inline-flex items-center rounded-full bg-white/20 px-2 py-0.5 text-[10px] sm:text-xs font-black tracking-wide mr-1.5 align-middle">{candidate ? "CANDIDATO" : visit ? "IA · VISITA" : stall ? "WHATSAPP" : "IA"}</span>
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
              if (candidate) navigate(`/formularios?section=freelancer&sub=candidatos&candidato=${latest.data.response_id}`);
              else if (stall) navigate("/configuracoes?secao=connection");
              else onOpenConversation(latest.data.conversation_id, latest.data.contact_phone);
            }}
          >
            {candidate ? <UserPlus className="w-4 h-4" /> : stall ? <WifiOff className="w-4 h-4" /> : <MessageSquare className="w-4 h-4" />}
            {candidate ? "Ver candidato" : stall ? "Ver conexão" : "Abrir Chat"}
          </Button>
          {visit && (
            <Button
              size="sm"
              variant="ghost"
              className="h-9 gap-1.5 text-white hover:bg-white/15 font-semibold"
              onClick={async () => {
                await markRead(latest);
                navigate("/agenda");
              }}
            >
              <CalendarCheck className="w-4 h-4" />
              <span className="hidden sm:inline">Ver agenda</span>
            </Button>
          )}
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
