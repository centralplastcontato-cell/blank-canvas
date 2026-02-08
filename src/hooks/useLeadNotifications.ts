import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNotificationSounds } from "./useNotificationSounds";

/**
 * Hook that listens for new leads and plays a notification sound
 * This is separate from the notification system - it just plays sounds for new leads
 */
export function useLeadNotifications() {
  const { playLeadSound } = useNotificationSounds();
  const isSubscribedRef = useRef(false);

  useEffect(() => {
    if (isSubscribedRef.current) return;
    isSubscribedRef.current = true;

    const channel = supabase
      .channel("leads-realtime-sound")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "campaign_leads",
        },
        (payload) => {
          console.log("Novo lead recebido:", payload.new);
          // Play the lead notification sound
          playLeadSound();
        }
      )
      .subscribe();

    return () => {
      isSubscribedRef.current = false;
      supabase.removeChannel(channel);
    };
  }, [playLeadSound]);
}
