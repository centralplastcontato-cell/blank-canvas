import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNotificationSounds } from "./useNotificationSounds";
import { useChatNotificationToggle } from "./useChatNotificationToggle";

/**
 * Hook that listens for new leads and plays a notification sound
 * This is separate from the notification system - it just plays sounds for new leads
 */
export function useLeadNotifications(companyId?: string, shouldPlay?: (lead: { unit?: string | null }) => boolean) {
  const { playLeadSound } = useNotificationSounds();
  const { notificationsEnabled } = useChatNotificationToggle();
  const isSubscribedRef = useRef(false);
  const notificationsEnabledRef = useRef(notificationsEnabled);
  // Só toca para lead de unidade que a pessoa acessa
  const shouldPlayRef = useRef(shouldPlay);
  shouldPlayRef.current = shouldPlay;

  useEffect(() => {
    notificationsEnabledRef.current = notificationsEnabled;
  }, [notificationsEnabled]);

  useEffect(() => {
    // Nunca subscrever sem company_id — evita eventos cross-tenant
    if (!companyId || isSubscribedRef.current) return;
    isSubscribedRef.current = true;

    const channelConfig: { event: "INSERT"; schema: string; table: string; filter?: string } = {
      event: "INSERT",
      schema: "public",
      table: "campaign_leads",
      filter: `company_id=eq.${companyId}`,
    };

    const channel = supabase
      .channel(`leads-realtime-sound-${companyId ?? "global"}`)
      .on("postgres_changes", channelConfig, (payload) => {
        console.log("Novo lead recebido:", payload.new);
        const lead = payload.new as { unit?: string | null };
        if (notificationsEnabledRef.current && (!shouldPlayRef.current || shouldPlayRef.current(lead))) {
          playLeadSound();
        }
      })
      .subscribe();

    return () => {
      isSubscribedRef.current = false;
      supabase.removeChannel(channel);
    };
  }, [playLeadSound, companyId]);
}
