import { useState, useCallback, useEffect } from "react";
import { toast } from "@/hooks/use-toast";

export const WHATSAPP_NOTIFICATIONS_STORAGE_KEY = "whatsapp-notifications-enabled";
export const WHATSAPP_NOTIFICATIONS_TOGGLE_EVENT = "whatsapp-notifications-toggle";

export function areChatNotificationsEnabled() {
  if (typeof window === "undefined") return true;
  const saved = localStorage.getItem(WHATSAPP_NOTIFICATIONS_STORAGE_KEY);
  return saved !== null ? saved === "true" : true;
}

export function useChatNotificationToggle() {
  const [notificationsEnabled, setNotificationsEnabled] = useState(areChatNotificationsEnabled);

  // Sync state across hook instances in the same tab and across tabs/windows.
  useEffect(() => {
    const syncNotificationsState = () => {
      setNotificationsEnabled(areChatNotificationsEnabled());
    };

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === WHATSAPP_NOTIFICATIONS_STORAGE_KEY) {
        syncNotificationsState();
      }
    };

    window.addEventListener("storage", handleStorageChange);
    window.addEventListener(WHATSAPP_NOTIFICATIONS_TOGGLE_EVENT, syncNotificationsState);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener(WHATSAPP_NOTIFICATIONS_TOGGLE_EVENT, syncNotificationsState);
    };
  }, []);

  const toggleNotifications = useCallback(async () => {
    const newValue = !areChatNotificationsEnabled();
    setNotificationsEnabled(newValue);
    localStorage.setItem(WHATSAPP_NOTIFICATIONS_STORAGE_KEY, String(newValue));
    window.dispatchEvent(new Event(WHATSAPP_NOTIFICATIONS_TOGGLE_EVENT));

    // Request browser permission if enabling
    if (newValue && "Notification" in window && Notification.permission === "default") {
      await Notification.requestPermission();
    }

    toast({
      title: newValue ? "Notificações ativadas" : "Notificações desativadas",
      description: newValue
        ? "Você receberá alertas de novas mensagens."
        : "Você não receberá mais alertas de novas mensagens.",
    });
  }, []);

  return {
    notificationsEnabled,
    toggleNotifications,
  };
}
