import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Crown, X, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNotificationSounds } from "@/hooks/useNotificationSounds";
import { useChatNotificationToggle } from "@/hooks/useChatNotificationToggle";

interface ClientNotificationData {
  conversation_id: string;
  contact_name: string;
  contact_phone: string;
  unit: string;
}

interface ClientNotification {
  id: string;
  title: string;
  message: string | null;
  data: ClientNotificationData;
  created_at: string;
  read: boolean;
  type: string;
}

interface ClientAlertBannerProps {
  userId: string;
  onOpenConversation: (conversationId: string, phone: string) => void;
}

export function ClientAlertBanner({ userId, onOpenConversation }: ClientAlertBannerProps) {
  const [alerts, setAlerts] = useState<ClientNotification[]>([]);
  const { playClientSound } = useNotificationSounds();
  const { notificationsEnabled } = useChatNotificationToggle();
  const notificationsEnabledRef = useRef(notificationsEnabled);
  
  // Keep ref in sync with state for use in realtime callback
  useEffect(() => {
    notificationsEnabledRef.current = notificationsEnabled;
  }, [notificationsEnabled]);

  // Fetch unread client notifications
  useEffect(() => {
    const fetchAlerts = async () => {
      const { data } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", userId)
        .eq("type", "existing_client")
        .eq("read", false)
        .order("created_at", { ascending: false });

      if (data) {
        // Filter and cast only valid client notifications
        const validAlerts = data
          .filter((n) => n.data && typeof n.data === 'object' && 'conversation_id' in (n.data as object))
          .map((n) => ({
            ...n,
            data: n.data as unknown as ClientNotificationData,
          }));
        setAlerts(validAlerts);
        // Play sound if there are unread client alerts on load
        if (validAlerts.length > 0 && notificationsEnabledRef.current) {
          playClientSound();
        }
      }
    };

    fetchAlerts();

    // Subscribe to new client notifications
    const channel = supabase
      .channel("client-alerts")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const notification = payload.new as ClientNotification;
          if (notification.type === "existing_client") {
            setAlerts((prev) => [notification, ...prev]);
            // Play sound for new client alert
            if (notificationsEnabledRef.current) {
              playClientSound();
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
          const notification = payload.new as ClientNotification;
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

  const handleOpenConversation = async (notification: ClientNotification) => {
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

  const handleDismiss = async (notification: ClientNotification) => {
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
    <div className="bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 border-b-2 border-amber-300 px-4 py-3 animate-in slide-in-from-top duration-300 shadow-lg shadow-amber-500/40">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="flex items-center justify-center w-11 h-11 rounded-full bg-white/20 shrink-0 ring-2 ring-white/50 ring-offset-1 ring-offset-amber-500">
            <Crown className="w-5 h-5 text-white" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-base font-extrabold text-white truncate">
              👑 Cliente existente precisa de atenção!
            </p>
            <p className="text-sm text-amber-100 truncate">
              <span className="font-bold text-white">
                {latestAlert.data.contact_name || latestAlert.data.contact_phone}
              </span>
              <span className="text-yellow-100 font-semibold ml-1">
                ({latestAlert.data.unit})
              </span>
              {remainingCount > 0 && (
                <span className="ml-1 font-medium text-amber-100">
                  e mais {remainingCount} {remainingCount === 1 ? "cliente" : "clientes"}
                </span>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            size="sm"
            className="h-9 gap-1.5 bg-white text-amber-700 hover:bg-amber-50 font-bold shadow-lg"
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
