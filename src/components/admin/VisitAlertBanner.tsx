import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CalendarCheck, X, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNotificationSounds } from "@/hooks/useNotificationSounds";
import { useChatNotificationToggle } from "@/hooks/useChatNotificationToggle";

interface VisitNotificationData {
  conversation_id: string;
  contact_name: string;
  contact_phone: string;
  unit: string;
  lead_id?: string;
}

interface VisitNotification {
  id: string;
  title: string;
  message: string | null;
  data: VisitNotificationData;
  created_at: string;
  read: boolean;
  type: string;
}

interface VisitAlertBannerProps {
  userId: string;
  onOpenConversation: (conversationId: string, phone: string) => void;
}

export function VisitAlertBanner({ userId, onOpenConversation }: VisitAlertBannerProps) {
  const [alerts, setAlerts] = useState<VisitNotification[]>([]);
  const { playVisitSound } = useNotificationSounds();
  const { notificationsEnabled } = useChatNotificationToggle();
  const notificationsEnabledRef = useRef(notificationsEnabled);
  
  // Keep ref in sync with state for use in realtime callback
  useEffect(() => {
    notificationsEnabledRef.current = notificationsEnabled;
  }, [notificationsEnabled]);

  // Fetch unread visit notifications
  useEffect(() => {
    const fetchAlerts = async () => {
      const { data } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", userId)
        .eq("type", "visit_scheduled")
        .eq("read", false)
        .order("created_at", { ascending: false });

      if (data) {
        // Filter and cast only valid visit notifications
        const validAlerts = data
          .filter((n) => n.data && typeof n.data === 'object' && 'conversation_id' in (n.data as object))
          .map((n) => ({
            ...n,
            data: n.data as unknown as VisitNotificationData,
          }));
        setAlerts(validAlerts);
      }
    };

    fetchAlerts();

    // Subscribe to new visit notifications
    const channel = supabase
      .channel("visit-alerts")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const notification = payload.new as VisitNotification;
          if (notification.type === "visit_scheduled") {
            setAlerts((prev) => [notification, ...prev]);
            // Play sound for new visit alert
            if (notificationsEnabledRef.current) {
              playVisitSound();
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
          const notification = payload.new as VisitNotification;
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

  const handleOpenConversation = async (notification: VisitNotification) => {
    // Mark as read
    await supabase
      .from("notifications")
      .update({ read: true })
      .eq("id", notification.id);

    // Remove from local state
    setAlerts((prev) => prev.filter((a) => a.id !== notification.id));

    // Open the conversation
    onOpenConversation(notification.data.conversation_id, notification.data.contact_phone);
  };

  const handleDismiss = async (notification: VisitNotification) => {
    // Mark as read (dismiss)
    await supabase
      .from("notifications")
      .update({ read: true })
      .eq("id", notification.id);

    // Remove from local state
    setAlerts((prev) => prev.filter((a) => a.id !== notification.id));
  };

  if (alerts.length === 0) {
    return null;
  }

  // Show only the most recent alert
  const latestAlert = alerts[0];
  const remainingCount = alerts.length - 1;

  return (
    <div className="bg-gradient-to-r from-blue-500/15 via-blue-500/10 to-blue-500/5 border-b-2 border-blue-500/40 px-4 py-4 animate-in slide-in-from-top duration-300 animate-pulse">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="flex items-center justify-center w-11 h-11 rounded-full bg-blue-500/25 shrink-0 animate-bounce" style={{ animationDuration: '2s' }}>
            <CalendarCheck className="w-5 h-5 text-blue-600" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-base font-bold text-foreground truncate">
              🏰🗓️ VISITA AGENDADA - Ação urgente!
            </p>
            <p className="text-sm text-muted-foreground truncate">
              <span className="font-semibold text-foreground">
                {latestAlert.data.contact_name || latestAlert.data.contact_phone}
              </span>
              <span className="text-blue-600 font-medium ml-1">
                ({latestAlert.data.unit})
              </span>
              {remainingCount > 0 && (
                <span className="ml-1 font-medium">
                  e mais {remainingCount} {remainingCount === 1 ? "visita" : "visitas"}
                </span>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            size="sm"
            className="h-9 gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-lg shadow-blue-500/30"
            onClick={() => handleOpenConversation(latestAlert)}
          >
            <MessageSquare className="w-4 h-4" />
            Abrir Chat
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            onClick={() => handleDismiss(latestAlert)}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
