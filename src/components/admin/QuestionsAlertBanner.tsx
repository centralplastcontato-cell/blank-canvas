import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getCurrentCompanyId } from "@/lib/supabase-helpers";
import { HelpCircle, X, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNotificationSounds } from "@/hooks/useNotificationSounds";
import { useChatNotificationToggle } from "@/hooks/useChatNotificationToggle";

interface QuestionsNotificationData {
  conversation_id: string;
  contact_name: string;
  contact_phone: string;
  unit: string;
}

interface QuestionsNotification {
  id: string;
  title: string;
  message: string | null;
  data: QuestionsNotificationData;
  created_at: string;
  read: boolean;
  type: string;
}

interface QuestionsAlertBannerProps {
  userId: string;
  onOpenConversation: (conversationId: string, phone: string) => void;
}

export function QuestionsAlertBanner({ userId, onOpenConversation }: QuestionsAlertBannerProps) {
  const [alerts, setAlerts] = useState<QuestionsNotification[]>([]);
  const { playQuestionsSound } = useNotificationSounds();
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
        .eq("type", "lead_questions")
        .eq("read", false)
        .order("created_at", { ascending: false });

      if (companyId) {
        query = query.or(`company_id.eq.${companyId},company_id.is.null`);
      }

      const { data } = await query;

      if (data) {
        const validAlerts = data
          .filter((n) => n.data && typeof n.data === 'object' && 'conversation_id' in (n.data as object))
          .map((n) => ({
            ...n,
            data: n.data as unknown as QuestionsNotificationData,
          }));
        setAlerts(validAlerts);
        if (validAlerts.length > 0 && notificationsEnabledRef.current) {
          playQuestionsSound();
        }
      }
    };

    fetchAlerts();

    const channel = supabase
      .channel("questions-alerts")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const notification = payload.new as QuestionsNotification;
          if (notification.type === "lead_questions") {
            setAlerts((prev) => [notification, ...prev]);
            if (notificationsEnabledRef.current) {
              playQuestionsSound();
            }
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const notification = payload.new as QuestionsNotification;
          if (notification.read) {
            setAlerts((prev) => prev.filter((a) => a.id !== notification.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const handleOpenConversation = async (notification: QuestionsNotification) => {
    await supabase
      .from("notifications")
      .update({ read: true })
      .eq("id", notification.id);

    setAlerts((prev) => prev.filter((a) => a.id !== notification.id));
    onOpenConversation(notification.data.conversation_id, notification.data.contact_phone);
  };

  const handleDismiss = async (notification: QuestionsNotification) => {
    await supabase
      .from("notifications")
      .update({ read: true })
      .eq("id", notification.id);

    setAlerts((prev) => prev.filter((a) => a.id !== notification.id));
  };

  if (alerts.length === 0) {
    return null;
  }

  const latestAlert = alerts[0];
  const remainingCount = alerts.length - 1;

  return (
    <div className="bg-gradient-to-r from-emerald-600 via-emerald-500 to-emerald-600 border-b-2 border-emerald-400 px-4 py-3 animate-in slide-in-from-top duration-300 shadow-lg shadow-emerald-500/40">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="flex items-center justify-center w-11 h-11 rounded-full bg-white/20 shrink-0 ring-2 ring-white/50 ring-offset-1 ring-offset-emerald-600">
            <HelpCircle className="w-5 h-5 text-white" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-base font-extrabold text-white truncate">
              💬❓ Lead quer tirar dúvidas!
            </p>
            <p className="text-sm text-emerald-100 truncate">
              <span className="font-bold text-white">
                {latestAlert.data.contact_name || latestAlert.data.contact_phone}
              </span>
              <span className="text-green-100 font-semibold ml-1">
                ({latestAlert.data.unit})
              </span>
              {remainingCount > 0 && (
                <span className="ml-1 font-medium text-emerald-100">
                  e mais {remainingCount} {remainingCount === 1 ? "lead" : "leads"}
                </span>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            size="sm"
            className="h-9 gap-1.5 bg-white text-emerald-700 hover:bg-emerald-50 font-bold shadow-lg"
            onClick={() => handleOpenConversation(latestAlert)}
          >
            <MessageSquare className="w-4 h-4" />
            Abrir Chat
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 text-white/70 hover:text-white hover:bg-white/10"
            onClick={() => handleDismiss(latestAlert)}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
