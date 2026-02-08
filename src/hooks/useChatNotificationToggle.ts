import { useState, useCallback, useEffect } from "react";
import { toast } from "@/hooks/use-toast";

const STORAGE_KEY = "whatsapp-notifications-enabled";

export function useChatNotificationToggle() {
  const [notificationsEnabled, setNotificationsEnabled] = useState(() => {
    if (typeof window === "undefined") return true;
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved !== null ? saved === "true" : true;
  });

  // Sync state across tabs/windows
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue !== null) {
        setNotificationsEnabled(e.newValue === "true");
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  const toggleNotifications = useCallback(async () => {
    const newValue = !notificationsEnabled;
    setNotificationsEnabled(newValue);
    localStorage.setItem(STORAGE_KEY, String(newValue));

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
  }, [notificationsEnabled]);

  return {
    notificationsEnabled,
    toggleNotifications,
  };
}
