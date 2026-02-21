import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNotifications } from "./useNotifications";
import { useNotificationSounds } from "./useNotificationSounds";
import { getCurrentCompanyId } from "@/lib/supabase-helpers";

export interface AppNotification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string | null;
  data: Record<string, unknown> | null;
  read: boolean;
  created_at: string;
}

export function useAppNotifications() {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [clientAlertCount, setClientAlertCount] = useState(0);
  const [visitCount, setVisitCount] = useState(0);
  const [transferCount, setTransferCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const { showBrowserNotification, requestPermission } = useNotifications({ soundEnabled: false });
  const { playMessageSound, playLeadSound, playClientSound, playVisitSound } = useNotificationSounds();

  const updateCounts = useCallback((notifs: AppNotification[]) => {
    const unread = notifs.filter((n) => !n.read);
    setUnreadCount(unread.length);
    setClientAlertCount(unread.filter((n) => n.type === "existing_client").length);
    setVisitCount(unread.filter((n) => n.type === "visit_scheduled").length);
    setTransferCount(unread.filter((n) => n.type === "lead_transfer").length);
  }, []);

  const fetchNotifications = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const companyId = getCurrentCompanyId();
    
    let query = supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50);

    // Filter by company_id (include null for backward compatibility with old notifications)
    if (companyId) {
      query = query.or(`company_id.eq.${companyId},company_id.is.null`);
    }

    const { data, error } = await query;

    if (!error && data) {
      const notifs = data as AppNotification[];
      setNotifications(notifs);
      updateCounts(notifs);
    }
    setIsLoading(false);
  }, [updateCounts]);

  const markAsRead = useCallback(async (notificationId: string) => {
    const { error } = await supabase
      .from("notifications")
      .update({ read: true })
      .eq("id", notificationId);

    if (!error) {
      setNotifications((prev) => {
        const updated = prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n));
        updateCounts(updated);
        return updated;
      });
    }
  }, [updateCounts]);

  const markAllAsRead = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from("notifications")
      .update({ read: true })
      .eq("user_id", user.id)
      .eq("read", false);

    if (!error) {
      setNotifications((prev) => {
        const updated = prev.map((n) => ({ ...n, read: true }));
        updateCounts(updated);
        return updated;
      });
    }
  }, [updateCounts]);

  const deleteNotification = useCallback(async (notificationId: string) => {
    const { error } = await supabase
      .from("notifications")
      .delete()
      .eq("id", notificationId);

    if (!error) {
      setNotifications((prev) => {
        const updated = prev.filter((n) => n.id !== notificationId);
        updateCounts(updated);
        return updated;
      });
    }
  }, [updateCounts]);

  // Subscribe to realtime notifications
  useEffect(() => {
    fetchNotifications();

    const setupSubscription = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const channel = supabase
        .channel("notifications-realtime")
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            const newNotification = payload.new as AppNotification & { company_id?: string };
            const companyId = getCurrentCompanyId();
            
            // Filter: only show notifications for current company (or null for backward compat)
            if (newNotification.company_id && companyId && newNotification.company_id !== companyId) {
              return; // Skip notifications from other companies
            }
            
            setNotifications((prev) => {
              const updated = [newNotification, ...prev];
              updateCounts(updated);
              return updated;
            });

            // Play different sound based on notification type
            if (newNotification.type === "visit_scheduled") {
              // Priority: ascending fanfare for scheduled visits
              playVisitSound();
            } else if (newNotification.type === "existing_client") {
              // Urgent: triple chime for existing clients
              playClientSound();
            } else if (newNotification.type === "lead_transfer" || newNotification.type === "new_lead") {
              // Normal: two-tone chime for new leads
              playLeadSound();
            } else if (newNotification.type === "lead_questions" || newNotification.type === "lead_analyzing") {
              // Standard: regular lead sound for bot choices
              playLeadSound();
            } else {
              playMessageSound();
            }

            // Show browser notification
            showBrowserNotification({
              title: newNotification.title,
              body: newNotification.message || "",
              tag: newNotification.id,
            });
          }
        )
        .subscribe();

      return channel;
    };

    let channel: ReturnType<typeof supabase.channel> | null = null;
    setupSubscription().then((ch) => {
      channel = ch;
    });

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [fetchNotifications, updateCounts, playMessageSound, playLeadSound, playClientSound, showBrowserNotification]);

  return {
    notifications,
    unreadCount,
    clientAlertCount,
    visitCount,
    transferCount,
    isLoading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    refresh: fetchNotifications,
    requestBrowserPermission: requestPermission,
  };
}
