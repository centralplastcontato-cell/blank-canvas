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
    <div className="bg-gradient-to-r from-amber-500/15 via-amber-500/5 to-transparent border-b border-amber-500/30 px-4 py-3 animate-in slide-in-from-top duration-300">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="flex items-center justify-center w-9 h-9 rounded-full bg-amber-500/20 shrink-0">
            <Crown className="w-4 h-4 text-amber-600" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-foreground truncate">
              Cliente existente precisa de atenção!
            </p>
            <p className="text-xs text-muted-foreground truncate">
              <span className="font-medium text-foreground">
                {latestAlert.data.contact_name || latestAlert.data.contact_phone}
              </span>
              <span className="text-amber-600 ml-1">
                ({latestAlert.data.unit})
              </span>
              {remainingCount > 0 && (
                <span className="ml-1">
                  e mais {remainingCount} {remainingCount === 1 ? "cliente" : "clientes"}
                </span>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            size="sm"
            className="h-8 gap-1.5 bg-amber-600 hover:bg-amber-700 text-white"
            onClick={() => handleOpenConversation(latestAlert)}
          >
            <MessageSquare className="w-3.5 h-3.5" />
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
